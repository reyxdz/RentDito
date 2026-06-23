import { Router } from 'express';
import auth from '../middleware/auth';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/notifications — list notifications for the logged-in user
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read — mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
