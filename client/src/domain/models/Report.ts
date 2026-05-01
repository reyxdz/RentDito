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
}
