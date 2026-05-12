export interface FinancialSummary {
  rentCollected: number;
  utilitiesCollected: number;
  penaltiesCollected: number;
  refunds: number;
  netIncome: number;
  range: {
    from: string | Date;
    to: string | Date;
  };
}

export interface MonthlyFinancialPoint {
  month: number;
  label: string;
  rentCollected: number;
  utilitiesCollected: number;
  penaltiesCollected: number;
  refunds: number;
  netIncome: number;
}

export interface MonthlyFinancialTrend {
  year: number;
  trend: MonthlyFinancialPoint[];
}

export interface PropertyFinancialRow {
  propertyId: string;
  propertyName: string;
  rentCollected: number;
  utilitiesCollected: number;
  penaltiesCollected: number;
  refunds: number;
  netIncome: number;
}

export interface FinancialByProperty {
  range: {
    from: string | Date;
    to: string | Date;
  };
  data: PropertyFinancialRow[];
}
