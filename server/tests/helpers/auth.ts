/**
 * Token-minting helper for contract-test replay.
 *
 * WHY THIS EXISTS (read before touching): the golden fixtures under
 * tests/golden/*.json were captured against a live MongoDB app whose login
 * route (`POST /api/auth/login`) is rate-limited to 10 requests / 15 minutes
 * (see src/middleware/rateLimiter.ts). Replaying ~180 authenticated cases by
 * actually logging in for each one would blow through that limit and produce
 * spurious 429s that have nothing to do with the behaviour under test.
 *
 * The capture script (scripts/capture-golden.ts) solved this by minting
 * tokens directly with `signAccess()` — the exact function
 * `authService.login()` itself calls — keyed off a seeded user's real
 * Mongo `_id` and `role`. This helper does the same thing for replay, for
 * the same reason: `tokenForEmail('user1@rentdito.com')` returns a token
 * byte-identical in shape to what a real login would issue, without ever
 * touching the rate-limited route.
 *
 * FORWARD-COMPATIBILITY NOTE (do not lose this): `src/utils/jwt.ts` is
 * deleted later in the Mongo -> Supabase/Postgres migration, once auth
 * moves to Supabase. This file is deliberately the ONLY place in the test
 * suite that imports `signAccess` or knows how a bearer token is produced.
 * When that cutover happens, only `tokenForEmail`'s implementation below
 * needs to change (e.g. to mint/fetch a Supabase-issued token) — every test
 * that calls it stays untouched.
 */
import { User } from '../../src/models/User';
import { signAccess } from '../../src/utils/jwt';

// These must be set before the auth middleware verifies its first token
// (src/middleware/auth.ts reads process.env.JWT_ACCESS_SECRET at REQUEST
// time, not at import time — see src/server.ts's own dotenv.config(), which
// is a no-op here since no server/.env exists or is created for this suite).
// Forced (not `process.env.X || 'fallback'`) so the suite never silently
// depends on a real .env a developer happens to have locally.
process.env.JWT_ACCESS_SECRET = 'contract-replay-access-secret';
process.env.JWT_REFRESH_SECRET = 'contract-replay-refresh-secret';

const tokenCache = new Map<string, string>();

/**
 * Given a seeded user's email, return a bearer access token for them.
 * Looks the user up by email (for their real Mongo _id and role) and mints
 * a token with the same `signAccess()` the real login flow uses. Tokens are
 * cached per email for the lifetime of the test process, both for speed and
 * so the same email always yields a stable identity within one run.
 */
export async function tokenForEmail(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new Error(
      `tokenForEmail: no seeded user found for "${email}". Is MongoDB seeded ` +
        `(run \`npm run seed\` in server/) and is it the same seed the golden ` +
        `fixtures were captured against?`
    );
  }

  const token = signAccess((user as any)._id.toString(), (user as any).role);
  tokenCache.set(email, token);
  return token;
}
