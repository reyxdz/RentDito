/**
 * Golden-fixture contract replay.
 *
 * Replays every case captured by server/scripts/capture-golden.ts against
 * the CURRENT (MongoDB) implementation of the app, so that later phases of
 * the Mongo -> Supabase/Postgres migration — in particular the rewrite of
 * 235 `.populate()` call sites into Prisma `include`s — have a real
 * regression gate to run against. If this suite passes vacuously (0 cases
 * discovered, or auth silently missing so everything 401s "successfully"),
 * the whole migration proceeds unguarded, so several things here are
 * deliberately paranoid: see the fixture-discovery guards below and the
 * "has an identity mapped for every discovered case" test.
 *
 * IMPORTANT — named import. `server.ts` only calls connectDB()/app.listen()
 * under `if (require.main === module)`; the default export is `undefined`
 * on import (see tests/server-import.test.ts). Importing `app` here does
 * NOT connect to MongoDB — this file owns its own connection below.
 *
 * KNOWN CAPTURED BUG — do not "fix" the fixture: GET /api/tickets/:id
 * currently returns 403 even to the ticket's own reporter. In
 * src/services/ticket.service.ts's canAccessTicket() (around line 109):
 *
 *     const isOwner = ticket.reportedByUserId.toString() === userId;
 *
 * `ticket.reportedByUserId` is a populated user document by the time this
 * runs, so `.toString()` yields "[object Object]", never the raw userId —
 * `isOwner` is always false. tests/golden/ticket.json's `ticket-by-id-
 * owner-user1` case (403, "Access denied") captures exactly this: it is
 * what the app genuinely does today, not what it should do. If that
 * comparison is ever fixed, THIS SPECIFIC CASE WILL GO RED, and that is
 * correct — re-capture the fixture deliberately at that point, do not
 * silently edit it (or this test) to keep the old expectation.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/server';
import { normalizeBody } from '../helpers/normalize';
import { tokenForEmail } from '../helpers/auth';
import { EMAILS, CASE_AUTH, CASE_QUERY, AUTH_LOGIN_BODIES, ALLOW_ID_ONLY } from './replay.meta';

const GOLDEN_DIR = path.resolve(__dirname, '../golden');

// ───────────────────────────────────────────────────────────────────────
// Fixture discovery. This runs at module-load time, synchronously, and
// THROWS (rather than degrading to an empty test list) if the golden
// directory is missing, unreadable, or empty. A harness that silently
// reports "0 passed / 0 failed" when its inputs vanish looks green in CI —
// that is the single worst outcome for a migration gate, so it must fail
// loudly instead.
// ───────────────────────────────────────────────────────────────────────
if (!fs.existsSync(GOLDEN_DIR) || !fs.statSync(GOLDEN_DIR).isDirectory()) {
  throw new Error(
    `golden replay: fixture directory missing or not a directory: ${GOLDEN_DIR}`
  );
}

const fixtureFiles = fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'));

if (fixtureFiles.length === 0) {
  throw new Error(`golden replay: no *.json fixtures found in ${GOLDEN_DIR}`);
}

interface GoldenCase {
  name: string;
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  status: number;
  body: unknown;
}

const suites: { file: string; cases: GoldenCase[] }[] = fixtureFiles.map((file) => {
  const raw = fs.readFileSync(path.join(GOLDEN_DIR, file), 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`golden replay: ${file} is not valid JSON (${(err as Error).message})`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`golden replay: ${file} did not parse to an array of cases`);
  }
  return { file, cases: parsed as GoldenCase[] };
});

const totalCases = suites.reduce((sum, s) => sum + s.cases.length, 0);

// Cases deliberately replayed with NO Authorization header at all, matching
// the capture-golden.ts CaseDefs that never set `token`.
const KNOWN_UNAUTH_CASES = new Set<string>([
  'transfers-list-unauthenticated',
  'my-inquiries-unauthenticated',
  'me-unauthenticated',
  'notifications-unauthenticated',
  'health-check',
  'public-listings',
  'public-listings-filtered-city',
  'public-property-by-id',
  'public-property-by-id-not-found',
  'public-unit-by-id',
]);

// ───────────────────────────────────────────────────────────────────────
// Structural dual-id assertion. MUST run on the raw response body BEFORE
// normalizeBody() — normalizeBody collapses both `id` and `_id` to the same
// '<ID>' placeholder, which erases exactly the values this check depends on
// (see tests/helpers/normalize.ts's own warning).
//
// Global Constraint under test: every entity object the API returns must
// carry both `id` and `_id`, equal to each other. This matters most for the
// upcoming Prisma rewrite — Prisma's default primary key is `id`, while
// existing Mongo-shaped consumers expect `_id`; dropping either silently
// breaks that contract. The direction enforced is "id present -> _id must
// also be present and equal": today that's close to a no-op, because this
// Mongoose-backed API barely attaches an `id` virtual anywhere yet (see
// replay.meta.ts's ALLOW_ID_ONLY for the one current exception). It exists
// so that once the Prisma rewrite starts emitting `id` broadly, any
// populate-rewrite site that forgets to also expose `_id` fails here
// immediately instead of silently shipping a breaking response shape.
// ───────────────────────────────────────────────────────────────────────
function assertDualId(node: unknown, allowIdOnly: boolean, pointer = '$'): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertDualId(item, allowIdOnly, `${pointer}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'id')) {
      const hasUnderscoreId = Object.prototype.hasOwnProperty.call(obj, '_id');
      if (!hasUnderscoreId) {
        if (!allowIdOnly) {
          throw new Error(
            `assertDualId: object at ${pointer} has "id" (${JSON.stringify(obj.id)}) ` +
              `with no sibling "_id". Every entity object must carry both, equal to ` +
              `each other. If this is a deliberate DTO shape (like notification list ` +
              `items), add it to ALLOW_ID_ONLY in replay.meta.ts with a comment ` +
              `explaining why — do not silence this blindly.`
          );
        }
      } else if (String(obj.id) !== String(obj._id)) {
        throw new Error(
          `assertDualId: object at ${pointer} has mismatched id ` +
            `(${JSON.stringify(obj.id)}) vs _id (${JSON.stringify(obj._id)}).`
        );
      }
    }
    for (const [key, value] of Object.entries(obj)) {
      assertDualId(value, allowIdOnly, `${pointer}.${key}`);
    }
  }
}

/**
 * Login responses embed live, freshly-signed JWTs. They can never equal the
 * `<ACCESS_TOKEN>` / `<REFRESH_TOKEN>` placeholders capture-golden.ts's own
 * redactTokens() baked into auth.json, and per this task's design must
 * NEVER be compared by value at all — post-Supabase-cutover tokens are a
 * different shape entirely. Assert presence and type, then replace with the
 * same placeholder so the rest of the body can still be deep-compared.
 */
function redactTokens(body: any): any {
  if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
    if ('accessToken' in body.data) {
      expect(typeof body.data.accessToken).toBe('string');
      expect((body.data.accessToken as string).length).toBeGreaterThan(0);
      body.data.accessToken = '<ACCESS_TOKEN>';
    }
    if ('refreshToken' in body.data) {
      expect(typeof body.data.refreshToken).toBe('string');
      expect((body.data.refreshToken as string).length).toBeGreaterThan(0);
      body.data.refreshToken = '<REFRESH_TOKEN>';
    }
  }
  return body;
}

beforeAll(async () => {
  // Importing `app` does not connect to MongoDB (see docstring above) — the
  // suite must connect itself. MongoDB is expected already running and
  // seeded at 127.0.0.1:27017/rentdito (same seed the fixtures were
  // captured against). No server/.env is required or created.
  await mongoose.connect('mongodb://127.0.0.1:27017/rentdito');
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('golden fixture discovery', () => {
  it('discovers a plausible number of cases (fails loudly if fixtures vanish)', () => {
    expect(fixtureFiles.length).toBeGreaterThan(0);
    // 186 cases across 25 files at the time this suite was written. >150
    // leaves headroom for minor fixture changes while still catching "the
    // golden directory is empty/missing/truncated" outright.
    expect(totalCases).toBeGreaterThan(150);
  });

  it('has an auth/login identity mapped for every discovered case', () => {
    // Fixture records only carry { name, method, path, status, body } —
    // never which token produced them (see capture-golden.ts's
    // CaptureRecord vs CaseDef). Without this check, a typo'd or missing
    // entry in replay.meta.ts would silently replay a case unauthenticated
    // instead of failing loudly.
    const unmapped: string[] = [];
    for (const { file, cases } of suites) {
      for (const c of cases) {
        const known =
          CASE_AUTH[c.name] !== undefined ||
          AUTH_LOGIN_BODIES[c.name] !== undefined ||
          KNOWN_UNAUTH_CASES.has(c.name);
        if (!known) unmapped.push(`${file}:${c.name}`);
      }
    }
    expect(unmapped).toEqual([]);
  });
});

describe.each(suites.map(({ file, cases }) => [file, cases] as const))(
  'golden replay: %s',
  (_file, cases) => {
    it.each(cases)('$name', async (c: GoldenCase) => {
      let req = (request(app) as any)[c.method](c.path);

      const loginBody = AUTH_LOGIN_BODIES[c.name];
      if (loginBody) {
        req = req.send(loginBody);
      } else {
        const role = CASE_AUTH[c.name];
        if (role) {
          const token = await tokenForEmail(EMAILS[role]);
          req = req.set('Authorization', `Bearer ${token}`);
        }
        const query = CASE_QUERY[c.name];
        if (query) req = req.query(query);
      }

      const res = await req;

      expect(res.status).toBe(c.status);

      const actualBody = redactTokens(res.body);

      // Structural pass FIRST, on the raw (un-normalized) body.
      assertDualId(actualBody, ALLOW_ID_ONLY.has(c.name));

      // Then the value comparison, on normalized (ID/volatile-field
      // agnostic) copies of both sides.
      expect(normalizeBody(actualBody)).toEqual(normalizeBody(c.body));
    });
  }
);
