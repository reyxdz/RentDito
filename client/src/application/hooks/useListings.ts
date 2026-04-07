import { useState, useEffect } from 'react';
import type { Property } from '../../domain/entities/Property';
import { mockPropertyService } from '../../infrastructure/services/MockPropertyService';

export function useListings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    mockPropertyService
      .getAllProperties()
      .then((data) => {
        setProperties(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch listings');
        setLoading(false);
      });
  }, []);

  return { properties, loading, error };
}
