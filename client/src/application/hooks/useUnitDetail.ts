import { useState, useEffect } from 'react';
import type { Unit } from '../../domain/entities/Unit';
import type { Property } from '../../domain/entities/Property';
import { listingService } from '../../infrastructure/services/ListingService';

export function useUnitDetail(unitId: string | undefined) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) {
      setLoading(false);
      setError('Unit not found');
      return;
    }

    setLoading(true);
    listingService
      .getPublicUnitById(unitId)
      .then((unitData) => {
        if (!unitData) {
          setError('Unit not found');
          setLoading(false);
          return;
        }

        // The public API populates propertyId (returns the object, not just the ID string).
        // Extract the string ID for the subsequent property fetch.
        const populatedProperty = unitData.propertyId;
        const propertyIdStr =
          typeof populatedProperty === 'object' && populatedProperty !== null
            ? (populatedProperty as any)._id || (populatedProperty as any).id
            : populatedProperty;

        // Normalize propertyId on the unit to a string for downstream consumers
        unitData.propertyId = propertyIdStr;
        setUnit(unitData);

        // Fetch property data to get nearbyCategories
        return listingService.getPublicPropertyById(propertyIdStr);
      })
      .then((propertyData) => {
        if (propertyData) {
          setProperty(propertyData);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch unit details');
        setLoading(false);
      });
  }, [unitId]);

  return { unit, property, loading, error };
}
