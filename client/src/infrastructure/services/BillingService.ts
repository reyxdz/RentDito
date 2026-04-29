import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Bill } from '../../domain/entities/Bill';
import type { Payment } from '../../domain/entities/Payment';
import type { BillingRepository, BillingQueryFilters } from '../../domain/repositories/BillingRepository';

export class BillingService implements BillingRepository {
  async getBills(filters?: BillingQueryFilters): Promise<Bill[]> {
    const { data } = await apiClient.get(ENDPOINTS.BILLS.ROOT, { params: filters });
    return data.data || data;
  }

  async getBillById(id: string): Promise<Bill | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.BILLS.DETAILS(id));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async createBill(billData: Partial<Bill>): Promise<Bill> {
    const { data } = await apiClient.post(ENDPOINTS.BILLS.ROOT, billData);
    return data.data || data;
  }

  async generateBillsForMonth(monthYear: string): Promise<{ count: number; bills: Bill[] }> {
    const { data } = await apiClient.post(ENDPOINTS.BILLS.GENERATE, { monthYear });
    return data.data || data;
  }

  async recordPayment(billId: string, paymentData: Partial<Payment>): Promise<{ payment: Payment; updatedBill: Bill }> {
    const { data } = await apiClient.post(ENDPOINTS.BILLS.PAY(billId), paymentData);
    return data.data || data;
  }
}

export const billingService = new BillingService();
