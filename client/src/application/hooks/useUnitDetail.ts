import { useState, useEffect } from 'react';
import type { Unit } from '../../domain/entities/Unit';
import type { Property } from '../../domain/entities/Property';
import { mockUnitService } from '../../infrastructure/services/MockUnitService';
import { mockPropertyService } from '../../infrastructure/services/MockPropertyService';

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
    mockUnitService
      .getUnitById(unitId)
      .then((unitData) => {
        if (!unitData) {
          setError('Unit not found');
          setLoading(false);
          return;
        }
        
        setUnit(unitData);

        // Fetch property data to get nearbyCategories
        return mockPropertyService.getPropertyById(unitData.propertyId);
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
