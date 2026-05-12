import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type {
  FinancialSummary,
  MonthlyFinancialTrend,
  FinancialByProperty
} from '../../domain/entities/Financial';

type SummaryParams = {
  from?: string;
  to?: string;
  propertyId?: string;
};

type MonthlyParams = {
  year?: number;
  propertyId?: string;
};

type ByPropertyParams = {
  from?: string;
  to?: string;
  propertyId?: string;
};

const cleanParams = (params: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
};

export class FinancialService {
  async getSummary(params: SummaryParams = {}): Promise<FinancialSummary> {
    const { data: envelope } = await apiClient.get(ENDPOINTS.FINANCIALS.SUMMARY, {
      params: cleanParams(params)
    });
    return envelope.data as FinancialSummary;
  }

  async getMonthlyTrend(params: MonthlyParams = {}): Promise<MonthlyFinancialTrend> {
    const { data: envelope } = await apiClient.get(ENDPOINTS.FINANCIALS.MONTHLY, {
      params: cleanParams(params)
    });
    return envelope.data as MonthlyFinancialTrend;
  }

  async getByProperty(params: ByPropertyParams = {}): Promise<FinancialByProperty> {
    const { data: envelope } = await apiClient.get(ENDPOINTS.FINANCIALS.BY_PROPERTY, {
      params: cleanParams(params)
    });
    return envelope.data as FinancialByProperty;
  }
}

export const financialService = new FinancialService();
