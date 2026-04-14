import { useState, useEffect } from 'react';
import type { Property } from '../../domain/entities/Property';
import { listingService } from '../../infrastructure/services/ListingService';
export function useListings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listingService
      .getPublicListings()
      .then((data) => {
        setProperties(data.properties);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch listings');
        setLoading(false);
      });
  }, []);

  return { properties, loading, error };
}
