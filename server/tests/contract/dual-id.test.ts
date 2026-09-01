/**
 * Auth middleware profile-resolution contract (server/src/middleware/auth.ts).
 *
 * HISTORY: this file used to guard the strangler-era dual-id shape --
 * `req.user.id` reverting to the legacy MongoDB ObjectId (falling back to
 * the Postgres UUID for profiles with none) so not-yet-ported services could
 * keep querying MongoDB by it, while a second field on `req.user` always
 * carried the Postgres/Supabase profile UUID for services as they were
 * ported to Prisma. Now that every service is ported to Prisma, that
 * strangler has been collapsed (see middleware/auth.ts): `req.user.id` IS
 * the Postgres UUID directly, the second field is gone, and the
 * `legacyMongoId` lookup that used to populate it has been removed from the
 * middleware (the `profiles.legacy_mongo_id` column itself still exists as
 * a rollback aid -- only the middleware's read of it is gone).
 *
 * What still needs guarding after the collapse:
 *   1. a valid token resolves to the right Postgres profile
 *   2. the short-TTL profile cache actually expires (and re-fetches) once
 *      its TTL elapses, rather than serving a stale role forever
 *   3. a token with no matching profile is rejected (401), rather than
 *      silently admitting a caller the middleware can't actually resolve
 *
 * This file mounts the real middleware on a throwaway express app (no
 * src/routes/** involved) so `req.user` can be observed directly, rather
 * than inferring it indirectly through an existing controller's response
 * shape.
 */
import express from 'express';
import request from 'supertest';
import auth, { AuthRequest, __clearProfileCacheForTests } from '../../src/middleware/auth';
import prisma from '../../src/config/prisma';
import { tokenForEmail } from '../helpers/auth';
import { EMAILS } from './replay.meta';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildWhoAmIApp() {
  const app = express();
  app.get('/whoami', auth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });
  return app;
}

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  __clearProfileCacheForTests();
});

describe('auth middleware: profile resolution', () => {
  it("resolves a valid token to the seeded user's own Postgres profile, with no leftover secondary id field on req.user", async () => {
    const token = await tokenForEmail(EMAILS.user1);

    const res = await request(buildWhoAmIApp()).get('/whoami').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { user } = res.body;

    // Exactly {id, role} -- the collapsed shape carries nothing else.
    expect(Object.keys(user).sort()).toEqual(['id', 'role']);
    expect(user.role).toBe('user');
    expect(user.id).toMatch(UUID_RE);

    // id really is this user's own Postgres profile id.
    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    expect(profile).not.toBeNull();
    expect(profile!.email).toBe(EMAILS.user1);
  });

  it('rejects a token whose sub has no matching profile with 401 "Invalid token."', async () => {
    // A real Supabase Auth user, signed with no matching `profiles` row --
    // the exact case middleware/auth.ts's `if (!profile)` branch guards
    // against (a token that verifies cleanly but resolves to nobody).
    const email = `dual-id-unknown-profile-${Date.now()}@rentdito.com`;
    const { supabaseAdmin } = await import('../../src/config/supabase');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`fixture setup failed: ${error?.message}`);
    }
    try {
      const token = await tokenForEmail(email);
      const res = await request(buildWhoAmIApp()).get('/whoami').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ status: 'error', message: 'Invalid token.' });
    } finally {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    }
  }, 30000);
});

describe('profile cache TTL expiry', () => {
  const ORIGINAL_TTL = process.env.AUTH_PROFILE_CACHE_TTL_MS;

  afterEach(() => {
    if (ORIGINAL_TTL === undefined) delete process.env.AUTH_PROFILE_CACHE_TTL_MS;
    else process.env.AUTH_PROFILE_CACHE_TTL_MS = ORIGINAL_TTL;
    jest.resetModules();
  });

  it('picks up a role change from the database only after the TTL elapses', async () => {
    // Deterministic TTL proof: instead of sleeping a real duration (which
    // flaked under load -- a slow request round trip or CPU contention could
    // eat into the sleep window and race the TTL boundary either way), this
    // injects the cache's clock (auth.ts's `__setClockForTests`) and
    // advances a controlled counter explicitly. The TTL value itself
    // (1500ms, via AUTH_PROFILE_CACHE_TTL_MS) and the exact
    // `nowFn() - cachedAt > TTL` comparison are still the real production
    // code path -- only the passage of time is now a value this test
    // controls rather than something it waits on, so the assertions below
    // genuinely prove expiry behaviour with zero real elapsed time at risk.
    process.env.AUTH_PROFILE_CACHE_TTL_MS = '1500';
    jest.resetModules();
    // Re-require with the short TTL now in effect. Also re-require prisma so
    // this test's writes and the middleware's reads share one client
    // instance/module cache.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshAuth = require('../../src/middleware/auth');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshPrisma = require('../../src/config/prisma').default;

    let mockNow = 1_000_000_000;
    freshAuth.__setClockForTests(() => mockNow);

    const app = express();
    app.get('/whoami', freshAuth.default, (req: AuthRequest, res: express.Response) => {
      res.json({ user: req.user });
    });

    const token = await tokenForEmail(EMAILS.user2);

    const before = await request(app).get('/whoami').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);
    expect(before.body.user.role).toBe('user');

    await freshPrisma.profile.update({ where: { id: before.body.user.id }, data: { role: 'landlord' } });

    try {
      // Advance the mock clock by less than the TTL: still within the
      // window, so the cached (stale) value must win.
      mockNow += 500;
      const stillCached = await request(app).get('/whoami').set('Authorization', `Bearer ${token}`);
      expect(stillCached.status).toBe(200);
      expect(stillCached.body.user.role).toBe('user');

      // Advance past the TTL boundary (total elapsed: 1600ms > 1500ms).
      mockNow += 1100;
      const afterExpiry = await request(app).get('/whoami').set('Authorization', `Bearer ${token}`);
      expect(afterExpiry.status).toBe(200);
      expect(afterExpiry.body.user.role).toBe('landlord');
    } finally {
      // Restore the seed data so no other test observes a mutated role.
      await freshPrisma.profile.update({ where: { id: before.body.user.id }, data: { role: 'user' } });
      await freshPrisma.$disconnect();
    }
  }, 20000);
});
