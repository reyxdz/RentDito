import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import prisma from '../config/prisma';

/**
 * Extend Express Request to carry the authenticated user payload.
 */
export interface AuthRequest extends Request {
  user?: {
    // TRANSITIONAL: during the strangler migration this holds the legacy
    // MongoDB ObjectId (falling back to the Postgres UUID for profiles that
    // have no legacy id), because all 24 not-yet-ported services still
    // query MongoDB by this value. As each service is ported to Prisma it
    // switches from reading `id` to reading `pgId`. At final cutover — once
    // every service is ported — `id` becomes the Postgres UUID directly and
    // `pgId` is deleted.
    id: string;
    // The Postgres/Supabase profile UUID, always present. Ported (Prisma)
    // services should read this instead of `id`.
    pgId: string;
    role: string;
  };
}

const jwksUri = process.env.SUPABASE_JWKS_URL;

/**
 * JWKS client for Supabase's ES256 (ECC/P-256) signing keys. Caching and
 * rate-limiting are both enabled: caching avoids a network round-trip on
 * every request, and rate-limiting caps how often we'll re-hit the JWKS
 * endpoint if an unknown `kid` shows up (e.g. right after a key rotation).
 */
const jwksClient = jwksUri
  ? jwksRsa({
      jwksUri,
      cache: true,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    })
  : undefined;

/**
 * Distinguishes an infrastructure failure (JWKS endpoint unreachable, or our
 * own client-side rate limit tripping) from a genuinely bad token (unknown
 * `kid`, bad signature, expired, malformed). jwks-rsa flags true endpoint
 * failures with `isEndpointUnavailable` (set in JwksClient#getKeys) and its
 * own throttling with `JwksRateLimitError` — both are exported here so tests
 * can assert the classification directly against constructed error shapes,
 * without needing to fake a real network outage.
 */
export const isJwksInfraFailure = (err: any): boolean =>
  err?.isEndpointUnavailable === true || err?.name === 'JwksRateLimitError';

/**
 * In-process cache of the profile lookup, keyed on the JWT `sub` (the
 * Supabase/Postgres profile id). Every request otherwise pays a full Prisma
 * round-trip to the (remote, Singapore-hosted) Postgres instance —
 * 200-400ms each — purely to resolve id/pgId/role, which is what turned the
 * 186-case golden replay suite from seconds into minutes. TTL is short
 * (60s) and deliberately simple: a plain Map keyed by sub, storing the
 * resolved payload plus the time it was cached, with a bounded size so a
 * long-running process can't grow this unbounded from churn through many
 * distinct users.
 *
 * Staleness note: a role or status change made directly in the database
 * takes up to TTL_MS to be reflected in `req.user`. That's acceptable here
 * because every route still re-checks authorization per request against
 * whatever `req.user.role` says — worst case is a slightly stale role for
 * up to a minute, not a permanently wrong one.
 */
// Overridable via AUTH_PROFILE_CACHE_TTL_MS so tests can prove expiry
// deterministically (e.g. 200ms) instead of sleeping a real 60s.
const PROFILE_CACHE_TTL_MS = Number(process.env.AUTH_PROFILE_CACHE_TTL_MS) || 60 * 1000;
const PROFILE_CACHE_MAX_SIZE = 500;

interface CachedProfile {
  id: string;
  pgId: string;
  role: string;
}

const profileCache = new Map<string, { value: CachedProfile; cachedAt: number }>();

/**
 * The cache's sole time source. Defaults to the real wall clock in
 * production; tests may override it (see `__setClockForTests`) so TTL
 * expiry can be proven by advancing a controlled counter instead of
 * sleeping real milliseconds -- see that function's doc comment for why.
 */
let nowFn: () => number = Date.now;

function getCachedProfile(sub: string): CachedProfile | undefined {
  const entry = profileCache.get(sub);
  if (!entry) return undefined;
  if (nowFn() - entry.cachedAt > PROFILE_CACHE_TTL_MS) {
    profileCache.delete(sub);
    return undefined;
  }
  return entry.value;
}

function setCachedProfile(sub: string, value: CachedProfile): void {
  // Bound the cache: evict the oldest entry (Map preserves insertion order)
  // before inserting a new one once we're at capacity, rather than growing
  // unbounded.
  if (!profileCache.has(sub) && profileCache.size >= PROFILE_CACHE_MAX_SIZE) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey !== undefined) profileCache.delete(oldestKey);
  }
  profileCache.set(sub, { value, cachedAt: nowFn() });
}

/**
 * Test-only escape hatch: clears the profile cache. Exported so tests can
 * demonstrate TTL expiry and cache invalidation deterministically without
 * waiting on a real clock or reaching into module-private state.
 */
export function __clearProfileCacheForTests(): void {
  profileCache.clear();
}

/**
 * Test-only escape hatch: overrides the cache's time source. Lets a test
 * prove TTL expiry deterministically -- "still cached before expiry" /
 * "expired and re-fetched after expiry" -- by advancing a controlled
 * counter instead of sleeping a real wall-clock duration. Sleeping a real
 * duration is inherently racy under load: if the request round trip (or
 * just CPU contention) eats into the sleep window, the "still cached"
 * assertion can fire after the TTL has actually elapsed, or the "expired"
 * assertion can fire before it has. Injecting the clock removes real
 * elapsed time from the equation entirely, while still exercising the
 * exact same `nowFn() - cachedAt > TTL` comparison production uses.
 */
export function __setClockForTests(fn: () => number): void {
  nowFn = fn;
}

/**
 * Middleware that verifies the Supabase-issued (ES256) access token from the
 * Authorization header. Attaches the corresponding profile's id/role to
 * req.user. Returns 401 on missing, invalid, or expired tokens; 500 if the
 * JWKS endpoint itself cannot be reached (an infrastructure problem, not a
 * bad token).
 */
const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!jwksClient) {
    res.status(500).json({ status: 'error', message: 'Server misconfiguration: JWT secret not set' });
    return;
  }

  // Read the (unverified) header just to find which key signed this token.
  // The signature itself is verified below, against the key fetched from
  // the JWKS endpoint — the token's own header never chooses the algorithm.
  const unverified = jwt.decode(token, { complete: true });
  const kid = unverified && typeof unverified === 'object' ? unverified.header?.kid : undefined;
  if (!unverified || typeof unverified !== 'object') {
    res.status(401).json({ status: 'error', message: 'Invalid token.' });
    return;
  }

  let signingKey: string;
  try {
    const key = await jwksClient.getSigningKey(kid);
    signingKey = key.getPublicKey();
  } catch (err: any) {
    if (isJwksInfraFailure(err)) {
      res.status(500).json({
        status: 'error',
        message: 'Unable to verify token: authentication service unavailable.',
      });
      return;
    }
    // Unknown kid (SigningKeyNotFoundError / ArgumentError) — the token
    // itself is bogus, not a JWKS availability problem.
    res.status(401).json({ status: 'error', message: 'Invalid token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, signingKey, { algorithms: ['ES256'] }) as { sub: string };

    let cached = getCachedProfile(decoded.sub);
    if (!cached) {
      const profile = await prisma.profile.findUnique({
        where: { id: decoded.sub },
        select: { id: true, role: true, legacyMongoId: true },
      });
      if (!profile) {
        res.status(401).json({ status: 'error', message: 'Invalid token.' });
        return;
      }
      // TRANSITIONAL: `id` reverts to the Mongo ObjectId (falling back to
      // the Postgres UUID when a profile has no legacy id, e.g. one created
      // after the migration) so the 24 not-yet-ported services — which all
      // still query MongoDB by this value — keep working untouched. `pgId`
      // is always the Postgres UUID. At final cutover, `id` becomes the
      // UUID directly and `pgId` is removed.
      cached = { id: profile.legacyMongoId ?? profile.id, pgId: profile.id, role: profile.role };
      setCachedProfile(decoded.sub, cached);
    }

    req.user = cached;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        status: 'error',
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Invalid token.',
    });
  }
};

export default auth;
