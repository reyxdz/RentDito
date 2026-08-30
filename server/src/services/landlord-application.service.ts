import prisma from '../config/prisma';
import { Prisma, UserRole, LandlordAppStatus } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/**
 * `.populate('userId', 'name email phone verificationStatus avatar')` — used
 * only by `getAll`.
 */
const APPLICANT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  verificationStatus: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;

/**
 * `.populate('reviewedBy', 'name email')` — used by both `getMyApplication`
 * and `getAll`.
 */
const REVIEWER_SELECT = { id: true, name: true, email: true } satisfies Prisma.ProfileSelect;

/**
 * Mongoose never materializes a key for an optional scalar path that was
 * never set (no default, no value written) — it omits it from toJSON/
 * toObject output entirely rather than emitting `null`. Every optional
 * column read back from Postgres comes back as an explicit `null` instead,
 * so any populated sub-document (or the top-level application row itself)
 * has its null-valued keys dropped here before serialization, matching the
 * same convention `serializeProfile()` and `property.service.ts`'s
 * `shapeProperty()` already use elsewhere in this port.
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

/**
 * `.populate('userId', ...)` replaced the scalar `userId` with the
 * populated user object under the SAME key. Prisma's `include: { user: ... }`
 * instead adds a separate `user` key and leaves the `userId` scalar
 * untouched, so this remaps `user` back onto `userId` — byte-for-byte what
 * the populate call used to produce. `getMyApplication` never included
 * `user`, so `row.user` is `undefined` there and this is a no-op, leaving
 * `userId` as the raw scalar id (matches the original code, which never
 * populated `userId` on that path either).
 */
function remapApplicant<T extends { userId: string; user?: unknown }>(row: T) {
  if (row.user === undefined) return row;
  const { user, ...rest } = row;
  return { ...rest, userId: user === null ? null : stripNulls({ ...(user as Record<string, unknown>) }) };
}

/**
 * Same remap as `remapApplicant`, but for `.populate('reviewedBy', ...)` /
 * the `reviewer` relation. A never-reviewed (pending) application has
 * `reviewedBy: null` in Postgres; Mongoose's original document never set
 * the path at all, so `reviewedBy` was entirely absent from its JSON output
 * — the `null` case below drops the key rather than emitting `reviewedBy:
 * null`, and `approve`/`reject` never `include` this relation at all
 * (they return the raw updated row, exactly like the original `.save()`
 * did), so `row.reviewer === undefined` there and this is a no-op.
 */
function remapReviewer<T extends { reviewedBy: string | null; reviewer?: unknown }>(row: T) {
  if (row.reviewer === undefined) return row;
  const { reviewer, ...rest } = row;
  if (reviewer === null) {
    const out = { ...rest } as Record<string, unknown>;
    delete out.reviewedBy;
    return out;
  }
  return { ...rest, reviewedBy: stripNulls({ ...(reviewer as Record<string, unknown>) }) };
}

/**
 * Composes the two relation remaps and strips any remaining null optional
 * top-level column (`reviewedBy` when `reviewer` was never included,
 * `reviewedAt`, `reviewNotes`) so a pending application's response carries
 * none of those keys, matching what Mongoose emitted for a document that
 * never set them.
 */
function shapeApplication(row: Record<string, unknown>): Record<string, unknown> {
  const remapped = remapReviewer(remapApplicant(row as any) as any) as Record<string, unknown>;
  return stripNulls(remapped);
}

/**
 * Submit a landlord application. User must be verified.
 */
export const apply = async (
  userId: string,
  data: { businessName: string; businessType: string; documents?: string[] }
) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must verify your identity before applying to become a landlord.'),
      { statusCode: 403 }
    );
  }

  if (user.role !== 'user') {
    throw Object.assign(
      new Error('Only users with role "user" can apply to become a landlord.'),
      { statusCode: 400 }
    );
  }

  // Check for existing pending application
  const existing = await prisma.landlordApplication.findFirst({
    where: { userId, status: 'pending' },
  });
  if (existing) {
    throw Object.assign(new Error('You already have a pending application.'), { statusCode: 409 });
  }

  try {
    const row = await prisma.landlordApplication.create({
      data: {
        userId,
        businessName: data.businessName,
        businessType: data.businessType,
        documents: data.documents || [],
      },
    });

    return serializeDoc(shapeApplication(row));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Get the current user's landlord application.
 */
export const getMyApplication = async (userId: string) => {
  const row = await prisma.landlordApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { reviewer: { select: REVIEWER_SELECT } },
  });

  if (!row) return null;

  return serializeDoc(shapeApplication(row));
};

/**
 * Get all landlord applications (admin only). Supports filtering by status.
 */
export const getAll = async (status?: string) => {
  const where: Prisma.LandlordApplicationWhereInput = {};
  if (status) where.status = status as LandlordAppStatus;

  const rows = await prisma.landlordApplication.findMany({
    where,
    include: {
      user: { select: APPLICANT_SELECT },
      reviewer: { select: REVIEWER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(rows.map((row) => shapeApplication(row)));
};

/**
 * Approve a landlord application → promote user role to 'landlord'.
 *
 * Under Mongoose this was two independent `.save()` calls (the applicant's
 * `User.role` promotion, then the application's status/reviewer fields)
 * with no atomicity between them — a genuine latent bug: a crash or thrown
 * error between the two saves left the applicant promoted with no approved
 * application on record, or an "approved" application whose applicant was
 * never actually promoted. Both writes are now issued inside a single
 * `prisma.$transaction`, so either both land or neither does.
 */
export const approve = async (applicationId: string, adminId: string) => {
  if (!isValidId(applicationId)) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const application = await prisma.landlordApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error(`Application has already been ${application.status}.`),
      { statusCode: 400 }
    );
  }

  const applicant = await prisma.profile.findUnique({ where: { id: application.userId } });
  if (!applicant) {
    throw Object.assign(new Error('Applicant user not found'), { statusCode: 404 });
  }

  try {
    const updatedApplication = await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: application.userId },
        data: { role: UserRole.landlord },
      });

      return tx.landlordApplication.update({
        where: { id: applicationId },
        data: { status: 'approved', reviewedBy: adminId, reviewedAt: new Date() },
      });
    });

    return serializeDoc(shapeApplication(updatedApplication));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Reject a landlord application.
 *
 * Only one write (the application's own status/reviewer fields) — unlike
 * `approve`, there is no second row to keep in sync, so no transaction is
 * needed here.
 */
export const reject = async (applicationId: string, adminId: string, reviewNotes?: string) => {
  if (!isValidId(applicationId)) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  const application = await prisma.landlordApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (application.status !== 'pending') {
    throw Object.assign(
      new Error(`Application has already been ${application.status}.`),
      { statusCode: 400 }
    );
  }

  try {
    const row = await prisma.landlordApplication.update({
      where: { id: applicationId },
      data: { status: 'rejected', reviewedBy: adminId, reviewedAt: new Date(), reviewNotes: reviewNotes ?? null },
    });

    return serializeDoc(shapeApplication(row));
  } catch (e) {
    throw toHttpError(e);
  }
};
