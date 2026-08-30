import { Prisma } from '@prisma/client';

const isDecimal = (v: unknown): v is Prisma.Decimal =>
  v instanceof Prisma.Decimal;

/**
 * Recursively prepare a Prisma result for JSON output:
 *  - mirrors `id` into `_id` so existing client code keeps working
 *  - converts Decimal to number, matching what Mongo used to emit
 * Dates are left as Date instances; Express serializes them to ISO strings.
 */
const walk = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v);
    }
    if (typeof out.id === 'string') out._id = out.id;
    return out;
  }
  return value;
};

export function serializeDoc<T extends object>(doc: T | null): Record<string, unknown> | null {
  if (doc === null || doc === undefined) return null;
  return walk(doc) as Record<string, unknown>;
}

export function serializeList<T extends object>(docs: T[]): Record<string, unknown>[] {
  return docs.map((d) => walk(d) as Record<string, unknown>);
}

/**
 * Fields that must never cross the serialization boundary on a `Profile`,
 * because they're internal Mongo -> Postgres migration bookkeeping, not
 * part of any client-facing contract. `legacyMongoId` in particular must
 * not leak: it exposes the (soon-to-be-retired) Mongo id space to clients,
 * and it's the FK strangler services key their transitional `req.user.id`
 * off of (see src/middleware/auth.ts) -- nothing outside the server has any
 * business seeing it. Kept as an explicit denylist (rather than relying on
 * callers to `select` it away) so a future endpoint that serializes a full
 * Profile row doesn't have to remember to do this itself.
 */
const NEVER_SERIALIZE_PROFILE_FIELDS = new Set(['legacyMongoId']);

export interface SerializeProfileOptions {
  /**
   * Flat array of assigned property ids. In Mongo this lived directly on
   * the user document (`User.assignedPropertyIds`); in Postgres it's the
   * `staff_property_assignments` join table, which has no scalar column on
   * `Profile` to auto-include here. Callers must resolve it themselves
   * (typically: query the join table only for staff profiles) and pass it
   * in. Defaults to `[]`, matching what non-staff profiles (and Mongo's own
   * empty-array default) always returned.
   */
  assignedPropertyIds?: string[];
}

/**
 * Serialize a Postgres `Profile` row back into the pre-migration Mongo
 * `User` response shape that clients and the golden fixtures already
 * depend on:
 *  - dual id/_id via serializeDoc()
 *  - assignedPropertyIds flattened in as a plain string array (see
 *    SerializeProfileOptions)
 *  - migration-internal fields (NEVER_SERIALIZE_PROFILE_FIELDS) stripped
 *  - array fields defaulted to `[]` rather than `null` -- Mongo always
 *    emitted `[]` for these when empty, but the Postgres columns backing
 *    them are nullable, so a genuinely empty one from the database would
 *    otherwise come back as `null` and fail a strict shape comparison.
 */
export function serializeProfile(
  profile: Record<string, unknown> | null,
  options: SerializeProfileOptions = {}
): Record<string, unknown> | null {
  const serialized = serializeDoc(profile);
  if (!serialized) return serialized;

  for (const field of NEVER_SERIALIZE_PROFILE_FIELDS) {
    delete serialized[field];
  }

  serialized.idPhotos = serialized.idPhotos ?? [];
  serialized.permissions = serialized.permissions ?? [];
  serialized.assignedPropertyIds = options.assignedPropertyIds ?? [];

  // Mongoose never materializes a key for an optional scalar path that was
  // never set (no default, no value written) -- it simply omits it from
  // toJSON/toObject output entirely, it does not emit `null`. Postgres has
  // no such concept: an unset nullable column (avatar, landlordId,
  // positionName, phone, ...) always comes back as an explicit `null`. Drop
  // any such key here so a profile that never set e.g. `avatar` matches the
  // pre-migration shape (key absent) instead of gaining a `avatar: null`
  // that the old Mongo-captured fixtures never had.
  for (const key of Object.keys(serialized)) {
    if (serialized[key] === null) delete serialized[key];
  }

  return serialized;
}
