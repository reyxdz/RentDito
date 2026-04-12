import type { User } from './User';
import type { Property } from './Property';
import type { Unit } from './Unit';
import type { Contract } from './Contract';

export type TenancyStatus = 'pending' | 'checked_in' | 'checked_out';

export interface HouseholdMember {
  name: string;
  relation: string;
}

export interface PersonalDetails {
  fullName: string;
  phone: string;
  emergencyContact: string;
  idDetails: string;
  address: string;
  occupation: string;
}

export interface Tenancy {
  id: string;
  userId: string;
  user?: User;
  propertyId: string;
  property?: Property;
  unitId: string;
  unit?: Unit;
  contractId: string;
  contract?: Contract;
  
  status: TenancyStatus;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  
  // Occupancy fields
  slotNumber?: number;
  isPrimary?: boolean;
  householdMembers?: HouseholdMember[];
  
  // Meta
  personalDetails: PersonalDetails;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
