import type { User } from './User';

export type ApplicationReviewStatus = 'pending' | 'approved' | 'rejected';

export interface LandlordApplication {
  id: string;
  userId: string;
  user?: User;
  
  businessName: string;
  businessType: string;
  documents: string[];
  
  status: ApplicationReviewStatus;
  
  reviewedBy?: string;
  reviewer?: User;
  reviewedAt?: string | Date;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
