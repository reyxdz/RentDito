import { useState, useEffect } from 'react';
import type { Unit } from '../../domain/entities/Unit';
import { listingService } from '../../infrastructure/services/ListingService';

export function useListingUnitDetail(unitId: string | undefined) {
  const [unit, setUnit] = useState<Unit | null>(null);
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
        } else {
          setUnit(unitData);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch unit details');
        setLoading(false);
      });
  }, [unitId]);

  return { unit, loading, error };
}
