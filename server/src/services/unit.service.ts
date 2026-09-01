import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';

/**
 * Request-body shape for create/update unit calls, mirroring the
 * pre-migration Mongoose `IUnit` document's fields. Defined locally,
 * rather than importing the generated Prisma input types, so this service
 * no longer depends on the Mongoose model, which is being retired (the
 * Prisma create/update input types don't carry the nested `slots` shape
 * this service accepts and maps by hand -- see createUnit/updateUnit below).
 */
interface UnitInput {
  propertyId: string;
  unitIdentifier: string;
  accommodationType: 'room' | 'bedspace';
  roomRent?: number;
  bedspaceRent?: number;
  perHeadRate?: number;
  deposit: number;
  capacity: number;
  maxOccupants: number;
  sizeSqm?: number;
  features?: string[];
  images?: string[];
  status?: 'vacant' | 'occupied' | 'reserved' | 'maintenance';
  slots?: Array<{ slotNumber: number; status?: 'vacant' | 'occupied' | 'reserved'; tenancyId?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

const UNIT_INCLUDE = {
  property: { select: PROPERTY_REF_SELECT },
  slots: { orderBy: { slotNumber: 'asc' as const } },
} satisfies Prisma.UnitInclude;

/**
 * Rebuilds the Mongoose-shaped Unit document:
 *  - `roomRent`/`bedspaceRent`/`perHeadRate`/`sizeSqm` are optional paths in
 *    the original schema -- Mongoose omits an unset optional path entirely
 *    rather than emitting `null`, so each is only re-attached when non-null
 *    (same convention as property.service.ts/user.service.ts).
 *  - `slots` (now the `unit_slots` child table) is remapped back onto the
 *    `slots` key, sorted by `slotNumber` for a deterministic response
 *    regardless of the caller's own query-level ordering. Mongoose's
 *    `SlotSchema` used `{ _id: false }`, so entries are picked field-by-field
 *    (no id minted) rather than routed through a "give every element a
 *    fresh id" helper like Property's venues/emergencyContacts.
 *  - `propertyId` is remapped onto the populated `{ name, address }` shape
 *    ONLY when `property` was actually included in the query (mirrors
 *    property.service.ts's `remapLandlord`: a shallow-populate-shaped key is
 *    a no-op when the relation wasn't included, e.g. `getUnitsByProperty`,
 *    which never populated `propertyId` in the original code either).
 */
function shapeUnit(row: Record<string, any>): Record<string, unknown> {
  const { roomRent, bedspaceRent, perHeadRate, sizeSqm, slots, property, ...rest } = row;

  const out: Record<string, unknown> = { ...rest };
  if (roomRent !== null && roomRent !== undefined) out.roomRent = roomRent;
  if (bedspaceRent !== null && bedspaceRent !== undefined) out.bedspaceRent = bedspaceRent;
  if (perHeadRate !== null && perHeadRate !== undefined) out.perHeadRate = perHeadRate;
  if (sizeSqm !== null && sizeSqm !== undefined) out.sizeSqm = sizeSqm;

  if (slots !== undefined) {
    out.slots = (slots as Array<Record<string, any>>)
      .slice()
      .sort((a, b) => a.slotNumber - b.slotNumber)
      .map((s) => ({
        slotNumber: s.slotNumber,
        status: s.status,
        ...(s.tenancyId !== null && s.tenancyId !== undefined ? { tenancyId: s.tenancyId } : {}),
      }));
  }

  if (property !== undefined) {
    out.propertyId = shapePropertyRef(property);
  }

  return out;
}

/**
 * Get scoped property filter based on user role. Returns a Prisma
 * `PropertyWhereInput` used to resolve the caller's accessible property ids
 * -- the direct replacement for the original's
 * `{ _id: { $in: assignedIds.map(id => new mongoose.Types.ObjectId(id)) } }`,
 * which under Prisma is just `{ id: { in: assignedIds } }` over plain UUID
 * strings (assigned properties now come from the `staff_property_assignments`
 * join table -- same query shape as property.service.ts's `getScopedFilter`
 * and user.service.ts/team.service.ts's `getAssignedPropertyIds`).
 */
const getScopedPropertyFilter = async (userId: string): Promise<Prisma.PropertyWhereInput> => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.role === 'super_admin') {
    return {};
  }

  if (user.role === 'landlord') {
    return { landlordId: userId };
  }

  if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    return { id: { in: assignments.map((a) => a.propertyId) } };
  }

  throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
};

/**
 * Get all units with filters and auto-scoping
 */
export const getUnits = async (
  userId: string,
  filters: {
    propertyId?: string;
    status?: string;
    accommodationType?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { propertyId, status, accommodationType, page = 1, limit = 20 } = filters;

  // Get accessible properties
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await prisma.property.findMany({
    where: propertyFilter,
    select: { id: true },
  });
  const accessiblePropertyIds = accessibleProperties.map((p) => p.id);

  // Build unit filter (preserving the original's behavior of an explicit
  // `propertyId` filter overwriting the accessible-ids scoping entirely,
  // rather than intersecting with it)
  const unitFilter: Prisma.UnitWhereInput = { propertyId: { in: accessiblePropertyIds } };
  if (propertyId) unitFilter.propertyId = propertyId;
  if (status) unitFilter.status = status as Prisma.UnitWhereInput['status'];
  if (accommodationType) {
    unitFilter.accommodationType = accommodationType as Prisma.UnitWhereInput['accommodationType'];
  }

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.unit.findMany({
      where: unitFilter,
      include: UNIT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.unit.count({ where: unitFilter }),
  ]);

  const units = rows.map((row) => shapeUnit(row));

  return {
    units: serializeList(units),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single unit by ID with auto-scoping
 */
export const getUnitById = async (userId: string, unitId: string) => {
  if (!isValidId(unitId)) {
    throw Object.assign(new Error('Invalid unit ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await prisma.property.findMany({
    where: propertyFilter,
    select: { id: true },
  });
  const accessiblePropertyIds = accessibleProperties.map((p) => p.id);

  const row = await prisma.unit.findUnique({ where: { id: unitId }, include: UNIT_INCLUDE });

  if (!row) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(row.propertyId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return serializeDoc(shapeUnit(row));
};

/**
 * Get units by property ID
 */
export const getUnitsByProperty = async (userId: string, propertyId: string) => {
  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const property = await prisma.property.findFirst({ where: { ...propertyFilter, id: propertyId } });

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  // Never populated `propertyId` in the original code either -- omit the
  // `property` relation entirely so shapeUnit leaves the scalar FK as-is.
  const rows = await prisma.unit.findMany({
    where: { propertyId },
    include: { slots: { orderBy: { slotNumber: 'asc' } } },
    orderBy: { unitIdentifier: 'asc' },
  });

  return serializeList(rows.map((row) => shapeUnit(row)));
};

/**
 * Create new unit
 */
export const createUnit = async (userId: string, data: Partial<UnitInput>) => {
  const body = data as any;

  if (!isValidId(body.propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const property = await prisma.property.findFirst({ where: { ...propertyFilter, id: body.propertyId } });

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  // Auto-generate slots for bedspace units if not provided -- sequence and
  // default status preserved exactly from the original.
  let slotsInput: Array<{ slotNumber: number; status?: string; tenancyId?: string }> | undefined =
    body.slots;
  if (body.accommodationType === 'bedspace' && (!slotsInput || slotsInput.length === 0)) {
    const capacity = body.capacity || 1;
    slotsInput = Array.from({ length: capacity }, (_, i) => ({
      slotNumber: i + 1,
      status: 'vacant' as const,
    }));
  }

  try {
    const row = await prisma.unit.create({
      data: {
        propertyId: body.propertyId,
        unitIdentifier: body.unitIdentifier,
        accommodationType: body.accommodationType,
        roomRent: body.roomRent ?? null,
        bedspaceRent: body.bedspaceRent ?? null,
        perHeadRate: body.perHeadRate ?? null,
        deposit: body.deposit,
        capacity: body.capacity,
        maxOccupants: body.maxOccupants,
        sizeSqm: body.sizeSqm ?? null,
        features: body.features ?? [],
        images: body.images ?? [],
        status: body.status ?? 'vacant',
        ...(slotsInput && slotsInput.length > 0
          ? {
              slots: {
                create: slotsInput.map((s) => ({
                  slotNumber: s.slotNumber,
                  status: (s.status ?? 'vacant') as Prisma.UnitSlotCreateWithoutUnitInput['status'],
                  tenancyId: s.tenancyId ?? null,
                })),
              },
            }
          : {}),
      },
      include: UNIT_INCLUDE,
    });

    return serializeDoc(shapeUnit(row));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Update unit
 */
export const updateUnit = async (userId: string, unitId: string, data: Partial<UnitInput>) => {
  if (!isValidId(unitId)) {
    throw Object.assign(new Error('Invalid unit ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await prisma.property.findMany({
    where: propertyFilter,
    select: { id: true },
  });
  const accessiblePropertyIds = accessibleProperties.map((p) => p.id);

  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!existing) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(existing.propertyId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const body = data as any;
  const updateData: Prisma.UnitUpdateInput = {};

  if (body.unitIdentifier !== undefined) updateData.unitIdentifier = body.unitIdentifier;
  if (body.accommodationType !== undefined) updateData.accommodationType = body.accommodationType;
  if (body.roomRent !== undefined) updateData.roomRent = body.roomRent;
  if (body.bedspaceRent !== undefined) updateData.bedspaceRent = body.bedspaceRent;
  if (body.perHeadRate !== undefined) updateData.perHeadRate = body.perHeadRate;
  if (body.deposit !== undefined) updateData.deposit = body.deposit;
  if (body.capacity !== undefined) updateData.capacity = body.capacity;
  if (body.maxOccupants !== undefined) updateData.maxOccupants = body.maxOccupants;
  if (body.sizeSqm !== undefined) updateData.sizeSqm = body.sizeSqm;
  if (body.features !== undefined) updateData.features = body.features;
  if (body.images !== undefined) updateData.images = body.images;
  if (body.status !== undefined) updateData.status = body.status;

  try {
    // `data.slots`, when provided, mirrors the original's `Object.assign`
    // wholesale-replace semantics for the embedded array: delete every
    // existing child row and recreate the new set, both inside one
    // transaction so a partial write is never observable (same
    // delete-then-insert pattern as team.service.ts's
    // `updateAssignedProperties` for its own child table).
    const row = await prisma.$transaction(async (tx) => {
      if (body.slots !== undefined) {
        await tx.unitSlot.deleteMany({ where: { unitId } });
        if (Array.isArray(body.slots) && body.slots.length > 0) {
          await tx.unitSlot.createMany({
            data: body.slots.map((s: any) => ({
              unitId,
              slotNumber: s.slotNumber,
              status: s.status ?? 'vacant',
              tenancyId: s.tenancyId ?? null,
            })),
          });
        }
      }

      return tx.unit.update({
        where: { id: unitId },
        data: updateData,
        include: UNIT_INCLUDE,
      });
    });

    return serializeDoc(shapeUnit(row));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Update unit status
 */
export const updateUnitStatus = async (userId: string, unitId: string, status: string) => {
  return updateUnit(userId, unitId, { status } as any);
};

/**
 * Delete unit
 */
export const deleteUnit = async (userId: string, unitId: string) => {
  if (!isValidId(unitId)) {
    throw Object.assign(new Error('Invalid unit ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await prisma.property.findMany({
    where: propertyFilter,
    select: { id: true },
  });
  const accessiblePropertyIds = accessibleProperties.map((p) => p.id);

  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!existing) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(existing.propertyId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // `unit_slots` rows cascade-delete via the FK (onDelete: Cascade); the
  // Task 6 trigger refreshes the parent property's metrics off this delete,
  // no manual update needed here.
  await prisma.unit.delete({ where: { id: unitId } });
  return { message: 'Unit deleted successfully' };
};

/**
 * Upload unit images
 */
export const uploadUnitImages = async (userId: string, unitId: string, imageUrls: string[]) => {
  if (!isValidId(unitId)) {
    throw Object.assign(new Error('Invalid unit ID'), { statusCode: 400 });
  }

  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await prisma.property.findMany({
    where: propertyFilter,
    select: { id: true },
  });
  const accessiblePropertyIds = accessibleProperties.map((p) => p.id);

  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!existing) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(existing.propertyId)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const row = await prisma.unit.update({
    where: { id: unitId },
    data: { images: { push: imageUrls } },
    include: UNIT_INCLUDE,
  });

  return serializeDoc(shapeUnit(row));
};
