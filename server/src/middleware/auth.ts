import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import prisma from '../config/prisma';

/**
 * Extend Express Request to carry the authenticated user payload.
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
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
    const profile = await prisma.profile.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true },
    });
    if (!profile) {
      res.status(401).json({ status: 'error', message: 'Invalid token.' });
      return;
    }
    req.user = { id: profile.id, role: profile.role };
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
