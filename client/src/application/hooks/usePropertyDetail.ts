import { useState, useEffect } from 'react';
import type { Property } from '../../domain/entities/Property';
import type { Unit } from '../../domain/entities/Unit';
import { listingService } from '../../infrastructure/services/ListingService';

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
    listingService
      .getPublicPropertyById(propertyId)
      .then((propertyData) => {
        if (!propertyData) {
          setError('Property not found');
        } else {
          setProperty(propertyData);
          setUnits(propertyData.units || []);
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
