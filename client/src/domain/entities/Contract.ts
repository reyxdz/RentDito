import { Tenancy } from './Tenancy';
import { RentalApplication } from './RentalApplication';

export type ContractRateType = 'fixed' | 'submetered';
export type ContractStatus = 'draft' | 'pending_review' | 'pending_signature' | 'signed' | 'active' | 'expired' | 'terminated';

export interface Contract {
  id: string;
  applicationId: string;
  application?: RentalApplication;
  tenancyId?: string;
  tenancy?: Tenancy;
  propertyId: string;
  unitId: string;
  landlordId: string;
  userId: string;
  
  startDate: string | Date;
  endDate: string | Date;
  lockInPeriod: number;
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  
  utilityIncludedInRent: boolean;
  rateType: ContractRateType;
  
  terms?: string;
  landlordSignature?: string;
  userSignature?: string;
  signedAt?: string | Date;
  
  status: ContractStatus;
  documentUrl?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
