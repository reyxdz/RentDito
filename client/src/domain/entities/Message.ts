export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: string[];
  readBy: string[];
  
  /** Populated sender name (set by API when populated) */
  senderName?: string;
  /** Populated sender avatar URL */
  senderAvatar?: string;
  /** Alias for createdAt, used by some components */
  timestamp?: string | Date;

  createdAt: string | Date;
  updatedAt: string | Date;
}
