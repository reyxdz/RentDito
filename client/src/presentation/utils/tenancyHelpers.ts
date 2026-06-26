/**
 * Safely extract the tenancy ID from the user's activeTenancy field.
 *
 * activeTenancy can be either a plain string (ObjectId) or a populated object
 * with _id / id. This helper normalises access so we don't repeat the same
 * `typeof … === 'string' ? … : (… as any)?._id` pattern everywhere.
 */
export const getTenancyId = (activeTenancy: unknown): string | undefined => {
  if (!activeTenancy) return undefined;
  if (typeof activeTenancy === 'string') return activeTenancy;
  if (typeof activeTenancy === 'object' && activeTenancy !== null) {
    return (activeTenancy as any)._id || (activeTenancy as any).id;
  }
  return undefined;
};

/**
 * Extract commonly-needed IDs from an activeTenancy object.
 * Returns { tenancyId, propertyId, unitId } or undefined values when missing.
 */
export const getTenancyContext = (activeTenancy: unknown) => {
  const tenancyId = getTenancyId(activeTenancy);

  let propertyId: string | undefined;
  let unitId: string | undefined;

  if (activeTenancy && typeof activeTenancy === 'object') {
    const t = activeTenancy as any;
    propertyId = t.propertyId?._id || t.propertyId;
    unitId = t.unitId?._id || t.unitId;
  }

  return { tenancyId, propertyId, unitId };
};
