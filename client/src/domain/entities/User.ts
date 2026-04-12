import { Tenancy } from './Tenancy';

export type Role = 'user' | 'landlord' | 'staff' | 'super_admin';
export type UserStatus = 'active' | 'suspended';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  role: Role;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  idPhotos: string[];
  avatar?: string;
  // Staff-specific fields
  landlordId?: string;
  assignedPropertyIds?: string[];
  permissions?: string[];
  positionName?: string;
  // Populated virtually
  activeTenancy?: Tenancy | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
