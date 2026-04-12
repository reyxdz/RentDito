export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
