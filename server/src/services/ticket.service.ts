import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';

// NOTE on embeddedProfile.mapper.ts (listed as an "existing utility to use"
// for this port): it does NOT apply anywhere in this file. Every single
// Profile/user relation this file ever returns to a client goes through a
// narrow, purpose-built `select` (never an unqualified `include: { x: true }`)
// -- `TENANCY_USER_SELECT`, `REPORTED_BY_SELECT`, `ASSIGNED_TO_SELECT`,
// `ASSIGNED_BY_SELECT`, `UPDATE_USER_SELECT` below -- each of which excludes
// `legacyMongoId` by construction (it is simply never named in any of these
// selects). The only UNQUALIFIED profile reads in this file
// (`ensureUser`/`prisma.profile.findUnique` for the acting user, `staff`/
// `actor` lookups inside assignTicket) are used purely for internal
// permission-check logic and are never serialized directly -- every actual
// response re-queries via `TICKET_INCLUDE`'s narrow selects. Same
// established precedent as transfer.service.ts's own identical note (Task 24).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

type TicketListFilters = {
  propertyId?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedToUserId?: string;
};

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
// Relation shapes -- the 8 `.populate()` sites from the original
// `populateTicket()` helper, translated 1:1 into a single shared
// `TICKET_INCLUDE` constant (every read/write-return path in this file uses
// the exact same populate shape, unlike tenancy.service.ts's four distinct
// per-call-site widths).
// ═══════════════════════════════════════════════════════════════════════

/** `.populate({path:'tenancyId', ..., populate:[{path:'userId', select:'name email avatar'}]})`. */
const TENANCY_USER_SELECT = { id: true, name: true, email: true, avatar: true } satisfies Prisma.ProfileSelect;
/** `.populate({path:'tenancyId', ..., populate:[{path:'unitId', select:'unitIdentifier'}]})`. */
const TENANCY_UNIT_SELECT = { id: true, unitIdentifier: true } satisfies Prisma.UnitSelect;
/** `.populate('unitId', 'unitIdentifier accommodationType')` -- the ticket's own top-level unit. */
const TICKET_UNIT_SELECT = { id: true, unitIdentifier: true, accommodationType: true } satisfies Prisma.UnitSelect;
/** `.populate('propertyId', 'name address landlordId')` -- propertyRef.mapper.ts's narrow shape, plus landlordId. */
const PROPERTY_TICKET_SELECT = { ...PROPERTY_REF_SELECT, landlordId: true } satisfies Prisma.PropertySelect;
/** `.populate('reportedByUserId', 'name email avatar')`. */
const REPORTED_BY_SELECT = { id: true, name: true, email: true, avatar: true } satisfies Prisma.ProfileSelect;
/** `.populate('assignedToUserId', 'name email avatar positionName')`. */
const ASSIGNED_TO_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  positionName: true,
} satisfies Prisma.ProfileSelect;
/** `.populate('assignedByUserId', 'name email')`. */
const ASSIGNED_BY_SELECT = { id: true, name: true, email: true } satisfies Prisma.ProfileSelect;
/** `.populate('updates.userId', 'name role avatar')`. */
const UPDATE_USER_SELECT = { id: true, name: true, role: true, avatar: true } satisfies Prisma.ProfileSelect;

/**
 * `updates[]` -> the `ticket_updates` child table. Mongoose embedded
 * `[{ userId, message, timestamp }]` directly on the Ticket document (its own
 * sub-schema uses `{ _id: false }` -- no per-entry id, confirmed against
 * src/models/Ticket.ts and every golden fixture entry); Postgres promotes it
 * to a real child table with its own `id` primary key. The API must still
 * present `updates` as an ordered array ON the ticket (per this task's
 * brief), so every read/write-return path below includes it via this same
 * constant, ordered by `timestamp` ascending (the column the schema actually
 * has -- there is no separate `createdAt` on `TicketUpdate`; `timestamp` IS
 * this row's creation instant, set once at insert and never updated),
 * selecting only `{message, timestamp, user}` -- `id`/`ticketId` are
 * deliberately never selected, so no id ever needs stripping out later to
 * match the original's id-less embedded shape.
 */
const TICKET_UPDATES_INCLUDE = {
  orderBy: { timestamp: 'asc' as const },
  select: {
    message: true,
    timestamp: true,
    user: { select: UPDATE_USER_SELECT },
  },
} satisfies Prisma.Ticket$updatesArgs;

const TICKET_INCLUDE = {
  tenancy: {
    select: {
      id: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      user: { select: TENANCY_USER_SELECT },
      unit: { select: TENANCY_UNIT_SELECT },
    },
  },
  property: { select: PROPERTY_TICKET_SELECT },
  unit: { select: TICKET_UNIT_SELECT },
  reportedBy: { select: REPORTED_BY_SELECT },
  assignedTo: { select: ASSIGNED_TO_SELECT },
  assignedBy: { select: ASSIGNED_BY_SELECT },
  updates: TICKET_UPDATES_INCLUDE,
} satisfies Prisma.TicketInclude;

const shapeReportedBy = (u: Record<string, any>): Record<string, unknown> =>
  stripNulls({ id: u.id, name: u.name, email: u.email, avatar: u.avatar });
const shapeAssignedTo = (u: Record<string, any>): Record<string, unknown> =>
  stripNulls({ id: u.id, name: u.name, email: u.email, avatar: u.avatar, positionName: u.positionName });
const shapeAssignedBy = (u: Record<string, any>): Record<string, unknown> =>
  stripNulls({ id: u.id, name: u.name, email: u.email });

function shapeTenancyEmbed(tenancy: Record<string, any>): Record<string, unknown> {
  const { user, unit, ...rest } = tenancy;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (user !== undefined) {
    out.userId = stripNulls({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
  }
  if (unit !== undefined) {
    out.unitId = { id: unit.id, unitIdentifier: unit.unitIdentifier };
  }
  return out;
}

/** `propertyRef.mapper.ts`'s narrow `{id, name, address}` shape, plus `landlordId` -- same pattern tenancy.service.ts's own `shapePropertyWithLandlordImages` established for the same mapper. */
function shapePropertyEmbed(property: Record<string, any>): Record<string, unknown> {
  return { ...shapePropertyRef(property as Parameters<typeof shapePropertyRef>[0]), landlordId: property.landlordId };
}

function shapeUnitEmbed(unit: Record<string, any>): Record<string, unknown> {
  return { id: unit.id, unitIdentifier: unit.unitIdentifier, accommodationType: unit.accommodationType };
}

function shapeTicketUpdate(row: Record<string, any>): Record<string, unknown> {
  return {
    userId: stripNulls({ id: row.user.id, name: row.user.name, role: row.user.role, avatar: row.user.avatar }),
    message: row.message,
    timestamp: row.timestamp,
  };
}

/**
 * Rebuilds a `TICKET_INCLUDE`-shaped row back onto the Mongoose `.populate()`
 * response shape: each relation object replaces its own scalar FK key
 * (property.service.ts's task-10 remap pattern -- spread the raw row first,
 * then re-declare each populated key so the explicit value wins), and
 * `updates` is always rebuilt as an array (defaulting to `[]`), never left
 * absent.
 */
function remapTicket(row: Record<string, any>): Record<string, unknown> {
  const { tenancy, property, unit, reportedBy, assignedTo, assignedBy, updates, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });

  if (tenancy !== undefined) out.tenancyId = shapeTenancyEmbed(tenancy);
  if (property !== undefined) out.propertyId = shapePropertyEmbed(property);
  if (unit !== undefined) out.unitId = shapeUnitEmbed(unit);
  if (reportedBy !== undefined) out.reportedByUserId = shapeReportedBy(reportedBy);
  if (assignedTo !== undefined && assignedTo !== null) out.assignedToUserId = shapeAssignedTo(assignedTo);
  if (assignedBy !== undefined && assignedBy !== null) out.assignedByUserId = shapeAssignedBy(assignedBy);
  out.updates = ((updates ?? []) as Record<string, any>[]).map(shapeTicketUpdate);

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

const hasMaintenancePermission = (user: { role: string; permissions: string[] }): boolean => {
  return user.role !== 'staff' || Boolean(user.permissions?.includes('maintenance'));
};

/**
 * Whether `staffId` is assigned to `propertyId` -- direct replacement for
 * Mongoose's `user.assignedPropertyIds?.some(...)`, which lived directly on
 * the User document; in Postgres it's the `staff_property_assignments` join
 * table (same pattern every other ported service's own scoped-access checks
 * already use).
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
 * ('User not found'/404, 'Property not found'/404, 'Access denied. Missing
 * permission: maintenance'/403, 'Access denied'/403).
 */
const verifyPropertyManagementAccess = async (
  userId: string,
  propertyId: string,
  options: { requireMaintenancePermission?: boolean } = {}
) => {
  const user = await ensureUser(userId);
  const property = await prisma.property.findUnique({ where: { id: propertyId } });

  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (user.role === 'super_admin') {
    return { user, property };
  }

  if (user.role === 'staff' && options.requireMaintenancePermission && !hasMaintenancePermission(user)) {
    throw Object.assign(new Error('Access denied. Missing permission: maintenance'), { statusCode: 403 });
  }

  const isLandlord = property.landlordId === userId;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId));

  if (!isLandlord && !isStaff) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return { user, property };
};

/**
 * The property-scope filter for `getTickets` -- direct Prisma port of the
 * original `getManagedPropertyFilter`. `null` means "no scoping" (super_admin
 * sees everything); an array (possibly empty) scopes to those property ids.
 */
const getManagedPropertyFilter = async (user: { id: string; role: string; permissions: string[] }): Promise<
  string[] | null
> => {
  if (user.role === 'super_admin') {
    return null;
  }

  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({ where: { landlordId: user.id }, select: { id: true } });
    return properties.map((p) => p.id);
  }

  if (user.role === 'staff') {
    if (!hasMaintenancePermission(user)) {
      throw Object.assign(new Error('Access denied. Missing permission: maintenance'), { statusCode: 403 });
    }
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: user.id },
      select: { propertyId: true },
    });
    return assignments.map((a) => a.propertyId);
  }

  throw Object.assign(new Error('Access denied'), { statusCode: 403 });
};

/**
 * Ownership + management access check for a single ticket. Takes the RAW
 * Prisma row (scalar `reportedByUserId`/`propertyId` FKs, untouched by
 * whatever relations happen to also be included alongside them) -- this is
 * what makes the KNOWN, DELIBERATE fix this task must preserve fall out
 * naturally rather than needing to be re-implemented: the original Mongoose
 * bug (`ticket.reportedByUserId.toString()` stringifying an already-
 * populated user object to the literal `"[object Object]"`, permanently
 * locking every tenant out of their own ticket) existed only because
 * Mongoose's `.populate()` overwrites the scalar FK key in place. Prisma's
 * `include` never does that -- the scalar `reportedByUserId` column and the
 * populated `reportedBy` relation object coexist under different keys on the
 * same row -- so comparing the raw scalar here is both the direct
 * replacement for the original's (already-fixed) `ticket.reportedByUserId
 * ._id?.toString?.() || ticket.reportedByUserId?.toString?.()` idiom AND
 * structurally immune to the class of bug that idiom was patching around.
 * `ticket-by-id-owner-user1` (tests/golden/ticket.json) is the regression
 * fixture for this; `tests/contract/ticket-access.test.ts` guards it
 * separately end-to-end.
 *
 * NOT preserved by design, per this task's brief: `ticket-by-id-assigned`
 * (assigned staff member gets 403 on a ticket assigned to them) is a
 * SEPARATE, still-open gap -- no seeded staff has a `staff_property_
 * assignments` row -- and must NOT be "fixed" here. This function's
 * `verifyPropertyManagementAccess` call below reproduces it automatically:
 * `isStaffAssignedToProperty` queries that same (empty) join table.
 */
const canAccessTicket = async (
  userId: string,
  ticket: { reportedByUserId: string; propertyId: string },
  options: { managementOnly?: boolean; requireMaintenancePermission?: boolean } = {}
) => {
  const user = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return { user, property: null };
  }

  const isOwner = ticket.reportedByUserId === userId;
  if (!options.managementOnly && isOwner) {
    return { user, property: null };
  }

  const result = await verifyPropertyManagementAccess(userId, ticket.propertyId, {
    requireMaintenancePermission: options.requireMaintenancePermission,
  });
  return { user, property: result.property };
};

// ─────────────────────────────────────────────────────────────
//  createTicket
//
//  WRITE SET (inside one prisma.$transaction):
//    1. ticket.create              -- the new ticket row
//    2. notification.create        -- to the property's landlord (if any)
//    3. notification.createMany    -- to every maintenance-permissioned staff assigned to the property
//  Under Mongoose these were up to 3 independent, non-atomic writes (a crash
//  after step 1 could leave a filed ticket nobody managing the property is
//  ever notified about). Wrapped here following the same "writes + notify,
//  one transaction" pattern every other create-plus-notify path in this
//  migration already uses.
// ─────────────────────────────────────────────────────────────

export const createTicket = async (
  userId: string,
  data: {
    tenancyId: string;
    title: string;
    description: string;
    category: 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'pest' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    images?: string[];
  }
) => {
  const user = await ensureUser(userId);
  if (user.role !== 'user') {
    throw Object.assign(new Error('Only tenant users can create maintenance tickets'), { statusCode: 403 });
  }

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
  if (tenancy.userId !== userId) {
    throw Object.assign(new Error('You can only create tickets for your own tenancy'), { statusCode: 403 });
  }
  if (tenancy.status !== 'checked_in') {
    throw Object.assign(new Error('You must have an active checked-in tenancy to create a ticket'), {
      statusCode: 400,
    });
  }

  const property = tenancy.property;
  const unit = tenancy.unit;

  let created: { id: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          tenancyId: tenancy.id,
          propertyId: property.id,
          unitId: unit.id,
          reportedByUserId: userId,
          title: data.title,
          description: data.description,
          category: data.category as Prisma.TicketUncheckedCreateInput['category'],
          priority: (data.priority ?? 'medium') as Prisma.TicketUncheckedCreateInput['priority'],
          images: data.images ?? [],
          status: 'open',
        },
      });

      if (property.landlordId) {
        await tx.notification.create({
          data: {
            userId: property.landlordId,
            type: 'maintenance',
            title: 'New Maintenance Ticket',
            message: `${user.name} reported "${data.title}" at ${property.name}.`,
            link: `/hub/maintenance/tickets/${ticket.id}`,
            metadata: { ticketId: ticket.id, propertyId: property.id, tenancyId: tenancy.id },
          },
        });
      }

      // Notify staff assigned to this property with maintenance module enabled.
      const assignedStaff = await tx.profile.findMany({
        where: {
          role: 'staff',
          permissions: { has: 'maintenance' },
          assignedProperties: { some: { propertyId: property.id } },
        },
        select: { id: true },
      });

      if (assignedStaff.length) {
        await tx.notification.createMany({
          data: assignedStaff.map((staff) => ({
            userId: staff.id,
            type: 'maintenance' as const,
            title: 'New Maintenance Ticket',
            message: `A new maintenance ticket was filed at ${property.name}.`,
            link: `/hub/maintenance/tickets/${ticket.id}`,
            metadata: { ticketId: ticket.id, propertyId: property.id, tenancyId: tenancy.id },
          })),
        });
      }

      return ticket;
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.ticket.findUnique({ where: { id: created.id }, include: TICKET_INCLUDE });
  return serializeDoc(remapTicket(populated!));
};

export const getMyTickets = async (
  userId: string,
  filters: { status?: string; priority?: string; category?: string } = {}
) => {
  const user = await ensureUser(userId);
  if (user.role !== 'user') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const where: Prisma.TicketWhereInput = { reportedByUserId: userId };
  if (filters.status) where.status = filters.status as Prisma.TicketWhereInput['status'];
  if (filters.priority) where.priority = filters.priority as Prisma.TicketWhereInput['priority'];
  if (filters.category) where.category = filters.category as Prisma.TicketWhereInput['category'];

  const tickets = await prisma.ticket.findMany({
    where,
    include: TICKET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(tickets.map((t) => remapTicket(t)));
};

export const getTickets = async (userId: string, filters: TicketListFilters = {}) => {
  const user = await ensureUser(userId);
  const managedPropertyIds = await getManagedPropertyFilter(user);

  const where: Prisma.TicketWhereInput = {};

  if (managedPropertyIds) {
    where.propertyId = { in: managedPropertyIds };
  }

  if (filters.propertyId) {
    // Invalid-id guard for an AUTHENTICATED route (property.service.ts's own
    // convention, not task-14's public-route collapse): a malformed id is a
    // genuine, distinguishable client bug for a signed-in caller, so it gets
    // its own 400 rather than folding into verifyPropertyManagementAccess's
    // 404 -- same convention transfer.service.ts's getTransferRequests
    // already established for the identical `filters.propertyId` shape.
    if (!isValidId(filters.propertyId)) {
      throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
    }
    await verifyPropertyManagementAccess(userId, filters.propertyId, { requireMaintenancePermission: true });
    where.propertyId = filters.propertyId;
  }

  if (filters.status) where.status = filters.status as Prisma.TicketWhereInput['status'];
  if (filters.priority) where.priority = filters.priority as Prisma.TicketWhereInput['priority'];
  if (filters.category) where.category = filters.category as Prisma.TicketWhereInput['category'];
  if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;

  const tickets = await prisma.ticket.findMany({
    where,
    include: TICKET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(tickets.map((t) => remapTicket(t)));
};

/**
 * INVALID-ID HANDLING (task-14 pattern, verbatim): `ticket-by-id-not-found`
 * (tests/golden/ticket.json) requests a Mongo-ObjectId-shaped sentinel
 * (`000000000000000000000000`) -- a syntactically valid Mongo ObjectId (24
 * hex chars), so the ORIGINAL Mongoose `Ticket.findById` happily casts it and
 * simply finds no document, throwing this function's own existing 404
 * ('Ticket not found'). It is NOT a valid Postgres UUID, so handed straight
 * to Prisma it would raise `P2023` (malformed UUID) -- which `toHttpError`
 * has no mapping for and falls through to a 500, not the 404 the fixture
 * (correctly) demands. Collapsing the malformed-id case into this function's
 * own pre-existing "ticket not found" 404 -- rather than a distinct 400 the
 * way property.service.ts's `getPropertyById` treats a malformed id on ITS
 * authenticated route -- is the right call specifically HERE because it's
 * exactly what the fixture already encodes (checked the actual message, per
 * the brief) and because it does not weaken any behavior: the original
 * already treated this exact sentinel as "not found", not as a distinct
 * client error, since 24 zero-hex-chars IS a syntactically valid ObjectId.
 */
export const getTicketById = async (userId: string, ticketId: string) => {
  if (!isValidId(ticketId)) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  await canAccessTicket(userId, ticket, { requireMaintenancePermission: true });
  return serializeDoc(remapTicket(ticket));
};

// ─────────────────────────────────────────────────────────────
//  assignTicket (also serves reassignTicket, via the `mode` param)
//
//  WRITE SET (inside one prisma.$transaction):
//    1. ticket.update (+ nested `updates: { create: ... }`) -- assignment
//       fields, status -> 'assigned', and the progress-note append, ALL in
//       one statement (the nested `create` is what "append via nested
//       create" means for a nested nested-write, not a separate round trip).
//    2. notification.create -- to the newly (re)assigned staff member.
//  Under Mongoose this was one `ticket.save()` (fields + the in-memory
//  `updates.push`) plus one separate, non-atomic `Notification.create()`;
//  wrapped in one transaction here, same pattern as every other
//  write-plus-notify path in this migration.
// ─────────────────────────────────────────────────────────────

export const assignTicket = async (
  userId: string,
  ticketId: string,
  staffId: string,
  mode: 'assign' | 'reassign'
) => {
  if (!isValidId(ticketId)) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const actor = await ensureUser(userId);
  const property = await prisma.property.findUnique({ where: { id: ticket.propertyId } });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (actor.role !== 'super_admin') {
    if (actor.role !== 'landlord' || property.landlordId !== userId) {
      throw Object.assign(new Error('Only the landlord can assign or reassign ticket staff'), { statusCode: 403 });
    }
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    throw Object.assign(new Error('Cannot assign a resolved or closed ticket'), { statusCode: 400 });
  }

  const staff = await prisma.profile.findUnique({ where: { id: staffId } });
  if (!staff || staff.role !== 'staff') {
    throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
  }
  if (!(await isStaffAssignedToProperty(staff.id, property.id))) {
    throw Object.assign(new Error('Staff is not assigned to this property'), { statusCode: 400 });
  }
  if (!staff.permissions?.includes('maintenance')) {
    throw Object.assign(new Error('Staff does not have maintenance permission'), { statusCode: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          assignedToUserId: staff.id,
          assignedByUserId: actor.id,
          status: 'assigned',
          updates: {
            create: {
              userId: actor.id,
              message:
                mode === 'assign' ? `Assigned ticket to ${staff.name}.` : `Reassigned ticket to ${staff.name}.`,
              timestamp: new Date(),
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: staff.id,
          type: 'maintenance',
          title: mode === 'assign' ? 'Maintenance Ticket Assigned' : 'Maintenance Ticket Reassigned',
          message: `You were ${mode === 'assign' ? 'assigned' : 'reassigned'} ticket "${ticket.title}".`,
          link: `/hub/maintenance/tickets/${ticket.id}`,
          metadata: { ticketId: ticket.id, propertyId: ticket.propertyId },
        },
      });
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: TICKET_INCLUDE });
  return serializeDoc(remapTicket(populated!));
};

// ─────────────────────────────────────────────────────────────
//  addTicketUpdate
//
//  WRITE SET (inside one prisma.$transaction):
//    1. ticket.update (+ nested `updates: { create: ... }`, + status ->
//       'in_progress' when applicable) -- one statement.
//    2. notification.create -- to the reporter, only when the actor is
//       someone other than the reporter themself.
//  Same non-atomicity fix as assignTicket's write pair. The
//  `verifyPropertyManagementAccess` re-check below (when `shouldTransition`
//  is true) runs BEFORE the transaction starts, matching the original's
//  ordering exactly: under Mongoose the in-memory `updates.push()` happened
//  before this check too, but `ticket.save()` (the actual persist) happened
//  after -- so a throw here discarded the pushed update same as it does
//  here (nothing is written until the transaction commits).
// ─────────────────────────────────────────────────────────────

export const addTicketUpdate = async (userId: string, ticketId: string, message: string) => {
  if (!isValidId(ticketId)) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const { user } = await canAccessTicket(userId, ticket, { requireMaintenancePermission: true });

  if (ticket.status === 'closed') {
    throw Object.assign(new Error('Cannot add updates to a closed ticket'), { statusCode: 400 });
  }

  const isManagement = user.role === 'landlord' || user.role === 'staff' || user.role === 'super_admin';
  const shouldTransition = isManagement && (ticket.status === 'open' || ticket.status === 'assigned');

  if (shouldTransition) {
    await verifyPropertyManagementAccess(userId, ticket.propertyId, { requireMaintenancePermission: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          ...(shouldTransition ? { status: 'in_progress' as const } : {}),
          updates: { create: { userId, message, timestamp: new Date() } },
        },
      });

      if (ticket.reportedByUserId !== userId) {
        await tx.notification.create({
          data: {
            userId: ticket.reportedByUserId,
            type: 'maintenance',
            title: 'Maintenance Ticket Updated',
            message: `Your ticket "${ticket.title}" has a new progress update.`,
            link: `/u/my-tickets/${ticket.id}`,
            metadata: { ticketId: ticket.id, propertyId: ticket.propertyId },
          },
        });
      }
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: TICKET_INCLUDE });
  return serializeDoc(remapTicket(populated!));
};

// ─────────────────────────────────────────────────────────────
//  resolveTicket -- same write shape/atomicity fix as assignTicket.
// ─────────────────────────────────────────────────────────────

export const resolveTicket = async (userId: string, ticketId: string, resolutionNotes: string) => {
  if (!isValidId(ticketId)) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const { user } = await canAccessTicket(userId, ticket, {
    managementOnly: true,
    requireMaintenancePermission: true,
  });

  if (ticket.status === 'closed') {
    throw Object.assign(new Error('Cannot resolve a closed ticket'), { statusCode: 400 });
  }
  if (ticket.status === 'resolved') {
    throw Object.assign(new Error('Ticket is already resolved'), { statusCode: 400 });
  }

  // Staff can resolve only if assigned to the ticket.
  if (user.role === 'staff' && ticket.assignedToUserId !== userId) {
    throw Object.assign(new Error('Only the assigned staff can resolve this ticket'), { statusCode: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'resolved',
          resolutionNotes,
          resolvedAt: new Date(),
          updates: { create: { userId, message: 'Ticket marked as resolved.', timestamp: new Date() } },
        },
      });

      await tx.notification.create({
        data: {
          userId: ticket.reportedByUserId,
          type: 'maintenance',
          title: 'Maintenance Ticket Resolved',
          message: `Your ticket "${ticket.title}" has been resolved.`,
          link: `/u/my-tickets/${ticket.id}`,
          metadata: { ticketId: ticket.id, propertyId: ticket.propertyId },
        },
      });
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: TICKET_INCLUDE });
  return serializeDoc(remapTicket(populated!));
};

// ─────────────────────────────────────────────────────────────
//  closeTicket -- same write shape/atomicity fix as assignTicket/resolveTicket.
//  Up to two `updates` entries are appended in the SAME nested `create`
//  (an array, when `closingNotes` is given) -- their timestamps are
//  explicitly offset by 1ms from each other (`now` / `now + 1ms`) rather
//  than each calling `new Date()` independently, because two sequential
//  `new Date()` calls inside the same transaction can land in the SAME
//  millisecond, and this file orders `updates` by `timestamp` ascending (see
//  `TICKET_UPDATES_INCLUDE`) -- a genuine tie there would leave the two
//  entries' relative order to Postgres's whim instead of preserving the
//  original's guaranteed push order (closing note always precedes "Ticket
//  closed."). No golden fixture exercises this two-entry path, but the same
//  ordering guarantee the brief asks for ("ordered by createdAt") should
//  hold regardless.
// ─────────────────────────────────────────────────────────────

export const closeTicket = async (userId: string, ticketId: string, closingNotes?: string) => {
  if (!isValidId(ticketId)) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  await canAccessTicket(userId, ticket, { managementOnly: true, requireMaintenancePermission: true });

  if (ticket.status !== 'resolved') {
    throw Object.assign(new Error('Only resolved tickets can be closed'), { statusCode: 400 });
  }

  const now = new Date();
  const updateCreates: Array<{ userId: string; message: string; timestamp: Date }> = [];
  if (closingNotes) {
    updateCreates.push({ userId, message: `Closing note: ${closingNotes}`, timestamp: now });
  }
  updateCreates.push({
    userId,
    message: 'Ticket closed.',
    timestamp: closingNotes ? new Date(now.getTime() + 1) : now,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'closed',
          updates: { create: updateCreates },
        },
      });

      if (ticket.reportedByUserId !== userId) {
        await tx.notification.create({
          data: {
            userId: ticket.reportedByUserId,
            type: 'maintenance',
            title: 'Maintenance Ticket Closed',
            message: `Your ticket "${ticket.title}" has been closed.`,
            link: `/u/my-tickets/${ticket.id}`,
            metadata: { ticketId: ticket.id, propertyId: ticket.propertyId },
          },
        });
      }
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: TICKET_INCLUDE });
  return serializeDoc(remapTicket(populated!));
};
