import type { Bill } from '../entities/Bill';
import type { Payment } from '../entities/Payment';

export interface BillingQueryFilters {
  status?: string;
  propertyId?: string;
  tenantId?: string;
  period?: string;
}

export interface BillingRepository {
  getBills(filters?: BillingQueryFilters): Promise<Bill[]>;
  getBillById(id: string): Promise<Bill | null>;
  createBill(data: Partial<Bill>): Promise<Bill>;
  generateBillsForMonth(monthYear: string): Promise<{ count: number; bills: Bill[] }>;
  recordPayment(billId: string, paymentData: Partial<Payment>): Promise<{ payment: Payment; updatedBill: Bill }>;
}
