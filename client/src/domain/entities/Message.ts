export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: string[];
  readBy: string[];
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
