import { Prisma } from '@prisma/client';

/**
 * Shared shape for the NARROW `.populate('propertyId', 'name address')`
 * projection several Mongoose services used when they only ever displayed a
 * property's name/address alongside some other primary entity (never its
 * full document). `property.service.ts`'s own `shapeProperty()` (full
 * property + trigger-maintained metrics) and `user.service.ts`'s
 * `shapeEmbeddedProperty()` (full property, no metrics) are both wider
 * shapes for different call sites and neither exports anything reusable, so
 * this narrow one gets its own tiny, purpose-built home rather than being
 * duplicated ad hoc by every future service that needs the same `name
 * address`-only projection (unit, and per the migration plan likely
 * tenancy/contract/billing/ticket/inquiry/visit later, all embed a property
 * this same shallow way).
 */
export const PROPERTY_REF_SELECT = {
  id: true,
  name: true,
  street: true,
  barangay: true,
  city: true,
  province: true,
  zipCode: true,
  country: true,
} satisfies Prisma.PropertySelect;

type PropertyRefRow = {
  id: string;
  name: string;
  street: string;
  barangay: string | null;
  city: string;
  province: string;
  zipCode: string;
  country: string;
};

/**
 * Rebuilds the `name`/`address` shape from the flattened Postgres columns.
 * `barangay` is included only when non-null, mirroring Mongoose's "unset
 * optional path -> key entirely absent" behavior (same convention used by
 * `property.service.ts`'s `shapeProperty` and `user.service.ts`'s
 * `shapeEmbeddedProperty`). Deliberately returns `id` (not `_id`) — the
 * caller embeds this object inside a larger response that is later run
 * through `serializeDoc`/`serializeList`, whose recursive `walk()` mirrors
 * `id` -> `_id` at every nesting level, so mirroring it here too would be
 * redundant.
 */
export function shapePropertyRef(row: PropertyRefRow): Record<string, unknown> {
  const address: Record<string, unknown> = {
    street: row.street,
    city: row.city,
    province: row.province,
    zipCode: row.zipCode,
    country: row.country,
  };
  if (row.barangay !== null && row.barangay !== undefined) {
    address.barangay = row.barangay;
  }

  return { id: row.id, name: row.name, address };
}
