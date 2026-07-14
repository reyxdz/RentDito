/**
 * Utility types for MongoDB populated vs. unpopulated references.
 *
 * When Mongoose populates a field, it replaces the raw ObjectId string
 * with the full document object. These types model that duality so the
 * frontend can handle both cases without resorting to `as any`.
 */

/** A MongoDB reference that may be a raw ID string or a populated object */
export type Ref<T> = string | T;

/**
 * Extract the ID from a possibly-populated reference.
 * Works for both `"abc123"` (string) and `{ id: "abc123", name: "..." }`.
 */
export function resolveId<T extends { id: string }>(ref: Ref<T> | undefined | null): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref;
  return ref.id;
}

/**
 * Extract a display field (e.g. `name`) from a possibly-populated reference.
 * Returns the fallback string when the ref is a raw ID or missing.
 */
export function resolveField<T>(
  ref: Ref<T> | undefined | null,
  field: keyof T,
  fallback = '—'
): string {
  if (!ref || typeof ref === 'string') return fallback;
  const value = ref[field];
  return value != null ? String(value) : fallback;
}

/**
 * Convenience: resolve a nested name field from a populated ref.
 * `resolveName(visit.propertyId)` → "Sunrise Apartments" or "—"
 */
export function resolveName<T extends { name: string }>(
  ref: Ref<T> | undefined | null,
  fallback = '—'
): string {
  return resolveField(ref, 'name' as keyof T, fallback);
}
