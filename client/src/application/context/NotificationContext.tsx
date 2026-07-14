import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { NotificationService } from '../../infrastructure/services/NotificationService';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  showNotification: (message: string, severity?: 'info' | 'success' | 'warning' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);
  const toastTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup toast timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [data, count] = await Promise.all([
        NotificationService.getNotifications(50),
        NotificationService.getUnreadCount()
      ]);
      setNotifications(data as Notification[]);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!isAuthenticated) return;
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const showNotification = (message: string, severity: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const toast: Notification = {
      id: `toast-${Date.now()}`,
      title: severity.charAt(0).toUpperCase() + severity.slice(1),
      message,
      read: false,
      createdAt: new Date().toISOString(),
      type: severity,
    };
    setToastNotifications((prev) => [...prev, toast]);
    // Auto-remove after 5 seconds (tracked for cleanup)
    const timeoutId = setTimeout(() => {
      setToastNotifications((prev) => prev.filter((n) => n.id !== toast.id));
    }, 5000);
    toastTimeouts.current.push(timeoutId);
  };

  // Merge persistent and toast notifications for consumers
  const allNotifications = [...notifications, ...toastNotifications];

  return (
    <NotificationContext.Provider
      value={{ notifications: allNotifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, showNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
