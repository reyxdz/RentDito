import { Inquiry } from './Inquiry';
import { User } from './User';

export interface Conversation {
  id: string;
  inquiryId: string;
  inquiry?: Inquiry;
  participants: string[];
  participantsData?: User[];
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
