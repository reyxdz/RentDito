import type { Ref } from './shared';
import type { User } from './User';
import type { Property } from './Property';
import type { Unit } from './Unit';

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface ApplicationPersonalDetails {
  fullName: string;
  phone: string;
  occupation: string;
  school?: string;
  address: string;
  emergencyContact: string;
}

export interface RentalApplication {
  id: string;
  userId: Ref<User>;
  /** Populated convenience alias */
  user?: User;
  propertyId: Ref<Property>;
  /** Populated convenience alias */
  property?: Property;
  unitId: Ref<Unit>;
  /** Populated convenience alias */
  unit?: Unit;
  
  personalDetails: ApplicationPersonalDetails;
  documents: string[];
  status: ApplicationStatus;
  
  reviewedBy?: Ref<User>;
  /** Populated convenience alias */
  reviewer?: User;
  reviewNotes?: string;
  reviewedAt?: string | Date;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
