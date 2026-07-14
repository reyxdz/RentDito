export interface PropertyBreakdown {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
}

export interface OccupancyStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
  propertyBreakdown: PropertyBreakdown[];
}

export interface CheckoutForecastMonth {
  month: string;
  year: number;
  expiringCount: number;
  revenueLoss: number;
}

export interface ExpiringContract {
  contractId: string;
  propertyName: string;
  unitIdentifier: string;
  tenantName: string;
  endDate: string;
  monthlyRent: number;
}

export interface CheckoutForecast {
  monthlyForecast: CheckoutForecastMonth[];
  peakMonth: string | null;
  expiringContracts: ExpiringContract[];
  historicalTrend: HistoricalCheckout[];
  totalRevenueLoss: number;
}

export interface HistoricalCheckout {
  month: string;
  year: number;
  checkouts: number;
}

export interface VacancyPropertyBreakdown {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  currentVacant: number;
  predictedVacant: number;
  currentVacancyRate: number;
  predictedVacancyRate: number;
}

export interface VacancyForecast {
  totalUnits: number;
  currentVacant: number;
  predictedVacant: number;
  currentVacancyRate: number;
  predictedVacancyRate: number;
  propertyBreakdown: VacancyPropertyBreakdown[];
}

export interface ReservationForecast {
  pendingInquiries: number;
  scheduledVisits: number;
  pendingApplications: number;
  totalApplications: number;
  approvedApplications: number;
  conversionRate: number;
}
