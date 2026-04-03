import { useState, useEffect } from 'react';
import type { Property } from '../../domain/entities/Property';
import { mockPropertyService } from '../../infrastructure/services/MockPropertyService';
import { useAuth } from '../context/AuthContext';

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    mockPropertyService.getPropertiesByLandlord(user.id)
      .then(data => {
        setProperties(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch properties');
        setLoading(false);
      });
  }, [user]);

  return { properties, loading, error };
}
