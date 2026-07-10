import type { Ref } from './shared';
import type { User } from './User';
import type { Property } from './Property';
import type { Unit } from './Unit';

export type VisitPurpose = 'viewing' | 'inspection';
export type VisitStatus = 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface VisitRequest {
  id: string;
  userId: Ref<User>;
  /** Populated convenience alias */
  user?: User;
  propertyId: Ref<Property>;
  /** Populated convenience alias */
  property?: Property;
  unitId?: Ref<Unit>;
  /** Populated convenience alias */
  unit?: Unit;
  
  requestedDate: string;
  requestedTime: string;
  scheduledDate?: string;
  scheduledTime?: string;
  
  purpose: VisitPurpose;
  status: VisitStatus;
  
  assignedStaffId?: Ref<User>;
  /** Populated convenience alias */
  assignedStaff?: User;
  notes?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
