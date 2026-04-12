import { User } from './User';
import { Property } from './Property';
import { Unit } from './Unit';

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
  userId: string;
  user?: User;
  propertyId: string;
  property?: Property;
  unitId: string;
  unit?: Unit;
  
  personalDetails: ApplicationPersonalDetails;
  documents: string[];
  status: ApplicationStatus;
  
  reviewedBy?: string;
  reviewer?: User;
  reviewNotes?: string;
  reviewedAt?: string | Date;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
