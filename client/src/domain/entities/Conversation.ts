import type {  Inquiry  } from './Inquiry';
import type {  User  } from './User';

export interface Conversation {
  id: string;
  inquiryId: string;
  inquiry?: Inquiry;
  participants: string[];
  participantsData?: User[];
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
