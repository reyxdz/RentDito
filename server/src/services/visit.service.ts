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
 * by inquiry.service.ts/unit.service.ts/property.service.ts).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

// `shapeEmbeddedProfile()` (full `Profile` row embed, e.g. FULL_VISIT_INCLUDE's
// `user`/`assignedStaff`, both unqualified includes, not field-selected) now
// lives in ../utils/embeddedProfile.mapper.ts -- promoted from a local
// helper here (task 18) so inquiry.service.ts's identical latent
// `legacyMongoId` leak (task 18a) shares the same fix instead of a second
// copy.

// ═══════════════════════════════════════════════════════════════════════
// Relation shapes. THREE distinct populate shapes existed in the original
// Mongoose code -- kept as three distinct consts/shapers here too, per the
// port's brief (collapsing them would change response shapes and fail
// fixtures):
//
//   1. FULL_VISIT_INCLUDE / remapFullVisit -- the unqualified
//      `.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId'])`
//      (no field-selection string, so full referenced documents). This is
//      the one shared `include` constant the brief asks for -- reused by
//      createVisitRequest, approveVisit, scheduleVisit, assignStaff,
//      completeVisit, cancelVisit and markNoShow (7 call sites; the
//      migration plan's brief said "six", but the original file has seven
//      identical `.populate([...])` call sites at lines 68, 196, 268, 321,
//      364, 409, 452 -- ported faithfully to what the code actually does).
//   2. getMyVisits's own narrow selects (`name address images` / `unitIdentifier`
//      / `name phone`).
//   3. getPropertyVisits's own narrow selects (`name email phone avatar` /
//      `unitIdentifier` / `name phone`) -- `propertyId` stays a raw scalar
//      here, never populated, matching the original exactly.
// ═══════════════════════════════════════════════════════════════════════

const FULL_VISIT_INCLUDE = {
  user: true,
  property: true,
  unit: true,
  assignedStaff: true,
} satisfies Prisma.VisitRequestInclude;

/** `.populate('propertyId', 'name address images')` -- getMyVisits only. */
const MY_VISITS_PROPERTY_SELECT = {
  ...PROPERTY_REF_SELECT,
  images: true,
} satisfies Prisma.PropertySelect;

/** `.populate('unitId', 'unitIdentifier')` -- getMyVisits + getPropertyVisits. */
const UNIT_IDENTIFIER_SELECT = { id: true, unitIdentifier: true } satisfies Prisma.UnitSelect;

/** `.populate('assignedStaffId', 'name phone')` -- getMyVisits + getPropertyVisits. */
const STAFF_NAME_PHONE_SELECT = { id: true, name: true, phone: true } satisfies Prisma.ProfileSelect;

/** `.populate('userId', 'name email phone avatar')` -- getPropertyVisits only. */
const USER_CONTACT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;

type StaffRefRow = { id: string; name: string; phone: string | null };
type UnitRefRow = { id: string; unitIdentifier: string };
type UserContactRow = { id: string; name: string; email: string; phone: string | null; avatar: string | null };
type PropertyImagesRow = Parameters<typeof shapePropertyRef>[0] & { images: string[] };

const shapeStaffRef = (row: StaffRefRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, phone: row.phone });

const shapeUnitRef = (row: UnitRefRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
});

const shapeUserContact = (row: UserContactRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, email: row.email, phone: row.phone, avatar: row.avatar });

const shapePropertyWithImages = (row: PropertyImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  images: row.images ?? [],
});

/** Remaps getMyVisits rows: `propertyId` (name/address/images) + `unitId` (unitIdentifier) + `assignedStaffId` (name/phone). `userId` is never populated here (matches original). */
function remapMyVisit(row: Record<string, any>): Record<string, unknown> {
  const { property, unit, assignedStaff, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined && unit !== null) out.unitId = shapeUnitRef(unit);
  if (assignedStaff !== undefined && assignedStaff !== null) out.assignedStaffId = shapeStaffRef(assignedStaff);
  return out;
}

/** Remaps getPropertyVisits rows: `userId` (contact fields) + `unitId` (unitIdentifier) + `assignedStaffId` (name/phone). `propertyId` stays a raw scalar (never populated on this path, matches original). */
function remapPropertyVisit(row: Record<string, any>): Record<string, unknown> {
  const { user, unit, assignedStaff, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (user !== undefined) out.userId = shapeUserContact(user);
  if (unit !== undefined && unit !== null) out.unitId = shapeUnitRef(unit);
  if (assignedStaff !== undefined && assignedStaff !== null) out.assignedStaffId = shapeStaffRef(assignedStaff);
  return out;
}

/**
 * Remaps the shared FULL_VISIT_INCLUDE shape: `userId`/`propertyId` are
 * required relations so they're always present as full (nulls-stripped)
 * objects; `unitId`/`assignedStaffId` are optional relations -- when the
 * underlying FK is null, the relation comes back `null` and the key is left
 * out entirely (the scalar FK itself was also null, so `stripNulls({...rest})`
 * already dropped it), mirroring Mongoose's "unset optional path -> key
 * absent" convention exactly as the golden fixtures expect (e.g. a pending
 * visit with no `assignedStaffId` carries no such key at all).
 */
function remapFullVisit(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, assignedStaff, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (user !== undefined) out.userId = shapeEmbeddedProfile(user);
  if (property !== undefined) out.propertyId = stripNulls({ ...property });
  if (unit !== undefined && unit !== null) out.unitId = stripNulls({ ...unit });
  if (assignedStaff !== undefined && assignedStaff !== null) out.assignedStaffId = shapeEmbeddedProfile(assignedStaff);
  return out;
}

/**
 * Whether `staffId` is assigned to `propertyId` -- the direct replacement
 * for Mongoose's `user.assignedPropertyIds?.some(id => ...)`, which lived
 * directly on the User document; in Postgres it's the
 * `staff_property_assignments` join table (same pattern as
 * inquiry.service.ts/unit.service.ts's own scoped-access checks).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Loads a visit for one of the six mutating routes and runs the
 * invalid-id-collapse pattern (task-14-report.md, copied verbatim): a
 * Mongo-ObjectId-shaped or otherwise malformed `visitId` is NOT a valid
 * Postgres UUID and, handed straight to Prisma, raises P2023 (which
 * `toHttpError` has no mapping for and would fall through to a 500). Collapse
 * it into the EXACT SAME 404 the function already throws for a
 * syntactically-valid-but-missing visit, rather than a distinct 400 --
 * this route never had a separate "invalid id" message to preserve.
 *
 * This is the authorization-only `.populate('propertyId')` load from the
 * original (lines 156, 207, 279, 328, 371, 416) -- it includes ONLY
 * `property` (to check `property.landlordId` / run the staff-assignment
 * check), never the full 4-relation shape; the final response is built
 * separately once the mutation's own `update()` call re-includes
 * FULL_VISIT_INCLUDE in one round trip.
 */
async function loadVisitForAuth(visitId: string) {
  if (!isValidId(visitId)) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const visit = await prisma.visitRequest.findUnique({
    where: { id: visitId },
    include: { property: true },
  });

  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  return visit;
}

/**
 * Create visit request (user must be verified)
 */
export const createVisitRequest = async (
  userId: string,
  data: {
    propertyId: string;
    unitId?: string;
    requestedDate: Date;
    requestedTime: string;
    purpose: string;
    notes?: string;
  }
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to request visits'),
      { statusCode: 403 }
    );
  }

  if (!isValidId(data.propertyId)) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (data.unitId) {
    if (!isValidId(data.unitId)) {
      throw Object.assign(new Error('Unit not found or does not belong to property'), { statusCode: 404 });
    }
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit || unit.propertyId !== data.propertyId) {
      throw Object.assign(new Error('Unit not found or does not belong to property'), { statusCode: 404 });
    }
  }

  // Two writes under Mongoose (VisitRequest.create + Notification.create)
  // with no atomicity between them -- a crash between the two would leave a
  // visit request the landlord never gets notified about. Wrapped in a
  // single prisma.$transaction so either both land or neither does (same
  // reasoning as inquiry.service.ts's createInquiry).
  try {
    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.visitRequest.create({
        data: {
          userId,
          propertyId: data.propertyId,
          unitId: data.unitId ?? null,
          requestedDate: data.requestedDate,
          requestedTime: data.requestedTime,
          purpose: data.purpose as Prisma.VisitRequestCreateInput['purpose'],
          notes: data.notes ?? null,
          status: 'pending',
        },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'visit',
          title: 'New Visit Request',
          message: `${user.name} requested a visit to ${property.name}`,
          link: `/hub/bookings/visits/${created.id}`,
          metadata: {
            visitRequestId: created.id,
            propertyId: property.id,
          },
        },
      });

      return created;
    });

    return serializeDoc(remapFullVisit(visit));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Get user's own visit requests
 */
export const getMyVisits = async (userId: string) => {
  const visits = await prisma.visitRequest.findMany({
    where: { userId },
    include: {
      property: { select: MY_VISITS_PROPERTY_SELECT },
      unit: { select: UNIT_IDENTIFIER_SELECT },
      assignedStaff: { select: STAFF_NAME_PHONE_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(visits.map((row) => remapMyVisit(row)));
};

/**
 * Get visit requests for a property (landlord/staff only)
 */
export const getPropertyVisits = async (
  userId: string,
  propertyId: string,
  filters: { status?: string } = {}
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const hasAccess =
    user.role === 'super_admin' ||
    property.landlordId === userId ||
    (user.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId)));

  if (!hasAccess) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const filter: Prisma.VisitRequestWhereInput = { propertyId };
  if (filters.status) {
    filter.status = filters.status as Prisma.VisitRequestWhereInput['status'];
  }

  const visits = await prisma.visitRequest.findMany({
    where: filter,
    include: {
      user: { select: USER_CONTACT_SELECT },
      unit: { select: UNIT_IDENTIFIER_SELECT },
      assignedStaff: { select: STAFF_NAME_PHONE_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(visits.map((row) => remapPropertyVisit(row)));
};

/**
 * Approve visit request
 */
export const approveVisit = async (userId: string, visitId: string) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'pending') {
    throw Object.assign(new Error('Only pending visits can be approved'), { statusCode: 400 });
  }

  // Status update + notification create: two writes, wrapped together so a
  // crash between them can't leave the visit approved with no notification.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: { status: 'approved' },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: visit.userId,
          type: 'visit',
          title: 'Visit Request Approved',
          message: `Your visit request to ${property.name} has been approved`,
          link: `/u/visits/${visit.id}`,
          metadata: {
            visitRequestId: visit.id,
            propertyId: property.id,
          },
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Schedule visit (set date/time)
 */
export const scheduleVisit = async (
  userId: string,
  visitId: string,
  data: { scheduledDate: Date; scheduledTime: string }
) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'approved' && visit.status !== 'pending') {
    throw Object.assign(new Error('Visit must be approved or pending to schedule'), { statusCode: 400 });
  }

  // Three steps under Mongoose (double-booking read, status/date write,
  // notification create) with no atomicity between any of them -- the
  // original's check-then-act double-booking guard already had a genuine
  // race (two concurrent schedule calls could both pass the conflict check
  // before either writes). Wrapping the read+write+notify in one
  // prisma.$transaction doesn't fully eliminate that race under Postgres's
  // default READ COMMITTED isolation (no unique constraint backs this), but
  // it does make the write+notify pair atomic and narrows the window to the
  // one pre-existing class of problem the original had too -- not a new
  // regression, flagged in the report rather than silently "fixed" with a
  // stronger isolation level this port wasn't asked to introduce.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (visit.unitId) {
        const conflict = await tx.visitRequest.findFirst({
          where: {
            unitId: visit.unitId,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            status: { in: ['scheduled', 'approved'] },
            id: { not: visitId },
          },
        });

        if (conflict) {
          throw Object.assign(
            new Error('Time slot already booked for this unit'),
            { statusCode: 409 }
          );
        }
      }

      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: {
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          status: 'scheduled',
        },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: visit.userId,
          type: 'visit',
          title: 'Visit Scheduled',
          message: `Your visit to ${property.name} has been scheduled for ${data.scheduledDate.toLocaleDateString()} at ${data.scheduledTime}`,
          link: `/u/visits/${visit.id}`,
          metadata: {
            visitRequestId: visit.id,
            propertyId: property.id,
            scheduledDate: data.scheduledDate.toISOString(),
            scheduledTime: data.scheduledTime,
          },
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Assign staff to visit
 */
export const assignStaff = async (
  userId: string,
  visitId: string,
  staffId: string
) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isLandlord = property.landlordId === userId;
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isAdmin) {
    throw Object.assign(new Error('Only landlord can assign staff'), { statusCode: 403 });
  }

  if (!isValidId(staffId)) {
    throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
  }

  const staff = await prisma.profile.findUnique({ where: { id: staffId } });
  if (!staff || staff.role !== 'staff') {
    throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
  }

  if (!(await isStaffAssignedToProperty(staffId, property.id))) {
    throw Object.assign(new Error('Staff is not assigned to this property'), { statusCode: 400 });
  }

  // Assignment write + notification create: two writes, wrapped together.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: { assignedStaffId: staffId },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: staffId,
          type: 'visit',
          title: 'Visit Assigned',
          message: `You have been assigned to a visit at ${property.name}`,
          link: `/hub/bookings/visits/${visit.id}`,
          metadata: {
            visitRequestId: visit.id,
            propertyId: property.id,
          },
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Complete visit
 */
export const completeVisit = async (userId: string, visitId: string) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'scheduled') {
    throw Object.assign(new Error('Only scheduled visits can be completed'), { statusCode: 400 });
  }

  // Status write + notification create: two writes, wrapped together.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: { status: 'completed' },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: visit.userId,
          type: 'visit',
          title: 'Visit Completed',
          message: `Your visit to ${property.name} has been marked as completed`,
          link: `/u/visits/${visit.id}`,
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Cancel visit
 */
export const cancelVisit = async (userId: string, visitId: string) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isOwner = visit.userId === userId;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status === 'completed' || visit.status === 'cancelled') {
    throw Object.assign(new Error('Cannot cancel completed or already cancelled visit'), { statusCode: 400 });
  }

  const notifyUserId = isOwner ? property.landlordId : visit.userId;

  // Status write + notification create: two writes, wrapped together.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: { status: 'cancelled' },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: notifyUserId,
          type: 'visit',
          title: 'Visit Cancelled',
          message: `Visit to ${property.name} has been cancelled`,
          link: isOwner ? `/hub/bookings/visits/${visit.id}` : `/u/visits/${visit.id}`,
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Mark visit as no-show
 */
export const markNoShow = async (userId: string, visitId: string) => {
  const visit = await loadVisitForAuth(visitId);

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'scheduled') {
    throw Object.assign(new Error('Only scheduled visits can be marked as no-show'), { statusCode: 400 });
  }

  // Status write + notification create: two writes, wrapped together.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.visitRequest.update({
        where: { id: visitId },
        data: { status: 'no_show' },
        include: FULL_VISIT_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: visit.userId,
          type: 'visit',
          title: 'Visit Marked as No-Show',
          message: `Your visit to ${property.name} was marked as no-show`,
          link: `/u/visits/${visit.id}`,
        },
      });

      return result;
    });

    return serializeDoc(remapFullVisit(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Create reminder notifications for visits 1 day before.
 * Called by the cron scheduler (Phase 5), not by any HTTP route -- no
 * golden fixture exercises this function. Ported carefully but unverified
 * by any fixture; see the task report for the manual proof used instead.
 */
export const createVisitReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const upcomingVisits = await prisma.visitRequest.findMany({
    where: {
      status: 'scheduled',
      scheduledDate: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
    },
    include: { property: true, user: true, assignedStaff: true },
  });

  // Sequential, non-atomic notification creates -- matches the original
  // Mongoose code's own lack of atomicity here exactly (no transaction
  // requirement given for this cron path; a crash mid-loop could still
  // leave some visits'/recipients' reminders sent and others not, same as
  // before the port).
  for (const visit of upcomingVisits) {
    const property = visit.property;
    const user = visit.user;

    // Notify user
    await prisma.notification.create({
      data: {
        userId: visit.userId,
        type: 'visit',
        title: 'Visit Reminder',
        message: `Reminder: You have a visit scheduled tomorrow at ${property.name} at ${visit.scheduledTime}`,
        link: `/u/visits/${visit.id}`,
        metadata: {
          visitRequestId: visit.id,
          scheduledDate: visit.scheduledDate?.toISOString(),
          scheduledTime: visit.scheduledTime,
        },
      },
    });

    // Notify landlord
    await prisma.notification.create({
      data: {
        userId: property.landlordId,
        type: 'visit',
        title: 'Visit Reminder',
        message: `Reminder: ${user.name} has a visit scheduled tomorrow at ${property.name} at ${visit.scheduledTime}`,
        link: `/hub/bookings/visits/${visit.id}`,
        metadata: {
          visitRequestId: visit.id,
          scheduledDate: visit.scheduledDate?.toISOString(),
          scheduledTime: visit.scheduledTime,
        },
      },
    });

    // Notify assigned staff if any
    if (visit.assignedStaffId) {
      await prisma.notification.create({
        data: {
          userId: visit.assignedStaffId,
          type: 'visit',
          title: 'Visit Reminder',
          message: `Reminder: You have a visit assigned tomorrow at ${property.name} at ${visit.scheduledTime}`,
          link: `/hub/bookings/visits/${visit.id}`,
          metadata: {
            visitRequestId: visit.id,
            scheduledDate: visit.scheduledDate?.toISOString(),
            scheduledTime: visit.scheduledTime,
          },
        },
      });
    }
  }

  return upcomingVisits.length;
};
