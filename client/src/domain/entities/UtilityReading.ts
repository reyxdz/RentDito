export type UtilityType = 'electricity' | 'water' | 'internet' | 'other';

export interface UtilityReading {
  id: string;
  propertyId: string;
  unitId: string;
  unitIdentifier?: string; // e.g., 'A1', 'Room 203'
  type: UtilityType;
  previousReading: number;
  currentReading: number;
  consumption: number;
  readingDate: string | Date;
  ratePerUnit: number;
  totalCost: number;
  isBilled: boolean;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MetricDataPoint {
  period: string; // e.g., 'Jan 2026'
  electricity: number;
  water: number;
  other: number;
}

export interface RoomUsageRanking {
  unitId: string;
  unitIdentifier: string;
  consumption: number;
  cost: number;
  percentageOffset: number; // compared to average
}

export interface UtilityMetrics {
  monthlyConsumption: MetricDataPoint[];
  expenseSummary: {
    type: UtilityType;
    value: number;
  }[];
  highestUsageRooms: RoomUsageRanking[];
  overconsumptionAlerts: {
    unitId: string;
    unitIdentifier: string;
    type: UtilityType;
    consumption: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }[];
}
