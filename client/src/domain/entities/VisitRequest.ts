import { User } from './User';
import { Property } from './Property';
import { Unit } from './Unit';

export type VisitPurpose = 'viewing' | 'inspection';
export type VisitStatus = 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface VisitRequest {
  id: string;
  userId: string;
  user?: User;
  propertyId: string;
  property?: Property;
  unitId?: string;
  unit?: Unit;
  
  requestedDate: string;
  requestedTime: string;
  scheduledDate?: string;
  scheduledTime?: string;
  
  purpose: VisitPurpose;
  status: VisitStatus;
  
  assignedStaffId?: string;
  assignedStaff?: User;
  notes?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
