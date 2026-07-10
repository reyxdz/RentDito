import type { Ref } from './shared';
import type { Tenancy } from './Tenancy';
import type { RentalApplication } from './RentalApplication';

export type ContractRateType = 'fixed' | 'submetered';
export type ContractStatus = 'draft' | 'pending_review' | 'pending_signature' | 'signed' | 'active' | 'expired' | 'terminated';

export interface Contract {
  id: string;
  applicationId: Ref<RentalApplication>;
  /** Populated convenience alias */
  application?: RentalApplication;
  tenancyId?: Ref<Tenancy>;
  /** Populated convenience alias */
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
