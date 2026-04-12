import { Tenancy } from './Tenancy';
import { User } from './User';

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketUpdate {
  userId: string;
  user?: User;
  message: string;
  timestamp: string | Date;
}

export interface Ticket {
  id: string;
  tenancyId: string;
  tenancy?: Tenancy;
  propertyId: string;
  unitId: string;
  
  reportedByUserId: string;
  reportedByUser?: User;
  
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  images: string[];
  
  status: TicketStatus;
  
  assignedToUserId?: string;
  assignedToUser?: User;
  assignedByUserId?: string;
  assignedByUser?: User;
  
  updates: TicketUpdate[];
  resolutionNotes?: string;
  resolvedAt?: string | Date;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
