import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import { Notification } from '../models/Notification';

export const getNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      status: 'success',
      data: notifications.map(n => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        read: n.isRead,
        metadata: n.metadata,
        createdAt: n.createdAt
      }))
    });
});

export const getUnreadCount = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const count = await Notification.countDocuments({ userId, isRead: false });
    res.status(200).json({ status: 'success', data: { count } });
});

export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    res.status(200).json({ status: 'success', data: notification });
});

export const markAllAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
});
