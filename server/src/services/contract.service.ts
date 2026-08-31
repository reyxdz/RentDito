import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';
import { shapeEmbeddedProfile } from '../utils/embeddedProfile.mapper';
import { generateContractHTML, ContractTemplateData } from './templates/contractTemplate';
import puppeteer from 'puppeteer';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
// personalDetails <-> pd_* columns (RentalApplication only -- read side,
// duplicated from application.service.ts's own private helper of the same
// name: that file exports no reusable helper, and this file's own
// established convention -- see application.service.ts's comment on
// PROPERTY_TYPE_FROM_DB -- is to duplicate small per-file helpers rather
// than reach across service files for something that was never exported.
// contract.service.ts never WRITES personalDetails (nothing here creates or
// edits a RentalApplication), so only the read-side rebuild is needed here.
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

/**
 * Shapes a full, unqualified `application: true` embed (the direct
 * replacement for the original's unqualified `.populate('applicationId')`,
 * used by both `getContractById` and every mutating route's return value):
 * pulls the eight `pd_*` columns off and rebuilds `personalDetails`, then
 * strips any other null-valued top-level key (`reviewedBy`/`reviewNotes`/
 * `reviewedAt` when unset). The application's OWN relations (userId,
 * propertyId, unitId, reviewedBy) are never populated further here, exactly
 * matching the original's unqualified, non-cascading `.populate('applicationId')`
 * -- they stay raw scalar FK strings, same as the golden fixture shows.
 */
function shapeApplicationEmbed(row: Record<string, any>): Record<string, unknown> {
  const {
    pdFullName,
    pdPhone,
    pdOccupation,
    pdSchool,
    pdAddress,
    pdEmergencyName,
    pdEmergencyPhone,
    pdEmergencyRelationship,
    ...rest
  } = row;
  return stripNulls({
    ...rest,
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
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Relation shapes. FIVE distinct populate shapes existed in the original
// Mongoose code -- kept as five distinct consts/shapers here (collapsing
// any would change response content and fail a fixture):
//
//   1. getMyContracts's own narrow selects (`name address images` /
//      `unitIdentifier accommodationType` / `name email phone`).
//   2. getContracts's own narrow selects (`name email phone avatar` /
//      `name address` / `unitIdentifier accommodationType`). `landlordId`
//      is never populated here (matches original).
//   3. getContractById's own narrow selects (`name email phone avatar` /
//      `name address landlordId` / `unitIdentifier accommodationType
//      roomRent bedspaceRent deposit` / `name email phone`) plus a full,
//      unqualified `applicationId` embed.
//   4. FULL_CONTRACT_INCLUDE -- the unqualified `.populate(['applicationId',
//      'propertyId', 'unitId', 'landlordId', 'userId'])` shape, shared by
//      createFromApplication / updateContract / addSignature / updateStatus
//      / generatePDF's return values (5 call sites collapsed into one
//      constant, plus generatePDF's own initial read, which needs the same
//      full shape for its own field access -- 6 populate call sites total).
//
// `tenancyId` is DELIBERATELY dropped from every shape below (see
// createFromApplication's own comment) -- the original never populates or
// even reads it anywhere in this file, and Postgres's seed backfills a real
// (non-null) value onto two of the three seeded contracts purely to satisfy
// `tenancies.contract_id`'s NOT NULL constraint (see requirement #1), so a
// naive raw-row spread would leak a field no golden fixture expects.
// ═══════════════════════════════════════════════════════════════════════

/** `.populate('propertyId', 'name address images')` -- getMyContracts only. */
const MY_CONTRACTS_PROPERTY_SELECT = {
  ...PROPERTY_REF_SELECT,
  images: true,
} satisfies Prisma.PropertySelect;

/** `.populate('propertyId', 'name address landlordId')` -- getContractById only. */
const PROPERTY_WITH_LANDLORD_SELECT = {
  ...PROPERTY_REF_SELECT,
  landlordId: true,
} satisfies Prisma.PropertySelect;

/** `.populate('unitId', 'unitIdentifier accommodationType')` -- getMyContracts + getContracts. */
const UNIT_BASIC_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
} satisfies Prisma.UnitSelect;

/**
 * `.populate('unitId', 'unitIdentifier accommodationType roomRent
 * bedspaceRent deposit')` -- getContractById only.
 */
const UNIT_DETAIL_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  roomRent: true,
  bedspaceRent: true,
  deposit: true,
} satisfies Prisma.UnitSelect;

/** `.populate('landlordId', 'name email phone')` -- getMyContracts + getContractById. */
const LANDLORD_CONTACT_SELECT = { id: true, name: true, email: true, phone: true } satisfies Prisma.ProfileSelect;

/** `.populate('userId', 'name email phone avatar')` -- getContracts + getContractById. */
const USER_CONTACT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;

/** The unqualified `.populate(['applicationId','propertyId','unitId','landlordId','userId'])` shape. */
const FULL_CONTRACT_INCLUDE = {
  application: true,
  property: true,
  unit: true,
  landlord: true,
  user: true,
} satisfies Prisma.ContractInclude;

type PropertyImagesRow = Parameters<typeof shapePropertyRef>[0] & { images: string[] };
type PropertyLandlordRow = Parameters<typeof shapePropertyRef>[0] & { landlordId: string };
type UnitBasicRow = { id: string; unitIdentifier: string; accommodationType: string };
type UnitDetailRow = UnitBasicRow & { roomRent: unknown; bedspaceRent: unknown; deposit: unknown };
type LandlordContactRow = { id: string; name: string; email: string; phone: string | null };
type UserContactRow = LandlordContactRow & { avatar: string | null };

const shapePropertyWithImages = (row: PropertyImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  images: row.images ?? [],
});

const shapePropertyWithLandlord = (row: PropertyLandlordRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  landlordId: row.landlordId,
});

const shapeUnitBasic = (row: UnitBasicRow): Record<string, unknown> =>
  stripNulls({ id: row.id, unitIdentifier: row.unitIdentifier, accommodationType: row.accommodationType });

const shapeUnitDetail = (row: UnitDetailRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    roomRent: row.roomRent,
    bedspaceRent: row.bedspaceRent,
    deposit: row.deposit,
  });

const shapeLandlordContact = (row: LandlordContactRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, email: row.email, phone: row.phone });

const shapeUserContact = (row: UserContactRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, email: row.email, phone: row.phone, avatar: row.avatar });

/** Remaps getMyContracts rows: `propertyId` (+images) + `unitId` (basic) + `landlordId` (contact). `userId` stays a raw scalar (matches original -- never populated here). */
function remapMyContract(row: Record<string, any>): Record<string, unknown> {
  const { tenancyId, property, unit, landlord, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined) out.unitId = shapeUnitBasic(unit);
  if (landlord !== undefined) out.landlordId = shapeLandlordContact(landlord);
  return out;
}

/** Remaps getContracts rows: `userId` (contact) + `propertyId` (name/address) + `unitId` (basic). `landlordId` stays a raw scalar (matches original -- never populated here). */
function remapListContract(row: Record<string, any>): Record<string, unknown> {
  const { tenancyId, user, property, unit, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (property !== undefined) out.propertyId = shapePropertyRef(property);
  if (unit !== undefined) out.unitId = shapeUnitBasic(unit);
  return out;
}

/** Remaps getContractById's row: `userId` (contact) + `propertyId` (name/address/landlordId) + `unitId` (detail) + `landlordId` (contact) + `applicationId` (full, unqualified). */
function remapByIdContract(row: Record<string, any>): Record<string, unknown> {
  const { tenancyId, user, property, unit, landlord, application, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (application !== undefined) out.applicationId = shapeApplicationEmbed(application);
  if (property !== undefined) out.propertyId = shapePropertyWithLandlord(property);
  if (unit !== undefined) out.unitId = shapeUnitDetail(unit);
  if (landlord !== undefined) out.landlordId = shapeLandlordContact(landlord);
  if (user !== undefined) out.userId = shapeUserContact(user);
  return out;
}

/**
 * Remaps the shared FULL_CONTRACT_INCLUDE shape (createFromApplication,
 * updateContract, addSignature, updateStatus and generatePDF's return
 * values): `userId`/`landlordId` are full unqualified `Profile` embeds, so
 * they go through `shapeEmbeddedProfile()` to keep `legacyMongoId` from
 * leaking (same protection every other full-Profile-embed path in this
 * migration applies). `propertyId`/`unitId` are full non-Profile embeds with
 * no golden-fixture coverage of their exact shape (no case in
 * `contract.json` exercises a mutating route) -- raw `stripNulls({...row})`
 * dump, identical to visit.service.ts's (task 18) and application.service.ts's
 * (task 19) own established treatment of the same kind of unqualified
 * full-document embed. `applicationId` reuses `shapeApplicationEmbed` (the
 * personalDetails-aware shaper) since it needs the same pd_* rebuild
 * `getContractById`'s own applicationId embed does.
 */
function remapFullContract(row: Record<string, any>): Record<string, unknown> {
  const { tenancyId, user, property, unit, landlord, application, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (application !== undefined) out.applicationId = shapeApplicationEmbed(application);
  if (property !== undefined) out.propertyId = stripNulls({ ...property });
  if (unit !== undefined) out.unitId = stripNulls({ ...unit });
  if (landlord !== undefined) out.landlordId = shapeEmbeddedProfile(landlord);
  if (user !== undefined) out.userId = shapeEmbeddedProfile(user);
  return out;
}

/**
 * Whether `staffId` is assigned to `propertyId` -- the direct replacement
 * for Mongoose's `user.assignedPropertyIds?.some(id => ...)`, which lived
 * directly on the User document; in Postgres it's the
 * `staff_property_assignments` join table (same pattern duplicated in every
 * other ported service's own scoped-access checks).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Loads a contract for `updateContract`'s auth check: only `property` is
 * needed (the original's `.populate('propertyId landlordId')` also
 * populates the contract's own top-level `landlordId`, but that populated
 * document is never actually read anywhere in `updateContract` -- the
 * access check reads `property.landlordId`, Property's OWN landlordId
 * scalar FK, which a full `property: true` include already carries with no
 * separate relation needed. Same "drop a populate whose result is dead"
 * judgment call application.service.ts's `loadApplicationForAuth` made for
 * its own unused `user` populate.) Applies the task-14 invalid-id pattern:
 * a malformed/Mongo-ObjectId-shaped id collapses into the exact same 404
 * this function already throws for a missing contract.
 */
async function loadContractForUpdate(contractId: string) {
  if (!isValidId(contractId)) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true },
  });
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }
  return contract;
}

/**
 * Loads a contract for `addSignature`/`updateStatus`'s auth checks: the
 * original's `.populate('propertyId landlordId userId')` for both -- unlike
 * `updateContract` above, both functions genuinely read the CONTRACT's own
 * populated `landlordId`/`userId` (not just `property.landlordId`), so all
 * three relations are needed here. Same task-14 invalid-id pattern as above.
 */
async function loadContractForSignOrStatus(contractId: string) {
  if (!isValidId(contractId)) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true, landlord: true, user: true },
  });
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }
  return contract;
}

/**
 * Create contract from approved application.
 *
 * `tenancyId` is deliberately never set here (defaults to Postgres `null`,
 * same as the original never assigning it) -- per requirement #1, a Tenancy
 * cannot exist yet at this point (nothing to check in to), and the eventual
 * backfill happens later, from `tenancy.service.ts`'s check-in flow (not yet
 * ported; out of this task's scope).
 */
export const createFromApplication = async (userId: string, applicationId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Invalid-id collapse (task-14 pattern), applied preemptively -- no
  // fixture forces it on this write path, but it costs nothing and closes
  // the same malformed-UUID-to-P2023-to-500 trap the read paths guard
  // against.
  if (!isValidId(applicationId)) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: { user: true, property: true, unit: true },
  });

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'approved') {
    throw Object.assign(
      new Error('Only approved applications can be converted to contracts'),
      { statusCode: 400 }
    );
  }

  const property = application.property;
  const unit = application.unit;
  const tenant = application.user;

  // Check access
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Check if contract already exists for this application
  const existingContract = await prisma.contract.findFirst({ where: { applicationId } });
  if (existingContract) {
    throw Object.assign(
      new Error('Contract already exists for this application'),
      { statusCode: 409 }
    );
  }

  // Auto-populate contract data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Start 7 days from now
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year lease

  const monthlyRent = unit.accommodationType === 'room' ? unit.roomRent : unit.bedspaceRent;
  const securityDeposit = unit.deposit;
  const advancePayment = monthlyRent; // 1 month advance

  // Two writes under Mongoose (Contract.create + Notification.create) with
  // no atomicity between them -- wrapped in one prisma.$transaction so
  // either both land or neither does (same reasoning as
  // application.service.ts's createApplication / visit.service.ts's
  // createVisitRequest).
  try {
    const contract = await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          applicationId,
          propertyId: property.id,
          unitId: unit.id,
          landlordId: property.landlordId,
          userId: tenant.id,
          startDate,
          endDate,
          lockInPeriod: 6, // Default 6 months
          monthlyRent: monthlyRent!,
          securityDeposit,
          advancePayment: advancePayment!,
          utilityIncludedInRent: false,
          rateType: 'fixed',
          status: 'draft',
        },
        include: FULL_CONTRACT_INCLUDE,
      });

      // Notify tenant
      await tx.notification.create({
        data: {
          userId: tenant.id,
          type: 'contract',
          title: 'Contract Draft Created',
          message: `A lease contract has been prepared for ${unit.unitIdentifier} at ${property.name}`,
          link: `/u/contracts/${created.id}`,
          metadata: {
            contractId: created.id,
            propertyId: property.id,
            unitId: unit.id,
          },
        },
      });

      return created;
    });

    return serializeDoc(remapFullContract(contract));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Get user's contracts
 */
export const getMyContracts = async (userId: string) => {
  const contracts = await prisma.contract.findMany({
    where: { userId },
    include: {
      property: { select: MY_CONTRACTS_PROPERTY_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
      landlord: { select: LANDLORD_CONTACT_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(contracts.map((row) => remapMyContract(row)));
};

/**
 * Get contracts for landlord
 */
export const getContracts = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  let propertyFilter: Prisma.ContractWhereInput = {};

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

  const query: Prisma.ContractWhereInput = { ...propertyFilter };
  if (filters.status) {
    query.status = filters.status as Prisma.ContractWhereInput['status'];
  }
  if (filters.propertyId) {
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

  const contracts = await prisma.contract.findMany({
    where: query,
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_REF_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(contracts.map((row) => remapListContract(row)));
};

/**
 * Get contract by ID
 */
export const getContractById = async (userId: string, contractId: string) => {
  // Invalid-id collapse (task-14 pattern, verbatim): `contract-by-id-not-found`
  // requests a Mongo-ObjectId sentinel, not a valid Postgres UUID -- collapse
  // it into the exact same 404 this function already throws for a
  // syntactically-valid-but-missing contract.
  if (!isValidId(contractId)) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_WITH_LANDLORD_SELECT },
      unit: { select: UNIT_DETAIL_SELECT },
      landlord: { select: LANDLORD_CONTACT_SELECT },
      application: true,
    },
  });

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isOwner = contract.userId === userId;
  const isLandlord = contract.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, contract.propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return serializeDoc(remapByIdContract(contract));
};

/**
 * Update contract (draft only)
 */
export const updateContract = async (userId: string, contractId: string, updates: any) => {
  const contract = await loadContractForUpdate(contractId);

  if (contract.status !== 'draft') {
    throw Object.assign(
      new Error('Only draft contracts can be edited'),
      { statusCode: 400 }
    );
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Single write (status/field update only, no notification in the
  // original) -- no transaction needed.
  try {
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: updates as Prisma.ContractUpdateInput,
      include: FULL_CONTRACT_INCLUDE,
    });

    return serializeDoc(remapFullContract(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Add signature to contract
 */
export const addSignature = async (
  userId: string,
  contractId: string,
  signatureData: string,
  role: 'landlord' | 'tenant'
) => {
  const contract = await loadContractForSignOrStatus(contractId);

  // Only allow signing when contract is in pending_signature status
  if (contract.status !== 'pending_signature') {
    throw Object.assign(
      new Error(`Contract must be in 'pending_signature' status to sign. Current status: ${contract.status}`),
      { statusCode: 400 }
    );
  }

  const property = contract.property;
  const landlord = contract.landlord;
  const tenant = contract.user;

  let landlordSignature = contract.landlordSignature;
  let userSignature = contract.userSignature;

  // Verify user can sign in this role
  if (role === 'landlord') {
    if (landlord.id !== userId) {
      throw Object.assign(new Error('Only the landlord can sign as landlord'), { statusCode: 403 });
    }
    landlordSignature = signatureData;
  } else if (role === 'tenant') {
    if (tenant.id !== userId) {
      throw Object.assign(new Error('Only the tenant can sign as tenant'), { statusCode: 403 });
    }
    userSignature = signatureData;
  }

  const bothSigned = Boolean(landlordSignature && userSignature);

  // Signature write, possible status flip to 'signed', and up to two
  // notifications: three-to-four independent Mongoose writes with no
  // atomicity between them under the original (a contract could end up
  // signed with no notification sent, or vice versa) -- wrapped in one
  // prisma.$transaction so a crash between them can't split the two apart
  // (brief item 2, this function named explicitly).
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.contract.update({
        where: { id: contractId },
        data: {
          landlordSignature,
          userSignature,
          ...(bothSigned ? { status: 'signed', signedAt: new Date() } : {}),
        },
        include: FULL_CONTRACT_INCLUDE,
      });

      if (bothSigned) {
        // Notify both parties
        await tx.notification.create({
          data: {
            userId: tenant.id,
            type: 'contract',
            title: 'Contract Fully Signed',
            message: `The lease contract for ${property.name} has been fully signed by both parties`,
            link: `/u/contracts/${contractId}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: landlord.id,
            type: 'contract',
            title: 'Contract Fully Signed',
            message: `The lease contract for ${property.name} has been fully signed by both parties`,
            link: `/hub/contracts/${contractId}`,
          },
        });
      } else {
        // Notify the other party that one signature is complete
        const notifyUserId = role === 'landlord' ? tenant.id : landlord.id;
        const signerName = role === 'landlord' ? landlord.name : tenant.name;

        await tx.notification.create({
          data: {
            userId: notifyUserId,
            type: 'contract',
            title: 'Contract Signature Added',
            message: `${signerName} has signed the contract for ${property.name}. Awaiting your signature.`,
            link: role === 'landlord' ? `/u/contracts/${contractId}` : `/hub/contracts/${contractId}`,
          },
        });
      }

      return result;
    });

    return serializeDoc(remapFullContract(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Valid contract status transitions (state machine)
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_review'],
  pending_review: ['pending_signature', 'draft'],
  pending_signature: ['signed'],          // auto-transition handled by addSignature
  signed: ['active'],
  active: ['expired', 'terminated'],
  expired: [],                            // terminal state
  terminated: [],                         // terminal state
};

/**
 * Update contract status
 */
export const updateStatus = async (userId: string, contractId: string, status: string) => {
  const contract = await loadContractForSignOrStatus(contractId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Validate state transition
  const currentStatus = contract.status;
  const allowedNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
    throw Object.assign(
      new Error(`Invalid status transition: '${currentStatus}' → '${status}'. Allowed: [${(allowedNextStatuses || []).join(', ')}]`),
      { statusCode: 400 }
    );
  }

  const tenant = contract.user;

  // Status update + notification create: two writes under Mongoose with no
  // atomicity between them -- wrapped in one prisma.$transaction so a crash
  // between them can't leave the contract's status changed with no
  // notification sent (brief item 2, this function named explicitly).
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.contract.update({
        where: { id: contractId },
        data: { status: status as Prisma.ContractUpdateInput['status'] },
        include: FULL_CONTRACT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: tenant.id,
          type: 'contract',
          title: 'Contract Status Updated',
          message: `Contract status changed to: ${status}`,
          link: `/u/contracts/${contractId}`,
        },
      });

      return result;
    });

    return serializeDoc(remapFullContract(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Generate PDF from contract
 */
export const generatePDF = async (userId: string, contractId: string) => {
  // Invalid-id collapse (task-14 pattern), applied preemptively -- no
  // fixture forces it on this route, but it closes the same trap.
  if (!isValidId(contractId)) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: FULL_CONTRACT_INCLUDE,
  });

  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = contract.property;
  const isOwner = contract.user.id === userId;
  const isLandlord = contract.landlord.id === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const application = contract.application;
  const unit = contract.unit;
  const tenant = contract.user;
  const landlord = contract.landlord;

  // application.applicationId is a required, DB-enforced FK (Contract.application
  // is a non-optional relation) -- it can no longer dangle the way the
  // pre-seed-fix Mongo data could, per requirement #3.
  const personalDetails = shapePersonalDetails({
    pdFullName: application.pdFullName,
    pdPhone: application.pdPhone,
    pdOccupation: application.pdOccupation,
    pdSchool: application.pdSchool,
    pdAddress: application.pdAddress,
    pdEmergencyName: application.pdEmergencyName,
    pdEmergencyPhone: application.pdEmergencyPhone,
    pdEmergencyRelationship: application.pdEmergencyRelationship,
  }) as {
    fullName: string;
    phone: string;
    occupation: string;
    address: string;
    emergencyContact: { name: string; phone: string; relationship: string };
  };

  // Prepare template data
  const templateData: ContractTemplateData = {
    contractId: contract.id,
    propertyName: property.name,
    propertyAddress: [
      property.street,
      property.barangay,
      property.city,
      property.province,
      property.zipCode
    ].filter(Boolean).join(', '),
    unitIdentifier: unit.unitIdentifier,
    landlordName: landlord.name,
    landlordAddress: undefined,
    tenantName: personalDetails.fullName,
    tenantAddress: personalDetails.address,
    tenantPhone: personalDetails.phone,
    tenantOccupation: personalDetails.occupation,
    emergencyContactName: personalDetails.emergencyContact.name,
    emergencyContactPhone: personalDetails.emergencyContact.phone,
    emergencyContactRelationship: personalDetails.emergencyContact.relationship,
    monthlyRent: Number(contract.monthlyRent),
    securityDeposit: Number(contract.securityDeposit),
    advancePayment: Number(contract.advancePayment),
    startDate: contract.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    endDate: contract.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    lockInPeriod: contract.lockInPeriod,
    utilityIncludedInRent: contract.utilityIncludedInRent,
    rateType: contract.rateType,
    terms: contract.terms ?? undefined,
    landlordSignature: contract.landlordSignature ?? undefined,
    userSignature: contract.userSignature ?? undefined,
    signedAt: contract.signedAt
      ? contract.signedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined
  };

  const html = generateContractHTML(templateData);

  // ─────────────────────────────────────────────────────────────────────
  // Puppeteer / Cloudinary section: UNCHANGED per the brief ("that path is
  // unrelated to the DB and must not change"). Only the DB reads above and
  // the final `contract.save()`-equivalent below are ported.
  // ─────────────────────────────────────────────────────────────────────

  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const tempDir = os.tmpdir();
  const pdfPath = path.join(tempDir, `contract-${contract.id}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();

  // Upload to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(pdfPath, {
    folder: 'rentdito/contracts',
    resource_type: 'raw',
    public_id: `contract-${contract.id}`,
    overwrite: true
  });

  // Delete temp file
  fs.unlinkSync(pdfPath);

  // ─────────────────────────────────────────────────────────────────────
  // Save document URL -- back to porting: single write, no notification in
  // the original, no transaction needed.
  // ─────────────────────────────────────────────────────────────────────
  const updatedContract = await prisma.contract.update({
    where: { id: contractId },
    data: { documentUrl: uploadResult.secure_url },
    include: FULL_CONTRACT_INCLUDE,
  });

  return {
    documentUrl: uploadResult.secure_url,
    contract: serializeDoc(remapFullContract(updatedContract)),
  };
};

/**
 * Get download URL for contract PDF
 */
export const getDownloadUrl = async (userId: string, contractId: string) => {
  const contract: any = await getContractById(userId, contractId);

  if (!contract.documentUrl) {
    throw Object.assign(
      new Error('Contract PDF has not been generated yet'),
      { statusCode: 404 }
    );
  }

  return { documentUrl: contract.documentUrl };
};
