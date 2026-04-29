import type { UtilityReading, UtilityMetrics, UtilityType } from '../entities/UtilityReading';

export interface UtilityFilters {
  propertyId?: string;
  unitId?: string;
  type?: UtilityType;
  period?: string;
}

export interface UtilityRepository {
  getMetrics(filters?: UtilityFilters): Promise<UtilityMetrics>;
  getReadings(filters?: UtilityFilters): Promise<UtilityReading[]>;
  getLatestReading(unitId: string, type: UtilityType): Promise<UtilityReading | null>;
  recordReading(data: Partial<UtilityReading>): Promise<UtilityReading>;
}
