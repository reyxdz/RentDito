import type {  User  } from './User';
import type {  Property  } from './Property';
import type {  Unit  } from './Unit';

export type InquiryStatus = 'open' | 'in_progress' | 'closed' | 'converted';

export interface Inquiry {
  id: string;
  userId: string;
  user?: User;
  propertyId: string;
  property?: Property;
  unitId?: string;
  unit?: Unit;
  
  subject: string;
  status: InquiryStatus;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
