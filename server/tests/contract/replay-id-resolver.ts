/**
 * Natural-key id resolution for golden-fixture replay detail routes.
 *
 * THE PROBLEM (Phase 4 defect #2 -- see task-4b-report.md):
 * tests/golden/*.json's detail-route fixtures (`/api/properties/<id>`,
 * `/api/billing/<id>`, `/api/tickets/<id>`, ...) were captured against the
 * live MongoDB app, so every `<id>` baked into a fixture's `path` (and the
 * handful embedded in replay.meta.ts's CASE_QUERY) is a real Mongo
 * ObjectId. Only the `profiles` table carries a `legacyMongoId` bridge
 * (server/src/seeds/seed-postgres.ts) -- every other Postgres table gets a
 * fresh `randomUUID()` at seed time with no relationship to the old Mongo
 * id. Every service is now ported to Prisma, so every detail-route fixture
 * requests a Mongo id that simply does not exist in Postgres, and would
 * 404 -- not because the port is wrong, but because the fixture's baked-in
 * id is stale.
 *
 * THE FIX -- chosen over adding `legacy_mongo_id` to all 27 tables (that
 * would push transitional migration state into production query paths,
 * where it would later have to be hunted down and removed): keep the
 * complexity here, in the test harness, which already hand-maps each case
 * to an auth identity (replay.meta.ts's CASE_AUTH) -- resolving entity ids
 * is the natural extension of that same idea.
 *
 * HOW IT WORKS:
 *   1. CASE_PATH_IDS / CASE_QUERY_IDS map each fixture case that embeds an
 *      entity id to a STABLE NATURAL KEY (e.g. a property's `name`, a
 *      user's `email`).
 *   2. At suite start (once, in replay.test.ts's beforeAll -- never per
 *      case), resolveAllCaseIds() looks up every registered natural key
 *      against Postgres and returns the resolved ids so replay.test.ts can
 *      substitute them into the fixture's otherwise-frozen `path`/`query`
 *      before firing the request. Every resolver is memoized, so
 *      re-resolving the same key twice (e.g. property0's id is needed by
 *      6+ different cases across 6 different fixture files) costs one
 *      round trip, not six -- this matters because Postgres here is a real
 *      hosted instance in ap-southeast-1 (Singapore), not a local
 *      container.
 *   3. Every resolver throws a descriptive error (naming the entity kind
 *      and the natural key) if it finds no match, rather than silently
 *      returning `undefined` -- a silent miss would produce a 404 fixture
 *      mismatch that reads exactly like a port bug.
 *
 * HISTORY (task 31b): until this task, every resolver could also target
 * MongoDB, gated by a `PORTED_SERVICES` registry naming which backend
 * services had so far moved off Mongoose -- a case whose owning service
 * wasn't yet ported resolved its id against the live Mongo database
 * instead. Now that all services are ported (and MongoDB has been deleted
 * from the codebase entirely), that split serves no purpose: every case
 * always resolves against Postgres, so `PORTED_SERVICES`, the `Store`
 * type, `storeForService()`, the Mongo model imports, and every resolver's
 * Mongo-side branch were removed. The natural-key resolution and the
 * fail-loud-on-miss behaviour below are unchanged.
 *
 * NATURAL KEYS CHOSEN (mirrors task-4b-report.md's audit table):
 *   - property   -> `name` (unique across both seeded properties)
 *   - unit       -> `unitIdentifier` (unique across BOTH properties' units combined)
 *   - profile/user -> `email` (already the seed's own stable identity column)
 *   - tenancy    -> owning tenant's email (each seeded user has at most one
 *                   tenancy in this fixture, so tenant email alone is unique)
 *   - contract   -> (tenant email, status) -- user1 has one 'active' contract,
 *                   user2 one 'expired' contract
 *   - bill       -> (tenant email, status) resolved via that tenant's tenancy
 *                   (tenancy1/user1 has exactly one bill per status)
 *   - rental application -> (applicant email, status[, property name]) -- the
 *                   property qualifier is only needed for user2, who has two
 *                   'approved' applications (one per property)
 *   - inquiry    -> requester email (each of the 3 seeded inquiries has a
 *                   distinct requester)
 *   - conversation -> its parent inquiry's requester email (Conversation.inquiryId
 *                   is `@unique` in the Prisma schema / 1:1 in Mongo, so the
 *                   inquiry's natural key resolves the conversation uniquely)
 *   - ticket     -> (reporter email, status) -- tickets 1-3 share a reporter
 *                   (user1) but have distinct statuses; tickets 4-5 share
 *                   user2 with distinct statuses
 *   - incident report -> `status` alone (both seeded incidents are reported
 *                   by the same staff member, so status is the only
 *                   discriminator -- mirrors capture-golden.ts's own
 *                   `.find(i => i.status === 'investigating')`)
 *   - document   -> `type` alone (2 seeded documents, 2 distinct types)
 *
 * Cases resolving a Mongo ObjectId sentinel used to mean "does not exist"
 * (`000000000000000000000000` in *-not-found cases) are DELIBERATELY absent
 * from both registries below -- that id is supposed to not resolve to
 * anything, so leaving the fixture's literal sentinel untouched is correct.
 * (A Mongo-ObjectId-shaped sentinel is not a valid Postgres UUID, which
 * flips a would-be 404 into a 400 -- task-10-report.md flagged this for
 * `property`, which has no not-found fixture and so never hit it.)
 */

import prisma from '../../src/config/prisma';
import { EMAILS } from './replay.meta';

// ═══════════════════════════════════════════════════════════════════════
// 1. Memoization -- resolve each distinct key combination once per
//    process, no matter how many cases share it.
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
// 2. Per-entity resolvers. Each throws a descriptive error (naming the
//    entity and the natural key searched) rather than returning undefined
//    -- see module docstring point 3.
// ═══════════════════════════════════════════════════════════════════════

const resolveUserId = memoAsync(async (email: string): Promise<string> => {
  const row = await prisma.profile.findFirst({ where: { email } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres profile found for email="${email}"`);
  }
  return row.id;
});

export const resolvePropertyId = memoAsync(async (name: string): Promise<string> => {
  const row = await prisma.property.findFirst({ where: { name } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres property found with name="${name}"`);
  }
  return row.id;
});

export const resolveUnitId = memoAsync(async (unitIdentifier: string): Promise<string> => {
  const row = await prisma.unit.findFirst({ where: { unitIdentifier } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres unit found with unitIdentifier="${unitIdentifier}"`);
  }
  return row.id;
});

export const resolveTenancyId = memoAsync(async (tenantEmail: string): Promise<string> => {
  const userId = await resolveUserId(tenantEmail);
  const row = await prisma.tenancy.findFirst({ where: { userId } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres tenancy found for userId="${userId}" (tenantEmail="${tenantEmail}")`);
  }
  return row.id;
});

export const resolveContractId = memoAsync(async (tenantEmail: string, status: string): Promise<string> => {
  const userId = await resolveUserId(tenantEmail);
  const row = await prisma.contract.findFirst({ where: { userId, status: status as any } });
  if (!row) {
    throw new Error(
      `id-resolver: no Postgres contract found for userId="${userId}" status="${status}" (tenantEmail="${tenantEmail}")`
    );
  }
  return row.id;
});

export const resolveBillId = memoAsync(async (tenantEmail: string, status: string): Promise<string> => {
  const tenancyId = await resolveTenancyId(tenantEmail);
  const row = await prisma.bill.findFirst({ where: { tenancyId, status: status as any } });
  if (!row) {
    throw new Error(
      `id-resolver: no Postgres bill found for tenancyId="${tenancyId}" status="${status}" (tenantEmail="${tenantEmail}")`
    );
  }
  return row.id;
});

export const resolveApplicationId = memoAsync(
  async (applicantEmail: string, status: string, propertyName?: string): Promise<string> => {
    const userId = await resolveUserId(applicantEmail);
    const propertyId = propertyName ? await resolvePropertyId(propertyName) : undefined;
    const qualifier = propertyName ? ` propertyName="${propertyName}"` : '';
    const row = await prisma.rentalApplication.findFirst({
      where: { userId, status: status as any, ...(propertyId ? { propertyId } : {}) },
    });
    if (!row) {
      throw new Error(
        `id-resolver: no Postgres rental application found for userId="${userId}" status="${status}"${qualifier} ` +
          `(applicantEmail="${applicantEmail}")`
      );
    }
    return row.id;
  }
);

export const resolveInquiryId = memoAsync(async (requesterEmail: string): Promise<string> => {
  const userId = await resolveUserId(requesterEmail);
  const row = await prisma.inquiry.findFirst({ where: { userId } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres inquiry found for userId="${userId}" (requesterEmail="${requesterEmail}")`);
  }
  return row.id;
});

export const resolveConversationId = memoAsync(async (inquiryRequesterEmail: string): Promise<string> => {
  const inquiryId = await resolveInquiryId(inquiryRequesterEmail);
  const row = await prisma.conversation.findFirst({ where: { inquiryId } });
  if (!row) {
    throw new Error(
      `id-resolver: no Postgres conversation found for inquiryId="${inquiryId}" (inquiryRequesterEmail="${inquiryRequesterEmail}")`
    );
  }
  return row.id;
});

export const resolveTicketId = memoAsync(async (reporterEmail: string, status: string): Promise<string> => {
  const userId = await resolveUserId(reporterEmail);
  const row = await prisma.ticket.findFirst({ where: { reportedByUserId: userId, status: status as any } });
  if (!row) {
    throw new Error(
      `id-resolver: no Postgres ticket found for reportedByUserId="${userId}" status="${status}" (reporterEmail="${reporterEmail}")`
    );
  }
  return row.id;
});

export const resolveIncidentId = memoAsync(async (status: string): Promise<string> => {
  const row = await prisma.incidentReport.findFirst({ where: { status: status as any } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres incident report found with status="${status}"`);
  }
  return row.id;
});

export const resolveDocumentId = memoAsync(async (docType: string): Promise<string> => {
  const row = await prisma.document.findFirst({ where: { type: docType as any } });
  if (!row) {
    throw new Error(`id-resolver: no Postgres document found with type="${docType}"`);
  }
  return row.id;
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Case registry -- which fixture cases embed an id and what natural key
//    resolves it.
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

async function resolveEntityId(entity: EntitySpec): Promise<string> {
  switch (entity.kind) {
    case 'property':
      return resolvePropertyId(entity.name);
    case 'unit':
      return resolveUnitId(entity.unitIdentifier);
    case 'tenancy':
      return resolveTenancyId(entity.tenantEmail);
    case 'contract':
      return resolveContractId(entity.tenantEmail, entity.status);
    case 'bill':
      return resolveBillId(entity.tenantEmail, entity.status);
    case 'application':
      return resolveApplicationId(entity.applicantEmail, entity.status, entity.propertyName);
    case 'inquiry':
      return resolveInquiryId(entity.requesterEmail);
    case 'conversation':
      return resolveConversationId(entity.inquiryRequesterEmail);
    case 'ticket':
      return resolveTicketId(entity.reporterEmail, entity.status);
    case 'incident':
      return resolveIncidentId(entity.status);
    case 'document':
      return resolveDocumentId(entity.docType);
  }
}

// Property names, transcribed from server/src/seeds/seed-postgres.ts (both
// the old Mongo seed and the Postgres seed used identical `name` values for
// the two properties).
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

export const CASE_PATH_IDS: Record<string, EntitySpec> = {
  // ---- property.json ----
  'property-by-id-landlord1': { kind: 'property', name: WHITE_DORM },
  'property-by-id-denied-non-owner-landlord': { kind: 'property', name: WHITE_DORM },

  // ---- public.json ----
  'public-property-by-id': { kind: 'property', name: WHITE_DORM },
  'public-unit-by-id': { kind: 'unit', unitIdentifier: ROOM_2 },
  // 'public-property-by-id-not-found': sentinel id, deliberately left unresolved (see docstring).

  // ---- unit.json ----
  'unit-by-id-landlord1': { kind: 'unit', unitIdentifier: ROOM_2 },
  'units-by-property-landlord1': { kind: 'property', name: WHITE_DORM },

  // ---- tenancy.json ----
  'tenancy-by-id-owner-user1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-by-id-landlord1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-by-id-denied-other-tenant': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-checkout-review-owner': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-comments-owner': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-comments-landlord1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-roommates-owner': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'tenancy-by-id-checked-out': { kind: 'tenancy', tenantEmail: EMAILS.user2 },

  // ---- contract.json ----
  'contract-by-id-owner-user1': { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  'contract-by-id-landlord1': { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  'contract-by-id-denied-other-tenant': { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  'contract-download-url-not-generated': { kind: 'contract', tenantEmail: EMAILS.user1, status: 'active' },
  'contract-by-id-expired': { kind: 'contract', tenantEmail: EMAILS.user2, status: 'expired' },

  // ---- billing.json ----
  'bills-by-tenancy-owner-user1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'bills-by-tenancy-landlord1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'bills-by-tenancy-denied-other-tenant': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'bill-by-id-landlord1-populated': { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  'bill-by-id-owner-user1': { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  'bill-by-id-denied-staff-finance': { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  'bill-by-id-denied-other-tenant': { kind: 'bill', tenantEmail: EMAILS.user1, status: 'unpaid' },
  'bill-by-id-paid-with-payments': { kind: 'bill', tenantEmail: EMAILS.user1, status: 'paid' },

  // ---- payment.json (served by billing.service.ts -- see docstring "known exceptions" note) ----
  'payments-by-tenancy-owner': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'payments-by-tenancy-landlord1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'payments-by-tenancy-denied-other-tenant': { kind: 'tenancy', tenantEmail: EMAILS.user1 },

  // ---- application.json ----
  'application-by-id-owner-user1': { kind: 'application', applicantEmail: EMAILS.user1, status: 'approved' },
  'application-by-id-landlord1': { kind: 'application', applicantEmail: EMAILS.user1, status: 'approved' },
  'application-by-id-denied-other-tenant': {
    kind: 'application',
    applicantEmail: EMAILS.user1,
    status: 'approved',
  },
  'application-by-id-pending-landlord1': { kind: 'application', applicantEmail: USER4_EMAIL, status: 'pending' },
  'application-by-id-rejected-landlord1': { kind: 'application', applicantEmail: USER6_EMAIL, status: 'rejected' },
  'application-by-id-approved-property1-landlord2': {
    kind: 'application',
    applicantEmail: EMAILS.user2,
    status: 'approved',
    propertyName: UYTENGSO,
  },

  // ---- inquiry.json ----
  'property-inquiries-landlord1': { kind: 'property', name: WHITE_DORM },
  'property-inquiries-super-admin': { kind: 'property', name: WHITE_DORM },
  'property-inquiries-filtered-closed': { kind: 'property', name: WHITE_DORM },
  'property-inquiries-denied-non-owner-landlord': { kind: 'property', name: WHITE_DORM },
  'inquiry-by-id-landlord1': { kind: 'inquiry', requesterEmail: USER4_EMAIL },
  'inquiry-by-id-closed-landlord1': { kind: 'inquiry', requesterEmail: USER6_EMAIL },
  'inquiry-by-id-in-progress-landlord2': { kind: 'inquiry', requesterEmail: USER5_EMAIL },

  // ---- inventory.json ----
  'inventory-records-by-tenancy-owner': { kind: 'tenancy', tenantEmail: EMAILS.user1 },
  'inventory-records-by-tenancy-landlord1': { kind: 'tenancy', tenantEmail: EMAILS.user1 },

  // ---- message.json ----
  'conversation-messages-landlord1': { kind: 'conversation', inquiryRequesterEmail: USER4_EMAIL },
  'conversation-messages-denied-non-participant': { kind: 'conversation', inquiryRequesterEmail: USER4_EMAIL },
  // 'conversation-messages-not-found': sentinel id, deliberately left unresolved.

  // ---- ticket.json ----
  'ticket-by-id-owner-user1': { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'open' },
  'ticket-by-id-landlord1': { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'open' },
  'ticket-by-id-assigned': { kind: 'ticket', reporterEmail: EMAILS.user1, status: 'assigned' },
  'ticket-by-id-resolved': { kind: 'ticket', reporterEmail: EMAILS.user2, status: 'resolved' },

  // ---- security.json ----
  'incident-by-id-landlord1': { kind: 'incident', status: 'investigating' },
  'emergency-contacts-property0-landlord1': { kind: 'property', name: WHITE_DORM },

  // ---- document.json ----
  'document-by-id-landlord1': { kind: 'document', docType: 'contract' },

  // ---- visit.json ----
  'property-visits-landlord1': { kind: 'property', name: WHITE_DORM },
  'property-visits-super-admin': { kind: 'property', name: WHITE_DORM },
  'property-visits-staff-maintenance': { kind: 'property', name: WHITE_DORM },
  'property-visits-filtered-scheduled': { kind: 'property', name: UYTENGSO },
  'property-visits-denied-non-owner-landlord': { kind: 'property', name: WHITE_DORM },
  'property-visits-denied-user-role': { kind: 'property', name: WHITE_DORM },
};

export const CASE_QUERY_IDS: Record<string, { field: string; entity: EntitySpec }> = {
  'available-units-landlord1': { field: 'propertyId', entity: { kind: 'property', name: WHITE_DORM } },
};

// ═══════════════════════════════════════════════════════════════════════
// 4. Public entry point -- called exactly ONCE, from replay.test.ts's
//    beforeAll, never per case (see module docstring point 2).
// ═══════════════════════════════════════════════════════════════════════
export interface ResolvedIdOverrides {
  /** caseName -> resolved id, to substitute into that case's fixture `path`. */
  pathIds: Record<string, string>;
  /** caseName -> {field, value}, to override that field in that case's query. */
  queryIds: Record<string, { field: string; value: string }>;
}

export async function resolveAllCaseIds(): Promise<ResolvedIdOverrides> {
  const pathIds: Record<string, string> = {};
  for (const [caseName, entity] of Object.entries(CASE_PATH_IDS)) {
    pathIds[caseName] = await resolveEntityId(entity);
  }

  const queryIds: Record<string, { field: string; value: string }> = {};
  for (const [caseName, ref] of Object.entries(CASE_QUERY_IDS)) {
    const value = await resolveEntityId(ref.entity);
    queryIds[caseName] = { field: ref.field, value };
  }

  return { pathIds, queryIds };
}
