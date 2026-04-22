import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { UtilityReading, UtilityMetrics, UtilityType } from '../../domain/entities/UtilityReading';
import type { UtilityRepository, UtilityFilters } from '../../domain/repositories/UtilityRepository';

export class UtilityService implements UtilityRepository {
  async getMetrics(filters?: UtilityFilters): Promise<UtilityMetrics> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.UTILITIES.METRICS, { params: filters });
      return data.data || data;
    } catch (error: any) {
      // Mock Data Fallback for Development
      return {
        monthlyConsumption: [
          { period: 'Jan', electricity: 4200, water: 1200, other: 300 },
          { period: 'Feb', electricity: 3900, water: 1100, other: 300 },
          { period: 'Mar', electricity: 4800, water: 1400, other: 300 },
          { period: 'Apr', electricity: 5100, water: 1600, other: 300 },
          { period: 'May', electricity: 5800, water: 1800, other: 300 },
          { period: 'Jun', electricity: 6000, water: 2000, other: 300 },
        ],
        expenseSummary: [
          { type: 'electricity', value: 29800 },
          { type: 'water', value: 9100 },
          { type: 'internet', value: 3500 },
          { type: 'other', value: 1200 },
        ],
        highestUsageRooms: [
          { unitId: 'u1', unitIdentifier: 'Room 501', consumption: 850, cost: 10200, percentageOffset: 25 },
          { unitId: 'u2', unitIdentifier: 'Room 502', consumption: 780, cost: 9360, percentageOffset: 15 },
          { unitId: 'u3', unitIdentifier: 'Room 405', consumption: 650, cost: 7800, percentageOffset: -4 },
        ],
        overconsumptionAlerts: [
          { unitId: 'u1', unitIdentifier: 'Room 501', type: 'electricity', consumption: 850, threshold: 600, severity: 'critical' },
          { unitId: 'u2', unitIdentifier: 'Room 502', type: 'water', consumption: 45, threshold: 40, severity: 'warning' },
        ]
      };
    }
  }

  async getReadings(filters?: UtilityFilters): Promise<UtilityReading[]> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.UTILITIES.READINGS, { params: filters });
      return data.data || data;
    } catch (error: any) {
      return [];
    }
  }

  async getLatestReading(unitId: string, type: UtilityType): Promise<UtilityReading | null> {
    try {
      const { data } = await apiClient.get(`${ENDPOINTS.UTILITIES.READINGS}/latest`, { params: { unitId, type } });
      return data.data || data;
    } catch (error: any) {
      // Mock Fallback
      return {
        id: 'mock_latest',
        propertyId: 'p1',
        unitId,
        type,
        previousReading: 1200,
        currentReading: 1250,
        consumption: 50,
        readingDate: new Date().toISOString(),
        ratePerUnit: type === 'electricity' ? 12 : 50,
        totalCost: type === 'electricity' ? 600 : 2500,
        isBilled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async recordReading(readingData: Partial<UtilityReading>): Promise<UtilityReading> {
    try {
      const { data } = await apiClient.post(ENDPOINTS.UTILITIES.READINGS, readingData);
      return data.data || data;
    } catch (error: any) {
      // Mock immediate return
      return {
        ...readingData,
        id: `mock_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UtilityReading;
    }
  }
}

export const utilityService = new UtilityService();
