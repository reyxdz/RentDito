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
 * "unset optional path -> key entirely absent" convention (same pattern
 * used by property.service.ts/unit.service.ts/landlord-application.service.ts).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════
// Per-call-site relation selects. Each of the three read paths
// (getMyInquiries / getPropertyInquiries / getInquiryById) populated a
// DIFFERENT field set from the original Mongoose `.populate(path, select)`
// calls -- kept as distinct consts/shapers rather than one shared include,
// per the port's brief (collapsing them would change response shapes and
// fail fixtures).
// ═══════════════════════════════════════════════════════════════════════

/** `.populate('propertyId', 'name address images')` -- getMyInquiries only. */
const PROPERTY_NAME_ADDRESS_IMAGES_SELECT = {
  ...PROPERTY_REF_SELECT,
  images: true,
} satisfies Prisma.PropertySelect;

/** `.populate('propertyId', 'name address landlordId')` -- getInquiryById only. */
const PROPERTY_NAME_ADDRESS_LANDLORD_SELECT = {
  ...PROPERTY_REF_SELECT,
  landlordId: true,
} satisfies Prisma.PropertySelect;

/** `.populate('userId', 'name email phone avatar')` -- getPropertyInquiries + getInquiryById. */
const USER_CONTACT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;

/** `.populate('unitId', 'unitIdentifier')` -- all three read paths. */
const UNIT_IDENTIFIER_SELECT = { id: true, unitIdentifier: true } satisfies Prisma.UnitSelect;

type UserContactRow = { id: string; name: string; email: string; phone: string | null; avatar: string | null };
type UnitIdentifierRow = { id: string; unitIdentifier: string };
type PropertyImagesRow = Parameters<typeof shapePropertyRef>[0] & { images: string[] };
type PropertyLandlordRow = Parameters<typeof shapePropertyRef>[0] & { landlordId: string };

const shapeUserRef = (row: UserContactRow): Record<string, unknown> =>
  stripNulls({ id: row.id, name: row.name, email: row.email, phone: row.phone, avatar: row.avatar });

const shapeUnitRef = (row: UnitIdentifierRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
});

const shapePropertyWithImages = (row: PropertyImagesRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  images: row.images ?? [],
});

const shapePropertyWithLandlord = (row: PropertyLandlordRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  landlordId: row.landlordId,
});

/** Remaps for getMyInquiries: `propertyId` (name/address/images) + `unitId` (unitIdentifier). `userId` is never populated here (matches original). */
function remapMyInquiry(row: Record<string, any>): Record<string, unknown> {
  const { property, unit, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  if (property !== undefined) out.propertyId = shapePropertyWithImages(property);
  if (unit !== undefined) out.unitId = unit === null ? null : shapeUnitRef(unit);
  return out;
}

/** Remaps for getPropertyInquiries: `userId` (contact fields) + `unitId` (unitIdentifier). `propertyId` stays a raw scalar (matches original -- never populated on this path). */
function remapPropertyInquiry(row: Record<string, any>): Record<string, unknown> {
  const { user, unit, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  if (user !== undefined) out.userId = shapeUserRef(user);
  if (unit !== undefined) out.unitId = unit === null ? null : shapeUnitRef(unit);
  return out;
}

/** Remaps for getInquiryById: `userId` (contact fields) + `propertyId` (name/address/landlordId) + `unitId` (unitIdentifier). */
function remapInquiryDetail(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  if (user !== undefined) out.userId = shapeUserRef(user);
  if (property !== undefined) out.propertyId = shapePropertyWithLandlord(property);
  if (unit !== undefined) out.unitId = unit === null ? null : shapeUnitRef(unit);
  return out;
}

/**
 * Remaps for createInquiry/updateInquiryStatus's return value, which under
 * Mongoose was an UNQUALIFIED `.populate(['userId', 'propertyId', 'unitId'])`
 * -- i.e. the FULL referenced document for each relation, not a narrow field
 * list. No golden fixture exercises either return shape (there is no
 * create/PATCH-status case in inquiry.json), so this stays a straightforward
 * full-row pass-through (nulls stripped) rather than reconstructing
 * property.service.ts's private nested address/billingSettings shape, which
 * isn't exported and is out of this port's scope to duplicate for an
 * untested path.
 *
 * `user` is a full `Profile` row (unqualified include, not field-selected)
 * and must go through the shared `shapeEmbeddedProfile()` (task 18a), not a
 * bare `stripNulls({ ...user })` -- that bare form is exactly what leaked
 * `legacyMongoId` here (flagged as a latent bug in task 18's report,
 * confirmed and fixed in task 18a; no fixture exercises this return shape,
 * which is why it went undetected). `property`/`unit` are not `Profile`
 * rows (no `legacyMongoId` column exists on either model), so they keep the
 * plain local `stripNulls()`.
 */
function remapFullPopulate(row: Record<string, any>): Record<string, unknown> {
  const { user, property, unit, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  if (user !== undefined) out.userId = shapeEmbeddedProfile(user);
  if (property !== undefined) out.propertyId = stripNulls({ ...property });
  if (unit !== undefined) out.unitId = unit === null ? null : stripNulls({ ...unit });
  return out;
}

/**
 * Whether `userId` (a staff member) is assigned to `propertyId`, the direct
 * replacement for Mongoose's `user.assignedPropertyIds?.some(id => ...)` --
 * that array lived directly on the User document; in Postgres it's the
 * `staff_property_assignments` join table (same pattern as
 * property.service.ts/unit.service.ts's own scoped-access checks).
 */
async function isStaffAssignedToProperty(userId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId: userId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Create inquiry (user must be verified).
 * Auto-creates the conversation (with both participants) and the initial
 * message, and notifies the landlord.
 *
 * Under Mongoose the Inquiry, Conversation and initial Message were three
 * independent `.create()` calls with no atomicity between them -- a crash
 * between any two could leave an inquiry with no conversation, or a
 * conversation with no participants. All three (plus the notification) are
 * now issued as ONE nested write inside a single `prisma.$transaction`, so
 * either the whole graph lands or none of it does. `conversations.inquiry_id`
 * is `@unique`; a duplicate attempt raises P2002, mapped by `toHttpError` to
 * a 409 rather than a raw Prisma exception.
 */
export const createInquiry = async (
  userId: string,
  data: {
    propertyId: string;
    unitId?: string;
    subject: string;
    initialMessage: string;
  }
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to submit inquiries'),
      { statusCode: 403 }
    );
  }

  if (!isValidId(data.propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  try {
    const inquiry = await prisma.$transaction(async (tx) => {
      const created = await tx.inquiry.create({
        data: {
          userId,
          propertyId: data.propertyId,
          unitId: data.unitId ?? null,
          subject: data.subject,
          status: 'open',
          conversation: {
            create: {
              participants: {
                create: [{ userId }, { userId: property.landlordId }],
              },
              messages: {
                create: {
                  senderId: userId,
                  content: data.initialMessage,
                  attachments: [],
                  readBy: { create: { userId } },
                },
              },
            },
          },
        },
        include: { user: true, property: true, unit: true },
      });

      await tx.notification.create({
        data: {
          userId: property.landlordId,
          type: 'inquiry',
          title: 'New Inquiry',
          message: `${user.name} sent an inquiry about ${property.name}`,
          link: `/hub/pipeline/inquiries/${created.id}`,
          metadata: {
            inquiryId: created.id,
            propertyId: property.id,
          },
        },
      });

      return created;
    });

    return serializeDoc(remapFullPopulate(inquiry));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Get user's own inquiries
 */
export const getMyInquiries = async (userId: string) => {
  const inquiries = await prisma.inquiry.findMany({
    where: { userId },
    include: {
      property: { select: PROPERTY_NAME_ADDRESS_IMAGES_SELECT },
      unit: { select: UNIT_IDENTIFIER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(inquiries.map((row) => remapMyInquiry(row)));
};

/**
 * Get inquiries for a property (landlord/staff only)
 */
export const getPropertyInquiries = async (
  userId: string,
  propertyId: string,
  filters: { status?: string } = {}
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  // Check access
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

  // Build filter
  const filter: Prisma.InquiryWhereInput = { propertyId };
  if (filters.status) {
    filter.status = filters.status as Prisma.InquiryWhereInput['status'];
  }

  const inquiries = await prisma.inquiry.findMany({
    where: filter,
    include: {
      user: { select: USER_CONTACT_SELECT },
      unit: { select: UNIT_IDENTIFIER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(inquiries.map((row) => remapPropertyInquiry(row)));
};

/**
 * Get inquiry detail with conversation
 */
export const getInquiryById = async (userId: string, inquiryId: string) => {
  // A Mongo-ObjectId-shaped sentinel (e.g. the golden fixture's
  // `000000000000000000000000`) is syntactically valid under Mongoose's
  // ObjectId rules but is NOT a valid Postgres UUID; handed straight to
  // Prisma it raises P2023 (malformed UUID), which has no mapping in
  // toHttpError and would fall through to a 500. Collapse it into the SAME
  // 404 this function already throws for a syntactically-valid-but-missing
  // row -- copied verbatim from public.service.ts's invalid-id pattern
  // (task-14-report.md) -- rather than a distinct 400, since that is
  // exactly what the golden fixture (and the original Mongoose behavior for
  // this same well-formed-but-nonexistent id) requires.
  if (!isValidId(inquiryId)) {
    throw Object.assign(new Error('Inquiry not found'), { statusCode: 404 });
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      user: { select: USER_CONTACT_SELECT },
      property: { select: PROPERTY_NAME_ADDRESS_LANDLORD_SELECT },
      unit: { select: UNIT_IDENTIFIER_SELECT },
    },
  });

  if (!inquiry) {
    throw Object.assign(new Error('Inquiry not found'), { statusCode: 404 });
  }

  // Check access
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isOwner = inquiry.userId === userId;
  const isLandlord = inquiry.property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, inquiry.propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Get conversation
  const conversation = await prisma.conversation.findUnique({ where: { inquiryId } });

  return {
    ...serializeDoc(remapInquiryDetail(inquiry)),
    conversationId: conversation?.id,
  };
};

/**
 * Update inquiry status
 */
export const updateInquiryStatus = async (
  userId: string,
  inquiryId: string,
  status: string
) => {
  // No golden fixture exercises a malformed id on this route; guarded the
  // same way property.service.ts/unit.service.ts guard their own
  // authenticated update paths (400, not the 404-collapse getInquiryById
  // uses -- that collapse is specific to the fixture-mandated GET-by-id
  // case, see getInquiryById's comment).
  if (!isValidId(inquiryId)) {
    throw Object.assign(new Error('Invalid inquiry ID'), { statusCode: 400 });
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: { property: true },
  });
  if (!inquiry) {
    throw Object.assign(new Error('Inquiry not found'), { statusCode: 404 });
  }

  // Check access (landlord/staff only)
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = inquiry.property;
  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  try {
    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: status as Prisma.InquiryUpdateInput['status'] },
      include: { user: true, property: true, unit: true },
    });

    // Notify user if status changed to closed or converted
    if (status === 'closed' || status === 'converted') {
      await prisma.notification.create({
        data: {
          userId: inquiry.userId,
          type: 'inquiry',
          title: `Inquiry ${status === 'closed' ? 'Closed' : 'Converted'}`,
          message: `Your inquiry about ${property.name} has been ${status}`,
          link: `/u/inquiries/${inquiry.id}`,
        },
      });
    }

    return serializeDoc(remapFullPopulate(updated));
  } catch (e) {
    throw toHttpError(e);
  }
};
