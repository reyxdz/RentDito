import { Router } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as controller from '../controllers/landlord-application.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// User routes
router.post('/', requireRole('user'), controller.apply);
router.get('/me', requireRole('user', 'landlord'), controller.getMyApplication);

// Admin-only routes
router.get('/', requireRole('super_admin'), controller.getAll);
router.patch('/:id/approve', requireRole('super_admin'), controller.approve);
router.patch('/:id/reject', requireRole('super_admin'), controller.reject);

export default router;
