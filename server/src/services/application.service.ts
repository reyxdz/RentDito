import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';
import { shapeEmbeddedProfile } from '../utils/embeddedProfile.mapper';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/**
 * Drops any null-valued key from a shallow object, mirroring Mongoose's
 * "unset optional path -> key entirely absent" convention (same pattern used
 * by every other ported service in this migration).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════
// personalDetails <-> pd_* columns
//
// `RentalApplication.personalDetails` is now eight flat `pd_*` columns
// (pdFullName, pdPhone, pdOccupation, pdSchool, pdAddress, pdEmergencyName,
// pdEmergencyPhone, pdEmergencyRelationship). `pdSchool` is the only
// nullable one. Every read path rebuilds the original nested
// `{ fullName, phone, occupation, school?, address, emergencyContact: {
// name, phone, relationship } }` shape; every write path flattens it back
// down. This is orthogonal to relation remapping (property.service.ts's
// established split, task 10) -- `withPersonalDetails` runs BEFORE any
// relation is attached and before `stripNulls` touches the rest of the row,
// so a null `pdSchool` never gets a chance to interact with the generic
// null-stripping pass; it is handled once, here, on its own terms.
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

interface PersonalDetailsInput {
  fullName: string;
  phone: string;
  occupation: string;
  school?: string;
  address: string;
  emergencyContact: { name: string; phone: string; relationship: string };
}

/** Write side: nested `personalDetails` -> eight flat `pd_*` columns. */
function flattenPersonalDetails(pd: PersonalDetailsInput): PdColumns {
  return {
    pdFullName: pd.fullName,
    pdPhone: pd.phone,
    pdOccupation: pd.occupation,
    // `??` (not `||`) so an explicit empty string survives instead of
    // collapsing into the "absent" case -- same convention property.service.ts
    // uses for `address.barangay`.
    pdSchool: pd.school ?? null,
    pdAddress: pd.address,
    pdEmergencyName: pd.emergencyContact.name,
    pdEmergencyPhone: pd.emergencyContact.phone,
    pdEmergencyRelationship: pd.emergencyContact.relationship,
  };
}

/** Read side: eight flat `pd_*` columns -> nested `personalDetails`. */
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
 * Pulls the eight `pd_*` columns off `row` and returns everything else
 * (still carrying whichever relation objects the caller hasn't destructured
 * yet) plus a rebuilt `personalDetails` key. Composes with any of the four
 * relation-remap variants below, run before them. Takes/returns the same
 * loose `Record<string, any>` shape every remap function already uses for
 * raw Prisma rows (a strict `PdColumns`-constrained generic doesn't survive
 * a prior object-rest-spread, which TypeScript widens to an index
 * signature).
 */
function withPersonalDetails(row: Record<string, any>): Record<string, unknown> {
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
  return {
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
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Relation shapes. FOUR distinct populate shapes existed in the original
// Mongoose code -- kept as four distinct consts/shapers here, per the
// port's brief (collapsing any of them would change response content and
// fail a fixture):
//
//   1. FULL_APPLICATION_INCLUDE / remapFullApplication -- the unqualified
//      `.populate(['userId', 'propertyId', 'unitId', 'reviewedBy'])` (no
//      field-selection string, full referenced documents). Shared across
//      createApplication, reviewApplication, approveApplication and
//      rejectApplication's return values (4 call sites).
//   2. getMyApplications's own narrow selects (`name address images` /
//      `unitIdentifier accommodationType roomRent bedspaceRent` / `name`).
//      `userId` is never populated here (matches original).
//   3. getApplications's own narrow selects (`name email phone avatar
//      verificationStatus` / `name address` / same unit select as #2 /
//      `name`).
//   4. getApplicationById's own narrow selects (same user select as #3 /
//      `name address landlordId` / a wider unit select with deposit,
//      features, images / `name email`).
// ═══════════════════════════════════════════════════════════════════════

const FULL_APPLICATION_INCLUDE = {
  user: true,
  property: true,
  unit: true,
  reviewer: true,
} satisfies Prisma.RentalApplicationInclude;

/** `.populate('propertyId', 'name address images')` -- getMyApplications only. */
const MY_APPLICATIONS_PROPERTY_SELECT = {
  ...PROPERTY_REF_SELECT,
  images: true,
} satisfies Prisma.PropertySelect;

/** `.populate('propertyId', 'name address landlordId')` -- getApplicationById only. */
const PROPERTY_WITH_LANDLORD_SELECT = {
  ...PROPERTY_REF_SELECT,
  landlordId: true,
} satisfies Prisma.PropertySelect;

/**
 * `.populate('unitId', 'unitIdentifier accommodationType roomRent
 * bedspaceRent')` -- getMyApplications + getApplications.
 */
const UNIT_BASIC_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  roomRent: true,
  bedspaceRent: true,
} satisfies Prisma.UnitSelect;

/**
 * `.populate('unitId', 'unitIdentifier accommodationType roomRent
 * bedspaceRent deposit features images')` -- getApplicationById only.
 */
const UNIT_DETAIL_SELECT = {
  id: true,
  unitIdentifier: true,
  accommodationType: true,
  roomRent: true,
  bedspaceRent: true,
  deposit: true,
  features: true,
  images: true,
} satisfies Prisma.UnitSelect;

/** `.populate('userId', 'name email phone avatar verificationStatus')` -- getApplications + getApplicationById. */
const USER_CONTACT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  verificationStatus: true,
} satisfies Prisma.ProfileSelect;

/** `.populate('reviewedBy', 'name')` -- getMyApplications + getApplications. */
const REVIEWER_NAME_SELECT = { id: true, name: true } satisfies Prisma.ProfileSelect;

/** `.populate('reviewedBy', 'name email')` -- getApplicationById only. */
const REVIEWER_NAME_EMAIL_SELECT = { id: true, name: true, email: true } satisfies Prisma.ProfileSelect;

type PropertyImagesRow = Parameters<typeof shapePropertyRef>[0] & { images: string[] };
type PropertyLandlordRow = Parameters<typeof shapePropertyRef>[0] & { landlordId: string };
type UnitBasicRow = { id: string; unitIdentifier: string; accommodationType: string; roomRent: unknown; bedspaceRent: unknown };
type UnitDetailRow = UnitBasicRow & { deposit: unknown; features: string[]; images: string[] };
type ReviewerNameRow = { id: string; name: string };
type ReviewerNameEmailRow = ReviewerNameRow & { email: string };
type UserContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  verificationStatus: string;
};

const shapePropertyWithImages = (row: PropertyImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  images: row.images ?? [],
});

const shapePropertyWithLandlord = (row: PropertyLandlordRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  landlordId: row.landlordId,
});

const shapeUnitBasic = (row: UnitBasicRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    roomRent: row.roomRent,
    bedspaceRent: row.bedspaceRent,
  });

const shapeUnitDetail = (row: UnitDetailRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    unitIdentifier: row.unitIdentifier,
    accommodationType: row.accommodationType,
    roomRent: row.roomRent,
    bedspaceRent: row.bedspaceRent,
    deposit: row.deposit,
    features: row.features,
    images: row.images,
  });

const shapeReviewerName = (row: ReviewerNameRow): Record<string, unknown> => ({ id: row.id, name: row.name });

const shapeReviewerNameEmail = (row: ReviewerNameEmailRow): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
  email: row.email,
});

const shapeUserContact = (row: UserContactRow): Record<string, unknown> =>
  stripNulls({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    verificationStatus: row.verificationStatus,
  });

/** Remaps getMyApplications rows: `propertyId` (name/address/images) + `unitId` (basic) + `reviewedBy` (name). `userId` is never populated here (matches original). */
function remapMyApplication(row: Record<string, any>): Record<string, unknown> {
  const { property, unit, reviewer, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(withPersonalDetails(rest));
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined) out.unitId = shapeUnitBasic(unit);
  if (reviewer !== undefined && reviewer !== null) out.reviewedBy = shapeReviewerName(reviewer);
  return out;
}

/** Remaps getApplications rows: `userId` (contact) + `propertyId` (name/address) + `unitId` (basic) + `reviewedBy` (name). */
function remapListApplication(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, reviewer, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(withPersonalDetails(rest));
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (property !== undefined) out.propertyId = shapePropertyRef(property);
  if (unit !== undefined) out.unitId = shapeUnitBasic(unit);
  if (reviewer !== undefined && reviewer !== null) out.reviewedBy = shapeReviewerName(reviewer);
  return out;
}

/** Remaps getApplicationById's row: `userId` (contact) + `propertyId` (name/address/landlordId) + `unitId` (detail) + `reviewedBy` (name/email). */
function remapByIdApplication(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, reviewer, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(withPersonalDetails(rest));
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (property !== undefined) out.propertyId = shapePropertyWithLandlord(property);
  if (unit !== undefined) out.unitId = shapeUnitDetail(unit);
  if (reviewer !== undefined && reviewer !== null) out.reviewedBy = shapeReviewerNameEmail(reviewer);
  return out;
}

/**
 * Remaps the shared FULL_APPLICATION_INCLUDE shape (createApplication,
 * reviewApplication, approveApplication, rejectApplication's return
 * values): `userId`/`propertyId`/`unitId` are required relations so they're
 * always present as full (nulls-stripped) objects; `reviewedBy` is an
 * optional relation -- when the underlying FK is null the key is left out
 * entirely, mirroring Mongoose's "unset optional path -> key absent"
 * convention exactly as the golden fixtures expect elsewhere in this file.
 * `userId` (a full `Profile` row from an unqualified `include`) goes
 * through `shapeEmbeddedProfile()` so `legacyMongoId` never leaks -- the
 * same protection every other full-Profile-embed path in this migration
 * (visit.service.ts, task 18) applies.
 */
function remapFullApplication(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, reviewer, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(withPersonalDetails(rest));
  if (user !== undefined) out.userId = shapeEmbeddedProfile(user);
  if (property !== undefined) out.propertyId = stripNulls({ ...property });
  if (unit !== undefined) out.unitId = stripNulls({ ...unit });
  if (reviewer !== undefined && reviewer !== null) out.reviewedBy = shapeEmbeddedProfile(reviewer);
  return out;
}

/**
 * Whether `staffId` is assigned to `propertyId` -- the direct replacement
 * for Mongoose's `user.assignedPropertyIds?.some(id => ...)`, which lived
 * directly on the User document; in Postgres it's the
 * `staff_property_assignments` join table (same pattern duplicated in
 * visit.service.ts/unit.service.ts/inquiry.service.ts's own scoped-access
 * checks).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Loads an application for one of the three mutating routes (review,
 * approve, reject) and runs the invalid-id-collapse pattern
 * (task-14-report.md, copied verbatim): a Mongo-ObjectId-shaped or
 * otherwise malformed `applicationId` is NOT a valid Postgres UUID and,
 * handed straight to Prisma, raises P2023 (which `toHttpError` has no
 * mapping for and would fall through to a 500). Collapse it into the EXACT
 * SAME 404 the function already throws for a syntactically-valid-but-
 * missing application, rather than a distinct 400 -- this route never had a
 * separate "invalid id" message to preserve.
 *
 * This is the authorization-only `.populate('propertyId userId unitId')`
 * load from the original -- full `property`/`unit` documents (needed for
 * `property.landlordId`/`property.name`/`unit.unitIdentifier`/`unit.id`),
 * never the four-relation FULL_APPLICATION_INCLUDE shape; the eventual
 * mutation's own `update({..., include: FULL_APPLICATION_INCLUDE})` call
 * re-fetches the full shape directly (no separate final `.populate()` round
 * trip needed, unlike the Mongoose original). `user` is deliberately NOT
 * included here: the original populated it too, but the only thing the
 * original code did with `application.userId` afterward was read the raw id
 * for the notification recipient (assigning a populated Mongoose document to
 * an ObjectId-typed field is coerced back to its `_id`), and a dead `applicant`
 * local variable that was never actually used -- the scalar FK the row
 * already carries covers the real usage with no extra query.
 */
async function loadApplicationForAuth(applicationId: string) {
  if (!isValidId(applicationId)) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: { property: true, unit: true },
  });

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  return application;
}

/**
 * Create rental application (user must be verified, unit must be vacant)
 */
export const createApplication = async (
  userId: string,
  data: {
    propertyId: string;
    unitId: string;
    personalDetails: PersonalDetailsInput;
    documents: string[];
  }
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to submit rental applications'),
      { statusCode: 403 }
    );
  }

  // Invalid-id collapse (task-14 pattern), applied preemptively here -- no
  // fixture forces it on this write path, but it costs nothing and closes
  // the same malformed-UUID-to-P2023-to-500 trap the read paths guard
  // against, reusing each function's own existing not-found message.
  if (!isValidId(data.propertyId)) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }
  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (!isValidId(data.unitId)) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }
  const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (unit.propertyId !== data.propertyId) {
    throw Object.assign(
      new Error('Unit does not belong to the specified property'),
      { statusCode: 400 }
    );
  }

  // Validate unit is vacant
  if (unit.status !== 'vacant') {
    throw Object.assign(
      new Error('Unit is not available for application'),
      { statusCode: 400 }
    );
  }

  // Check for existing pending/under_review application for same unit.
  // The `rental_applications_active_uniq` partial unique index on
  // (user_id, unit_id) WHERE status IN ('pending','under_review') now
  // enforces this at the database level too, but the explicit check stays:
  // it produces a friendlier, specific 409 message than the generic one a
  // raw P2002 constraint violation maps to. If a race slips two requests
  // past this check concurrently, the index still fires on the losing
  // `create()` below, and `toHttpError` maps that P2002 to a 409 (not a
  // 500) -- see the try/catch below.
  const existingApplication = await prisma.rentalApplication.findFirst({
    where: { userId, unitId: data.unitId, status: { in: ['pending', 'under_review'] } },
  });

  if (existingApplication) {
    throw Object.assign(
      new Error('You already have a pending application for this unit'),
      { statusCode: 409 }
    );
  }

  // Two writes under Mongoose (RentalApplication.create + Notification.create)
  // with no atomicity between them -- wrapped in one prisma.$transaction so
  // either both land or neither does (same reasoning as visit.service.ts's
  // createVisitRequest / inquiry.service.ts's createInquiry).
  try {
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.rentalApplication.create({
        data: {
          userId,
          propertyId: data.propertyId,
          unitId: data.unitId,
          ...flattenPersonalDetails(data.personalDetails),
          documents: data.documents,
          status: 'pending',
        },
        include: FULL_APPLICATION_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'application',
          title: 'New Rental Application',
          message: `${user.name} submitted an application for ${unit.unitIdentifier} at ${property.name}`,
          link: `/hub/pipeline/applications/${created.id}`,
          metadata: {
            applicationId: created.id,
            propertyId: property.id,
            unitId: unit.id,
          },
        },
      });

      return created;
    });

    return serializeDoc(remapFullApplication(application));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Get user's own applications
 */
export const getMyApplications = async (userId: string) => {
  const applications = await prisma.rentalApplication.findMany({
    where: { userId },
    include: {
      property: { select: MY_APPLICATIONS_PROPERTY_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
      reviewer: { select: REVIEWER_NAME_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(applications.map((row) => remapMyApplication(row)));
};

/**
 * Get applications for properties (landlord/staff only)
 */
export const getApplications = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Build property filter based on role
  let propertyFilter: Prisma.RentalApplicationWhereInput = {};

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

  // Apply additional filters
  const query: Prisma.RentalApplicationWhereInput = { ...propertyFilter };
  if (filters.status) {
    query.status = filters.status as Prisma.RentalApplicationWhereInput['status'];
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

  const applications = await prisma.rentalApplication.findMany({
    where: query,
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_REF_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
      reviewer: { select: REVIEWER_NAME_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(applications.map((row) => remapListApplication(row)));
};

/**
 * Get application by ID
 */
export const getApplicationById = async (userId: string, applicationId: string) => {
  // Invalid-id collapse (task-14 pattern, verbatim): `application-by-id-not-found`
  // requests a Mongo-ObjectId sentinel, not a valid Postgres UUID -- collapse
  // it into the exact same 404 this function already throws for a
  // syntactically-valid-but-missing application.
  if (!isValidId(applicationId)) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_WITH_LANDLORD_SELECT },
      unit: { select: UNIT_DETAIL_SELECT },
      reviewer: { select: REVIEWER_NAME_EMAIL_SELECT },
    },
  });

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Check access
  const isOwner = application.userId === userId;
  const isLandlord = application.property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, application.propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return serializeDoc(remapByIdApplication(application));
};

/**
 * Set application to under_review
 */
export const reviewApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes?: string
) => {
  const application = await loadApplicationForAuth(applicationId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error('Only pending applications can be set to under review'),
      { statusCode: 400 }
    );
  }

  // Status/reviewer-field update + notification create: two writes under
  // Mongoose with no atomicity between them -- wrapped in one
  // prisma.$transaction so a crash between them can't leave the application
  // reviewed with no notification sent.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.rentalApplication.update({
        where: { id: applicationId },
        data: {
          status: 'under_review',
          reviewedBy: userId,
          reviewedAt: new Date(),
          ...(reviewNotes ? { reviewNotes } : {}),
        },
        include: FULL_APPLICATION_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'application',
          title: 'Application Under Review',
          message: `Your application for ${property.name} is now under review`,
          link: `/u/applications/${applicationId}`,
        },
      });

      return result;
    });

    return serializeDoc(remapFullApplication(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Approve application (does NOT create tenancy yet)
 */
export const approveApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes?: string
) => {
  const application = await loadApplicationForAuth(applicationId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status === 'approved') {
    throw Object.assign(new Error('Application is already approved'), { statusCode: 400 });
  }

  if (application.status === 'rejected') {
    throw Object.assign(new Error('Cannot approve a rejected application'), { statusCode: 400 });
  }

  // Verify unit is still vacant -- re-read, don't trust the auth-load's copy
  const unit = application.unit;
  const currentUnit = await prisma.unit.findUnique({ where: { id: unit.id } });
  if (!currentUnit || currentUnit.status !== 'vacant') {
    throw Object.assign(
      new Error('Unit is no longer available'),
      { statusCode: 400 }
    );
  }

  // Status/reviewer-field update + notification create: two writes, wrapped
  // together. Does NOT touch Unit, Contract or Tenancy -- approval here is
  // purely a status/reviewer-field transition on RentalApplication, matching
  // the original's own comment ("does NOT create tenancy yet"). No
  // cross-service write, so nothing outside this file's scope is touched.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.rentalApplication.update({
        where: { id: applicationId },
        data: {
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
          ...(reviewNotes ? { reviewNotes } : {}),
        },
        include: FULL_APPLICATION_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'application',
          title: 'Application Approved',
          message: `Congratulations! Your application for ${unit.unitIdentifier} at ${property.name} has been approved`,
          link: `/u/applications/${applicationId}`,
          metadata: {
            applicationId,
            propertyId: property.id,
            unitId: unit.id,
          },
        },
      });

      return result;
    });

    return serializeDoc(remapFullApplication(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Reject application (with review notes required)
 */
export const rejectApplication = async (
  userId: string,
  applicationId: string,
  reviewNotes: string
) => {
  const application = await loadApplicationForAuth(applicationId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = application.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (application.status === 'rejected') {
    throw Object.assign(new Error('Application is already rejected'), { statusCode: 400 });
  }

  if (application.status === 'approved') {
    throw Object.assign(new Error('Cannot reject an approved application'), { statusCode: 400 });
  }

  const unit = application.unit;

  // Status/reviewer-field update + notification create: two writes, wrapped
  // together.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.rentalApplication.update({
        where: { id: applicationId },
        data: {
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes,
        },
        include: FULL_APPLICATION_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: application.userId,
          type: 'application',
          title: 'Application Rejected',
          message: `Your application for ${unit.unitIdentifier} at ${property.name} has been rejected`,
          link: `/u/applications/${applicationId}`,
          metadata: {
            applicationId,
            propertyId: property.id,
            unitId: unit.id,
          },
        },
      });

      return result;
    });

    return serializeDoc(remapFullApplication(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};
