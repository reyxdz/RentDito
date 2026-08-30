import { randomUUID } from 'crypto';
import prisma from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';
import { Prisma, PropertyType } from '@prisma/client';
import { serializeDoc, serializeProfile } from '../utils/serialize';

// Mongoose stored propertyType as its display string ("Boarding House",
// "Mixed Use", ...); Prisma's generated enum keys can't contain spaces. Same
// translation table as property.service.ts (not imported from there — that
// file exports no helpers, only its 7 route-level functions — so it's
// duplicated here for the one field this embed needs to translate).
const PROPERTY_TYPE_FROM_DB: Record<string, string> = {
  [PropertyType.BoardingHouse]: 'Boarding House',
  [PropertyType.Apartment]: 'Apartment',
  [PropertyType.Studio]: 'Studio',
  [PropertyType.Dormitory]: 'Dormitory',
  [PropertyType.Commercial]: 'Commercial',
  [PropertyType.Parking]: 'Parking',
  [PropertyType.Land]: 'Land',
  [PropertyType.MixedUse]: 'Mixed Use',
};

/**
 * Mongoose auto-assigns an `_id` to every element of an embedded-array
 * subdocument (Property.venues.{reviewCenters,schools,commercial} and
 * Property.emergencyContacts — see property.service.ts's identical helper).
 * Postgres stores these as plain `jsonb` with no per-element identity, so
 * one is minted fresh on every read.
 */
function withSubdocIds<T extends object>(items: T[] | null | undefined): (T & { _id: string })[] {
  return (items ?? []).map((item) => ({ ...item, _id: randomUUID() }));
}

function buildVenues(venues: unknown) {
  const v = (venues ?? {}) as {
    reviewCenters?: Array<{ name: string; distance: string }>;
    schools?: Array<{ name: string; distance: string }>;
    commercial?: Array<{ name: string; distance: string }>;
  };
  return {
    reviewCenters: withSubdocIds(v.reviewCenters),
    schools: withSubdocIds(v.schools),
    commercial: withSubdocIds(v.commercial),
  };
}

/**
 * Shapes a Property row the way Mongoose's `Tenancy.populate('propertyId')`
 * emitted it: a SHALLOW populate, so `landlordId` stays the raw scalar FK
 * (never remapped to a populated user object) and there is no `metrics`
 * sub-object (that key only ever existed in property.service.ts's own
 * response construction, never on the Property model/document itself — see
 * tests/golden/user.json's `me-user1-with-active-tenancy`, which has no
 * `metrics` key on the embedded property at all). Address/billingSettings/
 * venues/emergencyContacts/geoCoords rebuilt with the same optional-field
 * omission rules as property.service.ts's `shapeProperty`.
 */
function shapeEmbeddedProperty(row: Record<string, any>): Record<string, unknown> {
  const {
    street,
    barangay,
    city,
    province,
    zipCode,
    country,
    billingDay,
    dueDay,
    lateFeePercent,
    utilityDefault,
    latitude,
    longitude,
    propertyType,
    venues,
    emergencyContacts,
    ...rest
  } = row;

  const address: Record<string, unknown> = { street, city, province, zipCode, country };
  if (barangay !== null && barangay !== undefined) address.barangay = barangay;

  const out: Record<string, unknown> = {
    ...rest,
    address,
    propertyType: PROPERTY_TYPE_FROM_DB[propertyType] ?? propertyType,
    billingSettings: { billingDay, dueDay, lateFeePercent, utilityDefault },
    venues: buildVenues(venues),
    emergencyContacts: withSubdocIds((emergencyContacts as Record<string, unknown>[] | null) ?? []),
  };

  if (latitude !== null || longitude !== null) {
    out.geoCoords = { latitude, longitude };
  }

  return out;
}

/**
 * Shapes a Unit row the way Mongoose's `Tenancy.populate('unitId')` emitted
 * it. `roomRent`/`bedspaceRent`/`perHeadRate`/`sizeSqm` are optional paths in
 * the original schema — Mongoose omits an unset optional path entirely
 * rather than emitting `null`, so each is only re-attached here when
 * non-null. `slots` subdocuments used `{ _id: false }` in the Mongoose
 * schema (unlike venues/emergencyContacts), so — unlike `withSubdocIds`
 * above — no id is minted for them here; they're picked field-by-field
 * instead to also drop Prisma's own `id`/`unitId` columns, which the
 * Mongoose embedded subdocument never had.
 */
function shapeEmbeddedUnit(row: Record<string, any>): Record<string, unknown> {
  const { slots, roomRent, bedspaceRent, perHeadRate, sizeSqm, ...rest } = row;

  const out: Record<string, unknown> = { ...rest };
  if (roomRent !== null && roomRent !== undefined) out.roomRent = roomRent;
  if (bedspaceRent !== null && bedspaceRent !== undefined) out.bedspaceRent = bedspaceRent;
  if (perHeadRate !== null && perHeadRate !== undefined) out.perHeadRate = perHeadRate;
  if (sizeSqm !== null && sizeSqm !== undefined) out.sizeSqm = sizeSqm;

  out.slots = ((slots ?? []) as Array<Record<string, any>>).map((s) => ({
    slotNumber: s.slotNumber,
    status: s.status,
    ...(s.tenancyId !== null && s.tenancyId !== undefined ? { tenancyId: s.tenancyId } : {}),
  }));

  return out;
}

/**
 * Rebuilds Tenancy.personalDetails from the flattened `pd*` columns
 * (schema.prisma's comment: "Flattened from Tenancy.personalDetails").
 * `school` is optional in the original schema and omitted (not `null`) when
 * unset, same convention as everywhere else in this file.
 */
function shapePersonalDetails(t: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    fullName: t.pdFullName,
    phone: t.pdPhone,
    occupation: t.pdOccupation,
    address: t.pdAddress,
    emergencyContact: {
      name: t.pdEmergencyName,
      phone: t.pdEmergencyPhone,
      relationship: t.pdEmergencyRelationship,
    },
  };
  if (t.pdSchool !== null && t.pdSchool !== undefined) out.school = t.pdSchool;
  return out;
}

/**
 * Tenancy.comments[] elements (TenancyComment rows here) never carried a
 * `tenancyId` back-reference in the Mongoose embedded-array shape, so it's
 * deliberately excluded from the picked fields below.
 */
function shapeComment(c: Record<string, any>): Record<string, unknown> {
  return {
    id: c.id,
    userId: c.userId,
    role: c.role,
    text: c.text,
    createdAt: c.createdAt,
  };
}

/**
 * Rebuilds the Mongoose-shaped Tenancy document `getMe` used to attach as
 * `activeTenancy`. `checkOutDate`/`slotNumber` are optional paths, omitted
 * (not `null`) when unset, matching every other optional-field convention
 * in this file/property.service.ts.
 */
function shapeActiveTenancy(t: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: t.id,
    userId: t.userId,
    propertyId: shapeEmbeddedProperty(t.property),
    unitId: shapeEmbeddedUnit(t.unit),
    contractId: t.contractId,
    status: t.status,
  };
  if (t.checkInDate !== null && t.checkInDate !== undefined) out.checkInDate = t.checkInDate;
  if (t.checkOutDate !== null && t.checkOutDate !== undefined) out.checkOutDate = t.checkOutDate;
  if (t.slotNumber !== null && t.slotNumber !== undefined) out.slotNumber = t.slotNumber;
  out.isPrimary = t.isPrimary;
  out.personalDetails = shapePersonalDetails(t);
  out.comments = (t.comments as Record<string, any>[]).map(shapeComment);
  out.householdMembers = t.householdMembers ?? [];
  out.createdAt = t.createdAt;
  out.updatedAt = t.updatedAt;
  return out;
}

/**
 * Looks up the user's checked-in tenancy (at most one per the fixture data
 * and the original `getMe`'s `.findOne(...)` semantics). Per this task's
 * brief: Prisma has no circular-dependency problem across models (they all
 * live on one client), so this replaces the old `getMe`'s lazy
 * `import('mongoose')` + `mongoose.models['Tenancy']` workaround entirely —
 * there is no equivalent hack needed here.
 */
async function loadActiveTenancy(userId: string): Promise<Record<string, unknown> | null> {
  const tenancy = await prisma.tenancy.findFirst({
    where: { userId, status: 'checked_in' },
    include: {
      property: true,
      unit: { include: { slots: true } },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });
  return tenancy ? shapeActiveTenancy(tenancy) : null;
}

/**
 * Flat array of assigned property ids. In Mongo this lived directly on the
 * user document (`User.assignedPropertyIds`); in Postgres it's the
 * `staff_property_assignments` join table (see schema.prisma), which only
 * staff profiles can have rows in — every other role always returns `[]`,
 * matching what Mongo's own empty-array default returned for them too. Same
 * staff-only branch as auth.service.ts's `serializeAuthProfile`.
 */
async function getAssignedPropertyIds(profile: { id: string; role: string }): Promise<string[]> {
  if (profile.role !== 'staff') return [];
  const assignments = await prisma.staffPropertyAssignment.findMany({
    where: { staffId: profile.id },
    select: { propertyId: true },
  });
  return assignments.map((a) => a.propertyId);
}

/**
 * Get the current user's profile, including activeTenancy lookup.
 */
export const getMe = async (userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const [assignedPropertyIds, activeTenancy] = await Promise.all([
    getAssignedPropertyIds(profile),
    loadActiveTenancy(userId),
  ]);

  const result = serializeProfile(profile, { assignedPropertyIds })!;
  // serializeProfile only walks the profile row itself; activeTenancy is a
  // hand-built nested tree (raw Decimal/Date values, ids not yet mirrored to
  // _id) that needs its own serializeDoc pass to get Decimal->number
  // conversion and _id mirroring at every nested level (property, unit,
  // each comment).
  result.activeTenancy = activeTenancy ? serializeDoc(activeTenancy) : null;
  return result;
};

/**
 * Update the current user's profile fields (name, phone).
 */
export const updateMe = async (userId: string, data: { name?: string; phone?: string }) => {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (!existing) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const updateData: Prisma.ProfileUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;

  const updated = await prisma.profile.update({ where: { id: userId }, data: updateData });
  return serializeProfile(updated, { assignedPropertyIds: await getAssignedPropertyIds(updated) });
};

/**
 * Change the current user's password.
 *
 * Ported from bcrypt (`utils/password.ts`'s hash/compare against a
 * `passwordHash` column that no longer exists on `Profile`) to Supabase
 * Auth: the current password is verified via a real `signInWithPassword`
 * call (any failure — wrong password, unknown user, etc. — collapses to the
 * same "Current password is incorrect." 400 the old bcrypt `compare` path
 * produced), then the new password is set via `auth.admin.updateUserById`.
 * The email needed for `signInWithPassword` comes from the profile already
 * loaded for the "User not found" check — no extra round trip.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (signInError) {
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (updateError) {
    throw Object.assign(new Error('Failed to change password'), { statusCode: 400 });
  }
};

/**
 * Update the user's avatar URL.
 */
export const updateAvatar = async (userId: string, avatarUrl: string) => {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (!existing) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });

  return serializeProfile(updated, { assignedPropertyIds: await getAssignedPropertyIds(updated) });
};

/**
 * Submit ID photos for verification (sets verificationStatus to 'pending').
 */
export const submitVerification = async (userId: string, idPhotos: string[]) => {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (!existing) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (existing.verificationStatus === 'verified') {
    throw Object.assign(new Error('Account is already verified.'), { statusCode: 400 });
  }

  if (!idPhotos || idPhotos.length === 0) {
    throw Object.assign(new Error('At least one ID photo is required.'), { statusCode: 400 });
  }

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: { idPhotos, verificationStatus: 'pending' },
  });

  return serializeProfile(updated, { assignedPropertyIds: await getAssignedPropertyIds(updated) });
};
