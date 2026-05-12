import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FinancialSummary,
  MonthlyFinancialTrend,
  FinancialByProperty
} from '../../domain/entities/Financial';
import { financialService } from '../../infrastructure/services/FinancialService';

export type FinancialPeriod = 'this_month' | 'last_3_months' | 'year_to_date' | 'this_year';

const toIsoDate = (date: Date): string => date.toISOString();

const getPeriodRange = (period: FinancialPeriod) => {
  const now = new Date();

  if (period === 'this_month') {
    return {
      from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)),
      to: toIsoDate(now)
    };
  }

  if (period === 'last_3_months') {
    return {
      from: toIsoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0)),
      to: toIsoDate(now)
    };
  }

  if (period === 'year_to_date') {
    return {
      from: toIsoDate(new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)),
      to: toIsoDate(now)
    };
  }

  // this_year
  return {
    from: toIsoDate(new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)),
    to: toIsoDate(new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999))
  };
};

export function useFinancialDashboard() {
  const [period, setPeriod] = useState<FinancialPeriod>('this_year');
  const [propertyId, setPropertyId] = useState<string>('all');

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyFinancialTrend | null>(null);
  const [byProperty, setByProperty] = useState<FinancialByProperty | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => getPeriodRange(period), [period]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const scopedPropertyId = propertyId === 'all' ? undefined : propertyId;

      const [summaryData, monthlyData, propertyData] = await Promise.all([
        financialService.getSummary({
          from: range.from,
          to: range.to,
          propertyId: scopedPropertyId
        }),
        financialService.getMonthlyTrend({
          year: now.getFullYear(),
          propertyId: scopedPropertyId
        }),
        financialService.getByProperty({
          from: range.from,
          to: range.to,
          propertyId: scopedPropertyId
        })
      ]);

      setSummary(summaryData);
      setMonthlyTrend(monthlyData);
      setByProperty(propertyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load financial dashboard');
    } finally {
      setLoading(false);
    }
  }, [propertyId, range.from, range.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    period,
    setPeriod,
    propertyId,
    setPropertyId,
    summary,
    monthlyTrend,
    byProperty,
    loading,
    error,
    refresh: fetchData
  };
}
