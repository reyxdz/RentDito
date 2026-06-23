import { apiClient } from '../api/apiClient';

export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class NotificationService {
  static async getNotifications(limit = 50): Promise<ApiNotification[]> {
    const response = await apiClient.get('/api/notifications', { params: { limit } });
    return response.data.data;
  }

  static async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/api/notifications/unread-count');
    return response.data.data.count;
  }

  static async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${id}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    await apiClient.patch('/api/notifications/read-all');
  }
}
