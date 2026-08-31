import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';

// NOTE on embeddedProfile.mapper.ts (listed as an "existing utility to use"
// for this port): it does NOT apply anywhere in this file. Every single
// Profile relation this file ever returns to a client goes through a
// narrow, purpose-built `select` (never an unqualified `include: { x: true }`)
// -- `TENANCY_USER_SELECT`, `ISSUED_BY_SELECT` below -- each of which
// excludes `legacyMongoId` by construction (it is simply never named in
// either select). The only UNQUALIFIED Profile reads in this file
// (`ensureUser`) are used purely for internal permission-check logic and are
// never serialized directly. Same established precedent as
// ticket.service.ts/transfer.service.ts's own identical note.
//
// Child-table includes (`tenancy_comments`, `unit_slots`, `ticket_updates`)
// audited per this task's brief: this file's Tenancy/Unit embeds ALWAYS use a
// narrow `select` (never a bare `include: { tenancyId: true }`/full row), a
// direct port of the original's own narrow `.populate(path, 'field list')`
// calls (never an unqualified `.populate('tenancyId')`). A narrow select
// never reaches for `comments`/`slots` in the first place, so there is no
// silent-drop trap here -- confirmed by re-reading every `.populate()` call
// site in the pre-port file, all 12 of which name an explicit field list.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

type InventoryFilters = {
  propertyId?: string;
  status?: string;
  condition?: string;
  search?: string;
};

type InventoryRecordFilters = {
  propertyId?: string;
  tenancyId?: string;
  status?: string;
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

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

// ─────────────────────────────────────────────────────────────
//  Access-control helpers -- direct Prisma port of the originals.
//  Messages/statusCodes preserved exactly.
// ─────────────────────────────────────────────────────────────

const ensureUser = async (userId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throwWithStatus('User not found', 404);
  }
  return user!;
};

const isManagementRole = (role?: string): boolean => {
  return role === 'landlord' || role === 'staff' || role === 'super_admin';
};

const hasInventoryPermission = (user: { role: string; permissions: string[] }): boolean => {
  return user.role !== 'staff' || Boolean(user.permissions?.includes('inventory'));
};

/**
 * Whether `staffId` is assigned to `propertyId` -- direct replacement for
 * Mongoose's `user.assignedPropertyIds?.some(...)`, which lived directly on
 * the User document; in Postgres it's the `staff_property_assignments` join
 * table (same pattern property.service.ts/ticket.service.ts's own scoped-
 * access checks already use).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

const getManagedPropertyIds = async (userId: string): Promise<string[] | null> => {
  const user = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return null;
  }

  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({
      where: { landlordId: userId },
      select: { id: true },
    });
    return properties.map((property) => property.id);
  }

  if (user.role === 'staff') {
    if (!hasInventoryPermission(user)) {
      throwWithStatus('Access denied. Missing permission: inventory', 403);
    }
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    return assignments.map((a) => a.propertyId);
  }

  return throwWithStatus('Access denied', 403);
};

/**
 * INVALID-ID HANDLING (task-14 pattern, copied verbatim): a client-supplied
 * `propertyId` shaped like a Mongo ObjectId (or anything else that isn't a
 * syntactically valid Postgres UUID) would raise Prisma's `P2023` if handed
 * straight to `findUnique` -- unmapped by `toHttpError`, falling through to a
 * 500 instead of this function's own pre-existing 404. Collapsing the
 * malformed-id case into that same "Property not found" 404 (rather than a
 * distinct 400) is correct here because it is exactly what the original
 * `Property.findById` would have produced for a same-shaped-but-nonexistent
 * id, and no fixture exercises this path either way (added pre-emptively,
 * zero risk, for consistency with every other id-taking helper in this
 * file).
 */
const verifyPropertyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await ensureUser(userId);

  if (!isValidId(propertyId)) {
    throwWithStatus('Property not found', 404);
  }
  const property = await prisma.property.findUnique({ where: { id: propertyId } });

  if (!property) {
    throwWithStatus('Property not found', 404);
  }

  if (user.role === 'super_admin') {
    return { user, property: property! };
  }

  const isLandlord = property!.landlordId === userId;
  if (user.role === 'staff' && !hasInventoryPermission(user)) {
    throwWithStatus('Access denied. Missing permission: inventory', 403);
  }
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId));

  if (!isLandlord && !isStaff) {
    throwWithStatus('Access denied', 403);
  }

  return { user, property: property! };
};

/** Same invalid-id collapse as `verifyPropertyManagementAccess`, for tenancy ids. */
const verifyTenancyAccess = async (userId: string, tenancyId: string) => {
  if (!isValidId(tenancyId)) {
    throwWithStatus('Tenancy not found', 404);
  }
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { property: true },
  });
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }

  const user = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return tenancy!;
  }

  const isOwner = tenancy!.userId === userId;
  const isLandlord = tenancy!.property?.landlordId === userId;
  if (user.role === 'staff' && !hasInventoryPermission(user)) {
    throwWithStatus('Access denied. Missing permission: inventory', 403);
  }
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(userId, tenancy!.propertyId));

  if (!isOwner && !isLandlord && !isStaff) {
    throwWithStatus('Access denied', 403);
  }

  return tenancy!;
};

/** Same invalid-id collapse, for a direct inventory-item lookup by id. */
async function findInventoryItemOrThrow(itemId: string) {
  if (!isValidId(itemId)) {
    throwWithStatus('Inventory item not found', 404);
  }
  const item = await prisma.inventory.findUnique({ where: { id: itemId } });
  if (!item) {
    throwWithStatus('Inventory item not found', 404);
  }
  return item!;
}

/** Same invalid-id collapse, for a direct inventory-record lookup by id. */
async function findInventoryRecordOrThrow(recordId: string) {
  if (!isValidId(recordId)) {
    throwWithStatus('Inventory record not found', 404);
  }
  const record = await prisma.inventoryRecord.findUnique({ where: { id: recordId } });
  if (!record) {
    throwWithStatus('Inventory record not found', 404);
  }
  return record!;
}

/**
 * Direct port of `Inventory.ts`'s Mongoose `pre('validate')` hook (there is
 * no Prisma equivalent, so this moves into the service, per this task's
 * brief): defaults are handled by the caller always passing a concrete
 * `availableQuantity`, and this clamps it down to `quantity` if it would
 * otherwise exceed it. Applied at every create/update call site in this file
 * that writes either field, so it runs on exactly the same set of writes the
 * old hook fired on (every `.save()`/`.create()`).
 *
 * Deliberately does NOT clamp the lower bound -- Postgres's own
 * `available_quantity >= 0` CHECK constraint (see the schema migration) is
 * the enforcement boundary for that side, same as it effectively was under
 * Mongoose's own `min: 0` schema validator. A value that reaches this
 * function already negative is a bug in the caller's arithmetic, not
 * something to paper over here (per the brief: report it, don't clamp it).
 */
function clampAvailableQuantity(quantity: number, availableQuantity: number): number {
  return Math.min(availableQuantity, quantity);
}

// ─────────────────────────────────────────────────────────────
//  Relation shapes
// ─────────────────────────────────────────────────────────────

/** `.populate('propertyId', 'name address')` -- propertyRef.mapper.ts's narrow shape. */
function remapInventoryPropertyRef<T extends { propertyId: string; property?: unknown }>(
  row: T
): Record<string, unknown> {
  const { property, ...rest } = row as Record<string, unknown> & { property?: unknown };
  const out = stripNulls({ ...rest });
  if (property === undefined) return out;
  return { ...out, propertyId: shapePropertyRef(property as Parameters<typeof shapePropertyRef>[0]) };
}

const INVENTORY_ITEM_BASIC_SELECT = {
  id: true,
  itemName: true,
  serialNumber: true,
  condition: true,
  status: true,
  quantity: true,
  availableQuantity: true,
} satisfies Prisma.InventorySelect;

const INVENTORY_ITEM_WITH_COST_SELECT = {
  ...INVENTORY_ITEM_BASIC_SELECT,
  purchaseCost: true,
} satisfies Prisma.InventorySelect;

const ISSUED_BY_SELECT = { id: true, name: true, role: true } satisfies Prisma.ProfileSelect;
const TENANCY_UNIT_SELECT = { id: true, unitIdentifier: true } satisfies Prisma.UnitSelect;
const TENANCY_USER_SELECT = { id: true, name: true, email: true, avatar: true } satisfies Prisma.ProfileSelect;

/** `.populate('inventoryItemId', 'itemName serialNumber condition status quantity availableQuantity[ purchaseCost]')`. */
function shapeInventoryItemRef(item: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: item.id,
    itemName: item.itemName,
    serialNumber: item.serialNumber,
    condition: item.condition,
    status: item.status,
    quantity: item.quantity,
    availableQuantity: item.availableQuantity,
  };
  if ('purchaseCost' in item) out.purchaseCost = item.purchaseCost;
  return stripNulls(out);
}

/** `.populate('issuedByUserId', 'name role')`. */
function shapeIssuedBy(user: Record<string, unknown>): Record<string, unknown> {
  return stripNulls({ id: user.id, name: user.name, role: user.role });
}

/**
 * `.populate({path:'tenancyId', select:'status checkInDate unitId propertyId userId'})`
 * -- a FLAT narrow select with no further nested populate: `unitId`/`userId`
 * stay raw scalar FKs (used by `issueInventoryItem`/`returnInventoryItem`/
 * `reportRecordDamage`'s response shape).
 */
function shapeFlatTenancyRef(tenancy: Record<string, unknown>): Record<string, unknown> {
  return stripNulls({
    id: tenancy.id,
    status: tenancy.status,
    checkInDate: tenancy.checkInDate,
    unitId: tenancy.unitId,
    propertyId: tenancy.propertyId,
    userId: tenancy.userId,
  });
}

/**
 * `.populate({path:'tenancyId', select:'status checkInDate checkOutDate unitId propertyId userId',
 *   populate:[{path:'unitId', select:'unitIdentifier'}, {path:'userId', select:'name email avatar'}]})`
 * -- used only by `getInventoryRecords`, the one call site with NESTED
 * populates. `propertyId` stays a raw scalar (never itself populated, exactly
 * like the original).
 */
function shapeNestedTenancyRef(tenancy: Record<string, unknown>): Record<string, unknown> {
  const { user, unit, ...rest } = tenancy as Record<string, any>;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (user !== undefined) {
    out.userId = stripNulls({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
  }
  if (unit !== undefined && unit !== null) {
    out.unitId = { id: unit.id, unitIdentifier: unit.unitIdentifier };
  }
  return out;
}

/** Shared shape for `issueInventoryItem`/`returnInventoryItem`/`reportRecordDamage`'s return value. */
function remapActionRecord(row: Record<string, any>): Record<string, unknown> {
  const { inventoryItem, tenancy, issuedBy, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (inventoryItem !== undefined) out.inventoryItemId = shapeInventoryItemRef(inventoryItem);
  if (tenancy !== undefined) out.tenancyId = shapeFlatTenancyRef(tenancy);
  if (issuedBy !== undefined) out.issuedByUserId = shapeIssuedBy(issuedBy);
  return out;
}

/** Shape for `getInventoryRecords` -- the one call site with a nested tenancy populate. */
function remapListRecord(row: Record<string, any>): Record<string, unknown> {
  const { inventoryItem, tenancy, issuedBy, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (inventoryItem !== undefined) out.inventoryItemId = shapeInventoryItemRef(inventoryItem);
  if (tenancy !== undefined) out.tenancyId = shapeNestedTenancyRef(tenancy);
  if (issuedBy !== undefined) out.issuedByUserId = shapeIssuedBy(issuedBy);
  return out;
}

/** Shape for `getInventoryRecordsByTenancy` -- `tenancyId` stays a raw scalar, never populated. */
function remapByTenancyRecord(row: Record<string, any>): Record<string, unknown> {
  const { inventoryItem, issuedBy, ...rest } = row;
  const out: Record<string, unknown> = stripNulls({ ...rest });
  if (inventoryItem !== undefined) out.inventoryItemId = shapeInventoryItemRef(inventoryItem);
  if (issuedBy !== undefined) out.issuedByUserId = shapeIssuedBy(issuedBy);
  return out;
}

const ACTION_RECORD_INCLUDE = {
  inventoryItem: { select: INVENTORY_ITEM_BASIC_SELECT },
  tenancy: {
    select: { id: true, status: true, checkInDate: true, unitId: true, propertyId: true, userId: true },
  },
  issuedBy: { select: ISSUED_BY_SELECT },
} satisfies Prisma.InventoryRecordInclude;

const ACTION_RECORD_INCLUDE_WITH_COST = {
  inventoryItem: { select: INVENTORY_ITEM_WITH_COST_SELECT },
  tenancy: {
    select: { id: true, status: true, checkInDate: true, unitId: true, propertyId: true, userId: true },
  },
  issuedBy: { select: ISSUED_BY_SELECT },
} satisfies Prisma.InventoryRecordInclude;

// ─────────────────────────────────────────────────────────────
//  getInventoryItems
// ─────────────────────────────────────────────────────────────

export const getInventoryItems = async (userId: string, filters: InventoryFilters = {}) => {
  const user = await ensureUser(userId);
  if (!isManagementRole(user.role)) {
    throwWithStatus('Access denied', 403);
  }

  const managedPropertyIds = await getManagedPropertyIds(userId);
  const where: Prisma.InventoryWhereInput = {};

  if (managedPropertyIds) {
    where.propertyId = { in: managedPropertyIds };
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    where.propertyId = filters.propertyId;
  }

  if (filters.status) where.status = filters.status as Prisma.InventoryWhereInput['status'];
  if (filters.condition) where.condition = filters.condition as Prisma.InventoryWhereInput['condition'];

  if (filters.search) {
    where.OR = [
      { itemName: { contains: filters.search, mode: 'insensitive' } },
      { serialNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.inventory.findMany({
    where,
    include: { property: { select: PROPERTY_REF_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(items.map((item) => remapInventoryPropertyRef(item)));
};

// ─────────────────────────────────────────────────────────────
//  createInventoryItem
// ─────────────────────────────────────────────────────────────

export const createInventoryItem = async (
  userId: string,
  data: {
    propertyId: string;
    itemName: string;
    serialNumber?: string;
    condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
    quantity: number;
    status?: 'available' | 'issued' | 'maintenance' | 'retired';
    purchaseDate?: string;
    purchaseCost?: number;
  }
) => {
  await verifyPropertyManagementAccess(userId, data.propertyId);

  const normalizedSerial = data.serialNumber?.trim() || undefined;
  if (normalizedSerial) {
    const serialConflict = await prisma.inventory.findFirst({
      where: { propertyId: data.propertyId, serialNumber: normalizedSerial },
    });
    if (serialConflict) {
      throwWithStatus('Inventory serial number already exists in this property', 409);
    }
  }

  const quantity = Math.max(1, data.quantity);
  const availableQuantity = clampAvailableQuantity(quantity, quantity);

  const item = await prisma.inventory.create({
    data: {
      propertyId: data.propertyId,
      itemName: data.itemName,
      serialNumber: normalizedSerial ?? null,
      condition: (data.condition ?? 'good') as Prisma.InventoryUncheckedCreateInput['condition'],
      quantity,
      availableQuantity,
      status: (data.status ?? 'available') as Prisma.InventoryUncheckedCreateInput['status'],
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchaseCost: data.purchaseCost ?? null,
    },
    include: { property: { select: PROPERTY_REF_SELECT } },
  });

  return serializeDoc(remapInventoryPropertyRef(item));
};

// ─────────────────────────────────────────────────────────────
//  updateInventoryItem
// ─────────────────────────────────────────────────────────────

export const updateInventoryItem = async (
  userId: string,
  itemId: string,
  updates: {
    itemName?: string;
    serialNumber?: string;
    condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
    quantity?: number;
    status?: 'available' | 'issued' | 'maintenance' | 'retired';
    purchaseDate?: string;
    purchaseCost?: number;
  }
) => {
  const item = await findInventoryItemOrThrow(itemId);

  await verifyPropertyManagementAccess(userId, item.propertyId);

  const data: Prisma.InventoryUncheckedUpdateInput = {};

  if (updates.serialNumber !== undefined) {
    const normalizedSerial = updates.serialNumber.trim();
    if (normalizedSerial) {
      const serialConflict = await prisma.inventory.findFirst({
        where: { id: { not: item.id }, propertyId: item.propertyId, serialNumber: normalizedSerial },
      });
      if (serialConflict) {
        throwWithStatus('Inventory serial number already exists in this property', 409);
      }
      data.serialNumber = normalizedSerial;
    } else {
      data.serialNumber = null;
    }
  }

  if (updates.itemName !== undefined) data.itemName = updates.itemName;
  if (updates.condition !== undefined) {
    data.condition = updates.condition as Prisma.InventoryUncheckedUpdateInput['condition'];
  }
  if (updates.purchaseDate !== undefined) {
    data.purchaseDate = updates.purchaseDate ? new Date(updates.purchaseDate) : null;
  }
  if (updates.purchaseCost !== undefined) data.purchaseCost = updates.purchaseCost;

  let quantity = item.quantity;
  let availableQuantity = item.availableQuantity;

  if (updates.quantity !== undefined) {
    const issuedCount = item.quantity - item.availableQuantity;
    if (updates.quantity < issuedCount) {
      throwWithStatus(`Quantity cannot be lower than currently issued count (${issuedCount})`, 400);
    }
    quantity = updates.quantity;
    availableQuantity = updates.quantity - issuedCount;
  }

  availableQuantity = clampAvailableQuantity(quantity, availableQuantity);
  data.quantity = quantity;
  data.availableQuantity = availableQuantity;

  let status = (updates.status !== undefined ? updates.status : item.status) as string;
  if (availableQuantity <= 0 && status === 'available') {
    status = 'issued';
  } else if (availableQuantity > 0 && status === 'issued') {
    status = 'available';
  }
  data.status = status as Prisma.InventoryUncheckedUpdateInput['status'];

  const updated = await prisma.inventory.update({
    where: { id: item.id },
    data,
    include: { property: { select: PROPERTY_REF_SELECT } },
  });

  return serializeDoc(remapInventoryPropertyRef(updated));
};

// ─────────────────────────────────────────────────────────────
//  issueInventoryItem
//
//  WRITE SET (inside one prisma.$transaction):
//    1. inventoryRecord.create -- the new issuance record
//    2. inventory.update       -- decrement availableQuantity / possibly flip status
//    3. notification.create    -- notify the tenant
//  Under Mongoose these were 3 independent, non-atomic writes
//  (record.create(), item.save(), Notification.create()) -- a crash between
//  any two could leave stock decremented with no record, a record issued
//  with stock un-decremented, or either without ever notifying the tenant.
// ─────────────────────────────────────────────────────────────

export const issueInventoryItem = async (
  userId: string,
  itemId: string,
  data: {
    tenancyId: string;
    issuedDate?: string;
    quantityIssued?: number;
    signedFormUrl?: string;
  }
) => {
  const item = await findInventoryItemOrThrow(itemId);

  if (item.status === 'retired') {
    throwWithStatus('Cannot issue a retired inventory item', 400);
  }
  if (item.status === 'maintenance') {
    throwWithStatus('Cannot issue an item currently under maintenance', 400);
  }

  if (!isValidId(data.tenancyId)) {
    throwWithStatus('Tenancy not found', 404);
  }
  const tenancy = await prisma.tenancy.findUnique({ where: { id: data.tenancyId } });
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }
  if (tenancy!.status !== 'checked_in') {
    throwWithStatus('Can only issue items to checked-in tenants', 400);
  }

  await verifyPropertyManagementAccess(userId, item.propertyId);

  if (tenancy!.propertyId !== item.propertyId) {
    throwWithStatus('Inventory item and tenancy are not in the same property', 400);
  }

  const quantityIssued = data.quantityIssued || 1;
  if (quantityIssued > item.availableQuantity) {
    throwWithStatus(`Insufficient stock. Available: ${item.availableQuantity}, requested: ${quantityIssued}`, 400);
  }

  const newAvailableQuantity = clampAvailableQuantity(item.quantity, item.availableQuantity - quantityIssued);
  const newStatus = newAvailableQuantity <= 0 && item.status === 'available' ? 'issued' : item.status;

  let recordId!: string;
  try {
    await prisma.$transaction(async (tx) => {
      const record = await tx.inventoryRecord.create({
        data: {
          inventoryItemId: item.id,
          tenancyId: tenancy!.id,
          propertyId: item.propertyId,
          unitId: tenancy!.unitId,
          issuedByUserId: userId,
          issuedDate: data.issuedDate ? new Date(data.issuedDate) : new Date(),
          quantityIssued,
          issuedCondition: item.condition as Prisma.InventoryRecordUncheckedCreateInput['issuedCondition'],
          signedFormUrl: data.signedFormUrl ?? null,
          status: 'active',
        },
      });
      recordId = record.id;

      await tx.inventory.update({
        where: { id: item.id },
        data: {
          availableQuantity: newAvailableQuantity,
          status: newStatus as Prisma.InventoryUncheckedUpdateInput['status'],
        },
      });

      await tx.notification.create({
        data: {
          userId: tenancy!.userId,
          type: 'system',
          title: 'Inventory Item Issued',
          message: `${item.itemName} has been issued to your tenancy.`,
          link: '/u/my-inventory',
          metadata: {
            inventoryRecordId: record.id,
            inventoryItemId: item.id,
            tenancyId: tenancy!.id,
          },
        },
      });
    });
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.inventoryRecord.findUnique({
    where: { id: recordId },
    include: ACTION_RECORD_INCLUDE,
  });
  return serializeDoc(remapActionRecord(populated!));
};

// ─────────────────────────────────────────────────────────────
//  returnInventoryItem
//
//  WRITE SET (inside one prisma.$transaction):
//    1. inventoryRecord.update -- return/lost/damaged status + notes
//    2. inventory.update       -- quantity/availableQuantity/status
//  Under Mongoose these were 2 independent, non-atomic writes
//  (record.save(), item.save()) -- a crash between them could leave a record
//  marked returned/lost/damaged with the parent item's stock never adjusted
//  to match.
// ─────────────────────────────────────────────────────────────

export const returnInventoryItem = async (
  userId: string,
  itemId: string,
  data: {
    recordId: string;
    returnDate?: string;
    returnCondition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
    damageNotes?: string;
    isLost?: boolean;
  }
) => {
  const item = await findInventoryItemOrThrow(itemId);
  await verifyPropertyManagementAccess(userId, item.propertyId);

  const record = await findInventoryRecordOrThrow(data.recordId);
  if (record.inventoryItemId !== itemId) {
    throwWithStatus('Record does not belong to this inventory item', 400);
  }
  if (record.status !== 'active') {
    throwWithStatus(`Only active records can be returned. Current status: ${record.status}`, 400);
  }

  const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();
  const returnCondition = (data.returnCondition ?? item.condition) as string;
  const isLost = Boolean(data.isLost);
  const isDamagedReturn = returnCondition === 'damaged';

  let quantity = item.quantity;
  let availableQuantity = item.availableQuantity;
  let recordStatus: string;
  let itemStatus: string = item.status;

  if (isLost) {
    recordStatus = 'lost';
    quantity = Math.max(0, item.quantity - record.quantityIssued);
    availableQuantity = Math.min(item.availableQuantity, quantity);
  } else if (isDamagedReturn) {
    recordStatus = 'damaged';
    itemStatus = 'maintenance';
  } else {
    recordStatus = 'returned';
    availableQuantity = Math.min(item.quantity, item.availableQuantity + record.quantityIssued);
  }

  availableQuantity = clampAvailableQuantity(quantity, availableQuantity);

  if (availableQuantity <= 0 && itemStatus === 'available') {
    itemStatus = 'issued';
  } else if (availableQuantity > 0 && itemStatus === 'issued') {
    itemStatus = 'available';
  }

  const recordData: Prisma.InventoryRecordUncheckedUpdateInput = {
    returnDate,
    returnCondition: returnCondition as Prisma.InventoryRecordUncheckedUpdateInput['returnCondition'],
    status: recordStatus as Prisma.InventoryRecordUncheckedUpdateInput['status'],
  };
  if (data.damageNotes !== undefined) {
    recordData.damageNotes = data.damageNotes;
  }

  try {
    await prisma.$transaction([
      prisma.inventoryRecord.update({ where: { id: record.id }, data: recordData }),
      prisma.inventory.update({
        where: { id: item.id },
        data: {
          quantity,
          availableQuantity,
          status: itemStatus as Prisma.InventoryUncheckedUpdateInput['status'],
        },
      }),
    ]);
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.inventoryRecord.findUnique({
    where: { id: record.id },
    include: ACTION_RECORD_INCLUDE,
  });
  return serializeDoc(remapActionRecord(populated!));
};

// ─────────────────────────────────────────────────────────────
//  reportRecordDamage
//
//  WRITE SET (inside one prisma.$transaction):
//    1. inventoryRecord.update -- reclassify status/damageNotes/penaltyAmount/deductedFromDeposit
//    2. inventory.update       -- quantity/availableQuantity/status adjustments
//  Under Mongoose these were 2 independent, non-atomic writes. Note:
//  `deductedFromDeposit` is only ever a flag stored on the record itself --
//  this service never creates a separate Bill/Payment deduction row, under
//  either Mongoose or here, so there is no third, cross-service write to
//  fold into this transaction.
// ─────────────────────────────────────────────────────────────

export const reportRecordDamage = async (
  userId: string,
  recordId: string,
  data: {
    damageNotes: string;
    penaltyAmount: number;
    deductedFromDeposit?: boolean;
    status?: 'damaged' | 'lost';
  }
) => {
  const record = await findInventoryRecordOrThrow(recordId);
  const item = await findInventoryItemOrThrow(record.inventoryItemId);

  await verifyPropertyManagementAccess(userId, item.propertyId);

  const previousStatus = record.status;
  const nextStatus = data.status || 'damaged';

  let quantity = item.quantity;
  let availableQuantity = item.availableQuantity;

  if (previousStatus === 'returned' && (nextStatus === 'damaged' || nextStatus === 'lost')) {
    availableQuantity = Math.max(0, availableQuantity - record.quantityIssued);
  }

  if (nextStatus === 'lost' && previousStatus !== 'lost') {
    quantity = Math.max(0, quantity - record.quantityIssued);
    availableQuantity = Math.min(availableQuantity, quantity);
  }

  availableQuantity = clampAvailableQuantity(quantity, availableQuantity);

  let itemStatus = item.status;
  if (nextStatus === 'damaged') {
    itemStatus = 'maintenance';
  } else if (availableQuantity <= 0 && itemStatus === 'available') {
    itemStatus = 'issued';
  }

  try {
    await prisma.$transaction([
      prisma.inventoryRecord.update({
        where: { id: record.id },
        data: {
          status: nextStatus as Prisma.InventoryRecordUncheckedUpdateInput['status'],
          damageNotes: data.damageNotes,
          penaltyAmount: data.penaltyAmount,
          deductedFromDeposit: Boolean(data.deductedFromDeposit),
        },
      }),
      prisma.inventory.update({
        where: { id: item.id },
        data: {
          quantity,
          availableQuantity,
          status: itemStatus as Prisma.InventoryUncheckedUpdateInput['status'],
        },
      }),
    ]);
  } catch (e) {
    throw toHttpError(e);
  }

  const populated = await prisma.inventoryRecord.findUnique({
    where: { id: record.id },
    include: ACTION_RECORD_INCLUDE_WITH_COST,
  });
  return serializeDoc(remapActionRecord(populated!));
};

// ─────────────────────────────────────────────────────────────
//  getInventoryRecords
// ─────────────────────────────────────────────────────────────

export const getInventoryRecords = async (userId: string, filters: InventoryRecordFilters = {}) => {
  const user = await ensureUser(userId);
  const where: Prisma.InventoryRecordWhereInput = {};

  if (user.role === 'user') {
    const tenancies = await prisma.tenancy.findMany({ where: { userId }, select: { id: true } });
    where.tenancyId = { in: tenancies.map((t) => t.id) };
  } else {
    const managedPropertyIds = await getManagedPropertyIds(userId);
    if (managedPropertyIds) {
      where.propertyId = { in: managedPropertyIds };
    }
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    where.propertyId = filters.propertyId;
  }

  if (filters.tenancyId) {
    const tenancy = await verifyTenancyAccess(userId, filters.tenancyId);
    where.tenancyId = tenancy.id;
  }

  if (filters.status) {
    where.status = filters.status as Prisma.InventoryRecordWhereInput['status'];
  }

  const records = await prisma.inventoryRecord.findMany({
    where,
    include: {
      inventoryItem: { select: INVENTORY_ITEM_BASIC_SELECT },
      tenancy: {
        select: {
          id: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          propertyId: true,
          unit: { select: TENANCY_UNIT_SELECT },
          user: { select: TENANCY_USER_SELECT },
        },
      },
      issuedBy: { select: ISSUED_BY_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(records.map((r) => remapListRecord(r)));
};

// ─────────────────────────────────────────────────────────────
//  getInventoryRecordsByTenancy
// ─────────────────────────────────────────────────────────────

export const getInventoryRecordsByTenancy = async (userId: string, tenancyId: string) => {
  const tenancy = await verifyTenancyAccess(userId, tenancyId);

  const records = await prisma.inventoryRecord.findMany({
    where: { tenancyId: tenancy.id },
    include: {
      inventoryItem: { select: INVENTORY_ITEM_BASIC_SELECT },
      issuedBy: { select: ISSUED_BY_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(records.map((r) => remapByTenancyRecord(r)));
};

// ─────────────────────────────────────────────────────────────
//  getMonthlyInventoryReport -- the 2 aggregation pipelines
//
//  Both `mostDamagedItems` and `depreciation` need a per-`inventoryItemId`
//  GROUP BY with CONDITIONAL sums (count/sum only rows where status = 'lost'
//  vs 'damaged', within the SAME group as the unconditional totals) plus a
//  join to `inventories` for the item's name/serial/cost. `prisma.groupBy`
//  has no conditional-aggregate expression (no `$cond`/CASE equivalent) and
//  no join support, so neither pipeline's SHAPE fits it -- both are
//  rewritten as parameterized `$queryRaw`, with every dynamic value bound
//  through `Prisma.sql`/`Prisma.join` (never string-interpolated) exactly
//  like every other raw-value boundary in this migration.
//
//  NULL SEMANTICS: `SUM(CASE WHEN status = 'lost' THEN qty ELSE 0 END)` is
//  used instead of `SUM(qty) FILTER (WHERE status = 'lost')` specifically
//  because the CASE form NEVER returns NULL (every row in the group
//  contributes at least a 0 to the sum), matching Mongo's
//  `$sum: {$cond: [...]}` exactly. The FILTER form (or a bare conditional
//  `WHERE`) WOULD return SQL NULL whenever zero rows in a group satisfy the
//  condition -- e.g. a group with only 'damaged' rows would otherwise leave
//  `lostQty` NULL instead of 0. `purchaseCost` is a nullable Decimal column,
//  so every read of it goes through `COALESCE(purchase_cost, 0)`, the direct
//  SQL translation of the original's `$ifNull: ['$item.purchaseCost', 0]`.
//  The GROUP BY itself can never produce an empty-but-present group (a group
//  only exists if >=1 row matched the WHERE), so `SUM`'s "no rows" case never
//  applies inside a group here -- it only applies to the OUTER result set
//  being empty, which both `$queryRaw` calls already handle naturally (zero
//  matching rows -> zero returned groups -> `[]`), same as Mongo's `$match`
//  short-circuiting an empty `$group` output.
// ─────────────────────────────────────────────────────────────

type PropertyFilter = { kind: 'none' } | { kind: 'in'; ids: string[] } | { kind: 'eq'; id: string };

function propertyFilterToWhere(filter: PropertyFilter): Prisma.InventoryRecordWhereInput {
  if (filter.kind === 'in') return { propertyId: { in: filter.ids } };
  if (filter.kind === 'eq') return { propertyId: filter.id };
  return {};
}

/**
 * The `$match` stage shared by both aggregation pipelines, as a
 * parameterized SQL fragment. `= ANY($1::uuid[])` binds the whole id array
 * as one parameter (never interpolated); an empty scoped-id array (a staff
 * member assigned to zero properties) is special-cased to a literal `FALSE`
 * rather than binding an empty array, matching Mongo's `{$in: []}` (matches
 * nothing) without depending on how the driver marshals an empty array
 * parameter.
 */
function buildDamageMatchFragment(filter: PropertyFilter, start: Date, end: Date): Prisma.Sql {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`ir.status IN ('lost', 'damaged')`,
    Prisma.sql`ir.updated_at >= ${start}`,
    Prisma.sql`ir.updated_at < ${end}`,
  ];
  if (filter.kind === 'in') {
    clauses.push(filter.ids.length > 0 ? Prisma.sql`ir.property_id = ANY(${filter.ids}::uuid[])` : Prisma.sql`FALSE`);
  } else if (filter.kind === 'eq') {
    clauses.push(Prisma.sql`ir.property_id = ${filter.id}::uuid`);
  }
  return Prisma.join(clauses, ' AND ');
}

interface MostDamagedRow {
  inventoryItemId: string;
  itemName: string;
  serialNumber: string | null;
  incidents: number;
  lostCount: number;
  damagedCount: number;
  totalQuantityAffected: number;
}

interface DepreciationRow {
  inventoryItemId: string;
  itemName: string;
  serialNumber: string | null;
  purchaseCost: Prisma.Decimal;
  lostQty: number;
  damagedQty: number;
  estimatedDepreciation: Prisma.Decimal;
}

/** `$project: {_id: 0, inventoryItemId: '$_id', ...}` -- drops the SQL-null serialNumber key entirely when absent. */
function shapeMostDamagedRow(row: MostDamagedRow): Record<string, unknown> {
  return stripNulls({
    inventoryItemId: row.inventoryItemId,
    itemName: row.itemName,
    serialNumber: row.serialNumber,
    incidents: row.incidents,
    lostCount: row.lostCount,
    damagedCount: row.damagedCount,
    totalQuantityAffected: row.totalQuantityAffected,
  });
}

function shapeDepreciationRow(row: DepreciationRow): Record<string, unknown> {
  return stripNulls({
    inventoryItemId: row.inventoryItemId,
    itemName: row.itemName,
    serialNumber: row.serialNumber,
    purchaseCost: row.purchaseCost,
    lostQty: row.lostQty,
    damagedQty: row.damagedQty,
    estimatedDepreciation: row.estimatedDepreciation,
  });
}

export const getMonthlyInventoryReport = async (
  userId: string,
  options: { month?: number; year?: number; propertyId?: string } = {}
) => {
  const user = await ensureUser(userId);
  if (!isManagementRole(user.role)) {
    throwWithStatus('Access denied', 403);
  }

  const now = new Date();
  const month = options.month || now.getMonth() + 1;
  const year = options.year || now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throwWithStatus('Month must be between 1 and 12', 400);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throwWithStatus('Year must be between 2000 and 2100', 400);
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);

  const managedPropertyIds = await getManagedPropertyIds(userId);
  let propertyFilter: PropertyFilter = managedPropertyIds ? { kind: 'in', ids: managedPropertyIds } : { kind: 'none' };

  if (options.propertyId) {
    await verifyPropertyManagementAccess(userId, options.propertyId);
    propertyFilter = { kind: 'eq', id: options.propertyId };
  }

  const baseWhere = propertyFilterToWhere(propertyFilter);

  const activeIssued = await prisma.inventoryRecord.count({
    where: { ...baseWhere, status: 'active' },
  });

  const lostDamaged = await prisma.inventoryRecord.count({
    where: {
      ...baseWhere,
      status: { in: ['lost', 'damaged'] },
      updatedAt: { gte: start, lt: end },
    },
  });

  const matchFragment = buildDamageMatchFragment(propertyFilter, start, end);

  const mostDamagedItemsRaw = await prisma.$queryRaw<MostDamagedRow[]>(Prisma.sql`
    SELECT
      ir.inventory_item_id AS "inventoryItemId",
      i.item_name AS "itemName",
      i.serial_number AS "serialNumber",
      COUNT(*)::int AS "incidents",
      SUM(CASE WHEN ir.status = 'lost' THEN 1 ELSE 0 END)::int AS "lostCount",
      SUM(CASE WHEN ir.status = 'damaged' THEN 1 ELSE 0 END)::int AS "damagedCount",
      SUM(ir.quantity_issued)::int AS "totalQuantityAffected"
    FROM inventory_records ir
    JOIN inventories i ON i.id = ir.inventory_item_id
    WHERE ${matchFragment}
    GROUP BY ir.inventory_item_id, i.item_name, i.serial_number
    ORDER BY "incidents" DESC, "itemName" ASC
    LIMIT 10
  `);

  const depreciationRaw = await prisma.$queryRaw<DepreciationRow[]>(Prisma.sql`
    SELECT
      ir.inventory_item_id AS "inventoryItemId",
      i.item_name AS "itemName",
      i.serial_number AS "serialNumber",
      COALESCE(i.purchase_cost, 0) AS "purchaseCost",
      SUM(CASE WHEN ir.status = 'lost' THEN ir.quantity_issued ELSE 0 END)::int AS "lostQty",
      SUM(CASE WHEN ir.status = 'damaged' THEN ir.quantity_issued ELSE 0 END)::int AS "damagedQty",
      ROUND(
        COALESCE(i.purchase_cost, 0) * SUM(CASE WHEN ir.status = 'lost' THEN ir.quantity_issued ELSE 0 END)
          + COALESCE(i.purchase_cost, 0) * SUM(CASE WHEN ir.status = 'damaged' THEN ir.quantity_issued ELSE 0 END) * 0.5,
        2
      ) AS "estimatedDepreciation"
    FROM inventory_records ir
    JOIN inventories i ON i.id = ir.inventory_item_id
    WHERE ${matchFragment}
    GROUP BY ir.inventory_item_id, i.item_name, i.serial_number, i.purchase_cost
    ORDER BY "estimatedDepreciation" DESC, "itemName" ASC
  `);

  const mostDamagedItems = mostDamagedItemsRaw.map(shapeMostDamagedRow);
  const depreciation = depreciationRaw.map(shapeDepreciationRow);

  const totalEstimatedDepreciation = depreciationRaw
    .reduce((sum, row) => sum.plus(row.estimatedDepreciation), new Prisma.Decimal(0))
    .toDecimalPlaces(2);

  return serializeDoc({
    month,
    year,
    period: { start, end: new Date(end.getTime() - 1) },
    summary: {
      activeIssued,
      lostDamaged,
      mostFrequentlyDamagedItem: mostDamagedItems[0] || null,
      totalEstimatedDepreciation,
    },
    mostDamagedItems,
    depreciation,
  });
};
