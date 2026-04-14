import { useState, useEffect, useCallback } from 'react';
import type { Property } from '../../domain/entities/Property';
import { propertyService } from '../../infrastructure/services/PropertyService';

export function useProperty(propertyId: string | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await propertyService.getPropertyById(propertyId);
      setProperty(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch property details');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  return { property, loading, error, refresh: fetchProperty };
}
