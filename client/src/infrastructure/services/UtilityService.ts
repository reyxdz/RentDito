import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { UtilityReading, UtilityMetrics, UtilityType } from '../../domain/entities/UtilityReading';
import type { UtilityRepository, UtilityFilters } from '../../domain/repositories/UtilityRepository';

export class UtilityService implements UtilityRepository {
  async getMetrics(filters?: UtilityFilters): Promise<UtilityMetrics> {
    const { data } = await apiClient.get(ENDPOINTS.UTILITIES.METRICS, { params: filters });
    return data.data || data;
  }

  async getReadings(filters?: UtilityFilters): Promise<UtilityReading[]> {
    const { data } = await apiClient.get(ENDPOINTS.UTILITIES.READINGS, { params: filters });
    return data.data || data;
  }

  async getLatestReading(unitId: string, type: UtilityType): Promise<UtilityReading | null> {
    try {
      const { data } = await apiClient.get(`${ENDPOINTS.UTILITIES.READINGS}/latest`, { params: { unitId, type } });
      return data.data || data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async recordReading(readingData: Partial<UtilityReading>): Promise<UtilityReading> {
    const { data } = await apiClient.post(ENDPOINTS.UTILITIES.READINGS, readingData);
    return data.data || data;
  }
}

export const utilityService = new UtilityService();
