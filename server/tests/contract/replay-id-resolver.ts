/**
 * Natural-key id resolution for golden-fixture replay detail routes.
 *
 * THE PROBLEM (Phase 4 defect #2 — see task-4b-report.md):
 * tests/golden/*.json's detail-route fixtures (`/api/properties/<id>`,
 * `/api/billing/<id>`, `/api/tickets/<id>`, ...) were captured against the
 * live MongoDB app, so every `<id>` baked into a fixture's `path` (and the
 * handful embedded in replay.meta.ts's CASE_QUERY) is a real Mongo
 * ObjectId. Only the `profiles` table carries a `legacyMongoId` bridge
 * (server/src/seeds/seed-postgres.ts) — every other Postgres table gets a
 * fresh `randomUUID()` at seed time with no relationship to the old Mongo
 * id. The moment a service is ported to Prisma, its detail-route fixture
 * starts requesting a Mongo id that simply does not exist in Postgres, and
 * 404s — not because the port is wrong, but because the harness is asking
 * for the wrong id.
 *
 * THE FIX — chosen over adding `legacy_mongo_id` to all 27 tables (that
 * would push transitional migration state into production query paths,
 * where it would later have to be hunted down and removed): keep the
 * complexity here, in the test harness, which already hand-maps each case
 * to an auth identity (replay.meta.ts's CASE_AUTH) — resolving entity ids
 * is the natural extension of that same idea.
 *
 * HOW IT WORKS:
 *   1. PORTED_SERVICES (below) names which backend services currently read
 *      Postgres. Today: only 'property' (Task 10).
 *   2. CASE_PATH_IDS / CASE_QUERY_IDS map each fixture case that embeds an
 *      entity id to a STABLE NATURAL KEY plus the SERVICE that owns the
 *      route (not necessarily the service that "owns" the entity — see
 *      below).
 *   3. At suite start (once, in replay.test.ts's beforeAll — never per
 *      case), resolveAllCaseIds() looks up every registered natural key
 *      against Postgres (if its service is ported) or MongoDB (if not),
 *      and returns the resolved ids so replay.test.ts can substitute them
 *      into the fixture's otherwise-frozen `path`/`query` before firing
 *      the request. Every resolver is memoized, so re-resolving the same
 *      key twice (e.g. property0's id is needed by 6+ different cases
 *      across 6 different fixture files) costs one round trip, not six —
 *      this matters because Postgres here is a real hosted instance in
 *      ap-southeast-1 (Singapore), not a local container.
 *   4. Every resolver throws a descriptive error (naming the entity kind,
 *      the natural key, and the store searched) if it finds no match,
 *      rather than silently returning `undefined` — a silent miss would
 *      produce a 404 fixture mismatch that reads exactly like a port bug.
 *
 * WHY "SERVICE THAT OWNS THE ROUTE", NOT "SERVICE THAT OWNS THE ENTITY":
 * A property id can appear in a path served by a service OTHER than
 * property.service.ts — e.g. `/api/inquiries/property/<id>` is handled by
 * inquiry.service.ts, which (until it is itself ported) still queries
 * MongoDB's Inquiry.propertyId, a Mongo ObjectId referencing the *Mongo*
 * Property collection, REGARDLESS of whether property.service.ts itself
 * has already moved to Postgres. So the store to resolve against is
 * determined by whichever service is actually about to receive the
 * request, not by which store the underlying entity "really" lives in.
 * This is why every CASE_PATH_IDS / CASE_QUERY_IDS entry carries its own
 * `service` field even when several entries share the same `entity`.
 *
 * NATURAL KEYS CHOSEN (mirrors task-4b-report.md's audit table):
 *   - property   -> `name` (unique across both seeded properties in both stores)
 *   - unit       -> `unitIdentifier` (unique across BOTH properties' units combined)
 *   - profile/user -> `email` (already the seed's own stable identity column)
 *   - tenancy    -> owning tenant's email (each seeded user has at most one
 *                   tenancy in this fixture, so tenant email alone is unique)
 *   - contract   -> (tenant email, status) — user1 has one 'active' contract,
 *                   user2 one 'expired' contract
 *   - bill       -> (tenant email, status) resolved via that tenant's tenancy
 *                   (tenancy1/user1 has exactly one bill per status)
 *   - rental application -> (applicant email, status[, property name]) — the
 *                   property qualifier is only needed for user2, who has two
 *                   'approved' applications (one per property)
 *   - inquiry    -> requester email (each of the 3 seeded inquiries has a
 *                   distinct requester)
 *   - conversation -> its parent inquiry's requester email (Conversation.inquiryId
 *                   is `@unique` in the Prisma schema / 1:1 in Mongo, so the
 *                   inquiry's natural key resolves the conversation uniquely)
 *   - ticket     -> (reporter email, status) — tickets 1-3 share a reporter
 *                   (user1) but have distinct statuses; tickets 4-5 share
 *                   user2 with distinct statuses
 *   - incident report -> `status` alone (both seeded incidents are reported
 *                   by the same staff member, so status is the only
 *                   discriminator — mirrors capture-golden.ts's own
 *                   `.find(i => i.status === 'investigating')`)
 *   - document   -> `type` alone (2 seeded documents, 2 distinct types)
 *
 * Cases resolving a Mongo ObjectId sentinel used to mean "does not exist"
 * (`000000000000000000000000` in *-not-found cases) are DELIBERATELY absent
 * from both registries below — that id is supposed to not resolve to
 * anything, in whichever store currently serves the route, so leaving the
 * fixture's literal sentinel untouched is correct today. (A future port of
 * a service that has a not-found fixture will need its own follow-up, since
 * a Mongo-ObjectId-shaped sentinel is not a valid Postgres UUID and would
 * flip a 404 into a 400 — the same edge case task-10-report.md already
 * flagged for `property`, which has no not-found fixture and so never hit
 * it. Out of scope here; flagging for whoever ports a service that does.)
 */

import prisma from '../../src/config/prisma';
import { User } from '../../src/models/User';
import { Property } from '../../src/models/Property';
import { Unit } from '../../src/models/Unit';
import { Tenancy } from '../../src/models/Tenancy';
import { Contract } from '../../src/models/Contract';
import { Bill } from '../../src/models/Bill';
import { RentalApplication } from '../../src/models/RentalApplication';
import { Inquiry } from '../../src/models/Inquiry';
import { Conversation } from '../../src/models/Conversation';
import { Ticket } from '../../src/models/Ticket';
import { IncidentReport } from '../../src/models/IncidentReport';
import { Document as MongoDocument } from '../../src/models/Document';
import { EMAILS } from './replay.meta';

// ═══════════════════════════════════════════════════════════════════════
// 1. PORTED_SERVICES
//
// Add ONE line here — the service's `src/services/<name>.service.ts` /
// `tests/golden/<name>.json` identity — the moment that service's reads
// move from Mongoose to Prisma. That is the ONLY edit most of the
// remaining 19 ports need to make in this file: everything below resolves
// generically off this set. Do NOT remove an entry once added (there is
// no going back to Mongo for a ported service), and do NOT add a service
// here before its port actually lands — every case whose `service` maps to
// an entry here is asserted to be resolvable in POSTGRES from this moment
// on, so adding a name early makes every one of its detail-route fixtures
// fail loudly (which is the point: it would mean the port isn't done yet).
//
// Service-name keys correspond 1:1 with tests/golden/<name>.json / a
// src/controllers/<name>.controller.ts importing src/services/<name>.service.ts,
// with two known exceptions carried over from the existing app structure
// (not introduced by this harness): `payment.json`'s cases are served by
// `billing.service.ts` (payment.controller.ts imports billingService), and
// `public.json` is its own service (public.service.ts) that reads Property/
// Unit directly and is NOT the same as `property`/`unit` — porting
// property.service.ts does NOT imply public.service.ts is also ported.
// ═══════════════════════════════════════════════════════════════════════
export const PORTED_SERVICES: ReadonlySet<string> = new Set<string>([
  'property', // Task 10 (server/src/services/property.service.ts)
  'user', // Task 11 (server/src/services/user.service.ts)
  'team', // Task 12 (server/src/services/team.service.ts)
  'unit', // Task 13 (server/src/services/unit.service.ts)
  'public', // Task 14 (server/src/services/public.service.ts)
  'landlord-application', // Task 15 (server/src/services/landlord-application.service.ts)
  'inquiry', // Task 16 (server/src/services/inquiry.service.ts)
  'message', // Task 17 (server/src/services/message.service.ts)
  'visit', // Task 18 (server/src/services/visit.service.ts)
  'application', // Task 19 (server/src/services/application.service.ts)
  'contract', // Task 20 (server/src/services/contract.service.ts)
  'tenancy', // Task 21 (server/src/services/tenancy.service.ts)
  'billing', // Task 22 (server/src/services/billing.service.ts) -- also serves payment.json, see the module docstring's "known exceptions" note
  'transfer', // Task 24 (server/src/services/transfer.service.ts)
  'ticket', // Task 25 (server/src/services/ticket.service.ts)
  'inventory', // Task 26 (server/src/services/inventory.service.ts)
  'utility', // Task 27 (server/src/services/utility.service.ts)
  'report', // Task 28 (server/src/services/report.service.ts)
  'financial', // Task 29 (server/src/services/financial.service.ts)
  'admin', // Task 29 (server/src/services/admin.service.ts)
  'document', // Task 29 (server/src/services/document.service.ts)
  'security', // Task 29 (server/src/services/security.service.ts)
  // ...and so on, one line per port, in whatever order the ports land.
]);

type Store = 'postgres' | 'mongo';

function storeForService(service: string): Store {
  return PORTED_SERVICES.has(service) ? 'postgres' : 'mongo';
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Memoization — resolve each distinct (store, ...key) combination once
//    per process, no matter how many cases share it.
// ═══════════════════════════════════════════════════════════════════════
function memoAsync<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R> {
  const cache = new Map<string, R>();
  return async (...args: Args): Promise<R> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const value = await fn(...args);
    cache.set(key, value);
    return value;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Per-entity resolvers. Each throws a descriptive error (naming the
//    entity, the natural key searched, and the store) rather than
//    returning undefined -- see module docstring point 4.
// ═══════════════════════════════════════════════════════════════════════

const resolveUserId = memoAsync(async (store: Store, email: string): Promise<string> => {
  if (store === 'postgres') {
    const row = await prisma.profile.findFirst({ where: { email } });
    if (!row) {
      throw new Error(`id-resolver: no Postgres profile found for email="${email}" (store=postgres)`);
    }
    return row.id;
  }
  const doc = await User.findOne({ email }).lean();
  if (!doc) {
    throw new Error(`id-resolver: no Mongo user found for email="${email}" (store=mongo)`);
  }
  return String((doc as any)._id);
});

export const resolvePropertyId = memoAsync(async (store: Store, name: string): Promise<string> => {
  if (store === 'postgres') {
    const row = await prisma.property.findFirst({ where: { name } });
    if (!row) {
      throw new Error(`id-resolver: no Postgres property found with name="${name}" (store=postgres)`);
    }
    return row.id;
  }
  const doc = await Property.findOne({ name }).lean();
  if (!doc) {
    throw new Error(`id-resolver: no Mongo property found with name="${name}" (store=mongo)`);
  }
  return String((doc as any)._id);
});

export const resolveUnitId = memoAsync(async (store: Store, unitIdentifier: string): Promise<string> => {
  if (store === 'postgres') {
    const row = await prisma.unit.findFirst({ where: { unitIdentifier } });
    if (!row) {
      throw new Error(`id-resolver: no Postgres unit found with unitIdentifier="${unitIdentifier}" (store=postgres)`);
    }
    return row.id;
  }
  const doc = await Unit.findOne({ unitIdentifier }).lean();
  if (!doc) {
    throw new Error(`id-resolver: no Mongo unit found with unitIdentifier="${unitIdentifier}" (store=mongo)`);
  }
  return String((doc as any)._id);
});

export const resolveTenancyId = memoAsync(async (store: Store, tenantEmail: string): Promise<string> => {
  const userId = await resolveUserId(store, tenantEmail);
  if (store === 'postgres') {
    const row = await prisma.tenancy.findFirst({ where: { userId } });
    if (!row) {
      throw new Error(
        `id-resolver: no Postgres tenancy found for userId="${userId}" (tenantEmail="${tenantEmail}", store=postgres)`
      );
    }
    return row.id;
  }
  const doc = await Tenancy.findOne({ userId }).lean();
  if (!doc) {
    throw new Error(
      `id-resolver: no Mongo tenancy found for userId="${userId}" (tenantEmail="${tenantEmail}", store=mongo)`
    );
  }
  return String((doc as any)._id);
});

export const resolveContractId = memoAsync(
  async (store: Store, tenantEmail: string, status: string): Promise<string> => {
    const userId = await resolveUserId(store, tenantEmail);
    if (store === 'postgres') {
      const row = await prisma.contract.findFirst({ where: { userId, status: status as any } });
      if (!row) {
        throw new Error(
          `id-resolver: no Postgres contract found for userId="${userId}" status="${status}" ` +
            `(tenantEmail="${tenantEmail}", store=postgres)`
        );
      }
      return row.id;
    }
    const doc = await Contract.findOne({ userId, status }).lean();
    if (!doc) {
      throw new Error(
        `id-resolver: no Mongo contract found for userId="${userId}" status="${status}" ` +
          `(tenantEmail="${tenantEmail}", store=mongo)`
      );
    }
    return String((doc as any)._id);
  }
);

export const resolveBillId = memoAsync(async (store: Store, tenantEmail: string, status: string): Promise<string> => {
  const tenancyId = await resolveTenancyId(store, tenantEmail);
  if (store === 'postgres') {
    const row = await prisma.bill.findFirst({ where: { tenancyId, status: status as any } });
    if (!row) {
      throw new Error(
        `id-resolver: no Postgres bill found for tenancyId="${tenancyId}" status="${status}" ` +
          `(tenantEmail="${tenantEmail}", store=postgres)`
      );
    }
    return row.id;
  }
  const doc = await Bill.findOne({ tenancyId, status }).lean();
  if (!doc) {
    throw new Error(
      `id-resolver: no Mongo bill found for tenancyId="${tenancyId}" status="${status}" ` +
        `(tenantEmail="${tenantEmail}", store=mongo)`
    );
  }
  return String((doc as any)._id);
});

export const resolveApplicationId = memoAsync(
  async (store: Store, applicantEmail: string, status: string, propertyName?: string): Promise<string> => {
    const userId = await resolveUserId(store, applicantEmail);
    const propertyId = propertyName ? await resolvePropertyId(store, propertyName) : undefined;
    const qualifier = propertyName ? ` propertyName="${propertyName}"` : '';
    if (store === 'postgres') {
      const row = await prisma.rentalApplication.findFirst({
        where: { userId, status: status as any, ...(propertyId ? { propertyId } : {}) },
      });
      if (!row) {
        throw new Error(
          `id-resolver: no Postgres rental application found for userId="${userId}" status="${status}"${qualifier} ` +
            `(applicantEmail="${applicantEmail}", store=postgres)`
        );
      }
      return row.id;
    }
    const query: Record<string, unknown> = { userId, status };
    if (propertyId) query.propertyId = propertyId;
    const doc = await RentalApplication.findOne(query).lean();
    if (!doc) {
      throw new Error(
        `id-resolver: no Mongo rental application found for userId="${userId}" status="${status}"${qualifier} ` +
          `(applicantEmail="${applicantEmail}", store=mongo)`
      );
    }
    return String((doc as any)._id);
  }
);

export const resolveInquiryId = memoAsync(async (store: Store, requesterEmail: string): Promise<string> => {
  const userId = await resolveUserId(store, requesterEmail);
  if (store === 'postgres') {
    const row = await prisma.inquiry.findFirst({ where: { userId } });
    if (!row) {
      throw new Error(
        `id-resolver: no Postgres inquiry found for userId="${userId}" (requesterEmail="${requesterEmail}", store=postgres)`
      );
    }
    return row.id;
  }
  const doc = await Inquiry.findOne({ userId }).lean();
  if (!doc) {
    throw new Error(
      `id-resolver: no Mongo inquiry found for userId="${userId}" (requesterEmail="${requesterEmail}", store=mongo)`
    );
  }
  return String((doc as any)._id);
});

export const resolveConversationId = memoAsync(
  async (store: Store, inquiryRequesterEmail: string): Promise<string> => {
    const inquiryId = await resolveInquiryId(store, inquiryRequesterEmail);
    if (store === 'postgres') {
      const row = await prisma.conversation.findFirst({ where: { inquiryId } });
      if (!row) {
        throw new Error(
          `id-resolver: no Postgres conversation found for inquiryId="${inquiryId}" ` +
            `(inquiryRequesterEmail="${inquiryRequesterEmail}", store=postgres)`
        );
      }
      return row.id;
    }
    const doc = await Conversation.findOne({ inquiryId }).lean();
    if (!doc) {
      throw new Error(
        `id-resolver: no Mongo conversation found for inquiryId="${inquiryId}" ` +
          `(inquiryRequesterEmail="${inquiryRequesterEmail}", store=mongo)`
      );
    }
    return String((doc as any)._id);
  }
);

export const resolveTicketId = memoAsync(
  async (store: Store, reporterEmail: string, status: string): Promise<string> => {
    const userId = await resolveUserId(store, reporterEmail);
    if (store === 'postgres') {
      const row = await prisma.ticket.findFirst({ where: { reportedByUserId: userId, status: status as any } });
      if (!row) {
        throw new Error(
          `id-resolver: no Postgres ticket found for reportedByUserId="${userId}" status="${status}" ` +
            `(reporterEmail="${reporterEmail}", store=postgres)`
        );
      }
      return row.id;
    }
    const doc = await Ticket.findOne({ reportedByUserId: userId, status }).lean();
    if (!doc) {
      throw new Error(
        `id-resolver: no Mongo ticket found for reportedByUserId="${userId}" status="${status}" ` +
          `(reporterEmail="${reporterEmail}", store=mongo)`
      );
    }
    return String((doc as any)._id);
  }
);

export const resolveIncidentId = memoAsync(async (store: Store, status: string): Promise<string> => {
  if (store === 'postgres') {
    const row = await prisma.incidentReport.findFirst({ where: { status: status as any } });
    if (!row) {
      throw new Error(`id-resolver: no Postgres incident report found with status="${status}" (store=postgres)`);
    }
    return row.id;
  }
  const doc = await IncidentReport.findOne({ status }).lean();
  if (!doc) {
    throw new Error(`id-resolver: no Mongo incident report found with status="${status}" (store=mongo)`);
  }
  return String((doc as any)._id);
});

export const resolveDocumentId = memoAsync(async (store: Store, docType: string): Promise<string> => {
  if (store === 'postgres') {
    const row = await prisma.document.findFirst({ where: { type: docType as any } });
    if (!row) {
      throw new Error(`id-resolver: no Postgres document found with type="${docType}" (store=postgres)`);
    }
    return row.id;
  }
  const doc = await MongoDocument.findOne({ type: docType }).lean();
  if (!doc) {
    throw new Error(`id-resolver: no Mongo document found with type="${docType}" (store=mongo)`);
  }
  return String((doc as any)._id);
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Case registry -- which fixture cases embed an id, what natural key
//    resolves it, and which service's port status decides the store (see
//    module docstring: "service that owns the ROUTE", not the entity).
// ═══════════════════════════════════════════════════════════════════════

type EntitySpec =
  | { kind: 'property'; name: string }
  | { kind: 'unit'; unitIdentifier: string }
  | { kind: 'tenancy'; tenantEmail: string }
  | { kind: 'contract'; tenantEmail: string; status: string }
  | { kind: 'bill'; tenantEmail: string; status: string }
  | { kind: 'application'; applicantEmail: string; status: string; propertyName?: string }
  | { kind: 'inquiry'; requesterEmail: string }
  | { kind: 'conversation'; inquiryRequesterEmail: string }
  | { kind: 'ticket'; reporterEmail: string; status: string }
  | { kind: 'incident'; status: string }
  | { kind: 'document'; docType: string };

interface CaseIdRef {
  service: string;
  entity: EntitySpec;
}

async function resolveEntityId(store: Store, entity: EntitySpec): Promise<string> {
  switch (entity.kind) {
    case 'property':
      return resolvePropertyId(store, entity.name);
    case 'unit':
      return resolveUnitId(store, entity.unitIdentifier);
    case 'tenancy':
      return resolveTenancyId(store, entity.tenantEmail);
    case 'contract':
      return resolveContractId(store, entity.tenantEmail, entity.status);
    case 'bill':
      return resolveBillId(store, entity.tenantEmail, entity.status);
    case 'application':
      return resolveApplicationId(store, entity.applicantEmail, entity.status, entity.propertyName);
    case 'inquiry':
      return resolveInquiryId(store, entity.requesterEmail);
    case 'conversation':
      return resolveConversationId(store, entity.inquiryRequesterEmail);
    case 'ticket':
      return resolveTicketId(store, entity.reporterEmail, entity.status);
    case 'incident':
      return resolveIncidentId(store, entity.status);
    case 'document':
      return resolveDocumentId(store, entity.docType);
  }
}

// Property names, transcribed from server/src/seeds/seed-postgres.ts /
// seed.ts (both seeds use identical `name` values for the two properties).
const WHITE_DORM = 'White Dorm Property'; // property0, landlord1
const UYTENGSO = 'Uytengso Boardings House'; // property1, landlord2
// "first unit of property0", matching capture-golden.ts's
// `units0[0]` (Unit.find({propertyId: property0._id}).sort({_id: 1})[0]).
const ROOM_2 = 'Room 2';

// user4/5/6 are not in replay.meta.ts's EMAILS map (they only ever appear as
// AUTH_LOGIN_BODIES negative-path logins there) -- transcribed literally here,
// matching that file's own literal-string convention for the same accounts.
const USER4_EMAIL = 'user4@rentdito.com';
const USER5_EMAIL = 'user5@rentdito.com';
const USER6_EMAIL = 'user6@rentdito.com';

export const CASE_PATH_IDS: Record<string, CaseIdRef> = {
  // ---- property.json (service: 'property') ----
  'property-by-id-landlord1': { service: 'property', entity: { kind: 'property', name: WHITE_DORM } },
  'property-by-id-denied-non-owner-landlord': { service: 'property', entity: { kind: 'property', name: WHITE_DORM } },

  // ---- public.json (service: 'public' -- NOT the same as 'property'/'unit'; see docstring) ----
  'public-property-by-id': { service: 'public', entity: { kind: 'property', name: WHITE_DORM } },
  'public-unit-by-id': { service: 'public', entity: { kind: 'unit', unitIdentifier: ROOM_2 } },
  // 'public-property-by-id-not-found': sentinel id, deliberately left unresolved (see docstring).

  // ---- unit.json (service: 'unit') ----
  'unit-by-id-landlord1': { service: 'unit', entity: { kind: 'unit', unitIdentifier: ROOM_2 } },
  'units-by-property-landlord1': { service: 'unit', entity: { kind: 'property', name: WHITE_DORM } },

  // ---- tenancy.json (service: 'tenancy') ----
  'tenancy-by-id-owner-user1': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-by-id-landlord1': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-by-id-denied-other-tenant': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-checkout-review-owner': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-comments-owner': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-comments-landlord1': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-roommates-owner': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'tenancy-by-id-checked-out': { service: 'tenancy', entity: { kind: 'tenancy', tenantEmail: EMAILS.user2 } },

  // ---- contract.json (service: 'contract') ----
  'contract-by-id-owner-user1': {
    service: 'contract',
    entity: { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  },
  'contract-by-id-landlord1': {
    service: 'contract',
    entity: { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  },
  'contract-by-id-denied-other-tenant': {
    service: 'contract',
    entity: { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  },
  'contract-download-url-not-generated': {
    service: 'contract',
    entity: { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  },
  'contract-by-id-expired': {
    service: 'contract',
    entity: { kind: 'contract', tenantEmail: EMAILS.user2, status: 'expired' },
  },

  // ---- billing.json (service: 'billing') ----
  'bills-by-tenancy-owner-user1': { service: 'billing', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'bills-by-tenancy-landlord1': { service: 'billing', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'bills-by-tenancy-denied-other-tenant': {
    service: 'billing',
    entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  },
  'bill-by-id-landlord1-populated': {
    service: 'billing',
    entity: { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  },
  'bill-by-id-owner-user1': {
    service: 'billing',
    entity: { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  },
  'bill-by-id-denied-staff-finance': {
    service: 'billing',
    entity: { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  },
  'bill-by-id-denied-other-tenant': {
    service: 'billing',
    entity: { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  },
  'bill-by-id-paid-with-payments': {
    service: 'billing',
    entity: { kind: 'bill', tenantEmail: EMAILS.user1, status: 'paid' },
  },

  // ---- payment.json (service: 'billing' -- payment.controller.ts calls billingService, see docstring) ----
  'payments-by-tenancy-owner': { service: 'billing', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'payments-by-tenancy-landlord1': { service: 'billing', entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 } },
  'payments-by-tenancy-denied-other-tenant': {
    service: 'billing',
    entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  },

  // ---- application.json (service: 'application') ----
  'application-by-id-owner-user1': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: EMAILS.user1, status: 'approved' },
  },
  'application-by-id-landlord1': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: EMAILS.user1, status: 'approved' },
  },
  'application-by-id-denied-other-tenant': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: EMAILS.user1, status: 'approved' },
  },
  'application-by-id-pending-landlord1': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: USER4_EMAIL, status: 'pending' },
  },
  'application-by-id-rejected-landlord1': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: USER6_EMAIL, status: 'rejected' },
  },
  'application-by-id-approved-property1-landlord2': {
    service: 'application',
    entity: { kind: 'application', applicantEmail: EMAILS.user2, status: 'approved', propertyName: UYTENGSO },
  },

  // ---- inquiry.json (service: 'inquiry') ----
  'property-inquiries-landlord1': { service: 'inquiry', entity: { kind: 'property', name: WHITE_DORM } },
  'property-inquiries-super-admin': { service: 'inquiry', entity: { kind: 'property', name: WHITE_DORM } },
  'property-inquiries-filtered-closed': { service: 'inquiry', entity: { kind: 'property', name: WHITE_DORM } },
  'property-inquiries-denied-non-owner-landlord': {
    service: 'inquiry',
    entity: { kind: 'property', name: WHITE_DORM },
  },
  'inquiry-by-id-landlord1': { service: 'inquiry', entity: { kind: 'inquiry', requesterEmail: USER4_EMAIL } },
  'inquiry-by-id-closed-landlord1': {
    service: 'inquiry',
    entity: { kind: 'inquiry', requesterEmail: USER6_EMAIL },
  },
  'inquiry-by-id-in-progress-landlord2': {
    service: 'inquiry',
    entity: { kind: 'inquiry', requesterEmail: USER5_EMAIL },
  },

  // ---- inventory.json (service: 'inventory') ----
  'inventory-records-by-tenancy-owner': {
    service: 'inventory',
    entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  },
  'inventory-records-by-tenancy-landlord1': {
    service: 'inventory',
    entity: { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  },

  // ---- message.json (service: 'message') ----
  'conversation-messages-landlord1': {
    service: 'message',
    entity: { kind: 'conversation', inquiryRequesterEmail: USER4_EMAIL },
  },
  'conversation-messages-denied-non-participant': {
    service: 'message',
    entity: { kind: 'conversation', inquiryRequesterEmail: USER4_EMAIL },
  },
  // 'conversation-messages-not-found': sentinel id, deliberately left unresolved.

  // ---- ticket.json (service: 'ticket') ----
  'ticket-by-id-owner-user1': {
    service: 'ticket',
    entity: { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'open' },
  },
  'ticket-by-id-landlord1': {
    service: 'ticket',
    entity: { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'open' },
  },
  'ticket-by-id-assigned': {
    service: 'ticket',
    entity: { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'assigned' },
  },
  'ticket-by-id-resolved': {
    service: 'ticket',
    entity: { kind: 'ticket', reporterEmail: EMAILS.user2, status: 'resolved' },
  },

  // ---- security.json (service: 'security') ----
  'incident-by-id-landlord1': { service: 'security', entity: { kind: 'incident', status: 'investigating' } },
  'emergency-contacts-property0-landlord1': {
    service: 'security',
    entity: { kind: 'property', name: WHITE_DORM },
  },

  // ---- document.json (service: 'document') ----
  'document-by-id-landlord1': { service: 'document', entity: { kind: 'document', docType: 'contract' } },

  // ---- visit.json (service: 'visit') ----
  'property-visits-landlord1': { service: 'visit', entity: { kind: 'property', name: WHITE_DORM } },
  'property-visits-super-admin': { service: 'visit', entity: { kind: 'property', name: WHITE_DORM } },
  'property-visits-staff-maintenance': { service: 'visit', entity: { kind: 'property', name: WHITE_DORM } },
  'property-visits-filtered-scheduled': { service: 'visit', entity: { kind: 'property', name: UYTENGSO } },
  'property-visits-denied-non-owner-landlord': { service: 'visit', entity: { kind: 'property', name: WHITE_DORM } },
  'property-visits-denied-user-role': { service: 'visit', entity: { kind: 'property', name: WHITE_DORM } },
};

export const CASE_QUERY_IDS: Record<string, { field: string; service: string; entity: EntitySpec }> = {
  'available-units-landlord1': { field: 'propertyId', service: 'utility', entity: { kind: 'property', name: WHITE_DORM } },
};

// ═══════════════════════════════════════════════════════════════════════
// 5. Public entry point -- called exactly ONCE, from replay.test.ts's
//    beforeAll, never per case (see module docstring point 3).
// ═══════════════════════════════════════════════════════════════════════
export interface ResolvedIdOverrides {
  /** caseName -> resolved id, to substitute into that case's fixture `path`. */
  pathIds: Record<string, string>;
  /** caseName -> {field, value}, to override that field in that case's query. */
  queryIds: Record<string, { field: string; value: string }>;
}

export async function resolveAllCaseIds(): Promise<ResolvedIdOverrides> {
  const pathIds: Record<string, string> = {};
  for (const [caseName, ref] of Object.entries(CASE_PATH_IDS)) {
    pathIds[caseName] = await resolveEntityId(storeForService(ref.service), ref.entity);
  }

  const queryIds: Record<string, { field: string; value: string }> = {};
  for (const [caseName, ref] of Object.entries(CASE_QUERY_IDS)) {
    const value = await resolveEntityId(storeForService(ref.service), ref.entity);
    queryIds[caseName] = { field: ref.field, value };
  }

  return { pathIds, queryIds };
}
