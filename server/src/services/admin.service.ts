import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeList, serializeProfile } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies here.
// `getActivityLog`'s `AuditLog.userId` populate is a narrow, file-local
// `{name email avatar role}` select (never a full/unqualified Profile row),
// so `shapeEmbeddedProfile()` (built for FULL-row embeds specifically, see
// its own doc comment) would be the wrong tool -- a narrow select already
// excludes `legacyMongoId` by construction. Nothing here embeds a Property
// either. No child-table (`tenancy_comments`/`unit_slots`/`ticket_updates`/
// `conversation_participants`/`message_reads`) is reachable from this file.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

/**
 * Drops null-valued keys, mirroring Mongoose's "unset optional path -> key
 * entirely absent" convention every other ported service's own
 * `stripNulls()` already applies. `getPlatformStats`'s narrow `recentUsers`
 * select (`{name email role status createdAt avatar}`) is the one place in
 * this file that builds a Profile-shaped response WITHOUT going through
 * `serializeProfile` (which already does this for every other profile
 * response here) -- `avatar` is nullable and unset for every seeded user,
 * so without this it would leak an `avatar: null` the original Mongoose
 * `.select(...)` (which just omits an unset key) never produced.
 */
function stripNulls<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const key of Object.keys(out)) {
    if (out[key] === null) delete out[key];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Access Guard
// ─────────────────────────────────────────────────────────────

const checkAdminAccess = async (userId: string) => {
  if (!isValidId(userId)) {
    throwWithStatus('User not found', 404);
  }
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throwWithStatus('User not found', 404);
  }
  if (user!.role !== 'super_admin') {
    throwWithStatus('Access denied. Admin only.', 403);
  }
  return user!;
};

/**
 * Batch-resolves `assignedPropertyIds` (the join-table replacement for
 * `User.assignedPropertyIds[]`) for a set of profile ids in ONE round trip,
 * mirroring `team.service.ts`'s `getAssignedPropertyIds` but for many
 * profiles at once (this file's list endpoints return up to `limit` rows
 * per call, unlike team.service.ts's single-staff writes). Kept as a raw
 * scalar id array here (never populated to `{id, name}` objects) because
 * the original `getUsers`/`getPendingVerifications`/`getAllVerifications`
 * never called `.populate('assignedPropertyIds', ...)` -- only
 * `team.service.ts`'s own `getStaff` did that.
 */
async function getAssignedPropertyIdsMap(profileIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (profileIds.length === 0) return map;

  const rows = await prisma.staffPropertyAssignment.findMany({
    where: { staffId: { in: profileIds } },
    select: { staffId: true, propertyId: true },
  });
  for (const row of rows) {
    const list = map.get(row.staffId) ?? [];
    list.push(row.propertyId);
    map.set(row.staffId, list);
  }
  return map;
}

async function shapeUserRows(rows: Array<Record<string, unknown> & { id: string }>) {
  const assignedMap = await getAssignedPropertyIdsMap(rows.map((r) => r.id));
  return rows.map((row) => serializeProfile(row, { assignedPropertyIds: assignedMap.get(row.id) ?? [] }));
}

// ─────────────────────────────────────────────────────────────
//  Platform KPIs (GET /stats)
// ─────────────────────────────────────────────────────────────

export const getPlatformStats = async (adminId: string) => {
  await checkAdminAccess(adminId);

  // Mirrors the original's `new Date(new Date().setMonth(new Date().getMonth() - 6))`
  // exactly (a temp Date mutated by setMonth, whose returned epoch-ms is
  // then wrapped in a fresh Date) -- not simplified, so behavior under a
  // frozen/faked clock stays byte-identical to the pre-port code.
  const sixMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 6));

  // Run all aggregations in parallel, exactly like the original's Promise.all.
  const [
    totalUsers,
    totalLandlords,
    totalStaff,
    totalProperties,
    activeTenancies,
    totalTenancies,
    pendingVerifications,
    pendingLandlordApps,
    revenueAgg,
    monthlyGrowthRows,
    usersByRoleRows,
    recentUsersRows,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { role: 'landlord' } }),
    prisma.profile.count({ where: { role: 'staff' } }),
    prisma.property.count(),
    prisma.tenancy.count({ where: { status: 'checked_in' } }),
    prisma.tenancy.count(),
    prisma.profile.count({ where: { verificationStatus: 'pending' } }),
    prisma.landlordApplication.count({ where: { status: 'pending' } }),
    // Aggregation 1/3: total revenue from paid/partial bills. A single,
    // ungrouped $sum -- `prisma.bill.aggregate` (not groupBy, no grouping
    // key) is the direct translation.
    prisma.bill.aggregate({
      where: { status: { in: ['paid', 'partial'] } },
      _sum: { paidAmount: true, totalAmount: true },
    }),
    // Aggregation 2/3: monthly user growth (last 6 months), grouped by
    // (year, month) extracted from `created_at`. Prisma's `groupBy` has no
    // computed/extracted group key, so this is a parameterized `$queryRaw`.
    // Forced to UTC explicitly (`AT TIME ZONE 'UTC'`) to match Mongo's
    // `$year`/`$month` operators, which always operate in UTC regardless of
    // the server's local timezone -- Postgres's bare EXTRACT(... FROM
    // timestamptz) would otherwise use the session timezone.
    prisma.$queryRaw<Array<{ year: number; month: number; count: number }>>`
      SELECT EXTRACT(YEAR FROM (created_at AT TIME ZONE 'UTC'))::int AS year,
             EXTRACT(MONTH FROM (created_at AT TIME ZONE 'UTC'))::int AS month,
             COUNT(*)::int AS count
      FROM profiles
      WHERE created_at >= ${sixMonthsAgo}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `,
    // Aggregation 3/3: users by role. A plain single-column group -- fits
    // `groupBy` cleanly, no conditional aggregate needed.
    prisma.profile.groupBy({ by: ['role'], _count: true }),
    // 5 most recent users -- narrow select mirrors the original's
    // `.select('name email role status createdAt avatar')`, which (per
    // Mongoose's default) still implicitly carries `_id`.
    prisma.profile.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, avatar: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Mongo's $sum over zero matching documents never runs at all ($group
  // emits nothing, so `revenueAgg[0] || {totalCollected:0,totalBilled:0}`
  // falls back to zero); Postgres's SUM over zero matching rows returns SQL
  // NULL, not 0 -- the `?? 0` fallback below reproduces the same zero
  // default explicitly rather than letting `null` leak into a client that
  // expects a number.
  const totalCollected = revenueAgg._sum.paidAmount?.toNumber() ?? 0;
  const totalBilled = revenueAgg._sum.totalAmount?.toNumber() ?? 0;

  return {
    overview: {
      totalUsers,
      totalLandlords,
      totalStaff,
      totalProperties,
      activeTenancies,
      totalTenancies,
      pendingVerifications,
      pendingLandlordApps,
    },
    financial: {
      totalCollected,
      totalBilled,
      collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
    },
    charts: {
      monthlyGrowth: monthlyGrowthRows.map((item) => ({
        month: `${item.year}-${String(item.month).padStart(2, '0')}`,
        count: item.count,
      })),
      usersByRole: usersByRoleRows.map((item) => ({
        role: item.role,
        count: item._count,
      })),
    },
    recentUsers: serializeList(recentUsersRows.map((row) => stripNulls(row as unknown as Record<string, unknown>))),
  };
};

// ─────────────────────────────────────────────────────────────
//  User Management (GET /users, PATCH /users/:id/status)
// ─────────────────────────────────────────────────────────────

export const getUsers = async (
  adminId: string,
  filters: {
    role?: string;
    status?: string;
    verificationStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { role, status, verificationStatus, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProfileWhereInput = {};
  if (role) where.role = role as Prisma.ProfileWhereInput['role'];
  if (status) where.status = status as Prisma.ProfileWhereInput['status'];
  if (verificationStatus) where.verificationStatus = verificationStatus as Prisma.ProfileWhereInput['verificationStatus'];
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    users: await shapeUserRows(users),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateUserStatus = async (
  adminId: string,
  targetUserId: string,
  newStatus: 'active' | 'suspended'
) => {
  await checkAdminAccess(adminId);

  if (!isValidId(targetUserId)) {
    throwWithStatus('User not found', 404);
  }

  const user = await prisma.profile.findUnique({ where: { id: targetUserId } });
  if (!user) throwWithStatus('User not found', 404);

  if (user!.role === 'super_admin') {
    throwWithStatus('Cannot modify another super admin', 403);
  }

  try {
    // 3 writes under Mongoose (User.save + AuditLog.create + Notification.create)
    // with no atomicity between them -- wrapped in one prisma.$transaction so a
    // crash mid-sequence can't leave the status changed with no audit trail
    // and/or no notification sent.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.profile.update({
        where: { id: targetUserId },
        data: { status: newStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: newStatus === 'suspended' ? 'user_suspended' : 'user_activated',
          resourceType: 'User',
          resourceId: targetUserId,
          details: { targetUserEmail: user!.email, newStatus },
        },
      });

      await tx.notification.create({
        data: {
          userId: targetUserId,
          type: 'system',
          title: newStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
          message:
            newStatus === 'suspended'
              ? 'Your account has been suspended by an administrator. Contact support for more information.'
              : 'Your account has been reactivated. You may now log in and use the platform.',
          link: '/',
        },
      });

      return result;
    });

    return serializeProfile(updated, { assignedPropertyIds: (await getAssignedPropertyIdsMap([updated.id])).get(updated.id) ?? [] });
  } catch (e) {
    throw toHttpError(e);
  }
};

// ─────────────────────────────────────────────────────────────
//  Activity / Audit Log (GET /activity)
// ─────────────────────────────────────────────────────────────

// `userId`/`user` are nullable now that `audit_logs.user_id` is
// `ON DELETE SetNull` (see schema.prisma's AuditLog doc comment): a row
// whose actor was later deleted comes back from Prisma with `user: null`
// (not `undefined` -- `include` always resolves an optional relation to
// either the row or `null`), and this must render as a null actor rather
// than throw or leak the literal string "undefined" into the response.
function remapAuditUser<T extends { userId: string | null; user?: unknown }>(row: T) {
  if (row.user === undefined) return row;
  const { user, ...rest } = row;
  return { ...rest, userId: user };
}

export const getActivityLog = async (
  adminId: string,
  filters: {
    action?: string;
    resourceType?: string;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { action, resourceType, userId, page = 1, limit = 30 } = filters;
  const skip = (page - 1) * limit;

  // A malformed/Mongo-shaped `userId` filter can never match a real
  // Postgres row -- short-circuit to an empty page rather than letting
  // Prisma's `@db.Uuid` validation throw P2023 on the equality filter
  // (task-14's malformed-id-to-500 trap, applied here to a query filter
  // rather than a path id).
  if (userId !== undefined && !isValidId(userId)) {
    return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
  }

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, avatar: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: serializeList(logs.map(remapAuditUser)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────
//  Verification endpoints (existing — preserved)
// ─────────────────────────────────────────────────────────────

export const getPendingVerifications = async (
  adminId: string,
  filters: { page?: number; limit?: number } = {}
) => {
  await checkAdminAccess(adminId);

  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProfileWhereInput = { verificationStatus: 'pending' };

  const [users, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    users: await shapeUserRows(users),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getAllVerifications = async (
  adminId: string,
  filters: {
    verificationStatus?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { verificationStatus, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProfileWhereInput = {};
  if (verificationStatus) {
    where.verificationStatus = verificationStatus as Prisma.ProfileWhereInput['verificationStatus'];
  }

  const [users, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    users: await shapeUserRows(users),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const approveVerification = async (adminId: string, targetUserId: string) => {
  await checkAdminAccess(adminId);

  if (!isValidId(targetUserId)) {
    throwWithStatus('User not found', 404);
  }

  const user = await prisma.profile.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throwWithStatus('User not found', 404);
  }

  if (user!.verificationStatus !== 'pending') {
    throwWithStatus('User verification is not pending', 400);
  }

  try {
    const updated = await prisma.profile.update({
      where: { id: targetUserId },
      data: { verificationStatus: 'verified' },
    });

    return serializeProfile(updated, { assignedPropertyIds: (await getAssignedPropertyIdsMap([updated.id])).get(updated.id) ?? [] });
  } catch (e) {
    throw toHttpError(e);
  }
};

export const rejectVerification = async (
  adminId: string,
  targetUserId: string,
  reason?: string
) => {
  await checkAdminAccess(adminId);

  if (!isValidId(targetUserId)) {
    throwWithStatus('User not found', 404);
  }

  const user = await prisma.profile.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throwWithStatus('User not found', 404);
  }

  if (user!.verificationStatus !== 'pending') {
    throwWithStatus('User verification is not pending', 400);
  }

  try {
    const updated = await prisma.profile.update({
      where: { id: targetUserId },
      data: { verificationStatus: 'unverified', idPhotos: [] },
    });

    const shaped = serializeProfile(updated, { assignedPropertyIds: (await getAssignedPropertyIdsMap([updated.id])).get(updated.id) ?? [] });
    return { ...shaped, rejectionReason: reason };
  } catch (e) {
    throw toHttpError(e);
  }
};
