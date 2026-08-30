/**
 * Contract test for the Supabase-backed /api/auth/* routes (Task 7).
 *
 * IMPORTANT: named import — server.ts's connectDB()/app.listen() are guarded
 * behind `require.main === module` (Task 2), so the default export is
 * `undefined` on import. Importing `app` does NOT connect to MongoDB; this
 * suite does not need it either, since /api/auth/login is now served
 * entirely by Prisma + Supabase, not Mongoose.
 *
 * Fixtures are created directly via the Supabase admin API + Prisma
 * (bypassing POST /api/auth/register, which is rate-limited to 10/15min —
 * see src/middleware/rateLimiter.ts) and torn down in afterAll. The database
 * is otherwise empty at this point in the migration (no seed has run yet),
 * so every fixture used here is self-contained to this file.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../../src/server';
import { supabaseAdmin } from '../../src/config/supabase';
import prisma from '../../src/config/prisma';
import { isJwksInfraFailure } from '../../src/middleware/auth';

const TEST_PASSWORD = 'Password123!';
const runId = crypto.randomBytes(4).toString('hex');

const emails = {
  active: `task7-active-${runId}@rentdito.com`,
  suspended: `task7-suspended-${runId}@rentdito.com`,
  unverified: `task7-unverified-${runId}@rentdito.com`,
};

const createdUserIds: string[] = [];

async function createFixture(
  email: string,
  overrides: Partial<{ status: 'active' | 'suspended'; verificationStatus: 'unverified' | 'pending' | 'verified' }>
): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`fixture setup: could not create Supabase auth user "${email}": ${error?.message}`);
  }
  createdUserIds.push(data.user.id);

  await prisma.profile.create({
    data: {
      id: data.user.id,
      name: 'Task 7 Fixture',
      email,
      role: 'user',
      status: overrides.status ?? 'active',
      verificationStatus: overrides.verificationStatus ?? 'verified',
    },
  });

  return data.user.id;
}

let activeUserId: string;

beforeAll(async () => {
  activeUserId = await createFixture(emails.active, {});
  await createFixture(emails.suspended, { status: 'suspended' });
  await createFixture(emails.unverified, { verificationStatus: 'unverified' });
}, 30000);

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: createdUserIds } } });
  await Promise.all(createdUserIds.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  await prisma.$disconnect();
}, 30000);

describe('POST /api/auth/login', () => {
  it('returns camelCase tokens and a dual-id user for a valid Supabase-issued session', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emails.active, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).not.toHaveProperty('access_token');
    expect(res.body.data).not.toHaveProperty('refresh_token');
    expect(res.body.data.user.id).toBe(res.body.data.user._id);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    // The access token really is a Supabase-issued ES256 token, not some
    // fallback shape.
    const header = JSON.parse(Buffer.from(res.body.data.accessToken.split('.')[0], 'base64url').toString('utf8'));
    expect(header.alg).toBe('ES256');
  });

  it('rejects a suspended account with 403 and the exact pre-existing message, before checking credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emails.suspended, password: 'not-even-the-right-password' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ status: 'error', message: 'Account is suspended. Contact support.' });
  });

  it('rejects an unverified account with 403 and the exact pre-existing message, before checking credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emails.unverified, password: 'not-even-the-right-password' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Please verify your email address to continue.',
    });
  });

  it('rejects an unknown email with 401 "Invalid email or password"', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `no-such-user-${runId}@rentdito.com`, password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'error', message: 'Invalid email or password' });
  });
});

describe('Supabase ES256 token verification (server/src/middleware/auth.ts)', () => {
  it('authenticates a protected route with a real Supabase-issued ES256 access token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: emails.active, password: TEST_PASSWORD });
    const { accessToken } = login.body.data;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'success', message: 'Logged out successfully' });
  });

  it('rejects a token signed with the wrong key with 401 — proves the signature is actually verified, not merely decoded', async () => {
    // Use a REAL `kid` from the live JWKS endpoint so the header looks
    // legitimate, but sign with a locally generated EC keypair Supabase
    // never issued. If the middleware only decoded the token (or trusted
    // its header) this would sail through; because it re-derives the public
    // key for this exact kid and verifies the signature against it, the
    // mismatch must be caught.
    const jwksRes = await fetch(process.env.SUPABASE_JWKS_URL as string);
    expect(jwksRes.status).toBe(200);
    const jwks = (await jwksRes.json()) as { keys: Array<{ kid: string }> };
    const realKid = jwks.keys[0].kid;

    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const forged = jwt.sign(
      { sub: activeUserId, aud: 'authenticated', role: 'authenticated' },
      privateKey,
      { algorithm: 'ES256', expiresIn: '5m', keyid: realKid }
    );

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'error', message: 'Invalid token.' });
  });

  it('rejects a token with no matching kid with 401, not 500', async () => {
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const forged = jwt.sign(
      { sub: activeUserId, aud: 'authenticated', role: 'authenticated' },
      privateKey,
      { algorithm: 'ES256', expiresIn: '5m', keyid: 'not-a-real-kid' }
    );

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'error', message: 'Invalid token.' });
  });

  it('rejects requests with no Authorization header with 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'error', message: 'Access denied. No token provided.' });
  });
});

describe('isJwksInfraFailure (JWKS fetch failure vs. invalid token classification)', () => {
  it('classifies an unreachable-endpoint error as infrastructure, not a bad token', () => {
    expect(isJwksInfraFailure({ name: 'JwksError', isEndpointUnavailable: true })).toBe(true);
  });

  it('classifies our own client-side rate limit as infrastructure', () => {
    expect(isJwksInfraFailure({ name: 'JwksRateLimitError' })).toBe(true);
  });

  it('classifies an unknown kid as a bad token, not an infrastructure failure', () => {
    expect(isJwksInfraFailure({ name: 'SigningKeyNotFoundError' })).toBe(false);
  });

  it('classifies a plain signature/expiry error as a bad token', () => {
    expect(isJwksInfraFailure({ name: 'TokenExpiredError' })).toBe(false);
  });
});
