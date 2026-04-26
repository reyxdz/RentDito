import { useState, useCallback } from 'react';
import type { Unit } from '../../domain/entities/Unit';
import { unitService } from '../../infrastructure/services/UnitService';

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async (filters: Record<string, string> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await unitService.getUnits(filters);
      setUnits(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnitsByProperty = useCallback(async (propertyId: string) => {
    if (!propertyId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await unitService.getUnitsByProperty(propertyId);
      setUnits(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, []);

  const createUnit = async (propertyId: string, unitParams: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'slots'>) => {
    try {
      const newUnit = await unitService.createUnit(propertyId, unitParams);
      setUnits(prev => [...prev, newUnit]);
      return newUnit;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create unit');
    }
  };

  const updateUnit = async (unitId: string, updates: Partial<Unit>) => {
    try {
      const updatedUnit = await unitService.updateUnit(unitId, updates);
      setUnits(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
      return updatedUnit;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update unit');
    }
  };

  const deleteUnit = async (unitId: string) => {
    try {
      await unitService.deleteUnit(unitId);
      setUnits(prev => prev.filter(u => u.id !== unitId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete unit');
    }
  };

  return { 
    units, 
    loading, 
    error, 
    fetchUnits,
    fetchUnitsByProperty,
    createUnit,
    updateUnit,
    deleteUnit
  };
}
