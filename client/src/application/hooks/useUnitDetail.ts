import { useState, useEffect } from 'react';
import type { Unit } from '../../domain/entities/Unit';
import type { Property } from '../../domain/entities/Property';
import { unitService } from '../../infrastructure/services/UnitService';
import { propertyService } from '../../infrastructure/services/PropertyService';
import { listingService } from '../../infrastructure/services/ListingService';

/**
 * Fetches unit detail using the authenticated API (for landlord/staff hub).
 * Falls back to the public API if `usePublic` is true (for public listing pages).
 */
export function useUnitDetail(unitId: string | undefined, usePublic: boolean = false) {
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

    const fetchUnit = async () => {
      setLoading(true);
      setError(null);
      try {
        let unitData: Unit | null;

        if (usePublic) {
          unitData = await listingService.getPublicUnitById(unitId);
        } else {
          unitData = await unitService.getUnitById(unitId);
        }

        if (!unitData) {
          setError('Unit not found');
          setLoading(false);
          return;
        }

        // The API may populate propertyId as an object. Extract the ID string
        // and the property data from it.
        const populatedProperty = unitData.propertyId;
        let propertyIdStr: string;
        let embeddedProperty: any = null;

        if (typeof populatedProperty === 'object' && populatedProperty !== null) {
          embeddedProperty = populatedProperty;
          propertyIdStr = (populatedProperty as any)._id || (populatedProperty as any).id;
          // Normalize propertyId on the unit to a string
          unitData.propertyId = propertyIdStr;
        } else {
          propertyIdStr = populatedProperty as string;
        }

        setUnit(unitData);

        // If we got a populated property object with name, use it directly
        if (embeddedProperty?.name) {
          setProperty(embeddedProperty as Property);
        } else if (propertyIdStr) {
          // Otherwise fetch the full property data
          try {
            let propData: Property | null;
            if (usePublic) {
              propData = await listingService.getPublicPropertyById(propertyIdStr);
            } else {
              propData = await propertyService.getPropertyById(propertyIdStr);
            }
            if (propData) setProperty(propData);
          } catch {
            // Non-critical — unit still loads fine without property details
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch unit details');
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [unitId, usePublic]);

  return { unit, property, loading, error };
}
