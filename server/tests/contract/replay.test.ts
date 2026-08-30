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
 * RESOLVED BUG (commits 7264f23 / cc03c83) — GET /api/tickets/:id used to
 * return 403 even to the ticket's own reporter. In
 * src/services/ticket.service.ts's canAccessTicket(), the ownership check
 * used to be:
 *
 *     const isOwner = ticket.reportedByUserId.toString() === userId;
 *
 * `ticket.reportedByUserId` is a populated user document by the time this
 * runs (getTicketById populates it first), so `.toString()` yielded
 * "[object Object]", never the raw userId — `isOwner` was always false.
 * Fixed in 7264f23 by reading `reportedByUserId._id` first, falling back to
 * the raw value (the same idiom already used for `propertyId`).
 * tests/golden/ticket.json's `ticket-by-id-owner-user1` case was
 * deliberately re-captured in cc03c83 and now expects 200, not 403 — this
 * is a genuine behaviour fix, not a loosened assertion.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/server';
import { normalizeBody } from '../helpers/normalize';
import { tokenForEmail } from '../helpers/auth';
import { EMAILS, CASE_AUTH, CASE_QUERY, AUTH_LOGIN_BODIES, ALLOW_ID_ONLY } from './replay.meta';
import { resolveAllCaseIds, ResolvedIdOverrides } from './replay-id-resolver';

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
 * Guard against `Profile.legacyMongoId` (internal migration bookkeeping --
 * maps a Postgres profile back to its pre-migration Mongo `_id` so
 * not-yet-ported services can keep resolving `req.user.id` against Mongo,
 * see `src/middleware/auth.ts`) ever crossing the response boundary, at ANY
 * depth -- top-level or embedded arbitrarily deep inside a nested
 * object/array. It must never reach a client: it exposes the Mongo id space
 * and is meaningless outside the migration.
 *
 * `auth.service.ts` excludes it deliberately (`serialize.ts`'s
 * `NEVER_SERIALIZE_PROFILE_FIELDS`), but task 18's port of
 * visit.service.ts found it leaking through embedded profile objects
 * (`remapFullVisit`'s `userId`/`assignedStaffId`) — caught only because a
 * throwaway live proof happened to print the response, not by this suite.
 * inquiry.service.ts's `remapFullPopulate()` had the identical latent leak,
 * undetected purely because no fixture there embeds a profile. Per-service
 * vigilance has now failed once (twice, counting inquiry), and there are
 * more ports still to come, so this checks EVERY one of the suite's cases
 * rather than relying on some future fixture happening to embed a profile
 * at the right call site.
 *
 * Runs on the raw response body BEFORE normalizeBody(), exactly like
 * assertDualId above (normalizeBody has no reason to touch this field, but
 * running pre-normalization keeps both structural guards following the same
 * pattern and immune to any future normalizer change that might otherwise
 * mask a leak).
 */
function assertNoLeakedLegacyMongoId(node: unknown, pointer = '$'): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertNoLeakedLegacyMongoId(item, `${pointer}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'legacyMongoId')) {
      throw new Error(
        `assertNoLeakedLegacyMongoId: object at ${pointer} carries "legacyMongoId" ` +
          `(${JSON.stringify(obj.legacyMongoId)}). This is internal migration bookkeeping ` +
          `and must NEVER reach a client response -- see serialize.ts's ` +
          `NEVER_SERIALIZE_PROFILE_FIELDS and utils/embeddedProfile.mapper.ts's ` +
          `shapeEmbeddedProfile(), which the offending service/remap function needs to use.`
      );
    }
    for (const [key, value] of Object.entries(obj)) {
      assertNoLeakedLegacyMongoId(value, `${pointer}.${key}`);
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

// Populated once, in beforeAll below -- see replay-id-resolver.ts's module
// docstring for why this must never be resolved per-case (186 cases must
// not mean 186 extra round trips to a hosted Postgres instance in
// ap-southeast-1).
let RESOLVED_IDS: ResolvedIdOverrides;

// A resolved id/value is always either a 24-hex-char Mongo ObjectId (still-
// Mongo-backed service) or a Postgres UUID (ported service) -- neither
// contains a literal '/', so this is safe to use unescaped in both a path
// segment and a query-string value.
const MONGO_OBJECT_ID_RE = /[0-9a-f]{24}/;

beforeAll(async () => {
  // Importing `app` does not connect to MongoDB (see docstring above) — the
  // suite must connect itself. MongoDB is expected already running and
  // seeded at 127.0.0.1:27017/rentdito (same seed the fixtures were
  // captured against). No server/.env is required or created.
  await mongoose.connect('mongodb://127.0.0.1:27017/rentdito');
});

beforeAll(async () => {
  // Requires the Mongo connection above (Mongo-backed natural-key lookups)
  // and reads server/.env for Postgres/Supabase connectivity (Postgres-
  // backed lookups, for whichever services are in PORTED_SERVICES). Runs
  // exactly once for the whole suite -- see replay-id-resolver.ts.
  RESOLVED_IDS = await resolveAllCaseIds();
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
      // Substitute a resolved id into the fixture's frozen `path`/`query` for
      // any case registered in replay-id-resolver.ts (see its module
      // docstring). Cases with no registry entry (including every
      // '*-not-found' sentinel-id case) replay their fixture's literal path
      // unchanged, exactly as before.
      let effectivePath = c.path;
      const resolvedPathId = RESOLVED_IDS.pathIds[c.name];
      if (resolvedPathId !== undefined) {
        if (!MONGO_OBJECT_ID_RE.test(effectivePath)) {
          throw new Error(
            `replay: case "${c.name}" is registered in replay-id-resolver.ts's CASE_PATH_IDS, but its ` +
              `fixture path "${effectivePath}" contains no Mongo-ObjectId-shaped substring to substitute.`
          );
        }
        effectivePath = effectivePath.replace(MONGO_OBJECT_ID_RE, resolvedPathId);
      }

      let req = (request(app) as any)[c.method](effectivePath);

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
        const queryIdOverride = RESOLVED_IDS.queryIds[c.name];
        if (query || queryIdOverride) {
          const effectiveQuery = { ...(query ?? {}) };
          if (queryIdOverride) effectiveQuery[queryIdOverride.field] = queryIdOverride.value;
          req = req.query(effectiveQuery);
        }
      }

      const res = await req;

      expect(res.status).toBe(c.status);

      const actualBody = redactTokens(res.body);

      // Structural pass FIRST, on the raw (un-normalized) body.
      assertDualId(actualBody, ALLOW_ID_ONLY.has(c.name));
      assertNoLeakedLegacyMongoId(actualBody);

      // Then the value comparison, on normalized (ID/volatile-field
      // agnostic) copies of both sides.
      expect(normalizeBody(actualBody)).toEqual(normalizeBody(c.body));
    });
  }
);
