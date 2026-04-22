import { useState, useCallback } from 'react';
import type { Bill } from '../../domain/entities/Bill';
import type { Payment } from '../../domain/entities/Payment';
import { billingService } from '../../infrastructure/services/BillingService';
import type { BillingQueryFilters } from '../../domain/repositories/BillingRepository';

export function useBilling() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async (filters?: BillingQueryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.getBills(filters);
      setBills(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  }, []);

  const getBill = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await billingService.getBillById(id);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bill');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBill = async (billData: Partial<Bill>) => {
    try {
      const newBill = await billingService.createBill(billData);
      setBills(prev => [newBill, ...prev]);
      return newBill;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create bill');
    }
  };

  const generateBills = async (monthYear: string) => {
    try {
      const result = await billingService.generateBillsForMonth(monthYear);
      setBills(prev => [...result.bills, ...prev]);
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to generate bills');
    }
  };

  const recordPayment = async (billId: string, paymentData: Partial<Payment>) => {
    try {
      const result = await billingService.recordPayment(billId, paymentData);
      setBills(prev => prev.map(b => b.id === billId ? result.updatedBill : b));
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to record payment');
    }
  };

  return {
    bills,
    loading,
    error,
    fetchBills,
    getBill,
    createBill,
    generateBills,
    recordPayment,
  };
}
