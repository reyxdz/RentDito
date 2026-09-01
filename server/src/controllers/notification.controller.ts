import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as notificationService from '../services/notification.service';

export const getNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await notificationService.getNotifications(req.user!.id, limit);

    res.status(200).json({
      status: 'success',
      data: notifications,
    });
});

export const getUnreadCount = catchAsync(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.status(200).json({ status: 'success', data: { count } });
});

export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const notification = await notificationService.markAsRead(req.user!.id, id as string);

    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    res.status(200).json({ status: 'success', data: notification });
});

export const markAllAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
    await notificationService.markAllAsRead(req.user!.id);

    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
});
