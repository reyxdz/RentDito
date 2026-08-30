import { randomUUID } from 'crypto';
import prisma from '../config/prisma';
import { Prisma, PropertyType, PropertyStatus } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import type { IProperty } from '../models/Property';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

// Mongoose stored propertyType as its display string ("Boarding House",
// "Mixed Use", ...). Prisma's generated enum keys can't contain spaces, so
// the schema maps them (PropertyType.BoardingHouse -> DB value
// "Boarding House"). At the JS/TS level the Prisma client only ever sees the
// no-space enum key, never the mapped DB value -- so every value crossing
// the service boundary has to be translated by hand in both directions to
// keep the API's display-string contract (and the golden fixtures) unchanged.
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

const LANDLORD_LIST_SELECT = { id: true, name: true, email: true } as const;
const LANDLORD_DETAIL_SELECT = { id: true, name: true, email: true, phone: true } as const;

/**
 * Mongoose auto-assigns an `_id` to every element of an embedded-array
 * subdocument (Property.venues.{reviewCenters,schools,commercial} and
 * Property.emergencyContacts). Postgres stores these as plain `jsonb` with
 * no such per-element identity. There is no column to read a stable id back
 * from, so one is minted fresh on every read -- this is invisible to
 * clients that only ever compare/replace whole array elements (as the
 * existing UI does), and keeps the response shape identical to what
 * Mongoose emitted for consumers (including the golden fixtures' dual-id
 * expectations) that expect an `_id` on each entry.
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
 * `.populate('landlordId', 'name email[, phone]')` replaced the scalar
 * `landlordId` with the populated user object under the SAME key. Prisma's
 * `include: { landlord: ... }` instead adds a separate `landlord` key and
 * leaves the `landlordId` scalar untouched -- so every read path remaps
 * `landlord` back onto `landlordId` here to preserve the shape the client
 * (and the golden fixtures) already depend on. Write-only paths that never
 * populated in Mongoose either (deleteProperty, uploadPropertyImages) simply
 * never get a `landlord` key to remap, and pass through unchanged.
 */
function remapLandlord<T extends { landlordId: string; landlord?: unknown }>(
  row: T
): Omit<T, 'landlord'> & { landlordId: unknown } {
  if (row.landlord === undefined) return row;
  const { landlord, ...rest } = row;
  return { ...rest, landlordId: landlord };
}

/**
 * Rebuilds the Mongoose-shaped response from the flattened Postgres columns:
 * address/billingSettings/geoCoords nested back up, propertyType translated
 * back to its display string, venues/emergencyContacts given fresh `_id`s,
 * and `metrics` mirrored from the trigger-maintained total/occupied/vacant/
 * occupancyRate columns (see Task 6's trigger -- this service must not
 * compute or write those, only re-present them under the `metrics` key like
 * the original live Unit-count queries did).
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
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
    ...rest
  } = row;

  const address: Record<string, unknown> = { street, city, province, zipCode, country };
  if (barangay !== null && barangay !== undefined) address.barangay = barangay;

  const out: Record<string, unknown> = {
    ...rest,
    address,
    propertyType: PROPERTY_TYPE_FROM_DB[propertyType] ?? propertyType,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
    billingSettings: { billingDay, dueDay, lateFeePercent, utilityDefault },
    venues: buildVenues(venues),
    emergencyContacts: withSubdocIds((emergencyContacts as Record<string, unknown>[] | null) ?? []),
    metrics: { totalUnits, occupiedUnits, vacantUnits, occupancyRate },
  };

  if (latitude !== null || longitude !== null) {
    out.geoCoords = { latitude, longitude };
  }

  return out;
}

/**
 * Get scoped query filter based on user role
 */
const getScopedFilter = async (
  userId: string,
  baseFilter: Prisma.PropertyWhereInput = {}
): Promise<Prisma.PropertyWhereInput> => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Super admin sees all properties
  if (user.role === 'super_admin') {
    return baseFilter;
  }

  // Landlord sees only their properties
  if (user.role === 'landlord') {
    return { ...baseFilter, landlordId: userId };
  }

  // Staff sees only assigned properties
  if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    return {
      ...baseFilter,
      id: { in: assignments.map((a) => a.propertyId) },
    };
  }

  // Regular users cannot access properties
  throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
};

/**
 * Get all properties with auto-scoping
 */
export const getProperties = async (
  userId: string,
  filters: {
    status?: string;
    propertyType?: string;
    city?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { status, propertyType, city, page = 1, limit = 20 } = filters;

  // Build base filter
  const baseFilter: Prisma.PropertyWhereInput = {};
  if (status) baseFilter.status = status as PropertyStatus;
  if (propertyType) baseFilter.propertyType = PROPERTY_TYPE_TO_DB[propertyType] ?? (propertyType as PropertyType);
  if (city) baseFilter.city = { contains: city, mode: 'insensitive' };

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, baseFilter);

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where: scopedFilter,
      include: { landlord: { select: LANDLORD_LIST_SELECT } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.property.count({ where: scopedFilter }),
  ]);

  const properties = rows.map((row) => shapeProperty(remapLandlord(row)));

  return {
    properties: serializeList(properties),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single property by ID with auto-scoping
 */
export const getPropertyById = async (userId: string, propertyId: string) => {
  // Validate ID format
  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { id: propertyId });

  const row = await prisma.property.findFirst({
    where: scopedFilter,
    include: { landlord: { select: LANDLORD_DETAIL_SELECT } },
  });

  if (!row) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  return serializeDoc(shapeProperty(remapLandlord(row)));
};

/**
 * Create new property (landlord only)
 */
export const createProperty = async (userId: string, data: Partial<IProperty>) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Only landlords can create properties
  if (user.role !== 'landlord' && user.role !== 'super_admin') {
    throw Object.assign(new Error('Only landlords can create properties'), { statusCode: 403 });
  }

  const body = data as any;
  const address = body.address ?? {};
  const billingSettings = body.billingSettings ?? {};
  const geoCoords = body.geoCoords;

  try {
    const row = await prisma.property.create({
      data: {
        landlordId: user.role === 'landlord' ? userId : body.landlordId,
        name: body.name,
        description: body.description,
        street: address.street,
        barangay: address.barangay ?? null,
        city: address.city,
        province: address.province,
        zipCode: address.zipCode,
        country: address.country ?? 'Philippines',
        amenities: body.amenities ?? [],
        inclusions: body.inclusions ?? [],
        images: body.images ?? [],
        propertyType: PROPERTY_TYPE_TO_DB[body.propertyType] ?? body.propertyType,
        status: (body.status as PropertyStatus) ?? 'Active',
        venues: body.venues ?? {},
        emergencyContacts: body.emergencyContacts ?? [],
        billingDay: billingSettings.billingDay ?? 1,
        dueDay: billingSettings.dueDay ?? 5,
        lateFeePercent: billingSettings.lateFeePercent ?? 5,
        utilityDefault: billingSettings.utilityDefault ?? 'metered',
        latitude: geoCoords?.latitude ?? null,
        longitude: geoCoords?.longitude ?? null,
      },
      include: { landlord: { select: LANDLORD_LIST_SELECT } },
    });

    return serializeDoc(shapeProperty(remapLandlord(row)));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Update property with auto-scoping
 */
export const updateProperty = async (
  userId: string,
  propertyId: string,
  data: Partial<IProperty>
) => {
  // Validate ID format
  if (!isValidId(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { id: propertyId });

  // Mongoose's findOneAndUpdate(query, update) atomically finds-and-updates
  // in one round trip; Prisma has no equivalent for a non-unique/compound
  // query, so this finds the scoped match first and then updates that exact
  // row by its id (mirrors findOneAndUpdate's "update whatever the query
  // matched" semantics, including which row wins under the same
  // scoped-filter precedence as getScopedFilter itself).
  const existing = await prisma.property.findFirst({ where: scopedFilter });
  if (!existing) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  const body = data as any;
  const updateData: Prisma.PropertyUpdateInput = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.address) {
    const a = body.address;
    if (a.street !== undefined) updateData.street = a.street;
    if (a.barangay !== undefined) updateData.barangay = a.barangay ?? null;
    if (a.city !== undefined) updateData.city = a.city;
    if (a.province !== undefined) updateData.province = a.province;
    if (a.zipCode !== undefined) updateData.zipCode = a.zipCode;
    if (a.country !== undefined) updateData.country = a.country;
  }
  if (body.amenities !== undefined) updateData.amenities = body.amenities;
  if (body.inclusions !== undefined) updateData.inclusions = body.inclusions;
  if (body.images !== undefined) updateData.images = body.images;
  if (body.propertyType !== undefined) {
    updateData.propertyType = PROPERTY_TYPE_TO_DB[body.propertyType] ?? body.propertyType;
  }
  if (body.status !== undefined) updateData.status = body.status;
  if (body.venues !== undefined) updateData.venues = body.venues;
  if (body.emergencyContacts !== undefined) updateData.emergencyContacts = body.emergencyContacts;
  if (body.billingSettings) {
    const b = body.billingSettings;
    if (b.billingDay !== undefined) updateData.billingDay = b.billingDay;
    if (b.dueDay !== undefined) updateData.dueDay = b.dueDay;
    if (b.lateFeePercent !== undefined) updateData.lateFeePercent = b.lateFeePercent;
    if (b.utilityDefault !== undefined) updateData.utilityDefault = b.utilityDefault;
  }
  if (body.geoCoords) {
    const g = body.geoCoords;
    if (g.latitude !== undefined) updateData.latitude = g.latitude;
    if (g.longitude !== undefined) updateData.longitude = g.longitude;
  }

  try {
    const row = await prisma.property.update({
      where: { id: existing.id },
      data: updateData,
      include: { landlord: { select: LANDLORD_LIST_SELECT } },
    });

    return serializeDoc(shapeProperty(remapLandlord(row)));
  } catch (e) {
    throw toHttpError(e);
  }
};

/**
 * Update property status
 */
export const updatePropertyStatus = async (
  userId: string,
  propertyId: string,
  status: string
) => {
  return updateProperty(userId, propertyId, { status } as any);
};

/**
 * Soft delete property (set status to Archived)
 */
export const deleteProperty = async (userId: string, propertyId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Only landlords and admins can delete
  if (user.role !== 'landlord' && user.role !== 'super_admin') {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { id: propertyId });

  const existing = await prisma.property.findFirst({ where: scopedFilter });
  if (!existing) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  const row = await prisma.property.update({
    where: { id: existing.id },
    data: { status: 'Archived' },
  });

  return serializeDoc(shapeProperty(remapLandlord(row)));
};

/**
 * Upload property images
 */
export const uploadPropertyImages = async (
  userId: string,
  propertyId: string,
  imageUrls: string[]
) => {
  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { id: propertyId });

  const existing = await prisma.property.findFirst({ where: scopedFilter });
  if (!existing) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  const row = await prisma.property.update({
    where: { id: existing.id },
    data: { images: { push: imageUrls } },
  });

  return serializeDoc(shapeProperty(remapLandlord(row)));
};
