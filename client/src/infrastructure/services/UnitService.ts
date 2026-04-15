import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Unit } from '../../domain/entities/Unit';
import type { UnitRepository } from '../../domain/repositories/UnitRepository';

export class UnitService implements UnitRepository {
  async getUnitsByProperty(propertyId: string): Promise<Unit[]> {
    const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.UNITS(propertyId));
    return data.data || data;
  }

  async getUnitById(unitId: string): Promise<Unit | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.UNITS.DETAILS(unitId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createUnit(propertyId: string, unitParams: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'slots'>): Promise<Unit> {
    const { data } = await apiClient.post(ENDPOINTS.UNITS.ROOT, { ...unitParams, propertyId });
    return data.data || data;
  }

  async updateUnit(unitId: string, updates: Partial<Unit>): Promise<Unit> {
    const { data } = await apiClient.patch(ENDPOINTS.UNITS.DETAILS(unitId), updates);
    return data.data || data;
  }

  async deleteUnit(unitId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.UNITS.DETAILS(unitId));
  }
}

export const unitService = new UnitService();
