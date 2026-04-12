import type {  Tenancy  } from './Tenancy';
import type {  User  } from './User';
import type {  Unit  } from './Unit';

export type TransferRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface TransferRequest {
  id: string;
  tenancyId: string;
  tenancy?: Tenancy;
  fromUnitId: string;
  fromUnit?: Unit;
  toUnitId: string;
  toUnit?: Unit;
  
  reason: string;
  status: TransferRequestStatus;
  
  reviewedBy?: string;
  reviewer?: User;
  reviewNotes?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
