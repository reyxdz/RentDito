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
 * PRE-SUPABASE, this minted tokens directly with `signAccess()` — the exact
 * function `authService.login()` itself called — keyed off a seeded user's
 * real Mongo `_id` and `role`.
 *
 * POST-SUPABASE-CUTOVER (this implementation): `src/utils/jwt.ts` no longer
 * exists — Supabase issues tokens now, and the auth middleware verifies them
 * against Supabase's JWKS (ES256), so a token has to come from Supabase
 * itself to be accepted. This calls `supabaseAdmin.auth.signInWithPassword`
 * directly (NOT through the rate-limited `POST /api/auth/login` route),
 * which is why the rate-limit concern above still doesn't apply.
 *
 * IMPORTANT DEPENDENCY: this requires a real Supabase Auth user (and a
 * matching `profiles` row) to already exist for the given email, seeded with
 * the password below. That seeding is Task 12's job (Supabase-Auth seed),
 * not this file's — until Task 12 runs, every call here throws the error
 * below rather than silently returning a bad token.
 */
import { supabaseAdmin } from '../../src/config/supabase';

// Matches the pre-Supabase Mongo seed's plaintext convention
// (server/src/seeds/seed.ts: `await hash('password123')` for every seeded
// user). Task 12's Supabase-Auth seed is expected to create each user with
// this same password; override via SEED_TEST_PASSWORD if that ever changes.
const SEED_TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || 'password123';

const tokenCache = new Map<string, string>();

/**
 * Given a seeded user's email, return a bearer access token for them, minted
 * by signing in against Supabase Auth directly (never through the
 * rate-limited `/api/auth/login` route). Tokens are cached per email for the
 * lifetime of the test process, both for speed and so the same email always
 * yields a stable identity within one run.
 */
export async function tokenForEmail(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password: SEED_TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(
      `tokenForEmail: could not sign in as "${email}" via Supabase Auth ` +
        `(${error?.message ?? 'no session returned'}). Is Supabase Auth seeded ` +
        `with this user (Task 12's seed) using the SEED_TEST_PASSWORD ` +
        `convention ("${SEED_TEST_PASSWORD}")?`
    );
  }

  const token = data.session.access_token;
  tokenCache.set(email, token);
  return token;
}
