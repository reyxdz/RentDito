import { Bill } from './Bill';
import { User } from './User';

export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'other';

export interface Payment {
  id: string;
  billId: string;
  bill?: Bill;
  tenancyId: string;
  amount: number;
  paymentDate: string | Date;
  
  method: PaymentMethod;
  referenceNumber?: string;
  proofImageUrl?: string;
  
  recordedByUserId: string;
  recordedByUser?: User;
  notes?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
