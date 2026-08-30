/**
 * Request-shape metadata for golden replay, mirrored from
 * server/scripts/capture-golden.ts.
 *
 * WHY THIS FILE EXISTS: each record in tests/golden/*.json is
 * `{ name, method, path, status, body }` — it does NOT record which bearer
 * token or query string produced it (see CaptureRecord in capture-golden.ts;
 * `token` and `query` live only on the CaseDef used to make the request, and
 * are never written to disk). To replay a case apples-to-apples we have to
 * reconstruct "who was calling" and "with what query params", which means
 * mirroring capture-golden.ts's own case list by hand.
 *
 * Every mapping below was transcribed directly from capture-golden.ts (the
 * one file we're told never to modify) by matching case `name` values 1:1.
 * If a new case is added there, add its identity here too — the fixture
 * loader in replay.test.ts fails loudly (via CASE_IDENTITY validation) if a
 * discovered case name has no entry, rather than silently sending an
 * unauthenticated request and getting a confusing mismatch.
 *
 * Do NOT edit server/scripts/capture-golden.ts to make this easier — it is
 * out of scope for this task (read-only source of truth).
 */

/** name -> seeded user email. Emails match capture-golden.ts's `emails` map. */
export const EMAILS = {
  superAdmin: 'admin@rentdito.com',
  landlord1: 'landlord1@rentdito.com',
  landlord2: 'landlord2@rentdito.com',
  staffManager: 'manager@rentdito.com',
  staffMaintenance: 'maintenance@rentdito.com',
  staffFinance: 'finance@rentdito.com',
  user1: 'user1@rentdito.com',
  user2: 'user2@rentdito.com',
  user3: 'user3@rentdito.com',
} as const;

type Role = keyof typeof EMAILS;

// Cases not listed here (and not in AUTH_LOGIN_BODIES) are replayed with no
// Authorization header at all — this is deliberate for the "-unauthenticated"
// / no-token cases, matching the CaseDef entries in capture-golden.ts that
// never set `token`.
export const CASE_AUTH: Record<string, Role> = {
  // transfer.json
  'my-transfers-user1': 'user1',
  'transfers-list-landlord1': 'landlord1',
  'transfers-list-super-admin': 'superAdmin',
  'transfers-list-staff-manager-no-assigned-properties': 'staffManager',
  'transfers-list-filtered-by-status-completed': 'landlord1',
  'transfers-list-denied-for-user-role': 'user1',
  // 'transfers-list-unauthenticated': (none)

  // billing.json
  'bills-list-landlord1': 'landlord1',
  'bills-list-user1-own-tenancy': 'user1',
  'bills-list-user2-no-bills-for-tenancy': 'user2',
  'bills-list-staff-finance-no-assigned-properties': 'staffFinance',
  'bills-list-super-admin': 'superAdmin',
  'bills-list-filtered-status-unpaid': 'landlord1',
  'bills-by-tenancy-owner-user1': 'user1',
  'bills-by-tenancy-landlord1': 'landlord1',
  'bills-by-tenancy-denied-other-tenant': 'user2',
  'bill-by-id-landlord1-populated': 'landlord1',
  'bill-by-id-owner-user1': 'user1',
  'bill-by-id-denied-staff-finance': 'staffFinance',
  'bill-by-id-denied-other-tenant': 'user2',
  'bill-by-id-paid-with-payments': 'landlord1',
  'bill-by-id-not-found': 'superAdmin',

  // tenancy.json
  'my-tenancies-user1': 'user1',
  'my-tenancies-user2-checked-out': 'user2',
  'tenancies-list-landlord1': 'landlord1',
  'tenancies-list-super-admin': 'superAdmin',
  'tenancies-list-staff-manager-no-assigned-properties': 'staffManager',
  'tenancies-list-filtered-checked-in': 'landlord1',
  'tenancy-by-id-owner-user1': 'user1',
  'tenancy-by-id-landlord1': 'landlord1',
  'tenancy-by-id-denied-other-tenant': 'user2',
  'tenancy-checkout-review-owner': 'user1',
  'tenancy-comments-owner': 'user1',
  'tenancy-comments-landlord1': 'landlord1',
  'tenancy-roommates-owner': 'user1',
  'tenancy-by-id-checked-out': 'landlord1',
  'tenancy-by-id-not-found': 'superAdmin',

  // contract.json
  'my-contracts-user1': 'user1',
  'my-contracts-user3-active-no-tenancy': 'user3',
  'contracts-list-landlord1': 'landlord1',
  'contracts-list-super-admin': 'superAdmin',
  'contracts-list-staff-manager-no-assigned-properties': 'staffManager',
  'contracts-list-filtered-active': 'landlord1',
  'contract-by-id-owner-user1': 'user1',
  'contract-by-id-landlord1': 'landlord1',
  'contract-by-id-denied-other-tenant': 'user2',
  'contract-download-url-not-generated': 'user1',
  'contract-by-id-expired': 'landlord1',
  'contract-by-id-not-found': 'superAdmin',

  // visit.json
  'my-visits-user1-pending': 'user1',
  'my-visits-user3-scheduled': 'user3',
  'property-visits-landlord1': 'landlord1',
  'property-visits-super-admin': 'superAdmin',
  'property-visits-staff-maintenance': 'staffMaintenance',
  'property-visits-filtered-scheduled': 'landlord2',
  'property-visits-denied-non-owner-landlord': 'landlord2',
  'property-visits-denied-user-role': 'user1',

  // application.json
  'my-applications-user1-approved': 'user1',
  'my-applications-user2': 'user2',
  'applications-list-landlord1': 'landlord1',
  'applications-list-super-admin': 'superAdmin',
  'applications-list-staff-manager-no-assigned-properties': 'staffManager',
  'applications-list-filtered-pending': 'landlord1',
  'applications-list-denied-user-role': 'user1',
  'application-by-id-owner-user1': 'user1',
  'application-by-id-landlord1': 'landlord1',
  'application-by-id-denied-other-tenant': 'user2',
  'application-by-id-pending-landlord1': 'landlord1',
  'application-by-id-rejected-landlord1': 'landlord1',
  'application-by-id-approved-property1-landlord2': 'landlord2',
  'application-by-id-not-found': 'superAdmin',

  // inventory.json
  'inventory-items-landlord1': 'landlord1',
  'inventory-items-staff-maintenance-has-permission': 'staffMaintenance',
  'inventory-items-denied-staff-manager-no-permission': 'staffManager',
  'inventory-items-super-admin': 'superAdmin',
  'inventory-items-denied-user-role': 'user1',
  'inventory-records-user1-own-tenancy': 'user1',
  'inventory-records-landlord1': 'landlord1',
  'inventory-records-by-tenancy-owner': 'user1',
  'inventory-records-by-tenancy-landlord1': 'landlord1',
  'inventory-monthly-report-landlord1': 'landlord1',
  'inventory-monthly-report-denied-staff-manager': 'staffManager',

  // inquiry.json
  'my-inquiries-user1-empty': 'user1',
  // 'my-inquiries-unauthenticated': (none)
  'property-inquiries-landlord1': 'landlord1',
  'property-inquiries-super-admin': 'superAdmin',
  'property-inquiries-filtered-closed': 'landlord1',
  'property-inquiries-denied-non-owner-landlord': 'landlord2',
  'inquiry-by-id-landlord1': 'landlord1',
  'inquiry-by-id-closed-landlord1': 'landlord1',
  'inquiry-by-id-in-progress-landlord2': 'landlord2',
  'inquiry-by-id-not-found': 'superAdmin',

  // ticket.json
  'my-tickets-user1': 'user1',
  'my-tickets-user2': 'user2',
  'tickets-list-landlord1': 'landlord1',
  'tickets-list-staff-maintenance': 'staffMaintenance',
  'tickets-list-super-admin': 'superAdmin',
  'tickets-list-filtered-priority-urgent': 'landlord1',
  'ticket-by-id-owner-user1': 'user1',
  'ticket-by-id-landlord1': 'landlord1',
  'ticket-by-id-assigned': 'staffMaintenance',
  'ticket-by-id-resolved': 'landlord1',
  'ticket-by-id-not-found': 'superAdmin',

  // unit.json
  'units-list-landlord1': 'landlord1',
  'units-list-super-admin': 'superAdmin',
  'units-list-staff-manager-no-assigned-properties': 'staffManager',
  'units-list-denied-user-role': 'user1',
  'unit-by-id-landlord1': 'landlord1',
  'units-by-property-landlord1': 'landlord1',

  // security.json
  'incidents-list-landlord1': 'landlord1',
  'incidents-list-staff-maintenance': 'staffMaintenance',
  'incidents-list-denied-user-role': 'user1',
  'incidents-list-denied-super-admin-not-in-role-list': 'superAdmin',
  'incident-by-id-landlord1': 'landlord1',
  'incident-by-id-not-found': 'landlord1',
  'emergency-contacts-property0-landlord1': 'landlord1',

  // property.json
  'properties-list-landlord1': 'landlord1',
  'properties-list-super-admin': 'superAdmin',
  'properties-list-staff-manager-no-assigned-properties': 'staffManager',
  'properties-list-denied-user-role': 'user1',
  'property-by-id-landlord1': 'landlord1',
  'property-by-id-denied-non-owner-landlord': 'landlord2',

  // report.json
  'occupancy-landlord1': 'landlord1',
  'occupancy-denied-user-role': 'user1',
  'checkout-forecast-landlord1': 'landlord1',
  'vacancy-forecast-landlord1': 'landlord1',
  'reservation-forecast-landlord1': 'landlord1',
  'occupancy-staff-manager-no-assigned-properties': 'staffManager',

  // public.json: all unauthenticated — no entries.

  // message.json
  'conversation-messages-landlord1': 'landlord1',
  'conversation-messages-denied-non-participant': 'landlord2',
  'conversation-messages-not-found': 'landlord1',

  // landlord-application.json
  'my-application-user3-approved': 'user3',
  'my-application-user1-none': 'user1',
  'my-application-denied-landlord-role': 'landlord1',
  'all-applications-super-admin': 'superAdmin',
  'all-applications-denied-landlord-role': 'landlord1',

  // document.json
  'documents-list-landlord1': 'landlord1',
  'documents-list-staff-maintenance': 'staffMaintenance',
  'documents-list-denied-user-role': 'user1',
  'document-by-id-landlord1': 'landlord1',
  'document-by-id-not-found': 'landlord1',

  // utility.json
  'consumption-landlord1': 'landlord1',
  'consumption-denied-staff-no-utilities-permission': 'staffFinance',
  'highest-usage-landlord1': 'landlord1',
  'overconsumption-landlord1': 'landlord1',
  'expense-summary-landlord1': 'landlord1',
  'available-units-landlord1': 'landlord1',

  // user.json
  'me-user1-with-active-tenancy': 'user1',
  'me-landlord1': 'landlord1',
  // 'me-unauthenticated': (none)

  // team.json
  'staff-list-landlord1': 'landlord1',
  'staff-list-denied-super-admin-not-in-role-list': 'superAdmin',
  'staff-list-denied-staff-role': 'staffManager',

  // financial.json
  'summary-landlord1': 'landlord1',
  'summary-staff-finance-has-permission': 'staffFinance',
  'summary-denied-staff-manager-no-permission': 'staffManager',
  'monthly-landlord1': 'landlord1',
  'by-property-landlord1': 'landlord1',

  // admin.json
  'platform-stats-super-admin': 'superAdmin',
  'platform-stats-denied-landlord-role': 'landlord1',
  'users-list-super-admin': 'superAdmin',
  'activity-log-super-admin': 'superAdmin',
  'pending-verifications-super-admin': 'superAdmin',
  'all-verifications-super-admin': 'superAdmin',

  // notification.json
  'notifications-landlord1-has-two': 'landlord1',
  'notifications-user1-empty': 'user1',
  'unread-count-landlord1': 'landlord1',
  // 'notifications-unauthenticated': (none)

  // payment.json
  'payments-list-landlord1': 'landlord1',
  'payments-list-user1-own-tenancy': 'user1',
  'payments-by-tenancy-owner': 'user1',
  'payments-by-tenancy-landlord1': 'landlord1',
  'payments-by-tenancy-denied-other-tenant': 'user2',
};

/**
 * Query-string params for the small set of cases that filter results.
 * Everything else that needs a specific entity ID already has it baked into
 * `path` (fixture paths are the fully-resolved CaseDef.path, e.g.
 * `/api/tickets/<id>`), so only genuine `?query=` filters need reconstructing
 * here.
 *
 * `available-units-landlord1` uses property0's real id
 * (6a93e154107b82fb635d8feb, "White Dorm Property" — see
 * tests/golden/public.json's `public-property-by-id` case for the same id),
 * which is deterministic because the seed script assigns fixed ObjectIds.
 *
 * `public-listings-filtered-city` uses property0's city ("Cebu City").
 * Both seeded properties share that city, so — exactly as captured — this
 * filter returns the same two-property list as the unfiltered case.
 */
export const CASE_QUERY: Record<string, Record<string, string>> = {
  'transfers-list-filtered-by-status-completed': { status: 'completed' },
  'bills-list-filtered-status-unpaid': { status: 'unpaid' },
  'tenancies-list-filtered-checked-in': { status: 'checked_in' },
  'contracts-list-filtered-active': { status: 'active' },
  'property-visits-filtered-scheduled': { status: 'scheduled' },
  'applications-list-filtered-pending': { status: 'pending' },
  'property-inquiries-filtered-closed': { status: 'closed' },
  'tickets-list-filtered-priority-urgent': { priority: 'urgent' },
  'monthly-landlord1': { year: '2026' },
  'public-listings-filtered-city': { city: 'Cebu City' },
  'available-units-landlord1': { propertyId: '6a93e154107b82fb635d8feb' },
};

/** auth.json's login-* cases replay the real POST body capture-golden.ts sent. */
export const AUTH_LOGIN_BODIES: Record<string, { email: string; password: string }> = {
  'login-superAdmin': { email: EMAILS.superAdmin, password: 'password123' },
  'login-landlord1': { email: EMAILS.landlord1, password: 'password123' },
  'login-user1': { email: EMAILS.user1, password: 'password123' },
  'login-user4-unverified-rejected': { email: 'user4@rentdito.com', password: 'password123' },
  'login-user6-pending-rejected': { email: 'user6@rentdito.com', password: 'password123' },
  'login-wrong-password': { email: EMAILS.user1, password: 'wrong-password' },
  'login-unknown-email': { email: 'nobody@rentdito.com', password: 'password123' },
};

/**
 * Cases where a top-level `id` field is legitimately present WITHOUT a
 * sibling `_id` — i.e. known, deliberate exceptions to the dual-id
 * invariant checked by `assertDualId` in replay.test.ts, not bugs.
 *
 * Currently the only one: GET /api/notifications
 * (src/controllers/notification.controller.ts:18) hand-builds
 * `{ id: n._id, title, message, type, read, createdAt }` as a lightweight
 * DTO — it is not a raw Mongo entity and was never touched by any
 * `.populate()` call site, so it has no `_id` to compare against `id`.
 *
 * If this set ever needs a new entry because some OTHER endpoint starts
 * returning `id` without `_id`, treat that as a signal to go verify by hand
 * whether it's another deliberate DTO (fine) or a populate-rewrite
 * regression (not fine) — do not add entries reflexively just to make a
 * test pass.
 */
export const ALLOW_ID_ONLY = new Set<string>(['notifications-landlord1-has-two']);
