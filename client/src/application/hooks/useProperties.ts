import { useState, useEffect, useCallback } from 'react';
import type { Property } from '../../domain/entities/Property';
import { propertyService } from '../../infrastructure/services/PropertyService';
import { useAuth } from '../context/AuthContext';

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await propertyService.getPropertiesByLandlord(user.id);
      setProperties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return { properties, loading, error, refresh: fetchProperties };
}
