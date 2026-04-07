import { useState, useEffect } from 'react';
import type { Property } from '../../domain/entities/Property';
import type { Unit } from '../../domain/entities/Unit';
import { mockPropertyService } from '../../infrastructure/services/MockPropertyService';
import { mockUnitService } from '../../infrastructure/services/MockUnitService';

export function usePropertyDetail(propertyId: string | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      setError('Property not found');
      return;
    }

    setLoading(true);
    Promise.all([
      mockPropertyService.getPropertyById(propertyId),
      mockUnitService.getUnitsByPropertyId(propertyId),
    ])
      .then(([propertyData, unitData]) => {
        if (!propertyData) {
          setError('Property not found');
        } else {
          setProperty(propertyData);
          setUnits(unitData);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch property details');
        setLoading(false);
      });
  }, [propertyId]);

  return { property, units, loading, error };
}
