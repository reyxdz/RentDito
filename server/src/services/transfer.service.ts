import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (both listed as
// "existing utilities to use" for this port):
//
// - propertyRef.mapper.ts DOES apply, but only to ONE call site:
//   completeTransferRequest's own returned `tenancy.propertyId` embed
//   (`.populate('propertyId', 'name address')`) is exactly the narrow
//   `{id, name, address}` projection this mapper was built for -- used below
//   via `PROPERTY_REF_SELECT`/`shapePropertyRef`. Every OTHER relation this
//   file embeds is a different, narrower, purpose-built projection --
//   `{id, unitIdentifier, accommodationType}` for fromUnit/toUnit and
//   `{id, name, role}` for initiatedByUserId/reviewedBy -- and `propertyId`
//   on the TransferRequest itself is NEVER populated by any of this file's
//   six TransferRequest-returning functions (it stays a raw scalar FK in
//   every response, confirmed against every case in
//   tests/golden/transfer.json), so the mapper has no other call site here.
// - embeddedProfile.mapper.ts does NOT apply anywhere in this file: every
//   Profile/user relation this file ever returns to a client is a narrow
//   `select` (`name role` or `name email phone avatar`), which excludes
//   `legacyMongoId` by construction. The only UNQUALIFIED `include: { user:
//   true }`/`include: { tenancy: true }`-style full-row reads in this file
//   are used purely for internal logic (ids, names, status checks) and are
//   never serialized directly -- every actual response re-queries with its
//   own narrow select afterward, so nothing here needs the mapper's
//   `legacyMongoId`-stripping protection.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/**
 * Drops any null-valued key from a shallow object, mirroring Mongoose's
 * "unset optional path -> key entirely absent" convention (same pattern
 * every other ported service in this migration already uses).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════
// Relation shapes. Every one of the six read-return call sites
// (createTransferRequest, getMyTransferRequests, getTransferRequests,
// approveTransferRequest, rejectTransferRequest, and completeTransferRequest's
// own transferRequest sub-read) does the IDENTICAL 4-way populate of
// fromUnitId/toUnitId/initiatedByUserId/reviewedBy -- extracted once here
// per the brief ("Six repeated 4-way populates; use one shared include
// constant"). `tenancy`'s own select is NOT part of this shared constant:
// it varies across call sites (a 2-3 field-width difference), so collapsing
// it in would silently change response content -- each call site adds its
// own `tenancy: { select: ... }` alongside this constant instead.
// ═══════════════════════════════════════════════════════════════════════
const TRANSFER_UNIT_REF_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
} satisfies Prisma.UnitSelect;

const TRANSFER_USER_ROLE_SELECT = { id: true, name: true, role: true } satisfies Prisma.ProfileSelect;

const TRANSFER_REQUEST_SHARED_INCLUDE = {
  fromUnit: { select: TRANSFER_UNIT_REF_SELECT },
  toUnit: { select: TRANSFER_UNIT_REF_SELECT },
  initiatedBy: { select: TRANSFER_USER_ROLE_SELECT },
  reviewer: { select: TRANSFER_USER_ROLE_SELECT },
} satisfies Prisma.TransferRequestInclude;

/** `.populate('tenancyId', 'status checkInDate')` -- createTransferRequest/approveTransferRequest/rejectTransferRequest return. */
const TENANCY_CHECKIN_SELECT = { id: true, status: true, checkInDate: true } satisfies Prisma.TenancySelect;
/** `.populate('tenancyId', 'status checkInDate checkOutDate')` -- getMyTransferRequests/getTransferRequests. */
const TENANCY_CHECKIN_CHECKOUT_SELECT = {
  ...TENANCY_CHECKIN_SELECT,
  checkOutDate: true,
} satisfies Prisma.TenancySelect;
/** `.populate('tenancyId', 'status unitId propertyId')` -- completeTransferRequest's own return shape only. */
const TENANCY_COMPLETE_SELECT = {
  id: true,
  status: true,
  unitId: true,
  propertyId: true,
} satisfies Prisma.TenancySelect;

type UnitRefRow = { id: string; unitIdentifier: string; accommodationType: string };
type UserRoleRow = { id: string; name: string; role: string };

const shapeUnitRef = (row: UnitRefRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
  accommodationType: row.accommodationType,
});
const shapeUserRole = (row: UserRoleRow): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
  role: row.role,
});

/**
 * Remaps a TransferRequest row (fetched with `TRANSFER_REQUEST_SHARED_INCLUDE`
 * plus a per-call-site `tenancy` select) back onto the Mongoose `.populate()`
 * shape: relation objects replace their own scalar FK key (property.service.ts's
 * task-10 remap pattern), `propertyId` is left untouched (never populated by
 * the original), and any nullable scalar (`reviewNotes`/`reviewedAt`/
 * `completedAt`) or unpopulated optional relation (`reviewer`, when
 * `reviewedBy` is null -- a pending request has no reviewer yet) is omitted
 * entirely rather than emitted as `null`/absent-object, matching every seeded
 * fixture (a `pending` transfer request carries none of
 * reviewedBy/reviewNotes/reviewedAt/completedAt at all).
 */
function remapTransferRequest(row: Record<string, any>): Record<string, unknown> {
  const { tenancy, fromUnit, toUnit, initiatedBy, reviewer, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);

  if (tenancy !== undefined) out.tenancyId = stripNulls({ ...tenancy });
  if (fromUnit !== undefined) out.fromUnitId = shapeUnitRef(fromUnit);
  if (toUnit !== undefined) out.toUnitId = shapeUnitRef(toUnit);
  if (initiatedBy !== undefined) out.initiatedByUserId = shapeUserRole(initiatedBy);
  if (reviewer !== undefined && reviewer !== null) out.reviewedBy = shapeUserRole(reviewer);

  return out;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const ensureUser = async (userId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user;
};

/**
 * Whether `staffId` is assigned to `propertyId` -- direct replacement for
 * Mongoose's `user.assignedPropertyIds?.some(...)`, which lived directly on
 * the User document; in Postgres it's the `staff_property_assignments` join
 * table (same pattern every other ported service's own scoped-access checks
 * already use, e.g. tenancy.service.ts's `isStaffAssignedToProperty`).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Verify the caller is a landlord/staff with property access, or super_admin.
 * Direct Prisma port of the original -- message/statusCode preserved exactly
 * ('User not found'/404, 'Property not found'/404, 'Access denied'/403).
 */
const verifyPropertyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await ensureUser(userId);
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (user.role === 'super_admin') {
    return { user, property };
  }

  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId));

  if (!isLandlord && !isStaff) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return { user, property };
};

/**
 * Placement/availability check for the TARGET unit of a transfer -- shared,
 * pure (no writes), verbatim port of the original's `ensureTargetUnitAvailability`.
 * Used both at request time (createTransferRequest, to reject a doomed
 * request up front) and again at completion time (completeTransferRequest,
 * to re-validate against the unit's CURRENT state and compute the actual
 * placement to write).
 */
type SlotRow = { slotNumber: number; status: string };
type TargetUnitRow = { accommodationType: string; status: string; slots: SlotRow[] };

function ensureTargetUnitAvailability(targetUnit: TargetUnitRow): { slotNumber?: number; isPrimary: boolean } {
  if (targetUnit.accommodationType === 'bedspace') {
    const vacantSlot = targetUnit.slots.find((slot) => slot.status === 'vacant');
    if (!vacantSlot) {
      throw Object.assign(new Error('Target bedspace unit has no vacant slots'), { statusCode: 400 });
    }
    return { slotNumber: vacantSlot.slotNumber, isPrimary: false };
  }

  if (targetUnit.status !== 'vacant') {
    throw Object.assign(
      new Error(`Target unit is ${targetUnit.status} and cannot accept transfer`),
      { statusCode: 400 }
    );
  }

  return { slotNumber: undefined, isPrimary: true };
}

/**
 * Pure computation of the SOURCE unit's release plan -- verbatim port of the
 * original's `releaseCurrentUnitOccupancy`. The `hasOccupiedSlots` check
 * deliberately excludes the slot being released (`slot.slotNumber !==
 * releaseSlotNumber`), matching the original's in-place array mutation
 * (which flipped that slot to 'vacant' BEFORE checking `.some(status ===
 * 'occupied')`, so it could never see its own just-released slot as
 * occupied) -- same translation tenancy.service.ts's `processCheckout`
 * already established for the identical Mongoose pattern.
 */
function computeReleasePlan(
  tenancySlotNumber: number | null,
  fromUnit: TargetUnitRow
): { slotNumber?: number; newUnitStatus: string } {
  if (fromUnit.accommodationType === 'bedspace' && tenancySlotNumber) {
    const hasOccupiedSlots = fromUnit.slots.some(
      (slot) => slot.slotNumber !== tenancySlotNumber && slot.status === 'occupied'
    );
    return { slotNumber: tenancySlotNumber, newUnitStatus: hasOccupiedSlots ? 'occupied' : 'vacant' };
  }
  return { slotNumber: undefined, newUnitStatus: 'vacant' };
}

/**
 * Pure computation of the TARGET unit's occupy plan -- verbatim port of the
 * original's `occupyTargetUnit`. `allOccupied` deliberately counts the
 * slot being claimed as occupied (`slot.slotNumber === placement.slotNumber`),
 * matching the original's in-place mutation-then-check order (same
 * translation tenancy.service.ts's `confirmCheckin` already established for
 * its own identical `allOccupied` pattern).
 */
function computeOccupyPlan(
  toUnit: TargetUnitRow,
  placement: { slotNumber?: number; isPrimary: boolean }
): { slotNumber?: number; newUnitStatus: string } {
  if (toUnit.accommodationType === 'bedspace') {
    const allOccupied = toUnit.slots.every(
      (slot) => slot.slotNumber === placement.slotNumber || slot.status === 'occupied'
    );
    return { slotNumber: placement.slotNumber, newUnitStatus: allOccupied ? 'occupied' : 'vacant' };
  }
  return { slotNumber: undefined, newUnitStatus: 'occupied' };
}

async function getScopedPropertiesForManager(user: { id: string; role: string }): Promise<string[] | null> {
  if (user.role === 'super_admin') {
    return null;
  }
  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({ where: { landlordId: user.id }, select: { id: true } });
    return properties.map((p) => p.id);
  }
  if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: user.id },
      select: { propertyId: true },
    });
    return assignments.map((a) => a.propertyId);
  }
  throw Object.assign(new Error('Access denied'), { statusCode: 403 });
}

// ─────────────────────────────────────────────────────────────
//  createTransferRequest
//
//  WRITE SET (inside one prisma.$transaction):
//    1. transferRequest.create -- the new request row
//    2. notification.create    -- to the current property's landlord
//  Under Mongoose these were two independent, non-atomic writes (a crash
//  after step 1 could leave a filed transfer request the landlord is never
//  notified about); wrapped here following the same "two writes, one
//  transaction" pattern every other create-plus-notify path in this
//  migration already uses (e.g. tenancy.service.ts's addComment).
// ─────────────────────────────────────────────────────────────

export const createTransferRequest = async (
  userId: string,
  data: { tenancyId: string; toUnitId: string; reason: string }
) => {
  const user = await ensureUser(userId);

  // Invalid-id collapse (task-14 pattern, verbatim): a malformed/Mongo-
  // ObjectId-shaped tenancyId is not a valid Postgres UUID -- collapse it
  // into the exact same 404 this function already throws for a missing
  // tenancy.
  if (!isValidId(data.tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: data.tenancyId },
    include: { property: true, unit: true },
  });
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }
  if (tenancy.status !== 'checked_in') {
    throw Object.assign(new Error('Only checked-in tenancies can request transfer'), { statusCode: 400 });
  }

  const property = tenancy.property;
  const isTenantOwner = tenancy.userId === userId;
  const isLandlord = property.landlordId === userId;
  const isAdmin = user.role === 'super_admin';

  if (!isTenantOwner && !isLandlord && !isAdmin) {
    throw Object.assign(
      new Error('Only the tenant owner or landlord can initiate transfer'),
      { statusCode: 403 }
    );
  }

  if (!isValidId(data.toUnitId)) {
    throw Object.assign(new Error('Target unit not found'), { statusCode: 404 });
  }

  const toUnit = await prisma.unit.findUnique({
    where: { id: data.toUnitId },
    include: { property: true, slots: true },
  });
  if (!toUnit) {
    throw Object.assign(new Error('Target unit not found'), { statusCode: 404 });
  }
  if (toUnit.id === tenancy.unitId) {
    throw Object.assign(new Error('Target unit must be different from current unit'), { statusCode: 400 });
  }

  const fromLandlordId = property.landlordId;
  const toLandlordId = toUnit.property.landlordId;
  if (!isAdmin && fromLandlordId !== toLandlordId) {
    throw Object.assign(
      new Error('Transfer is only allowed between properties of the same landlord'),
      { statusCode: 400 }
    );
  }

  ensureTargetUnitAvailability(toUnit);

  const existingPending = await prisma.transferRequest.findFirst({
    where: { tenancyId: tenancy.id, status: { in: ['pending', 'approved'] } },
  });
  if (existingPending) {
    throw Object.assign(
      new Error('There is already an active transfer request for this tenancy'),
      { statusCode: 409 }
    );
  }

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const transferRequest = await tx.transferRequest.create({
        data: {
          tenancyId: tenancy.id,
          propertyId: property.id,
          fromUnitId: tenancy.unitId,
          toUnitId: toUnit.id,
          reason: data.reason,
          status: 'pending',
          initiatedByUserId: userId,
        },
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'tenancy',
          title: 'New Transfer Request',
          message: `A transfer request was filed from ${tenancy.unit.unitIdentifier} to ${toUnit.unitIdentifier}.`,
          link: `/hub/pipeline/transfers/${transferRequest.id}`,
          metadata: { transferRequestId: transferRequest.id, tenancyId: tenancy.id },
        },
      });

      return transferRequest;
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.transferRequest.findUnique({
    where: { id: created.id },
    include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_CHECKIN_SELECT } },
  });

  return serializeDoc(remapTransferRequest(populated!));
};

export const getMyTransferRequests = async (userId: string) => {
  const user = await ensureUser(userId);
  if (user.role !== 'user') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const tenancies = await prisma.tenancy.findMany({ where: { userId }, select: { id: true } });
  const tenancyIds = tenancies.map((t) => t.id);

  const transferRequests = await prisma.transferRequest.findMany({
    where: { tenancyId: { in: tenancyIds } },
    include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_CHECKIN_CHECKOUT_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(transferRequests.map((row) => remapTransferRequest(row)));
};

export const getTransferRequests = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user = await ensureUser(userId);
  const scopedPropertyIds = await getScopedPropertiesForManager(user);

  const query: Prisma.TransferRequestWhereInput = {};
  if (scopedPropertyIds !== null) {
    query.propertyId = { in: scopedPropertyIds };
  }

  if (filters.propertyId) {
    // Invalid-id guard for an AUTHENTICATED route (property.service.ts's own
    // convention, not task-14's public-route collapse): a malformed id is a
    // genuine, distinguishable client bug for a signed-in caller, so it gets
    // its own 400 rather than folding into verifyPropertyManagementAccess's
    // 404.
    if (!isValidId(filters.propertyId)) {
      throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
    }
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    query.propertyId = filters.propertyId;
  }
  if (filters.status) {
    query.status = filters.status as Prisma.TransferRequestWhereInput['status'];
  }

  const transferRequests = await prisma.transferRequest.findMany({
    where: query,
    include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_CHECKIN_CHECKOUT_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(transferRequests.map((row) => remapTransferRequest(row)));
};

// ─────────────────────────────────────────────────────────────
//  approveTransferRequest
//
//  WRITE SET (inside one prisma.$transaction):
//    1. transferRequest.update -- status -> 'approved', reviewedBy/reviewedAt/reviewNotes
//    2. notification.create    -- to the tenant
//  Same non-atomicity fix as createTransferRequest's write pair.
// ─────────────────────────────────────────────────────────────

export const approveTransferRequest = async (userId: string, transferRequestId: string, reviewNotes?: string) => {
  if (!isValidId(transferRequestId)) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }

  const transferRequest = await prisma.transferRequest.findUnique({
    where: { id: transferRequestId },
    include: { tenancy: true },
  });
  if (!transferRequest) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }
  if (transferRequest.status !== 'pending') {
    throw Object.assign(
      new Error(`Only pending requests can be approved. Current status: ${transferRequest.status}`),
      { statusCode: 400 }
    );
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId);
  if (management.user.role === 'staff') {
    throw Object.assign(new Error('Only landlord can approve transfer requests'), { statusCode: 403 });
  }

  const tenancy = transferRequest.tenancy;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'approved',
          reviewedBy: management.user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes ?? null,
        },
      });

      if (tenancy) {
        await tx.notification.create({
          data: {
            userId: tenancy.userId,
            type: 'tenancy',
            title: 'Transfer Request Approved',
            message: 'Your transfer request has been approved and is ready for completion.',
            link: `/u/my-transfers/${transferRequest.id}`,
            metadata: { transferRequestId: transferRequest.id, tenancyId: tenancy.id },
          },
        });
      }
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.transferRequest.findUnique({
    where: { id: transferRequest.id },
    include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_CHECKIN_SELECT } },
  });

  return serializeDoc(remapTransferRequest(populated!));
};

// ─────────────────────────────────────────────────────────────
//  rejectTransferRequest -- same write shape/atomicity fix as approve.
// ─────────────────────────────────────────────────────────────

export const rejectTransferRequest = async (userId: string, transferRequestId: string, reviewNotes?: string) => {
  if (!isValidId(transferRequestId)) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }

  const transferRequest = await prisma.transferRequest.findUnique({
    where: { id: transferRequestId },
    include: { tenancy: true },
  });
  if (!transferRequest) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }
  if (transferRequest.status !== 'pending') {
    throw Object.assign(
      new Error(`Only pending requests can be rejected. Current status: ${transferRequest.status}`),
      { statusCode: 400 }
    );
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId);
  if (management.user.role === 'staff') {
    throw Object.assign(new Error('Only landlord can reject transfer requests'), { statusCode: 403 });
  }

  const tenancy = transferRequest.tenancy;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transferRequest.update({
        where: { id: transferRequest.id },
        data: {
          status: 'rejected',
          reviewedBy: management.user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes ?? null,
        },
      });

      if (tenancy) {
        await tx.notification.create({
          data: {
            userId: tenancy.userId,
            type: 'tenancy',
            title: 'Transfer Request Rejected',
            message: reviewNotes
              ? `Your transfer request was rejected. Note: ${reviewNotes}`
              : 'Your transfer request was rejected.',
            link: `/u/my-transfers/${transferRequest.id}`,
            metadata: { transferRequestId: transferRequest.id, tenancyId: tenancy.id },
          },
        });
      }
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.transferRequest.findUnique({
    where: { id: transferRequest.id },
    include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_CHECKIN_SELECT } },
  });

  return serializeDoc(remapTransferRequest(populated!));
};

// ─────────────────────────────────────────────────────────────
//  completeTransferRequest — moves a checked-in tenant from one unit to
//  another. The densest write in this service; see the module-level report
//  (task-24-report.md) for the full write-set/atomicity writeup.
//
//  WRITE SET (ALL inside one prisma.$transaction, explicit 15000ms timeout):
//    1. unitSlot.update      -- bedspace only: release the SOURCE slot -> vacant, tenancyId cleared
//    2. unit.update          -- source unit's own status (room: vacant; bedspace: vacant/occupied per remaining slots)
//    3. unitSlot.update      -- bedspace only: claim the TARGET slot -> occupied, tenancyId linked
//    4. unit.update          -- target unit's own status (room: occupied; bedspace: occupied only if now all slots full)
//    5. tenancy.update       -- unitId/propertyId/slotNumber/isPrimary moved onto the target unit
//    6. contract.update      -- unitId/propertyId moved to match (contract always exists: tenancy.contractId is a required FK)
//    7. bill.updateMany      -- reassign future OPEN bills (balance>0, due>=now, unpaid/partial/overdue) to the new unit/property
//    8. transferRequest.update -- status -> 'completed', completedAt, reviewedBy, reviewedAt
//    9. notification.create x2 -- tenant + the ORIGINAL property's landlord
//
//  Under Mongoose these were up to 9 independent document writes/saves with
//  NO atomicity: a crash partway through could leave a tenant occupying two
//  units at once (both marked occupied), occupying neither (both released),
//  or a tenancy pointing at a unit whose own slot/status was never flipped
//  to match. This is the seventh such fix in this migration and the most
//  consequential.
//
//  The property-metrics trigger (units_refresh_property_metrics) fires on
//  writes 2 and 4 above and is left untouched -- it recomputes each unit's
//  OWN property row itself; this code never writes metric columns directly.
//  fromUnit/toUnit each keep their own property_id unchanged here (only the
//  TENANCY/contract/bills move property, never the units themselves), so the
//  trigger independently refreshes each unit's own property on its own
//  UPDATE OF status -- both properties end up correct even when they differ
//  (a cross-property transfer), with no special-casing needed.
//
//  Explicit timeout: up to 9 writes (2 conditional slot updates + 2 unit
//  updates + 1 tenancy update + 1 conditional contract update + 1 updateMany
//  + 1 transferRequest update + 2 inserts) -- more round trips than any other
//  single transaction in this migration so far. Raised from Prisma's 5000ms
//  default to stay well clear of it under a hosted (non-local) Postgres
//  instance, rather than splitting the transaction and losing the atomicity
//  this task exists to add.
// ─────────────────────────────────────────────────────────────

export const completeTransferRequest = async (userId: string, transferRequestId: string) => {
  if (!isValidId(transferRequestId)) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }

  const transferRequest = await prisma.transferRequest.findUnique({ where: { id: transferRequestId } });
  if (!transferRequest) {
    throw Object.assign(new Error('Transfer request not found'), { statusCode: 404 });
  }
  if (transferRequest.status !== 'approved') {
    throw Object.assign(
      new Error(`Only approved requests can be completed. Current status: ${transferRequest.status}`),
      { statusCode: 400 }
    );
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId);
  if (management.user.role === 'staff') {
    throw Object.assign(new Error('Only landlord can complete transfer requests'), { statusCode: 403 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: transferRequest.tenancyId },
    include: { contract: true, user: true },
  });
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }
  if (tenancy.status !== 'checked_in') {
    throw Object.assign(new Error('Only checked-in tenancies can be transferred'), { statusCode: 400 });
  }

  const [fromUnit, toUnit] = await Promise.all([
    prisma.unit.findUnique({ where: { id: transferRequest.fromUnitId }, include: { slots: true } }),
    prisma.unit.findUnique({ where: { id: transferRequest.toUnitId }, include: { slots: true } }),
  ]);
  if (!fromUnit || !toUnit) {
    throw Object.assign(new Error('Transfer units not found'), { statusCode: 404 });
  }
  if (tenancy.unitId !== fromUnit.id) {
    throw Object.assign(
      new Error('Transfer source unit no longer matches tenancy unit'),
      { statusCode: 409 }
    );
  }

  // Re-validate against the unit's CURRENT state (not any snapshot taken at
  // request time) and compute the actual placement to write.
  const placement = ensureTargetUnitAvailability(toUnit);
  const releasePlan = computeReleasePlan(tenancy.slotNumber, fromUnit);
  const occupyPlan = computeOccupyPlan(toUnit, placement);

  const previousUnitId = tenancy.unitId;
  const previousPropertyId = tenancy.propertyId;
  const contract = tenancy.contract;
  const tenant = tenancy.user;
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        if (releasePlan.slotNumber !== undefined) {
          await tx.unitSlot.update({
            where: { unitId_slotNumber: { unitId: fromUnit.id, slotNumber: releasePlan.slotNumber } },
            data: { status: 'vacant', tenancyId: null },
          });
        }
        await tx.unit.update({
          where: { id: fromUnit.id },
          data: { status: releasePlan.newUnitStatus as Prisma.UnitUpdateInput['status'] },
        });

        if (occupyPlan.slotNumber !== undefined) {
          await tx.unitSlot.update({
            where: { unitId_slotNumber: { unitId: toUnit.id, slotNumber: occupyPlan.slotNumber } },
            data: { status: 'occupied', tenancyId: tenancy.id },
          });
        }
        await tx.unit.update({
          where: { id: toUnit.id },
          data: { status: occupyPlan.newUnitStatus as Prisma.UnitUpdateInput['status'] },
        });

        await tx.tenancy.update({
          where: { id: tenancy.id },
          data: {
            unitId: toUnit.id,
            propertyId: toUnit.propertyId,
            slotNumber: placement.slotNumber ?? null,
            isPrimary: placement.isPrimary,
          },
        });

        if (contract) {
          await tx.contract.update({
            where: { id: contract.id },
            data: { unitId: toUnit.id, propertyId: toUnit.propertyId },
          });
        }

        // Update future open bills so upcoming collections align to the new unit.
        await tx.bill.updateMany({
          where: {
            tenancyId: tenancy.id,
            balanceAmount: { gt: 0 },
            dueDate: { gte: now },
            status: { in: ['unpaid', 'partial', 'overdue'] },
          },
          data: { propertyId: toUnit.propertyId, unitId: toUnit.id },
        });

        await tx.transferRequest.update({
          where: { id: transferRequest.id },
          data: {
            status: 'completed',
            completedAt: now,
            reviewedBy: management.user.id,
            reviewedAt: transferRequest.reviewedAt ?? now,
          },
        });

        await tx.notification.create({
          data: {
            userId: tenant.id,
            type: 'tenancy',
            title: 'Transfer Completed',
            message: `Your transfer to unit ${toUnit.unitIdentifier} is complete.`,
            link: '/u/my-room',
            metadata: {
              transferRequestId: transferRequest.id,
              tenancyId: tenancy.id,
              fromUnitId: previousUnitId,
              toUnitId: toUnit.id,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: management.property.landlordId,
            type: 'tenancy',
            title: 'Tenant Transfer Completed',
            message: `${tenant.name} was transferred to ${toUnit.unitIdentifier}.`,
            link: `/hub/tenants/${tenancy.id}`,
            metadata: {
              transferRequestId: transferRequest.id,
              tenancyId: tenancy.id,
              fromPropertyId: previousPropertyId,
              toPropertyId: toUnit.propertyId,
            },
          },
        });
      },
      { timeout: 15000 }
    );
  } catch (e) {
    throw toHttpError(e);
  }

  const [populatedTransferRequest, populatedTenancy] = await Promise.all([
    prisma.transferRequest.findUnique({
      where: { id: transferRequest.id },
      include: { ...TRANSFER_REQUEST_SHARED_INCLUDE, tenancy: { select: TENANCY_COMPLETE_SELECT } },
    }),
    prisma.tenancy.findUnique({
      where: { id: tenancy.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        property: { select: PROPERTY_REF_SELECT },
        unit: {
          select: {
            id: true,
            unitIdentifier: true,
            accommodationType: true,
            status: true,
            slots: { orderBy: { slotNumber: 'asc' as const } },
          },
        },
        contract: { select: { id: true, status: true, startDate: true, endDate: true, monthlyRent: true } },
      },
    }),
  ]);

  return serializeDoc({
    transferRequest: remapTransferRequest(populatedTransferRequest!),
    tenancy: remapCompletedTenancy(populatedTenancy!),
  });
};

// ─────────────────────────────────────────────────────────────
//  completeTransferRequest's own tenancy embed shape:
//  `.populate('userId', 'name email phone avatar')`
//  `.populate('propertyId', 'name address')`         -- via propertyRef.mapper.ts
//  `.populate('unitId', 'unitIdentifier accommodationType slots status')`
//  `.populate('contractId', 'status startDate endDate monthlyRent')`
//  Kept local (not reusing tenancy.service.ts's own remap helpers, per the
//  brief: transfer.service.ts must not import from/modify tenancy.service.ts)
//  -- `propertyId`'s shape happens to be EXACTLY propertyRef.mapper.ts's own
//  narrow `{id, name, address}` projection (`PROPERTY_REF_SELECT`/
//  `shapePropertyRef`, reused directly below), unlike any of tenancy.service.ts's
//  own three wider property variants (which all add images/landlordId/metrics).
// ─────────────────────────────────────────────────────────────
type CompletedTenancySlotRow = { slotNumber: number; status: string; tenancyId: string | null };
type CompletedTenancyUnitRow = {
  id: string;
  unitIdentifier: string;
  accommodationType: string;
  status: string;
  slots: CompletedTenancySlotRow[];
};

function shapeCompletedTenancyUnit(row: CompletedTenancyUnitRow): Record<string, unknown> {
  return {
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    slots: row.slots
      .slice()
      .sort((a, b) => a.slotNumber - b.slotNumber)
      .map((s) => ({
        slotNumber: s.slotNumber,
        status: s.status,
        ...(s.tenancyId !== null && s.tenancyId !== undefined ? { tenancyId: s.tenancyId } : {}),
      })),
    status: row.status,
  };
}

function remapCompletedTenancy(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, contract, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (user !== undefined) {
    out.userId = stripNulls({ id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar });
  }
  if (property !== undefined) out.propertyId = shapePropertyRef(property);
  if (unit !== undefined) out.unitId = shapeCompletedTenancyUnit(unit);
  if (contract !== undefined) {
    out.contractId = {
      id: contract.id,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlyRent: contract.monthlyRent,
    };
  }
  return out;
}
