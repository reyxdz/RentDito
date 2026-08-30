/**
 * Dual-ID auth middleware contract (Task: strangler transition with dual
 * IDs, server/src/middleware/auth.ts).
 *
 * Design under test: `req.user.id` reverts to holding the legacy MongoDB
 * ObjectId (falling back to the Postgres UUID when a profile has no legacy
 * id) so the not-yet-ported services — which still query MongoDB by this
 * value — keep working untouched, while `req.user.pgId` always carries the
 * Postgres/Supabase profile UUID for services as they're ported to Prisma.
 *
 * This file mounts the real middleware on a throwaway express app (no
 * src/routes/** involved) so `req.user` can be observed directly, rather
 * than inferring it indirectly through an existing controller's response
 * shape.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import auth, { AuthRequest, __clearProfileCacheForTests } from '../../src/middleware/auth';
import prisma from '../../src/config/prisma';
import { User } from '../../src/models/User';
import { tokenForEmail } from '../helpers/auth';
import { EMAILS } from './replay.meta';

const MONGO_OBJECT_ID_RE = /^[0-9a-f]{24}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildWhoAmIApp() {
  const app = express();
  app.get('/whoami', auth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });
  return app;
}

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rentdito');
});

afterAll(async () => {
  await mongoose.disconnect();
  await prisma.$disconnect();
});

beforeEach(() => {
  __clearProfileCacheForTests();
});

describe('dual-id middleware: req.user.id (Mongo ObjectId) vs req.user.pgId (Postgres UUID)', () => {
  it('sets id to the seeded user\'s legacy Mongo ObjectId and pgId to their Postgres profile UUID', async () => {
    const token = await tokenForEmail(EMAILS.user1);

    const res = await request(buildWhoAmIApp()).get('/whoami').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { user } = res.body;

    expect(user.role).toBe('user');
    expect(user.id).toMatch(MONGO_OBJECT_ID_RE);
    expect(user.pgId).toMatch(UUID_RE);
    expect(user.id).not.toBe(user.pgId);

    // id really is a live Mongo ObjectId for this same user, not just
    // something that happens to look like one.
    const mongoUser = await User.findById(user.id);
    expect(mongoUser).not.toBeNull();
    expect(mongoUser!.email).toBe(EMAILS.user1);

    // pgId really is this user's Postgres profile id, and that profile's
    // legacyMongoId is exactly what came back as `id`.
    const profile = await prisma.profile.findUnique({ where: { id: user.pgId } });
    expect(profile).not.toBeNull();
    expect(profile!.email).toBe(EMAILS.user1);
    expect(profile!.legacyMongoId).toBe(user.id);
  });

  it('falls back id to the Postgres UUID for a profile with no legacyMongoId (post-migration signup)', async () => {
    // Mirrors tests/contract/auth.test.ts's own fixture pattern: a profile
    // created directly via Prisma, with no legacyMongoId, representing a
    // user who signed up after the Mongo -> Postgres cutover.
    const email = `dual-id-no-legacy-${Date.now()}@rentdito.com`;
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
      await prisma.profile.create({
        data: {
          id: data.user.id,
          name: 'No Legacy Id Fixture',
          email,
          role: 'user',
          status: 'active',
          verificationStatus: 'verified',
        },
      });

      const token = await tokenForEmail(email);
      const res = await request(buildWhoAmIApp()).get('/whoami').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.pgId).toBe(data.user.id);
      // No legacyMongoId to fall back from -> id must equal the UUID.
      expect(res.body.user.id).toBe(data.user.id);
    } finally {
      await prisma.profile.deleteMany({ where: { id: data.user.id } });
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

    await freshPrisma.profile.update({ where: { id: before.body.user.pgId }, data: { role: 'landlord' } });

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
      await freshPrisma.profile.update({ where: { id: before.body.user.pgId }, data: { role: 'user' } });
      await freshPrisma.$disconnect();
    }
  }, 20000);
});
