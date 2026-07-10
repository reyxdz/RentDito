import type { Tenancy } from '../../domain/entities/Tenancy';
import { resolveId, type Ref } from '../../domain/entities/shared';

/**
 * Safely extract the tenancy ID from the user's activeTenancy field.
 *
 * activeTenancy can be either a plain string (ObjectId) or a populated object
 * with id. This helper normalises access using the Ref<T> type system.
 */
export const getTenancyId = (activeTenancy: Ref<Tenancy> | undefined | null): string | undefined => {
  return resolveId(activeTenancy as Ref<Tenancy & { id: string }>);
};

/**
 * Extract commonly-needed IDs from an activeTenancy object.
 * Returns { tenancyId, propertyId, unitId } or undefined values when missing.
 */
export const getTenancyContext = (activeTenancy: Ref<Tenancy> | undefined | null) => {
  const tenancyId = getTenancyId(activeTenancy);

  let propertyId: string | undefined;
  let unitId: string | undefined;

  if (activeTenancy && typeof activeTenancy === 'object') {
    propertyId = resolveId(activeTenancy.propertyId as Ref<{ id: string }>);
    unitId = resolveId(activeTenancy.unitId as Ref<{ id: string }>);
  }

  return { tenancyId, propertyId, unitId };
};
