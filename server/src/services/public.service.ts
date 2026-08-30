import { randomUUID } from 'crypto';
import prisma from '../config/prisma';
import { Prisma, PropertyType, UnitStatus } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

// Non-maintenance unit statuses -- these public endpoints never expose a
// unit currently under maintenance, matching the original's
// `status: { $in: ['vacant', 'occupied', 'reserved'] }` filter exactly.
const PUBLIC_UNIT_STATUSES: UnitStatus[] = [UnitStatus.vacant, UnitStatus.occupied, UnitStatus.reserved];

// Mongoose stored propertyType as its display string ("Boarding House",
// "Mixed Use", ...); Prisma's generated enum keys can't contain spaces. Same
// translation tables as property.service.ts/user.service.ts -- neither
// exports anything reusable (property.service.ts exports only its 7
// route-level functions; user.service.ts's are private too), so duplicated
// here for the fields this service's embeds need to translate, following the
// same duplication precedent user.service.ts's own comment already
// documents rather than reaching across service boundaries.
const PROPERTY_TYPE_TO_DB: Record<string, PropertyType> = {
  'Boarding House': PropertyType.BoardingHouse,
  Apartment: PropertyType.Apartment,
  Studio: PropertyType.Studio,
  Dormitory: PropertyType.Dormitory,
  Commercial: PropertyType.Commercial,
  Parking: PropertyType.Parking,
  Land: PropertyType.Land,
  'Mixed Use': PropertyType.MixedUse,
};

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

// The two distinct `.populate('landlordId', ...)` field sets the original
// used, kept as two separate selects rather than one -- `getPublicListings`
// only ever showed a landlord's name, `getPublicPropertyById` and the nested
// populate inside `getPublicUnitById` both showed name/email/phone.
const LANDLORD_LIST_SELECT = { id: true, name: true } as const;
const LANDLORD_DETAIL_SELECT = { id: true, name: true, email: true, phone: true } as const;

/**
 * Mongoose auto-assigns an `_id` to every element of an embedded-array
 * subdocument (Property.venues.{reviewCenters,schools,commercial} and
 * Property.emergencyContacts -- see property.service.ts's/user.service.ts's
 * identical helper). Postgres stores these as plain `jsonb` with no
 * per-element identity, so one is minted fresh on every read.
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
 * `.populate('landlordId', ...)` replaced the scalar `landlordId` with the
 * populated user object under the SAME key. Prisma's `include: { landlord:
 * ... }` instead adds a separate `landlord` key and leaves the `landlordId`
 * scalar untouched -- so every read path that included the relation remaps
 * `landlord` back onto `landlordId` here (identical helper to
 * property.service.ts's own `remapLandlord`, duplicated per this file's
 * established no-cross-service-import convention).
 */
function remapLandlord<T extends { landlordId: string; landlord?: unknown }>(
  row: T
): Omit<T, 'landlord'> & { landlordId: unknown } {
  if (row.landlord === undefined) return row;
  const { landlord, ...rest } = row;
  return { ...rest, landlordId: landlord };
}

/**
 * Rebuilds the Mongoose-shaped Property document, WITHOUT the `metrics`
 * sub-object: `totalUnits`/`occupiedUnits`/`vacantUnits`/`occupancyRate` stay
 * at the top level only (passed through untouched via `...rest`, exactly the
 * trigger-maintained columns -- see schema.prisma/Task 6), because this
 * service computes its OWN, separately-sourced `metrics` object per listing
 * from a live, status-filtered unit query (see `getPublicListings` /
 * `getPublicPropertyById` below) -- the same distinction
 * property.service.ts's own `shapeProperty` documents, except that function
 * always mirrors the trigger columns into `metrics` too, which would be
 * wrong here: this service's `metrics` is deliberately NOT the same
 * computation as the trigger's (it recomputes from a live, non-maintenance
 * unit fetch), so callers attach their own `metrics` key after calling this.
 * This mirrors user.service.ts's `shapeEmbeddedProperty` shape (no metrics
 * key at all), reused here as the base for every property embed in this
 * file, landlord-remapped or not.
 */
function shapeProperty(row: Record<string, any>): Record<string, unknown> {
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
 * Rebuilds the Mongoose-shaped Unit document. `roomRent`/`bedspaceRent`/
 * `perHeadRate`/`sizeSqm` are optional paths in the original schema --
 * omitted entirely (not `null`) when unset, same convention as
 * unit.service.ts's own `shapeUnit`. `slots` (the `unit_slots` child table)
 * is remapped back onto the `slots` key, sorted by `slotNumber`, picking
 * only `{slotNumber, status, tenancyId?}` per element (Mongoose's
 * `SlotSchema` used `{_id: false}`, so no id is minted). `propertyId` is
 * remapped onto the FULL populated property shape -- via `shapeProperty` +
 * `remapLandlord`, NOT the narrow `propertyRef.mapper.ts` name/address-only
 * shape -- only when `property` was actually included in the query: this
 * matches `getPublicUnitById`'s original
 * `.populate({path:'propertyId', populate:{path:'landlordId', ...}})`
 * (a full property document with its own landlord populated), which is a
 * wider embed than the narrow `name`/`address`-only shape
 * `propertyRef.mapper.ts` provides for other services (unit.service.ts) --
 * confirmed against `tests/golden/public.json`'s `public-unit-by-id` case,
 * whose nested `propertyId` carries the full property shape (address,
 * billingSettings, venues, emergencyContacts, propertyType, etc), not just
 * name/address. `getPublicListings`/`getPublicPropertyById` never include
 * `property` on a unit row (the original never populated `propertyId` on
 * those unit queries either), so this is a no-op for them.
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
    out.propertyId = shapeProperty(remapLandlord(property));
  }

  return out;
}

/**
 * Truthy-preserving Decimal -> number conversion for the price-range
 * computation below. The original's `if (unit.roomRent) prices.push(...)`
 * relied on Mongoose's `.lean()` handing back a plain JS number, where a
 * falsy check also (correctly) excludes an explicit `0`. Prisma hands back a
 * `Prisma.Decimal` *instance* for a non-null column -- always a truthy
 * object regardless of the value it wraps -- so converting to a number
 * FIRST, then checking truthiness, is required to preserve the original's
 * "exclude null/undefined/zero" behavior instead of accidentally treating
 * every non-null Decimal (including a genuine `0`) as present.
 */
function decimalOrNull(value: Prisma.Decimal | null | undefined): number | null {
  return value !== null && value !== undefined ? Number(value) : null;
}

/**
 * Get all active properties with metrics (public, no auth)
 */
export const getPublicListings = async (
  filters: {
    city?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { city, propertyType, minPrice, maxPrice, page = 1, limit = 20 } = filters;

  // Build filter - only active properties
  const where: Prisma.PropertyWhereInput = { status: 'Active' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (propertyType) where.propertyType = (PROPERTY_TYPE_TO_DB[propertyType] ?? propertyType) as PropertyType;

  // Fetch ALL matching properties first (without pagination) so we can
  // apply the price filter before paginating -- same two-phase approach as
  // the original.
  const rows = await prisma.property.findMany({
    where,
    include: { landlord: { select: LANDLORD_LIST_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  // Compute metrics and price ranges, then apply price filter
  const propertiesWithDetails = await Promise.all(
    rows.map(async (row) => {
      const units = await prisma.unit.findMany({
        where: {
          propertyId: row.id,
          status: { in: PUBLIC_UNIT_STATUSES }, // Exclude maintenance
        },
      });

      const totalUnits = units.length;
      const vacantUnits = units.filter((u) => u.status === 'vacant').length;
      const occupiedUnits = units.filter((u) => u.status === 'occupied').length;

      // Calculate price range
      const prices: number[] = [];
      units.forEach((unit) => {
        const roomRent = decimalOrNull(unit.roomRent);
        const bedspaceRent = decimalOrNull(unit.bedspaceRent);
        if (roomRent) prices.push(roomRent);
        if (bedspaceRent) prices.push(bedspaceRent);
      });

      const minUnitPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxUnitPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // Apply price filter if specified
      if (minPrice && maxUnitPrice < minPrice) return null;
      if (maxPrice && minUnitPrice > maxPrice) return null;

      return {
        ...shapeProperty(remapLandlord(row)),
        metrics: {
          totalUnits,
          vacantUnits,
          occupiedUnits,
          occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        },
        priceRange: {
          min: minUnitPrice,
          max: maxUnitPrice,
        },
      };
    })
  );

  // Filter out null entries (properties that didn't match price filter)
  const filteredProperties = propertiesWithDetails.filter(
    (p): p is Exclude<typeof p, null> => p !== null
  );

  // Apply pagination AFTER price filtering for correct counts
  const total = filteredProperties.length;
  const skip = (page - 1) * limit;
  const paginatedProperties = filteredProperties.slice(skip, skip + limit);

  return {
    properties: serializeList(paginatedProperties),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single property with units (public, no auth)
 *
 * INVALID-ID HANDLING (the pattern to copy for later ports -- see this
 * task's report): `tests/golden/public.json`'s
 * `public-property-by-id-not-found` case requests a Mongo-ObjectId-shaped
 * sentinel (`000000000000000000000000`), which is not a syntactically valid
 * Postgres UUID. Passing it straight to Prisma would raise `P2023`
 * (malformed UUID), which `toHttpError` has no special case for and would
 * fall through to a 500 -- NOT the 404 the fixture expects, and not the
 * behavior a real client hitting a nonexistent listing should see either.
 * Rather than adding a generic `Invalid ... ID` 400 (property.service.ts's
 * own convention for AUTHENTICATED routes, where a malformed id from a
 * signed-in client is a genuine client bug worth a distinct 400), this
 * PUBLIC, unauthenticated endpoint validates the id BEFORE querying and, if
 * it fails, throws the EXACT SAME 404 this function already throws for a
 * syntactically-valid-but-nonexistent id: an anonymous visitor has no way to
 * distinguish "malformed" from "doesn't exist" (and shouldn't be able to --
 * that distinction is only meaningful to a client that already knows the
 * real id space), so both collapse to one response.
 */
export const getPublicPropertyById = async (propertyId: string) => {
  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Property not found or not available'), { statusCode: 404 });
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, status: 'Active' },
    include: { landlord: { select: LANDLORD_DETAIL_SELECT } },
  });

  if (!property) {
    throw Object.assign(new Error('Property not found or not available'), { statusCode: 404 });
  }

  // Get all non-maintenance units
  const units = await prisma.unit.findMany({
    where: {
      propertyId: property.id,
      status: { in: PUBLIC_UNIT_STATUSES },
    },
    include: { slots: { orderBy: { slotNumber: 'asc' } } },
    orderBy: { unitIdentifier: 'asc' },
  });

  const totalUnits = units.length;
  const vacantUnits = units.filter((u) => u.status === 'vacant').length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;

  // Calculate price range
  const prices: number[] = [];
  units.forEach((unit) => {
    const roomRent = decimalOrNull(unit.roomRent);
    const bedspaceRent = decimalOrNull(unit.bedspaceRent);
    if (roomRent) prices.push(roomRent);
    if (bedspaceRent) prices.push(bedspaceRent);
  });

  const result = {
    ...shapeProperty(remapLandlord(property)),
    units: units.map((u) => shapeUnit(u)),
    metrics: {
      totalUnits,
      vacantUnits,
      occupiedUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    },
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
  };

  return serializeDoc(result);
};

/**
 * Get single unit detail (public, no auth)
 *
 * Same invalid-id treatment as `getPublicPropertyById` above, using THIS
 * function's own existing 404 message/status (`'Unit not found or not
 * available'`, 404) rather than borrowing the property one -- no golden
 * fixture exercises this exact path today, but the same malformed-UUID ->
 * `P2023` -> unintended-500 risk applies identically, so the guard is added
 * for consistency and to close the same trap before it can bite a later
 * fixture or a real client.
 */
export const getPublicUnitById = async (unitId: string) => {
  if (!isValidId(unitId)) {
    throw Object.assign(new Error('Unit not found or not available'), { statusCode: 404 });
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      status: { in: PUBLIC_UNIT_STATUSES },
    },
    include: {
      property: { include: { landlord: { select: LANDLORD_DETAIL_SELECT } } },
      slots: { orderBy: { slotNumber: 'asc' } },
    },
  });

  // Mirrors the original's `.populate({path:'propertyId', match:{status:
  // 'Active'}, ...})` + `if (!unit || !unit.propertyId)` check: a populate
  // `match` that fails sets the populated path to `null` rather than
  // filtering the parent out, so the original re-checked it explicitly
  // after the query. Prisma's `include` has no equivalent conditional
  // match, so the property is always included (it's a required relation)
  // and the Active-status check is re-applied here by hand instead.
  if (!unit || unit.property.status !== 'Active') {
    throw Object.assign(new Error('Unit not found or not available'), { statusCode: 404 });
  }

  return serializeDoc(shapeUnit(unit));
};
