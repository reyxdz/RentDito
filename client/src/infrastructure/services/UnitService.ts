import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Unit } from '../../domain/entities/Unit';
import type { UnitRepository } from '../../domain/repositories/UnitRepository';

/** Map MongoDB _id to client-side id */
const mapUnit = (u: any): Unit => ({
  ...u,
  id: u._id || u.id,
});

export class UnitService implements UnitRepository {
  async getUnitsByProperty(propertyId: string): Promise<Unit[]> {
    const { data } = await apiClient.get(ENDPOINTS.PROPERTIES.UNITS(propertyId));
    const raw = data.data || data;
    return raw.map(mapUnit);
  }

  async getUnits(filters: Record<string, string> = {}): Promise<Unit[]> {
    const { data } = await apiClient.get(ENDPOINTS.UNITS.ROOT, { params: filters });
    const raw = data.data || data;
    return raw.map(mapUnit);
  }

  async getUnitById(unitId: string): Promise<Unit | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.UNITS.DETAILS(unitId));
      return mapUnit(data.data || data);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createUnit(propertyId: string, unitParams: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'slots'>): Promise<Unit> {
    const { data } = await apiClient.post(ENDPOINTS.UNITS.ROOT, { ...unitParams, propertyId });
    return mapUnit(data.data || data);
  }

  async updateUnit(unitId: string, updates: Partial<Unit>): Promise<Unit> {
    const { data } = await apiClient.patch(ENDPOINTS.UNITS.DETAILS(unitId), updates);
    return mapUnit(data.data || data);
  }

  async deleteUnit(unitId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.UNITS.DETAILS(unitId));
  }
}

export const unitService = new UnitService();

