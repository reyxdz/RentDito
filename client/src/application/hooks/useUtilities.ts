import { useState, useCallback } from 'react';
import type { UtilityReading, UtilityMetrics, UtilityType } from '../../domain/entities/UtilityReading';
import type { UtilityFilters } from '../../domain/repositories/UtilityRepository';
import { utilityService } from '../../infrastructure/services/UtilityService';

export function useUtilities() {
  const [metrics, setMetrics] = useState<UtilityMetrics | null>(null);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (filters?: UtilityFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await utilityService.getMetrics(filters);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch utility metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReadings = useCallback(async (filters?: UtilityFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await utilityService.getReadings(filters);
      setReadings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch utility readings');
    } finally {
      setLoading(false);
    }
  }, []);

  const recordReading = async (data: Partial<UtilityReading>) => {
    try {
      const newReading = await utilityService.recordReading(data);
      setReadings(prev => [newReading, ...prev]);
      return newReading;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to record utility reading');
    }
  };

  const getLatestReading = async (unitId: string, type: UtilityType) => {
    return await utilityService.getLatestReading(unitId, type);
  };

  return {
    metrics,
    readings,
    loading,
    error,
    fetchMetrics,
    fetchReadings,
    getLatestReading,
    recordReading,
  };
}
