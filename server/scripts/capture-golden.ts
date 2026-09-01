/**
 * Golden API fixture capture script.
 *
 * Captures real request/response pairs from the live MongoDB implementation so that the
 * upcoming Mongoose -> Prisma rewrite (in particular the 235 `.populate()` call sites) can be
 * proven equivalent afterwards. This is a one-time, non-repeatable capture: once the app moves
 * to Postgres this data cannot be regenerated from Mongo again.
 *
 * Usage:
 *   cd server && npx tsx scripts/capture-golden.ts
 *
 * Requirements:
 *   - MongoDB running at 127.0.0.1:27017/rentdito, already seeded via `npm run seed`.
 *   - Supabase Auth seeded with every user this script signs in as (Task 12's seed), all
 *     sharing the SEED_TEST_PASSWORD convention documented in tests/helpers/auth.ts.
 *   - server/.env present with SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set (src/config/
 *     supabase.ts throws at import time otherwise).
 */

import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';

// FORCED, unconditionally overwriting whatever is already in process.env — do NOT change this
// to a `process.env.NODE_ENV || 'test'` pattern. server/.env sets NODE_ENV=development for
// normal local dev, and errorHandler.ts (src/middleware/errorHandler.ts) reads
// `process.env.NODE_ENV` at request-handling time and attaches a live `stack` trace to every
// error-response body whenever it is 'development'. Those stack traces would get baked into
// committed error fixtures otherwise. A plain assignment here (as opposed to an env-aware
// fallback) always wins by the time any request is handled, regardless of whether
// src/config/supabase.ts's own dotenv.config() call (reached via the `import { app }` below,
// which loads server/.env and would otherwise set NODE_ENV=development) happens to run before
// or after this line — this matches what Jest itself defaults NODE_ENV to for the replay
// suite, for the exact same reason.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rentdito';

// IMPORTANT: named import. `server.ts` only calls connectDB()/app.listen() under
// `if (require.main === module)`, so the default export is `undefined` when imported (as here,
// via supertest). The named `{ app }` export is the real, side-effect-free Express app.
import { app } from '../src/server';

import { User } from '../src/models/User';
import { Property } from '../src/models/Property';
import { Unit } from '../src/models/Unit';
import { Contract } from '../src/models/Contract';
import { Tenancy } from '../src/models/Tenancy';
import { Bill } from '../src/models/Bill';
import { Payment } from '../src/models/Payment';
import { RentalApplication } from '../src/models/RentalApplication';
import { VisitRequest } from '../src/models/VisitRequest';
import { TransferRequest } from '../src/models/TransferRequest';
import { Inquiry } from '../src/models/Inquiry';
import { Conversation } from '../src/models/Conversation';
import { Ticket } from '../src/models/Ticket';
import { Inventory } from '../src/models/Inventory';
import { InventoryRecord } from '../src/models/InventoryRecord';
import { LandlordApplication } from '../src/models/LandlordApplication';
import { Document } from '../src/models/Document';
import { IncidentReport } from '../src/models/IncidentReport';
// `src/utils/jwt.ts` was deleted by the Supabase-auth cutover (Task 7) — Supabase issues
// tokens now, and the live auth middleware (src/middleware/auth.ts) verifies only
// Supabase-issued ES256 tokens via JWKS. A locally HS256-signed token (the old
// `signAccess()` this script used to mint directly) is rejected with 401 on every
// request. `tokenForEmail()` is the same real-Supabase-sign-in helper the contract
// replay suite already uses for this identical reason (tests/helpers/auth.ts) — it
// calls `supabaseAdmin.auth.signInWithPassword` directly (not through the rate-limited
// POST /api/auth/login route) and caches the token per email for the process lifetime.
import { tokenForEmail } from '../tests/helpers/auth';

// ─────────────────────────────────────────────────────────────
//  Capture plumbing
// ─────────────────────────────────────────────────────────────

interface CaseDef {
  name: string;
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  token?: string;
  query?: Record<string, string>;
}

interface CaptureRecord {
  name: string;
  method: string;
  path: string;
  status: number;
  body: unknown;
}

const OUT_DIR = path.resolve(__dirname, '../tests/golden');
let totalCaptured = 0;
const fileCounts: Record<string, number> = {};

// Every group's records are buffered here in memory, keyed by group name, instead of being
// written to disk as each `capture()` call finishes. This is deliberate: it lets `main()` run
// a corpus-wide safety check (see checkNotCatastrophic() below) across *every* captured
// response before a single byte of any fixture file is touched. Writing incrementally (the
// previous behaviour) meant a stale-auth run had already overwritten most of the 25 fixture
// files with 401s by the time anyone could notice — see task-18b-report.md, which documents
// ~10,000 lines lost this way. Buffering + a single gated flush at the end makes "detect
// catastrophe, then refuse to write anything" possible.
const pendingGroups = new Map<string, CaptureRecord[]>();

async function capture(group: string, cases: CaseDef[]): Promise<void> {
  const results: CaptureRecord[] = [];
  for (const c of cases) {
    let req = (request(app) as any)[c.method](c.path);
    if (c.token) req = req.set('Authorization', `Bearer ${c.token}`);
    if (c.query) req = req.query(c.query);
    const res = await req;
    results.push({ name: c.name, method: c.method, path: c.path, status: res.status, body: res.body });
  }
  pendingGroups.set(group, results);
  console.log(`captured ${results.length} cases -> ${group}.json (buffered, not yet written)`);
  totalCaptured += results.length;
  fileCounts[group] = results.length;
}

/**
 * Guard against exactly the failure mode task-18b-report.md documents: a stale
 * token-minting path (or any other systemic auth breakage) turning nearly every
 * authenticated case into a 401, then silently overwriting all 25 committed fixture
 * files with that garbage.
 *
 * Threshold rationale: counted directly against the corpus committed at the time this
 * check was written, exactly 6 of 186 cases (~3.2%) are legitimately expected to return
 * 401 — deliberate negative-auth cases like `login-wrong-password`,
 * `*-unauthenticated`, `login-unknown-email`. Of the 186 case defs in this script, 169
 * (~91%) attach a bearer token; a stale-auth failure mode flips essentially all of
 * those to 401 at once, since the middleware rejects every token identically. So the
 * two possible worlds are ~3% (healthy) vs. ~90%+ (catastrophic) — there is no
 * plausible legitimate scenario in between. 20% is set well above the healthy baseline
 * (>6x headroom for the corpus growing more negative-auth cases over time) and far
 * below the catastrophic floor, so it fires reliably on the real failure mode without
 * being sensitive to ordinary fixture evolution.
 */
function checkNotCatastrophic(): void {
  let total = 0;
  let unauthorized = 0;
  for (const records of pendingGroups.values()) {
    for (const r of records) {
      total += 1;
      if (r.status === 401) unauthorized += 1;
    }
  }
  const ratio = total === 0 ? 0 : unauthorized / total;
  const THRESHOLD = 0.2;
  if (ratio >= THRESHOLD) {
    console.error('\n=== REFUSING TO WRITE GOLDEN FIXTURES ===');
    console.error(
      `${unauthorized}/${total} captured responses (${(ratio * 100).toFixed(1)}%) came back ` +
        `401 Unauthorized — at or above the ${(THRESHOLD * 100).toFixed(0)}% catastrophe ` +
        `threshold (healthy baseline is ~3%).`
    );
    console.error(
      'This is the exact stale-auth failure mode documented in task-18b-report.md: every ' +
        'bearer token this script minted was rejected by the auth middleware, which would ' +
        'otherwise overwrite all committed golden fixtures with near-uniform 401 bodies.'
    );
    console.error(
      'Likely cause: tokenForEmail() could not sign in via Supabase (missing/incorrect ' +
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in server/.env, or Supabase Auth not seeded ' +
        'per Task 12 — see the WARNING lines logged above for which emails failed), or the ' +
        'live auth middleware no longer accepts tokens minted this way.'
    );
    console.error('No fixture file was written. Fix the root cause and re-run.\n');
    throw new Error(
      `capture-golden: ${unauthorized}/${total} responses were 401 (${(ratio * 100).toFixed(1)}%) — refusing to overwrite golden fixtures.`
    );
  }
}

/**
 * Path to the capture-instant metadata file consumed by
 * tests/contract/replay.test.ts to freeze `Date` during replay (see that
 * file's own comments for why). Deliberately a SIBLING of OUT_DIR
 * (tests/golden-meta.json), not a file inside it (tests/golden/*.json) —
 * replay.test.ts's fixture-discovery loop globs *.json directly under
 * tests/golden/ and fails loudly if that count looks wrong, so a metadata
 * file placed inside that directory would silently inflate the fixture
 * count instead of being excluded from it.
 */
const GOLDEN_META_PATH = path.resolve(OUT_DIR, '../golden-meta.json');

/** Only called once checkNotCatastrophic() has passed — writes every buffered group to disk. */
function flushToDisk(capturedAt: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [group, results] of pendingGroups.entries()) {
    fs.writeFileSync(path.join(OUT_DIR, `${group}.json`), JSON.stringify(results, null, 2));
  }
  console.log(`\nWrote ${pendingGroups.size} fixture files to ${OUT_DIR}`);

  // Re-recorded on every run so a re-capture's frozen replay instant never silently drifts
  // from the fixtures it actually reflects — see GOLDEN_META_PATH's doc comment and
  // replay.test.ts's use of this value. `capturedAt` is the real wall-clock instant taken
  // at the END of main() (after every capture request above has already completed), not
  // script start — deliberately erring slightly LATE relative to the true capture window
  // rather than early (see golden-meta.json's own `_comment` for why that direction is the
  // safe one).
  fs.writeFileSync(
    GOLDEN_META_PATH,
    JSON.stringify(
      {
        capturedAt,
        _comment: [
          'Wall-clock instant recorded by server/scripts/capture-golden.ts at the end of ',
          'its run (after every request above completed), consumed by ',
          'tests/contract/replay.test.ts to freeze Date during golden-fixture replay so ',
          "rolling-window report endpoints (checkout-forecast, inventory's monthly report, ",
          'etc.) reproduce the exact months this capture ran against. Regenerated ',
          'automatically on every re-capture — do not hand-edit.',
        ],
      },
      null,
      2
    ) + '\n'
  );
  console.log(`Wrote capture metadata to ${GOLDEN_META_PATH} (capturedAt: ${capturedAt})`);
}

async function loginRaw(email: string, password = 'password123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

/**
 * Real login responses embed live, signed JWTs (accessToken/refreshToken) carrying iat/exp
 * claims. Those can never reproduce byte-for-byte across captures, and pinning them is not the
 * point of this fixture anyway — the point is the response *shape*: that accessToken and
 * refreshToken are present, that user is returned, that status is 200. Replace the actual
 * values with stable placeholders before anything is written to disk, so re-running this
 * script can never regress a redacted fixture back into embedding a live, real Supabase
 * session token.
 */
function redactTokens<T>(body: T): T {
  const anyBody = body as any;
  if (anyBody?.data?.accessToken) anyBody.data.accessToken = '<ACCESS_TOKEN>';
  if (anyBody?.data?.refreshToken) anyBody.data.refreshToken = '<REFRESH_TOKEN>';
  return body;
}

// ─────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

  // ---- 1. Authenticate, capturing auth.json's own real login behaviour ----
  //
  // auth.routes.ts guards POST /api/auth/login with `authLimiter`: max 10 requests per 15
  // minutes per IP (src/middleware/rateLimiter.ts). This capture script needs tokens for 9
  // distinct seeded roles across ~150 other requests — 9 login POSTs alone leaves almost no
  // headroom, and the negative-path logins below (unverified/pending/wrong-password/unknown
  // email) would blow straight through the cap if every token were also obtained via HTTP.
  //
  // So: a SMALL, representative set of real POST /api/auth/login calls exercises and captures
  // login's own behaviour (success, wrong password, unknown email, unverified, pending) for
  // auth.json. Every *other* token this script needs is minted directly with `signAccess()` —
  // the exact same signing function authService.login() calls internally — keyed off the
  // user's real _id/role read from Mongo. This is not a mock token: it is byte-identical to
  // what a successful login would issue, it never touches any restricted source file (only
  // imports an existing exported function), and it keeps every domain capture below within the
  // rate limiter's budget.
  const emails: Record<string, string> = {
    superAdmin: 'admin@rentdito.com',
    landlord1: 'landlord1@rentdito.com',
    landlord2: 'landlord2@rentdito.com',
    staffManager: 'manager@rentdito.com',
    staffMaintenance: 'maintenance@rentdito.com',
    staffFinance: 'finance@rentdito.com',
    user1: 'user1@rentdito.com',
    user2: 'user2@rentdito.com',
    user3: 'user3@rentdito.com',
  };

  const authRecords: CaptureRecord[] = [];

  // Real HTTP login captures (7 requests total — well under the 10/15min cap).
  {
    const res = await loginRaw(emails.superAdmin);
    authRecords.push({ name: 'login-superAdmin', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    const res = await loginRaw(emails.landlord1);
    authRecords.push({ name: 'login-landlord1', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    const res = await loginRaw(emails.user1);
    authRecords.push({ name: 'login-user1', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    // Non-verified users must be rejected with 403 at login (never reach a token) — pins this
    // authorization behaviour for the Prisma port.
    const res = await loginRaw('user4@rentdito.com');
    authRecords.push({ name: 'login-user4-unverified-rejected', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    // Pending verification is likewise rejected at login.
    const res = await loginRaw('user6@rentdito.com');
    authRecords.push({ name: 'login-user6-pending-rejected', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    const res = await loginRaw(emails.user1, 'wrong-password');
    authRecords.push({ name: 'login-wrong-password', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    const res = await loginRaw('nobody@rentdito.com');
    authRecords.push({ name: 'login-unknown-email', method: 'post', path: '/api/auth/login', status: res.status, body: redactTokens(res.body) });
  }
  {
    // No-auth GET, recorded here as the health check for this file.
    const res = await request(app).get('/api/health');
    authRecords.push({ name: 'health-check', method: 'get', path: '/api/health', status: res.status, body: redactTokens(res.body) });
  }

  pendingGroups.set('auth', authRecords);
  console.log(`captured ${authRecords.length} cases -> auth.json (buffered, not yet written)`);
  totalCaptured += authRecords.length;
  fileCounts.auth = authRecords.length;

  // ---- 2. Fetch real IDs (and every user doc needed for token-minting) directly from MongoDB ----
  const userDocs = await User.find({ email: { $in: Object.values(emails) } }).lean();
  const userByEmail = new Map(userDocs.map((u: any) => [u.email, u]));

  const tokens: Record<string, string> = {};
  for (const [key, email] of Object.entries(emails)) {
    const doc: any = userByEmail.get(email);
    if (!doc) {
      console.warn(`WARNING: no Mongo user found for ${key} (${email}) — dependent captures will be skipped/denied.`);
      continue;
    }
    try {
      // Real Supabase sign-in, not a local JWT mint — see the import comment above.
      // Only needs the email (Supabase Auth is a separate store from the Mongo `doc`
      // just looked up); the `doc` check above still guards the Mongo-side id/role
      // lookups this script does elsewhere for the same email.
      tokens[key] = await tokenForEmail(email);
    } catch (err) {
      console.warn(`WARNING: could not mint a Supabase token for ${key} (${email}) — dependent captures will be skipped/denied. ${(err as Error).message}`);
    }
  }

  const landlord1Doc: any = userByEmail.get('landlord1@rentdito.com');
  const landlord2Doc: any = userByEmail.get('landlord2@rentdito.com');
  const user1Doc: any = userByEmail.get('user1@rentdito.com');
  const user2Doc: any = userByEmail.get('user2@rentdito.com');
  const user3Doc: any = userByEmail.get('user3@rentdito.com');

  if (!landlord1Doc || !landlord2Doc || !user1Doc || !user2Doc || !user3Doc) {
    throw new Error('Seed data missing expected users — run `npm run seed` first.');
  }

  const property0: any = await Property.findOne({ landlordId: landlord1Doc._id }).lean();
  const property1: any = await Property.findOne({ landlordId: landlord2Doc._id }).lean();
  if (!property0 || !property1) throw new Error('Seed data missing expected properties.');

  const units0 = await Unit.find({ propertyId: property0._id }).sort({ _id: 1 }).lean();
  const units1 = await Unit.find({ propertyId: property1._id }).sort({ _id: 1 }).lean();

  const tenancy1: any = await Tenancy.findOne({ userId: user1Doc._id }).lean(); // checked_in
  const tenancy2: any = await Tenancy.findOne({ userId: user2Doc._id }).lean(); // checked_out

  const contract1: any = await Contract.findOne({ userId: user1Doc._id, status: 'active' }).lean();
  const pastContract: any = await Contract.findOne({ userId: user2Doc._id, status: 'expired' }).lean();
  const expiringContract: any = await Contract.findOne({ userId: user3Doc._id }).lean(); // active, no tenancy

  const unpaidBill: any = await Bill.findOne({ tenancyId: tenancy1?._id, status: 'unpaid' }).lean();
  const partialBill: any = await Bill.findOne({ tenancyId: tenancy1?._id, status: 'partial' }).lean();
  const paidBill: any = await Bill.findOne({ tenancyId: tenancy1?._id, status: 'paid' }).lean();

  const payments = tenancy1 ? await Payment.find({ tenancyId: tenancy1._id }).lean() : [];
  const payment1: any = payments[0];

  const applications = await RentalApplication.find({}).lean();
  const appPendingUser4: any = applications.find((a: any) => a.status === 'pending');
  const appUnderReviewUser5: any = applications.find((a: any) => a.status === 'under_review');
  const appRejectedUser6: any = applications.find((a: any) => a.status === 'rejected');
  const appApprovedUser1: any = await RentalApplication.findOne({ userId: user1Doc._id, status: 'approved' }).lean();
  const appApprovedUser2Prop1: any = applications.find(
    (a: any) => a.userId.toString() === user2Doc._id.toString() && a.propertyId.toString() === property1._id.toString()
  );

  const visits = await VisitRequest.find({}).lean();
  const visitPending: any = visits.find((v: any) => v.status === 'pending'); // user1
  const visitApproved: any = visits.find((v: any) => v.status === 'approved'); // user2
  const visitScheduled: any = visits.find((v: any) => v.status === 'scheduled'); // user3

  const transfers = tenancy1 ? await TransferRequest.find({ tenancyId: tenancy1._id }).lean() : [];
  const transferPending: any = transfers.find((t: any) => t.status === 'pending');
  const transferCompleted: any = transfers.find((t: any) => t.status === 'completed');

  const inquiries = await Inquiry.find({}).lean();
  const inquiryOpen: any = inquiries.find((i: any) => i.status === 'open'); // user4, property0
  const inquiryInProgress: any = inquiries.find((i: any) => i.status === 'in_progress'); // user5, property1
  const inquiryClosed: any = inquiries.find((i: any) => i.status === 'closed'); // user6, property0

  const conversations = await Conversation.find({}).lean();
  const conversationForOpenInquiry: any = conversations.find(
    (c: any) => inquiryOpen && c.inquiryId.toString() === inquiryOpen._id.toString()
  );

  const tickets = await Ticket.find({}).lean();
  const ticketOpen: any = tickets.find((t: any) => t.status === 'open'); // tenancy1/user1
  const ticketAssigned: any = tickets.find((t: any) => t.status === 'assigned');
  const ticketResolved: any = tickets.find((t: any) => t.status === 'resolved'); // tenancy2/user2

  const inventoryItems = await Inventory.find({}).lean();
  const inventoryIssuedItem: any = inventoryItems.find((i: any) => i.status === 'issued');
  const inventoryRecords = tenancy1 ? await InventoryRecord.find({ tenancyId: tenancy1._id }).lean() : [];

  const landlordApplications = await LandlordApplication.find({}).lean();
  const landlordAppApprovedUser3: any = landlordApplications.find(
    (a: any) => a.userId.toString() === user3Doc._id.toString()
  );

  const documents = await Document.find({}).lean();
  const docContract: any = documents.find((d: any) => d.type === 'contract');

  const incidentReports = await IncidentReport.find({}).lean();
  const incidentInvestigating: any = incidentReports.find((i: any) => i.status === 'investigating');

  // ═══════════════════════════════════════════════════════════════════════
  //  DOMAIN CAPTURES — ordered by populate-call-site priority (highest first)
  // ═══════════════════════════════════════════════════════════════════════

  // ── transfer (41 populate call sites) ──────────────────────────────────
  await capture('transfer', [
    { name: 'my-transfers-user1', method: 'get', path: '/api/transfers/my', token: tokens.user1 },
    { name: 'transfers-list-landlord1', method: 'get', path: '/api/transfers', token: tokens.landlord1 },
    { name: 'transfers-list-super-admin', method: 'get', path: '/api/transfers', token: tokens.superAdmin },
    { name: 'transfers-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/transfers', token: tokens.staffManager },
    { name: 'transfers-list-filtered-by-status-completed', method: 'get', path: '/api/transfers', token: tokens.landlord1, query: { status: 'completed' } },
    { name: 'transfers-list-denied-for-user-role', method: 'get', path: '/api/transfers', token: tokens.user1 },
    { name: 'transfers-list-unauthenticated', method: 'get', path: '/api/transfers' },
  ]);

  // ── billing (30 populate call sites) ────────────────────────────────────
  await capture('billing', [
    { name: 'bills-list-landlord1', method: 'get', path: '/api/billing', token: tokens.landlord1 },
    { name: 'bills-list-user1-own-tenancy', method: 'get', path: '/api/billing', token: tokens.user1 },
    { name: 'bills-list-user2-no-bills-for-tenancy', method: 'get', path: '/api/billing', token: tokens.user2 },
    { name: 'bills-list-staff-finance-no-assigned-properties', method: 'get', path: '/api/billing', token: tokens.staffFinance },
    { name: 'bills-list-super-admin', method: 'get', path: '/api/billing', token: tokens.superAdmin },
    { name: 'bills-list-filtered-status-unpaid', method: 'get', path: '/api/billing', token: tokens.landlord1, query: { status: 'unpaid' } },
    ...(tenancy1 ? [
      { name: 'bills-by-tenancy-owner-user1', method: 'get' as const, path: `/api/billing/tenancy/${tenancy1._id}`, token: tokens.user1 },
      { name: 'bills-by-tenancy-landlord1', method: 'get' as const, path: `/api/billing/tenancy/${tenancy1._id}`, token: tokens.landlord1 },
      { name: 'bills-by-tenancy-denied-other-tenant', method: 'get' as const, path: `/api/billing/tenancy/${tenancy1._id}`, token: tokens.user2 },
    ] : []),
    ...(unpaidBill ? [
      { name: 'bill-by-id-landlord1-populated', method: 'get' as const, path: `/api/billing/${unpaidBill._id}`, token: tokens.landlord1 },
      { name: 'bill-by-id-owner-user1', method: 'get' as const, path: `/api/billing/${unpaidBill._id}`, token: tokens.user1 },
      { name: 'bill-by-id-denied-staff-finance', method: 'get' as const, path: `/api/billing/${unpaidBill._id}`, token: tokens.staffFinance },
      { name: 'bill-by-id-denied-other-tenant', method: 'get' as const, path: `/api/billing/${unpaidBill._id}`, token: tokens.user2 },
    ] : []),
    ...(paidBill ? [
      { name: 'bill-by-id-paid-with-payments', method: 'get' as const, path: `/api/billing/${paidBill._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'bill-by-id-not-found', method: 'get', path: '/api/billing/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── tenancy (28 populate call sites) ────────────────────────────────────
  await capture('tenancy', [
    { name: 'my-tenancies-user1', method: 'get', path: '/api/tenancies/my', token: tokens.user1 },
    { name: 'my-tenancies-user2-checked-out', method: 'get', path: '/api/tenancies/my', token: tokens.user2 },
    { name: 'tenancies-list-landlord1', method: 'get', path: '/api/tenancies', token: tokens.landlord1 },
    { name: 'tenancies-list-super-admin', method: 'get', path: '/api/tenancies', token: tokens.superAdmin },
    { name: 'tenancies-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/tenancies', token: tokens.staffManager },
    { name: 'tenancies-list-filtered-checked-in', method: 'get', path: '/api/tenancies', token: tokens.landlord1, query: { status: 'checked_in' } },
    ...(tenancy1 ? [
      { name: 'tenancy-by-id-owner-user1', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}`, token: tokens.user1 },
      { name: 'tenancy-by-id-landlord1', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}`, token: tokens.landlord1 },
      { name: 'tenancy-by-id-denied-other-tenant', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}`, token: tokens.user2 },
      { name: 'tenancy-checkout-review-owner', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}/checkout-review`, token: tokens.user1 },
      { name: 'tenancy-comments-owner', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}/comments`, token: tokens.user1 },
      { name: 'tenancy-comments-landlord1', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}/comments`, token: tokens.landlord1 },
      { name: 'tenancy-roommates-owner', method: 'get' as const, path: `/api/tenancies/${tenancy1._id}/roommates`, token: tokens.user1 },
    ] : []),
    ...(tenancy2 ? [
      { name: 'tenancy-by-id-checked-out', method: 'get' as const, path: `/api/tenancies/${tenancy2._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'tenancy-by-id-not-found', method: 'get', path: '/api/tenancies/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── contract (27 populate call sites) ───────────────────────────────────
  await capture('contract', [
    { name: 'my-contracts-user1', method: 'get', path: '/api/contracts/my', token: tokens.user1 },
    { name: 'my-contracts-user3-active-no-tenancy', method: 'get', path: '/api/contracts/my', token: tokens.user3 },
    { name: 'contracts-list-landlord1', method: 'get', path: '/api/contracts', token: tokens.landlord1 },
    { name: 'contracts-list-super-admin', method: 'get', path: '/api/contracts', token: tokens.superAdmin },
    { name: 'contracts-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/contracts', token: tokens.staffManager },
    { name: 'contracts-list-filtered-active', method: 'get', path: '/api/contracts', token: tokens.landlord1, query: { status: 'active' } },
    ...(contract1 ? [
      { name: 'contract-by-id-owner-user1', method: 'get' as const, path: `/api/contracts/${contract1._id}`, token: tokens.user1 },
      { name: 'contract-by-id-landlord1', method: 'get' as const, path: `/api/contracts/${contract1._id}`, token: tokens.landlord1 },
      { name: 'contract-by-id-denied-other-tenant', method: 'get' as const, path: `/api/contracts/${contract1._id}`, token: tokens.user2 },
      { name: 'contract-download-url-not-generated', method: 'get' as const, path: `/api/contracts/${contract1._id}/download`, token: tokens.user1 },
    ] : []),
    ...(pastContract ? [
      { name: 'contract-by-id-expired', method: 'get' as const, path: `/api/contracts/${pastContract._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'contract-by-id-not-found', method: 'get', path: '/api/contracts/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── visit (20 populate call sites) ──────────────────────────────────────
  await capture('visit', [
    { name: 'my-visits-user1-pending', method: 'get', path: '/api/visits/my', token: tokens.user1 },
    { name: 'my-visits-user3-scheduled', method: 'get', path: '/api/visits/my', token: tokens.user3 },
    { name: 'property-visits-landlord1', method: 'get', path: `/api/visits/property/${property0._id}`, token: tokens.landlord1 },
    { name: 'property-visits-super-admin', method: 'get', path: `/api/visits/property/${property0._id}`, token: tokens.superAdmin },
    { name: 'property-visits-staff-maintenance', method: 'get', path: `/api/visits/property/${property0._id}`, token: tokens.staffMaintenance },
    { name: 'property-visits-filtered-scheduled', method: 'get', path: `/api/visits/property/${property1._id}`, token: tokens.landlord2, query: { status: 'scheduled' } },
    { name: 'property-visits-denied-non-owner-landlord', method: 'get', path: `/api/visits/property/${property0._id}`, token: tokens.landlord2 },
    { name: 'property-visits-denied-user-role', method: 'get', path: `/api/visits/property/${property0._id}`, token: tokens.user1 },
  ]);

  // ── application (18 populate call sites) ────────────────────────────────
  await capture('application', [
    { name: 'my-applications-user1-approved', method: 'get', path: '/api/applications/my', token: tokens.user1 },
    { name: 'my-applications-user2', method: 'get', path: '/api/applications/my', token: tokens.user2 },
    { name: 'applications-list-landlord1', method: 'get', path: '/api/applications', token: tokens.landlord1 },
    { name: 'applications-list-super-admin', method: 'get', path: '/api/applications', token: tokens.superAdmin },
    { name: 'applications-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/applications', token: tokens.staffManager },
    { name: 'applications-list-filtered-pending', method: 'get', path: '/api/applications', token: tokens.landlord1, query: { status: 'pending' } },
    { name: 'applications-list-denied-user-role', method: 'get', path: '/api/applications', token: tokens.user1 },
    ...(appApprovedUser1 ? [
      { name: 'application-by-id-owner-user1', method: 'get' as const, path: `/api/applications/${appApprovedUser1._id}`, token: tokens.user1 },
      { name: 'application-by-id-landlord1', method: 'get' as const, path: `/api/applications/${appApprovedUser1._id}`, token: tokens.landlord1 },
      { name: 'application-by-id-denied-other-tenant', method: 'get' as const, path: `/api/applications/${appApprovedUser1._id}`, token: tokens.user2 },
    ] : []),
    ...(appPendingUser4 ? [
      { name: 'application-by-id-pending-landlord1', method: 'get' as const, path: `/api/applications/${appPendingUser4._id}`, token: tokens.landlord1 },
    ] : []),
    ...(appRejectedUser6 ? [
      { name: 'application-by-id-rejected-landlord1', method: 'get' as const, path: `/api/applications/${appRejectedUser6._id}`, token: tokens.landlord1 },
    ] : []),
    ...(appApprovedUser2Prop1 ? [
      { name: 'application-by-id-approved-property1-landlord2', method: 'get' as const, path: `/api/applications/${appApprovedUser2Prop1._id}`, token: tokens.landlord2 },
    ] : []),
    { name: 'application-by-id-not-found', method: 'get', path: '/api/applications/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── inventory (12 populate call sites) ──────────────────────────────────
  await capture('inventory', [
    { name: 'inventory-items-landlord1', method: 'get', path: '/api/inventory', token: tokens.landlord1 },
    { name: 'inventory-items-staff-maintenance-has-permission', method: 'get', path: '/api/inventory', token: tokens.staffMaintenance },
    { name: 'inventory-items-denied-staff-manager-no-permission', method: 'get', path: '/api/inventory', token: tokens.staffManager },
    { name: 'inventory-items-super-admin', method: 'get', path: '/api/inventory', token: tokens.superAdmin },
    { name: 'inventory-items-denied-user-role', method: 'get', path: '/api/inventory', token: tokens.user1 },
    { name: 'inventory-records-user1-own-tenancy', method: 'get', path: '/api/inventory/records', token: tokens.user1 },
    { name: 'inventory-records-landlord1', method: 'get', path: '/api/inventory/records', token: tokens.landlord1 },
    ...(tenancy1 ? [
      { name: 'inventory-records-by-tenancy-owner', method: 'get' as const, path: `/api/inventory/records/tenancy/${tenancy1._id}`, token: tokens.user1 },
      { name: 'inventory-records-by-tenancy-landlord1', method: 'get' as const, path: `/api/inventory/records/tenancy/${tenancy1._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'inventory-monthly-report-landlord1', method: 'get', path: '/api/inventory/reports/monthly', token: tokens.landlord1 },
    { name: 'inventory-monthly-report-denied-staff-manager', method: 'get', path: '/api/inventory/reports/monthly', token: tokens.staffManager },
  ]);

  // ── inquiry (10 populate call sites) ────────────────────────────────────
  await capture('inquiry', [
    { name: 'my-inquiries-user1-empty', method: 'get', path: '/api/inquiries/my', token: tokens.user1 },
    { name: 'my-inquiries-unauthenticated', method: 'get', path: '/api/inquiries/my' },
    { name: 'property-inquiries-landlord1', method: 'get', path: `/api/inquiries/property/${property0._id}`, token: tokens.landlord1 },
    { name: 'property-inquiries-super-admin', method: 'get', path: `/api/inquiries/property/${property0._id}`, token: tokens.superAdmin },
    { name: 'property-inquiries-filtered-closed', method: 'get', path: `/api/inquiries/property/${property0._id}`, token: tokens.landlord1, query: { status: 'closed' } },
    { name: 'property-inquiries-denied-non-owner-landlord', method: 'get', path: `/api/inquiries/property/${property0._id}`, token: tokens.landlord2 },
    ...(inquiryOpen ? [
      { name: 'inquiry-by-id-landlord1', method: 'get' as const, path: `/api/inquiries/${inquiryOpen._id}`, token: tokens.landlord1 },
    ] : []),
    ...(inquiryClosed ? [
      { name: 'inquiry-by-id-closed-landlord1', method: 'get' as const, path: `/api/inquiries/${inquiryClosed._id}`, token: tokens.landlord1 },
    ] : []),
    ...(inquiryInProgress ? [
      { name: 'inquiry-by-id-in-progress-landlord2', method: 'get' as const, path: `/api/inquiries/${inquiryInProgress._id}`, token: tokens.landlord2 },
    ] : []),
    { name: 'inquiry-by-id-not-found', method: 'get', path: '/api/inquiries/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── ticket (8 populate call sites) ──────────────────────────────────────
  await capture('ticket', [
    { name: 'my-tickets-user1', method: 'get', path: '/api/tickets/my', token: tokens.user1 },
    { name: 'my-tickets-user2', method: 'get', path: '/api/tickets/my', token: tokens.user2 },
    { name: 'tickets-list-landlord1', method: 'get', path: '/api/tickets', token: tokens.landlord1 },
    { name: 'tickets-list-staff-maintenance', method: 'get', path: '/api/tickets', token: tokens.staffMaintenance },
    { name: 'tickets-list-super-admin', method: 'get', path: '/api/tickets', token: tokens.superAdmin },
    { name: 'tickets-list-filtered-priority-urgent', method: 'get', path: '/api/tickets', token: tokens.landlord1, query: { priority: 'urgent' } },
    ...(ticketOpen ? [
      { name: 'ticket-by-id-owner-user1', method: 'get' as const, path: `/api/tickets/${ticketOpen._id}`, token: tokens.user1 },
      { name: 'ticket-by-id-landlord1', method: 'get' as const, path: `/api/tickets/${ticketOpen._id}`, token: tokens.landlord1 },
    ] : []),
    ...(ticketAssigned ? [
      { name: 'ticket-by-id-assigned', method: 'get' as const, path: `/api/tickets/${ticketAssigned._id}`, token: tokens.staffMaintenance },
    ] : []),
    ...(ticketResolved ? [
      { name: 'ticket-by-id-resolved', method: 'get' as const, path: `/api/tickets/${ticketResolved._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'ticket-by-id-not-found', method: 'get', path: '/api/tickets/000000000000000000000000', token: tokens.superAdmin },
  ]);

  // ── unit (5 populate call sites) ────────────────────────────────────────
  await capture('unit', [
    { name: 'units-list-landlord1', method: 'get', path: '/api/units', token: tokens.landlord1 },
    { name: 'units-list-super-admin', method: 'get', path: '/api/units', token: tokens.superAdmin },
    { name: 'units-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/units', token: tokens.staffManager },
    { name: 'units-list-denied-user-role', method: 'get', path: '/api/units', token: tokens.user1 },
    ...(units0[0] ? [
      { name: 'unit-by-id-landlord1', method: 'get' as const, path: `/api/units/${units0[0]._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'units-by-property-landlord1', method: 'get', path: `/api/units/property/${property0._id}/units`, token: tokens.landlord1 },
  ]);

  // ── security (4 populate call sites) ────────────────────────────────────
  await capture('security', [
    { name: 'incidents-list-landlord1', method: 'get', path: '/api/security/incidents', token: tokens.landlord1 },
    { name: 'incidents-list-staff-maintenance', method: 'get', path: '/api/security/incidents', token: tokens.staffMaintenance },
    { name: 'incidents-list-denied-user-role', method: 'get', path: '/api/security/incidents', token: tokens.user1 },
    { name: 'incidents-list-denied-super-admin-not-in-role-list', method: 'get', path: '/api/security/incidents', token: tokens.superAdmin },
    ...(incidentInvestigating ? [
      { name: 'incident-by-id-landlord1', method: 'get' as const, path: `/api/security/incidents/${incidentInvestigating._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'incident-by-id-not-found', method: 'get', path: '/api/security/incidents/000000000000000000000000', token: tokens.landlord1 },
    { name: 'emergency-contacts-property0-landlord1', method: 'get', path: `/api/security/contacts/${property0._id}`, token: tokens.landlord1 },
  ]);

  // ── property (4 populate call sites) ────────────────────────────────────
  await capture('property', [
    { name: 'properties-list-landlord1', method: 'get', path: '/api/properties', token: tokens.landlord1 },
    { name: 'properties-list-super-admin', method: 'get', path: '/api/properties', token: tokens.superAdmin },
    { name: 'properties-list-staff-manager-no-assigned-properties', method: 'get', path: '/api/properties', token: tokens.staffManager },
    { name: 'properties-list-denied-user-role', method: 'get', path: '/api/properties', token: tokens.user1 },
    { name: 'property-by-id-landlord1', method: 'get', path: `/api/properties/${property0._id}`, token: tokens.landlord1 },
    { name: 'property-by-id-denied-non-owner-landlord', method: 'get', path: `/api/properties/${property0._id}`, token: tokens.landlord2 },
  ]);

  // ── report (3 populate call sites) ──────────────────────────────────────
  await capture('report', [
    { name: 'occupancy-landlord1', method: 'get', path: '/api/reports/occupancy', token: tokens.landlord1 },
    { name: 'occupancy-denied-user-role', method: 'get', path: '/api/reports/occupancy', token: tokens.user1 },
    { name: 'checkout-forecast-landlord1', method: 'get', path: '/api/reports/checkout-forecast', token: tokens.landlord1 },
    { name: 'vacancy-forecast-landlord1', method: 'get', path: '/api/reports/vacancy-forecast', token: tokens.landlord1 },
    { name: 'reservation-forecast-landlord1', method: 'get', path: '/api/reports/reservation-forecast', token: tokens.landlord1 },
    { name: 'occupancy-staff-manager-no-assigned-properties', method: 'get', path: '/api/reports/occupancy', token: tokens.staffManager },
  ]);

  // ── public (3 populate call sites, no auth) ─────────────────────────────
  await capture('public', [
    { name: 'public-listings', method: 'get', path: '/api/public/listings' },
    { name: 'public-listings-filtered-city', method: 'get', path: '/api/public/listings', query: { city: property0.address?.city || '' } },
    { name: 'public-property-by-id', method: 'get', path: `/api/public/listings/${property0._id}` },
    { name: 'public-property-by-id-not-found', method: 'get', path: '/api/public/listings/000000000000000000000000' },
    ...(units0[0] ? [
      { name: 'public-unit-by-id', method: 'get' as const, path: `/api/public/listings/unit/${units0[0]._id}` },
    ] : []),
  ]);

  // ── message (3 populate call sites) ─────────────────────────────────────
  await capture('message', [
    ...(conversationForOpenInquiry ? [
      { name: 'conversation-messages-landlord1', method: 'get' as const, path: `/api/messages/conversation/${conversationForOpenInquiry._id}/messages`, token: tokens.landlord1 },
      { name: 'conversation-messages-denied-non-participant', method: 'get' as const, path: `/api/messages/conversation/${conversationForOpenInquiry._id}/messages`, token: tokens.landlord2 },
    ] : []),
    { name: 'conversation-messages-not-found', method: 'get', path: '/api/messages/conversation/000000000000000000000000/messages', token: tokens.landlord1 },
  ]);

  // ── landlord-application (3 populate call sites) ────────────────────────
  await capture('landlord-application', [
    { name: 'my-application-user3-approved', method: 'get', path: '/api/landlord-applications/me', token: tokens.user3 },
    { name: 'my-application-user1-none', method: 'get', path: '/api/landlord-applications/me', token: tokens.user1 },
    { name: 'my-application-denied-landlord-role', method: 'get', path: '/api/landlord-applications/me', token: tokens.landlord1 },
    { name: 'all-applications-super-admin', method: 'get', path: '/api/landlord-applications', token: tokens.superAdmin },
    { name: 'all-applications-denied-landlord-role', method: 'get', path: '/api/landlord-applications', token: tokens.landlord1 },
  ]);

  // ── document (2 populate call sites) ────────────────────────────────────
  await capture('document', [
    { name: 'documents-list-landlord1', method: 'get', path: '/api/documents', token: tokens.landlord1 },
    { name: 'documents-list-staff-maintenance', method: 'get', path: '/api/documents', token: tokens.staffMaintenance },
    { name: 'documents-list-denied-user-role', method: 'get', path: '/api/documents', token: tokens.user1 },
    ...(docContract ? [
      { name: 'document-by-id-landlord1', method: 'get' as const, path: `/api/documents/${docContract._id}`, token: tokens.landlord1 },
    ] : []),
    { name: 'document-by-id-not-found', method: 'get', path: '/api/documents/000000000000000000000000', token: tokens.landlord1 },
  ]);

  // ── utility (1 populate call site) ──────────────────────────────────────
  await capture('utility', [
    { name: 'consumption-landlord1', method: 'get', path: '/api/utilities/consumption', token: tokens.landlord1 },
    { name: 'consumption-denied-staff-no-utilities-permission', method: 'get', path: '/api/utilities/consumption', token: tokens.staffFinance },
    { name: 'highest-usage-landlord1', method: 'get', path: '/api/utilities/highest-usage', token: tokens.landlord1 },
    { name: 'overconsumption-landlord1', method: 'get', path: '/api/utilities/overconsumption', token: tokens.landlord1 },
    { name: 'expense-summary-landlord1', method: 'get', path: '/api/utilities/expense-summary', token: tokens.landlord1 },
    { name: 'available-units-landlord1', method: 'get', path: '/api/utilities/units', token: tokens.landlord1, query: { propertyId: String(property0._id) } },
  ]);

  // ── user (1 populate call site) ─────────────────────────────────────────
  await capture('user', [
    { name: 'me-user1-with-active-tenancy', method: 'get', path: '/api/users/me', token: tokens.user1 },
    { name: 'me-landlord1', method: 'get', path: '/api/users/me', token: tokens.landlord1 },
    { name: 'me-unauthenticated', method: 'get', path: '/api/users/me' },
  ]);

  // ── team (1 populate call site) ─────────────────────────────────────────
  await capture('team', [
    { name: 'staff-list-landlord1', method: 'get', path: '/api/team', token: tokens.landlord1 },
    { name: 'staff-list-denied-super-admin-not-in-role-list', method: 'get', path: '/api/team', token: tokens.superAdmin },
    { name: 'staff-list-denied-staff-role', method: 'get', path: '/api/team', token: tokens.staffManager },
  ]);

  // ── financial (1 populate call site) ────────────────────────────────────
  await capture('financial', [
    { name: 'summary-landlord1', method: 'get', path: '/api/financials/summary', token: tokens.landlord1 },
    { name: 'summary-staff-finance-has-permission', method: 'get', path: '/api/financials/summary', token: tokens.staffFinance },
    { name: 'summary-denied-staff-manager-no-permission', method: 'get', path: '/api/financials/summary', token: tokens.staffManager },
    { name: 'monthly-landlord1', method: 'get', path: '/api/financials/monthly', token: tokens.landlord1, query: { year: '2026' } },
    { name: 'by-property-landlord1', method: 'get', path: '/api/financials/by-property', token: tokens.landlord1 },
  ]);

  // ── admin (1 populate call site) ────────────────────────────────────────
  await capture('admin', [
    { name: 'platform-stats-super-admin', method: 'get', path: '/api/admin/stats', token: tokens.superAdmin },
    { name: 'platform-stats-denied-landlord-role', method: 'get', path: '/api/admin/stats', token: tokens.landlord1 },
    { name: 'users-list-super-admin', method: 'get', path: '/api/admin/users', token: tokens.superAdmin },
    { name: 'activity-log-super-admin', method: 'get', path: '/api/admin/activity', token: tokens.superAdmin },
    { name: 'pending-verifications-super-admin', method: 'get', path: '/api/admin/verifications', token: tokens.superAdmin },
    { name: 'all-verifications-super-admin', method: 'get', path: '/api/admin/verifications/all', token: tokens.superAdmin },
  ]);

  // ── notification (not in priority list, but a real GET domain) ─────────
  await capture('notification', [
    { name: 'notifications-landlord1-has-two', method: 'get', path: '/api/notifications', token: tokens.landlord1 },
    { name: 'notifications-user1-empty', method: 'get', path: '/api/notifications', token: tokens.user1 },
    { name: 'unread-count-landlord1', method: 'get', path: '/api/notifications/unread-count', token: tokens.landlord1 },
    { name: 'notifications-unauthenticated', method: 'get', path: '/api/notifications' },
  ]);

  // ── payment (not in priority list, but a real GET domain; shares billing.service) ─
  await capture('payment', [
    { name: 'payments-list-landlord1', method: 'get', path: '/api/payments', token: tokens.landlord1 },
    { name: 'payments-list-user1-own-tenancy', method: 'get', path: '/api/payments', token: tokens.user1 },
    ...(tenancy1 ? [
      { name: 'payments-by-tenancy-owner', method: 'get' as const, path: `/api/payments/tenancy/${tenancy1._id}`, token: tokens.user1 },
      { name: 'payments-by-tenancy-landlord1', method: 'get' as const, path: `/api/payments/tenancy/${tenancy1._id}`, token: tokens.landlord1 },
      { name: 'payments-by-tenancy-denied-other-tenant', method: 'get' as const, path: `/api/payments/tenancy/${tenancy1._id}`, token: tokens.user2 },
    ] : []),
  ]);

  // ---- Wrap up ----
  console.log('\n=== Capture summary ===');
  for (const [group, count] of Object.entries(fileCounts)) {
    console.log(`  ${group.padEnd(24)} ${count}`);
  }
  console.log(`  TOTAL${''.padEnd(20)} ${totalCaptured}`);

  // Gate: refuse to touch any fixture file if the run looks like the stale-auth failure
  // mode (see checkNotCatastrophic()'s doc comment). Every group above is still only
  // buffered in memory at this point — nothing has been written to tests/golden/ yet.
  checkNotCatastrophic();
  // Taken here (after every capture request has completed, immediately before the only
  // gated flush) rather than at script start — see flushToDisk()'s doc comment.
  const capturedAt = new Date().toISOString();
  flushToDisk(capturedAt);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Golden capture failed:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
