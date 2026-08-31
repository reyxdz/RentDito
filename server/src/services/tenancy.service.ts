import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';

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
// personalDetails <-> pd_* columns. Tenancy.personalDetails is copied
// VERBATIM from RentalApplication.personalDetails at check-in time -- and
// since Task 19 already flattened RentalApplication itself down to the same
// eight pd_* columns, confirmCheckin's write side is a direct column-to-
// column copy (no nested-object flatten needed, unlike application.service.ts's
// own write side, which still takes a nested `personalDetails` object from
// the client). Only the READ-side rebuild is duplicated here, per this
// migration's established convention of duplicating small per-file helpers
// rather than reaching across service files for something application.service.ts
// never exported (see that file's own comment on PROPERTY_TYPE_FROM_DB).
// ═══════════════════════════════════════════════════════════════════════
interface PdColumns {
  pdFullName: string;
  pdPhone: string;
  pdOccupation: string;
  pdSchool: string | null;
  pdAddress: string;
  pdEmergencyName: string;
  pdEmergencyPhone: string;
  pdEmergencyRelationship: string;
}

function shapePersonalDetails(row: PdColumns): Record<string, unknown> {
  const personalDetails: Record<string, unknown> = {
    fullName: row.pdFullName,
    phone: row.pdPhone,
    occupation: row.pdOccupation,
  };
  if (row.pdSchool !== null && row.pdSchool !== undefined) {
    personalDetails.school = row.pdSchool;
  }
  personalDetails.address = row.pdAddress;
  personalDetails.emergencyContact = {
    name: row.pdEmergencyName,
    phone: row.pdEmergencyPhone,
    relationship: row.pdEmergencyRelationship,
  };
  return personalDetails;
}

// ═══════════════════════════════════════════════════════════════════════
// comments <-> tenancy_comments child table. Mongoose embedded
// `comments: [{ userId, role, text, createdAt }]` directly on the Tenancy
// document; Postgres promotes it to a real child table, but the API must
// still present `comments` as an ordered array ON the tenancy (per this
// task's brief). Every read path below includes `comments: { orderBy:
// { createdAt: 'asc' } }` and this helper rebuilds the embedded-array shape
// -- `userId` stays a RAW scalar FK here (matches the original: Tenancy's
// own `.populate()` calls never cascaded into `comments.userId`; only
// getComments's OWN dedicated `.populate('comments.userId', 'name avatar')`
// does, handled separately by shapeCommentPopulated below).
// ═══════════════════════════════════════════════════════════════════════
type CommentRawRow = { id: string; userId: string; role: string; text: string; createdAt: Date };

function shapeCommentsRaw(rows: CommentRawRow[]): Record<string, unknown>[] {
  return rows.map((c) => ({ id: c.id, userId: c.userId, role: c.role, text: c.text, createdAt: c.createdAt }));
}

/** `.populate('comments.userId', 'name avatar')` -- getComments only. */
const COMMENT_USER_SELECT = { id: true, name: true, avatar: true } satisfies Prisma.ProfileSelect;
type CommentUserRow = { id: string; name: string; avatar: string | null };
type CommentPopulatedRow = { id: string; role: string; text: string; createdAt: Date; user: CommentUserRow };

function shapeCommentPopulated(row: CommentPopulatedRow): Record<string, unknown> {
  return {
    id: row.id,
    userId: stripNulls({ id: row.user.id, name: row.user.name, avatar: row.user.avatar }),
    role: row.role,
    text: row.text,
    createdAt: row.createdAt,
  };
}

/** `.populate('userId', 'name avatar phone')` -- getRoommates only. */
const ROOMMATE_USER_SELECT = { id: true, name: true, avatar: true, phone: true } satisfies Prisma.ProfileSelect;

// ═══════════════════════════════════════════════════════════════════════
// Relation shapes for the four "full tenancy" read paths (getMyTenancies,
// getTenancies, getTenancyById, and the shared confirmCheckin/processCheckout
// mutation-return shape). Kept as four distinct select-const groups, per the
// established property.service.ts/contract.service.ts precedent -- collapsing
// any of them would change response content and fail a fixture.
// ═══════════════════════════════════════════════════════════════════════

/** `.populate('propertyId', 'name address images')` -- getMyTenancies + confirmCheckin/processCheckout return. */
const PROPERTY_IMAGES_SELECT = { ...PROPERTY_REF_SELECT, images: true } satisfies Prisma.PropertySelect;
/** `.populate('propertyId', 'name address')` -- getTenancies (list) only. */
const PROPERTY_BASIC_SELECT = { ...PROPERTY_REF_SELECT } satisfies Prisma.PropertySelect;
/** `.populate('propertyId', 'name address landlordId images')` -- getTenancyById only. */
const PROPERTY_WITH_LANDLORD_IMAGES_SELECT = {
  ...PROPERTY_REF_SELECT,
  landlordId: true,
  images: true,
} satisfies Prisma.PropertySelect;

/** `.populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent')` -- getMyTenancies only. */
const UNIT_RENT_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  roomRent: true,
  bedspaceRent: true,
} satisfies Prisma.UnitSelect;
/** `.populate('unitId', 'unitIdentifier accommodationType')` -- getTenancies (list) only. */
const UNIT_BASIC_SELECT = { id: true, unitIdentifier: true, accommodationType: true } satisfies Prisma.UnitSelect;
/**
 * `.populate('unitId', 'unitIdentifier accommodationType slots status')` --
 * confirmCheckin + processCheckout return only.
 */
const UNIT_SLOTS_STATUS_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  status: true,
  slots: { orderBy: { slotNumber: 'asc' as const } },
} satisfies Prisma.UnitSelect;
/**
 * `.populate('unitId', 'unitIdentifier accommodationType roomRent bedspaceRent
 * deposit features images slots status')` -- getTenancyById only (widest).
 */
const UNIT_WIDE_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  roomRent: true,
  bedspaceRent: true,
  deposit: true,
  features: true,
  images: true,
  status: true,
  slots: { orderBy: { slotNumber: 'asc' as const } },
} satisfies Prisma.UnitSelect;

/** `.populate('contractId', 'status startDate endDate monthlyRent')` -- getTenancies (list) + confirmCheckin/processCheckout return. */
const CONTRACT_BASIC_SELECT = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  monthlyRent: true,
} satisfies Prisma.ContractSelect;
/** `.populate('contractId', '... lockInPeriod')` -- getMyTenancies only. */
const CONTRACT_LOCKIN_SELECT = { ...CONTRACT_BASIC_SELECT, lockInPeriod: true } satisfies Prisma.ContractSelect;
/** `.populate('contractId', '... securityDeposit advancePayment signedAt documentUrl')` -- getTenancyById only (widest). */
const CONTRACT_WIDE_SELECT = {
  ...CONTRACT_LOCKIN_SELECT,
  securityDeposit: true,
  advancePayment: true,
  signedAt: true,
  documentUrl: true,
} satisfies Prisma.ContractSelect;

/** `.populate('userId', 'name email phone avatar')` -- getTenancies (list) + confirmCheckin/processCheckout return. */
const USER_CONTACT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;
/** `.populate('userId', '... verificationStatus')` -- getTenancyById only. */
const USER_DETAIL_SELECT = { ...USER_CONTACT_SELECT, verificationStatus: true } satisfies Prisma.ProfileSelect;

type PropertyImagesRow = Parameters<typeof shapePropertyRef>[0] & { images: string[] };
type PropertyLandlordImagesRow = PropertyImagesRow & { landlordId: string };
type SlotRow = { slotNumber: number; status: string; tenancyId: string | null };
type UnitBasicRow = { id: string; unitIdentifier: string; accommodationType: string };
type UnitRentRow = UnitBasicRow & { roomRent: unknown; bedspaceRent: unknown };
type UnitSlotsStatusRow = UnitBasicRow & { status: string; slots: SlotRow[] };
type UnitWideRow = UnitSlotsStatusRow & {
  roomRent: unknown;
  bedspaceRent: unknown;
  deposit: unknown;
  features: string[];
  images: string[];
};
type ContractBasicRow = { id: string; status: string; startDate: Date; endDate: Date; monthlyRent: unknown };
type ContractLockinRow = ContractBasicRow & { lockInPeriod: number };
type ContractWideRow = ContractLockinRow & {
  securityDeposit: unknown;
  advancePayment: unknown;
  signedAt: Date | null;
  documentUrl: string | null;
};
type UserContactRow = { id: string; name: string; email: string; phone: string | null; avatar: string | null };
type UserDetailRow = UserContactRow & { verificationStatus: string };

const shapePropertyWithImages = (row: PropertyImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  images: row.images ?? [],
});
const shapePropertyBasic = (row: Parameters<typeof shapePropertyRef>[0]): Record<string, unknown> =>
  shapePropertyRef(row);
const shapePropertyWithLandlordImages = (row: PropertyLandlordImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  landlordId: row.landlordId,
  images: row.images ?? [],
});

/**
 * Rebuilds the `slots` embedded-array shape from `unit_slots` child rows,
 * sorted by `slotNumber` for a deterministic response (same convention
 * unit.service.ts's own `shapeUnit` established -- Mongoose's `SlotSchema`
 * used `{ _id: false }`, so entries are picked field-by-field, no id minted).
 */
function shapeSlots(slots: SlotRow[]): Record<string, unknown>[] {
  return slots
    .slice()
    .sort((a, b) => a.slotNumber - b.slotNumber)
    .map((s) => ({
      slotNumber: s.slotNumber,
      status: s.status,
      ...(s.tenancyId !== null && s.tenancyId !== undefined ? { tenancyId: s.tenancyId } : {}),
    }));
}

const shapeUnitRent = (row: UnitRentRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    roomRent: row.roomRent,
    bedspaceRent: row.bedspaceRent,
  });
const shapeUnitBasic = (row: UnitBasicRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
  accommodationType: row.accommodationType,
});
const shapeUnitSlotsStatus = (row: UnitSlotsStatusRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
  accommodationType: row.accommodationType,
  slots: shapeSlots(row.slots ?? []),
  status: row.status,
});
const shapeUnitWide = (row: UnitWideRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    roomRent: row.roomRent,
    bedspaceRent: row.bedspaceRent,
    deposit: row.deposit,
    features: row.features,
    images: row.images,
    slots: shapeSlots(row.slots ?? []),
    status: row.status,
  });

const shapeContractBasic = (row: ContractBasicRow): Record<string, unknown> => ({
  id: row.id,
  status: row.status,
  startDate: row.startDate,
  endDate: row.endDate,
  monthlyRent: row.monthlyRent,
});
const shapeContractLockin = (row: ContractLockinRow): Record<string, unknown> => ({
  ...shapeContractBasic(row),
  lockInPeriod: row.lockInPeriod,
});
const shapeContractWide = (row: ContractWideRow): Record<string, unknown> =>
  stripNulls({
    ...shapeContractLockin(row),
    securityDeposit: row.securityDeposit,
    advancePayment: row.advancePayment,
    signedAt: row.signedAt,
    documentUrl: row.documentUrl,
  });

const shapeUserContact = (row: UserContactRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, email: row.email, phone: row.phone, avatar: row.avatar });
const shapeUserDetail = (row: UserDetailRow): Record<string, unknown> =>
  stripNulls({ ...shapeUserContact(row), verificationStatus: row.verificationStatus });

/**
 * Column-reshape step shared by every "full tenancy" remap variant below,
 * orthogonal to relation remapping (property.service.ts's established split,
 * task 10): rebuilds `personalDetails` from the eight `pd_*` columns,
 * defaults `householdMembers` (a nullable jsonb column with no Mongoose
 * equivalent default) to `[]` -- the fixture always shows `householdMembers:
 * []`, never an absent key or `null`, so this is NOT the usual "omit null
 * key" treatment -- and rebuilds `comments` from the included child rows.
 * Leaves `user`/`property`/`unit`/`contract` relation keys (when present)
 * untouched for the caller's own remap step.
 */
function withTenancyCore(row: Record<string, any>): Record<string, unknown> {
  const {
    pdFullName,
    pdPhone,
    pdOccupation,
    pdSchool,
    pdAddress,
    pdEmergencyName,
    pdEmergencyPhone,
    pdEmergencyRelationship,
    householdMembers,
    comments,
    ...rest
  } = row;

  return {
    ...stripNulls(rest),
    householdMembers: householdMembers ?? [],
    personalDetails: shapePersonalDetails({
      pdFullName,
      pdPhone,
      pdOccupation,
      pdSchool,
      pdAddress,
      pdEmergencyName,
      pdEmergencyPhone,
      pdEmergencyRelationship,
    }),
    comments: comments !== undefined ? shapeCommentsRaw(comments) : [],
  };
}

/** Remaps getMyTenancies rows: `propertyId` (+images) + `unitId` (rent) + `contractId` (+lockInPeriod). `userId` never populated (matches original). */
function remapMyTenancy(row: Record<string, any>): Record<string, unknown> {
  const core = withTenancyCore(row);
  const { property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined) out.unitId = shapeUnitRent(unit);
  if (contract !== undefined) out.contractId = shapeContractLockin(contract);
  return out;
}

/** Remaps getTenancies (list) rows: `userId` (contact) + `propertyId` (name/address) + `unitId` (basic) + `contractId` (basic). */
function remapListTenancy(row: Record<string, any>): Record<string, unknown> {
  const core = withTenancyCore(row);
  const { user, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (property !== undefined) out.propertyId = shapePropertyBasic(property);
  if (unit !== undefined) out.unitId = shapeUnitBasic(unit);
  if (contract !== undefined) out.contractId = shapeContractBasic(contract);
  return out;
}

/** Remaps getTenancyById's row: `userId` (detail) + `propertyId` (+landlordId/images) + `unitId` (wide) + `contractId` (wide). */
function remapByIdTenancy(row: Record<string, any>): Record<string, unknown> {
  const core = withTenancyCore(row);
  const { user, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (user !== undefined) out.userId = shapeUserDetail(user);
  if (property !== undefined) out.propertyId = shapePropertyWithLandlordImages(property);
  if (unit !== undefined) out.unitId = shapeUnitWide(unit);
  if (contract !== undefined) out.contractId = shapeContractWide(contract);
  return out;
}

/** Remaps confirmCheckin/processCheckout's shared return shape: `userId` (contact) + `propertyId` (+images) + `unitId` (slots+status) + `contractId` (basic). */
function remapMutationTenancy(row: Record<string, any>): Record<string, unknown> {
  const core = withTenancyCore(row);
  const { user, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined) out.unitId = shapeUnitSlotsStatus(unit);
  if (contract !== undefined) out.contractId = shapeContractBasic(contract);
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Whether `staffId` is assigned to `propertyId` -- the direct replacement for
 * Mongoose's `user.assignedPropertyIds?.some(...)`, which lived directly on
 * the User document; in Postgres it's the `staff_property_assignments` join
 * table (same pattern duplicated in every other ported service's own
 * scoped-access checks).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Verify the caller is a landlord/staff with property access, or super_admin.
 * Returns the resolved user document. Direct Prisma port of the original --
 * message/statusCode preserved exactly ('User not found'/404, 'Property not
 * found'/404, 'Access denied'/403). This is what makes
 * `tenancy-checkout-review-owner` correctly deny the tenant-owner a 403: a
 * plain 'user'-role caller is neither landlord, staff, nor admin.
 */
const verifyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return { user, property };
};

/**
 * Pre-checkout review: outstanding bills, unreturned inventory, contract
 * status. `Bill`/`InventoryRecord` belong to billing.service.ts/
 * inventory.service.ts, neither of which is ported yet -- but BOTH already
 * have real Postgres tables (per schema.prisma) seeded with data keyed off
 * the real Postgres `tenancyId`, so this reads them directly via `prisma`
 * (a read-only cross-table query, the same category of "shared Postgres
 * table with no owning-service call" already used by every ported service's
 * own `staffPropertyAssignment` checks) rather than reaching into
 * billing.service.ts/inventory.service.ts's own (still-Mongo) exported
 * functions, and rather than querying MongoDB directly (which would require
 * casting a Postgres UUID tenancy id into a Mongo ObjectId query -- a
 * guaranteed cast error, not a real fallback). No golden fixture exercises
 * this function's content (`tenancy-checkout-review-owner` is a 403 before
 * this ever runs), so the exact bill/inventory sub-shapes below are a
 * faithful-effort port of the original's `.select()`/`.populate()` shape,
 * not fixture-verified.
 */
async function buildCheckoutReview(tenancyId: string, contractId: string) {
  const outstandingBills = await prisma.bill.findMany({
    where: { tenancyId, balanceAmount: { gt: 0 }, status: { in: ['unpaid', 'partial', 'overdue'] } },
    select: {
      id: true,
      type: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  const unreturnedInventoryRows = await prisma.inventoryRecord.findMany({
    where: { tenancyId, status: 'active' },
    select: {
      id: true,
      issuedDate: true,
      quantityIssued: true,
      status: true,
      inventoryItem: { select: { id: true, itemName: true, serialNumber: true } },
    },
    orderBy: { issuedDate: 'asc' },
  });

  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { status: true } });
  const contractStatus: string = contract?.status ?? 'unknown';

  const warnings: string[] = [];
  if (outstandingBills.length > 0) warnings.push(`Outstanding bills found: ${outstandingBills.length}`);
  if (unreturnedInventoryRows.length > 0) warnings.push(`Unreturned inventory found: ${unreturnedInventoryRows.length}`);
  if (contractStatus !== 'active' && contractStatus !== 'signed') {
    warnings.push(`Contract status is '${contractStatus}'.`);
  }

  return {
    outstandingBills: outstandingBills.map((b) => ({
      id: b.id,
      type: b.type,
      dueDate: b.dueDate,
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount,
      balanceAmount: b.balanceAmount,
      status: b.status,
      billingPeriod: { start: b.billingPeriodStart, end: b.billingPeriodEnd },
    })),
    unreturnedInventory: unreturnedInventoryRows.map((r) => ({
      id: r.id,
      inventoryItemId: { id: r.inventoryItem.id, itemName: r.inventoryItem.itemName, serialNumber: r.inventoryItem.serialNumber },
      issuedDate: r.issuedDate,
      quantityIssued: r.quantityIssued,
      status: r.status,
    })),
    contractStatus,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────
//  confirmCheckin — The core check-in orchestration
//
//  WRITE SET (all inside one prisma.$transaction):
//    1. tenancy.create             -- the new Tenancy row
//    2. contract.update            -- status -> 'active', tenancyId linked
//    3. unitSlot.update            -- bedspace only: target slot -> occupied, tenancyId linked
//    4. unit.update (status)       -- room: always -> occupied; bedspace: -> occupied only if now all slots full
//    5. notification.create x2    -- tenant + landlord
//  Under Mongoose these were 4-6 independent document writes with NO
//  atomicity: a crash after step 1 could leave a checked-in Tenancy whose
//  Contract was never marked active, or whose Unit/slot was never marked
//  occupied. Wrapping them in one transaction is a genuine correctness fix,
//  not just a mechanical translation (per this task's brief).
// ─────────────────────────────────────────────────────────────

export const confirmCheckin = async (userId: string, contractId: string, slotNumber?: number) => {
  // Invalid-id collapse (task-14 pattern, verbatim): a malformed/Mongo-
  // ObjectId-shaped contractId is not a valid Postgres UUID -- collapse it
  // into the exact same 404 this function already throws for a missing
  // contract.
  if (!isValidId(contractId)) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  // 1. Load and validate the contract (unqualified populate of propertyId/unitId/userId).
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true, unit: true, user: true },
  });

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  if (contract.status !== 'signed') {
    throw Object.assign(
      new Error(`Contract must be in 'signed' status to check in. Current status: ${contract.status}`),
      { statusCode: 400 }
    );
  }

  // Check if a tenancy already exists for this contract
  const existingTenancy = await prisma.tenancy.findFirst({ where: { contractId } });
  if (existingTenancy) {
    throw Object.assign(new Error('A tenancy already exists for this contract'), { statusCode: 409 });
  }

  const property = contract.property;
  const unit = contract.unit;
  const tenant = contract.user;

  // 2. Verify caller has management access to this property
  await verifyManagementAccess(userId, property.id);

  // 3. Load the current unit state fresh (with slots), not from the contract's populated copy
  const currentUnit = await prisma.unit.findUnique({ where: { id: unit.id }, include: { slots: true } });
  if (!currentUnit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  // 4. Validate unit/slot availability based on accommodation type
  let targetSlotNumber: number | undefined;
  if (currentUnit.accommodationType === 'bedspace') {
    if (!slotNumber) {
      throw Object.assign(new Error('slotNumber is required for bedspace units'), { statusCode: 400 });
    }

    if (!currentUnit.slots || currentUnit.slots.length === 0) {
      throw Object.assign(new Error('Unit has no slots configured'), { statusCode: 400 });
    }

    const targetSlot = currentUnit.slots.find((s) => s.slotNumber === slotNumber);
    if (!targetSlot) {
      throw Object.assign(new Error(`Slot ${slotNumber} does not exist on this unit`), { statusCode: 400 });
    }

    if (targetSlot.status !== 'vacant') {
      throw Object.assign(new Error(`Slot ${slotNumber} is already ${targetSlot.status}`), { statusCode: 400 });
    }

    targetSlotNumber = slotNumber;
  } else {
    if (currentUnit.status !== 'vacant') {
      throw Object.assign(
        new Error(`Unit is currently ${currentUnit.status} and cannot accept check-in`),
        { statusCode: 400 }
      );
    }
  }

  // 5. Get personal details from the related rental application. `contract.applicationId`
  // is a required, DB-enforced FK, so this can never actually miss -- kept as a defensive
  // check matching the original's structure regardless.
  const application = await prisma.rentalApplication.findUnique({ where: { id: contract.applicationId } });
  if (!application) {
    throw Object.assign(new Error('Related rental application not found'), { statusCode: 404 });
  }

  const isBedspace = currentUnit.accommodationType === 'bedspace';
  const allOccupiedAfterCheckin =
    isBedspace && currentUnit.slots.every((s) => s.slotNumber === targetSlotNumber || s.status === 'occupied');
  const newUnitStatus: string = isBedspace ? (allOccupiedAfterCheckin ? 'occupied' : currentUnit.status) : 'occupied';

  // 6-9. Tenancy create + Contract update + (bedspace) slot update + Unit status
  // update + two notifications -- ALL in one transaction. Under Mongoose these
  // were independent document saves with no atomicity: a crash partway through
  // could leave a checked-in tenancy whose contract was never activated, or
  // whose unit/slot was never marked occupied. The property-metrics trigger
  // (units_refresh_property_metrics, fires on UPDATE OF status) runs inside
  // this same transaction when step 4 below executes and is left untouched --
  // it recomputes properties.total_units/occupied_units/vacant_units/
  // occupancy_rate itself; this code never writes those columns directly.
  //
  // Explicit timeout: this transaction does a create, an update, up to two
  // more updates, and two inserts -- more round trips than any other single
  // transaction in this migration so far (contract.service.ts's addSignature,
  // the closest precedent, tops out at 3). Raised from Prisma's 5000ms
  // default to stay well clear of it under a hosted (non-local) Postgres
  // instance, rather than splitting the transaction and losing the atomicity
  // this task exists to add.
  const created = await prisma.$transaction(
    async (tx) => {
      const tenancy = await tx.tenancy.create({
        data: {
          userId: tenant.id,
          propertyId: property.id,
          unitId: currentUnit.id,
          contractId: contract.id,
          status: 'checked_in',
          checkInDate: new Date(),
          slotNumber: isBedspace ? targetSlotNumber! : null,
          isPrimary: !isBedspace,
          pdFullName: application.pdFullName,
          pdPhone: application.pdPhone,
          pdOccupation: application.pdOccupation,
          pdSchool: application.pdSchool,
          pdAddress: application.pdAddress,
          pdEmergencyName: application.pdEmergencyName,
          pdEmergencyPhone: application.pdEmergencyPhone,
          pdEmergencyRelationship: application.pdEmergencyRelationship,
        },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: { status: 'active', tenancyId: tenancy.id },
      });

      if (isBedspace) {
        await tx.unitSlot.update({
          where: { unitId_slotNumber: { unitId: currentUnit.id, slotNumber: targetSlotNumber! } },
          data: { status: 'occupied', tenancyId: tenancy.id },
        });
      }

      await tx.unit.update({
        where: { id: currentUnit.id },
        data: { status: newUnitStatus as Prisma.UnitUpdateInput['status'] },
      });

      await tx.notification.create({
        data: {
          userId: tenant.id,
          type: 'tenancy',
          title: 'Check-In Confirmed',
          message: `Welcome! Your check-in at ${unit.unitIdentifier} in ${property.name} has been confirmed. You are now an active tenant.`,
          link: `/u/my-room`,
          metadata: { tenancyId: tenancy.id, propertyId: property.id, unitId: currentUnit.id },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'tenancy',
          title: 'Tenant Checked In',
          message: `${tenant.name} has checked in to ${unit.unitIdentifier} at ${property.name}`,
          link: `/hub/tenants/${tenancy.id}`,
          metadata: { tenancyId: tenancy.id, propertyId: property.id, unitId: currentUnit.id },
        },
      });

      return tenancy;
    },
    { timeout: 15000 }
  );

  // 10. Return the populated tenancy
  const populated = await prisma.tenancy.findUnique({
    where: { id: created.id },
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_IMAGES_SELECT },
      unit: { select: UNIT_SLOTS_STATUS_SELECT },
      contract: { select: CONTRACT_BASIC_SELECT },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  return serializeDoc(remapMutationTenancy(populated!));
};

// ─────────────────────────────────────────────────────────────
//  initiateCheckout / processCheckout — Close tenancy and release occupancy
//
//  WRITE SET (all inside one prisma.$transaction):
//    1. unitSlot.update             -- bedspace only: release the target slot
//    2. unit.update (status)        -- always: room -> vacant; bedspace -> vacant/occupied
//    3. contract.update             -- only if contract was active/signed: -> terminated/expired
//    4. tenancy.update              -- status -> 'checked_out', checkOutDate set
//    5. notification.create x2      -- tenant + landlord (carrying the final billing summary)
//  Same non-atomicity problem as confirmCheckin, now fixed the same way.
// ─────────────────────────────────────────────────────────────

export const processCheckout = async (userId: string, tenancyId: string) => {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      property: true,
      unit: { include: { slots: true } },
      user: true,
      contract: true,
    },
  });

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  if (tenancy.status !== 'checked_in') {
    throw Object.assign(
      new Error(`Cannot checkout tenancy with status '${tenancy.status}'. Must be 'checked_in'.`),
      { statusCode: 400 }
    );
  }

  const property = tenancy.property;
  await verifyManagementAccess(userId, property.id);

  const review = await buildCheckoutReview(tenancy.id, tenancy.contractId);
  if (review.warnings.length > 0) {
    const error: any = Object.assign(new Error('Checkout blocked due to unresolved items.'), { statusCode: 400 });
    error.details = serializeDoc(review);
    throw error;
  }

  const currentUnit = tenancy.unit;
  const isBedspace = currentUnit.accommodationType === 'bedspace';
  const releaseSlotNumber = isBedspace && tenancy.slotNumber ? tenancy.slotNumber : null;

  let newUnitStatus: string;
  if (isBedspace && releaseSlotNumber !== null) {
    const hasOccupiedSlots = currentUnit.slots.some(
      (s) => s.slotNumber !== releaseSlotNumber && s.status === 'occupied'
    );
    newUnitStatus = hasOccupiedSlots ? 'occupied' : 'vacant';
  } else {
    newUnitStatus = 'vacant';
  }

  const contract = tenancy.contract;
  const shouldUpdateContract = contract.status === 'active' || contract.status === 'signed';
  const now = new Date();
  const newContractStatus = now <= new Date(contract.endDate) ? 'terminated' : 'expired';

  const tenant = tenancy.user;
  const unit = tenancy.unit;

  // Explicit timeout: same reasoning as confirmCheckin's transaction --
  // up to 5 writes plus a Bill read, comfortably clear of Prisma's 5000ms
  // default.
  const finalBillingSummary = await prisma.$transaction(
    async (tx) => {
      if (releaseSlotNumber !== null) {
        await tx.unitSlot.update({
          where: { unitId_slotNumber: { unitId: currentUnit.id, slotNumber: releaseSlotNumber } },
          data: { status: 'vacant', tenancyId: null },
        });
      }

      await tx.unit.update({
        where: { id: currentUnit.id },
        data: { status: newUnitStatus as Prisma.UnitUpdateInput['status'] },
      });

      if (shouldUpdateContract) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: newContractStatus as Prisma.ContractUpdateInput['status'] },
        });
      }

      await tx.tenancy.update({
        where: { id: tenancyId },
        data: { status: 'checked_out', checkOutDate: now },
      });

      const allBills = await tx.bill.findMany({
        where: { tenancyId },
        select: { totalAmount: true, paidAmount: true, balanceAmount: true, status: true },
      });

      const summary = allBills.reduce(
        (acc, bill) => {
          acc.totalBilled += Number(bill.totalAmount) || 0;
          acc.totalPaid += Number(bill.paidAmount) || 0;
          acc.remainingBalance += Number(bill.balanceAmount) || 0;
          if (bill.status === 'paid') acc.paidCount += 1;
          if (bill.status === 'unpaid' || bill.status === 'partial' || bill.status === 'overdue') acc.openCount += 1;
          return acc;
        },
        { totalBilled: 0, totalPaid: 0, remainingBalance: 0, paidCount: 0, openCount: 0, billCount: allBills.length }
      );

      summary.totalBilled = Math.round(summary.totalBilled * 100) / 100;
      summary.totalPaid = Math.round(summary.totalPaid * 100) / 100;
      summary.remainingBalance = Math.round(summary.remainingBalance * 100) / 100;

      await tx.notification.create({
        data: {
          userId: tenant.id,
          type: 'tenancy',
          title: 'Checkout Complete',
          message: `Your tenancy at ${unit.unitIdentifier} in ${property.name} has been closed.`,
          link: `/u/dashboard`,
          metadata: { tenancyId, propertyId: property.id, finalBillingSummary: summary },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'tenancy',
          title: 'Tenant Checked Out',
          message: `${tenant.name} has checked out from ${unit.unitIdentifier} at ${property.name}.`,
          link: `/hub/tenants/${tenancyId}`,
          metadata: { tenancyId, propertyId: property.id, unitId: currentUnit.id, finalBillingSummary: summary },
        },
      });

      return summary;
    },
    { timeout: 15000 }
  );

  const updatedTenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_IMAGES_SELECT },
      unit: { select: UNIT_SLOTS_STATUS_SELECT },
      contract: { select: CONTRACT_BASIC_SELECT },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  return serializeDoc({
    tenancy: remapMutationTenancy(updatedTenancy!),
    finalBillingSummary,
  });
};

export const initiateCheckout = async (userId: string, tenancyId: string) => {
  return processCheckout(userId, tenancyId);
};

export const getCheckoutReview = async (userId: string, tenancyId: string) => {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: { id: true, propertyId: true, contractId: true },
  });
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  await verifyManagementAccess(userId, tenancy.propertyId);
  return serializeDoc(await buildCheckoutReview(tenancy.id, tenancy.contractId));
};

//  Read operations
// ─────────────────────────────────────────────────────────────

/**
 * Get the current user's tenancies.
 */
export const getMyTenancies = async (userId: string) => {
  const tenancies = await prisma.tenancy.findMany({
    where: { userId },
    include: {
      property: { select: PROPERTY_IMAGES_SELECT },
      unit: { select: UNIT_RENT_SELECT },
      contract: { select: CONTRACT_LOCKIN_SELECT },
      comments: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(tenancies.map((row) => remapMyTenancy(row)));
};

/**
 * Get tenancies for landlord/staff (scoped by property access).
 */
export const getTenancies = async (userId: string, filters: { status?: string; propertyId?: string } = {}) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  let propertyFilter: Prisma.TenancyWhereInput = {};

  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({ where: { landlordId: userId }, select: { id: true } });
    propertyFilter = { propertyId: { in: properties.map((p) => p.id) } };
  } else if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    if (assignments.length === 0) {
      return []; // Staff with no assigned properties sees nothing
    }
    propertyFilter = { propertyId: { in: assignments.map((a) => a.propertyId) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: Prisma.TenancyWhereInput = { ...propertyFilter };
  if (filters.status) {
    query.status = filters.status as Prisma.TenancyWhereInput['status'];
  }
  if (filters.propertyId) {
    // Verify access to this specific property
    if (user.role === 'landlord') {
      const property = await prisma.property.findFirst({
        where: { id: filters.propertyId, landlordId: userId },
      });
      if (!property) {
        throw Object.assign(new Error('Access denied to this property'), { statusCode: 403 });
      }
    } else if (user.role === 'staff') {
      const assigned = await isStaffAssignedToProperty(userId, filters.propertyId);
      if (!assigned) {
        throw Object.assign(new Error('Access denied to this property'), { statusCode: 403 });
      }
    }
    query.propertyId = filters.propertyId;
  }

  const tenancies = await prisma.tenancy.findMany({
    where: query,
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_BASIC_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
      contract: { select: CONTRACT_BASIC_SELECT },
      comments: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(tenancies.map((row) => remapListTenancy(row)));
};

/**
 * Get tenancy by ID (with access check).
 */
export const getTenancyById = async (userId: string, tenancyId: string) => {
  // Invalid-id collapse (task-14 pattern, verbatim): `tenancy-by-id-not-found`
  // requests a Mongo-ObjectId sentinel, not a valid Postgres UUID -- collapse
  // it into the exact same 404 this function already throws for a
  // syntactically-valid-but-missing tenancy. getCheckoutReview/getComments/
  // getRoommates all call through this function and inherit the guard for
  // free (same pattern contract.service.ts's getDownloadUrl established).
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      user: { select: USER_DETAIL_SELECT },
      property: { select: PROPERTY_WITH_LANDLORD_IMAGES_SELECT },
      unit: { select: UNIT_WIDE_SELECT },
      contract: { select: CONTRACT_WIDE_SELECT },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Check access
  const isOwner = tenancy.userId === userId;
  const isLandlord = tenancy.property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, tenancy.propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return serializeDoc(remapByIdTenancy(tenancy));
};

// ─────────────────────────────────────────────────────────────
//  Comments & Roommates
// ─────────────────────────────────────────────────────────────

/**
 * Add a comment to a tenancy.
 *
 * WRITE SET (inside one prisma.$transaction): 1. tenancyComment.create
 * (the comment itself -- promoted from an embedded array push to a real
 * child-table insert), 2. notification.create. Under Mongoose this was a
 * single-document `tenancy.save()` (the comment push) plus one separate,
 * non-atomic `Notification.create()`; the child-table promotion makes the
 * first write a genuinely separate statement too, so this now follows the
 * same "two writes, wrap in one transaction" pattern used everywhere else
 * in this migration.
 */
export const addComment = async (userId: string, tenancyId: string, text: string) => {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({ where: { id: tenancyId }, include: { property: true } });
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Determine role
  let role: 'tenant' | 'caretaker' | 'admin' = 'tenant';
  if (user.role === 'super_admin') {
    role = 'admin';
  } else if (user.role === 'landlord' || user.role === 'staff') {
    role = 'caretaker';
    // Verify access
    await verifyManagementAccess(userId, tenancy.property.id);
  } else {
    // Must be the tenant
    if (tenancy.userId !== userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const comment = await tx.tenancyComment.create({
      data: { tenancyId, userId, role: role as Prisma.TenancyCommentCreateInput['role'], text },
    });

    // Create notification for the other party
    if (role === 'tenant') {
      await tx.notification.create({
        data: {
          userId: tenancy.property.landlordId,
          type: 'tenancy',
          title: 'New Tenancy Comment',
          message: `${user.name} added a comment to their check-in/tenancy record.`,
          link: `/hub/tenants/${tenancy.id}`,
          metadata: { tenancyId: tenancy.id },
        },
      });
    } else {
      await tx.notification.create({
        data: {
          userId: tenancy.userId,
          type: 'tenancy',
          title: 'New Tenancy Comment',
          message: `Your caretaker or admin added a comment to your tenancy record.`,
          link: `/u/my-unit`,
          metadata: { tenancyId: tenancy.id },
        },
      });
    }

    return comment;
  });

  return serializeDoc(shapeCommentsRaw([created])[0]);
};

/**
 * Get comments for a tenancy.
 */
export const getComments = async (userId: string, tenancyId: string) => {
  await getTenancyById(userId, tenancyId); // This does access control (and the invalid-id/404 guard)

  const comments = await prisma.tenancyComment.findMany({
    where: { tenancyId },
    select: { id: true, role: true, text: true, createdAt: true, user: { select: COMMENT_USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  });

  return serializeList(comments.map((row) => shapeCommentPopulated(row)));
};

/**
 * Get roommates (other checked-in tenancies on the same unit).
 */
export const getRoommates = async (userId: string, tenancyId: string) => {
  const tenancy: any = await getTenancyById(userId, tenancyId); // Does access control

  if (!tenancy.unitId) return [];

  const roommates = await prisma.tenancy.findMany({
    where: { unitId: tenancy.unitId.id, status: 'checked_in', id: { not: tenancyId } },
    select: {
      id: true,
      slotNumber: true,
      isPrimary: true,
      checkInDate: true,
      user: { select: ROOMMATE_USER_SELECT },
    },
  });

  return serializeList(
    roommates.map((row) => {
      const { user, ...rest } = row;
      return stripNulls({
        ...rest,
        userId: user ? stripNulls({ id: user.id, name: user.name, avatar: user.avatar, phone: user.phone }) : undefined,
      });
    })
  );
};
