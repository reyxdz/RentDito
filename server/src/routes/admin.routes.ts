import { Router } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All routes require authentication + super_admin role
router.use(auth);
router.use(requireRole('super_admin'));

// ── Platform KPIs ───────────────────────────────────────────
// GET /api/admin/stats - Platform overview KPIs
router.get('/stats', adminController.getPlatformStats);

// ── User Management ─────────────────────────────────────────
// GET /api/admin/users - Get all users (filterable by role, status, search)
router.get('/users', adminController.getUsers);

// PATCH /api/admin/users/:id/status - Suspend or activate a user
router.patch('/users/:id/status', adminController.updateUserStatus);

// ── Activity / Audit Log ────────────────────────────────────
// GET /api/admin/activity - Get audit log (filterable by action, resourceType, userId)
router.get('/activity', adminController.getActivityLog);

// ── Verifications (existing) ────────────────────────────────
// GET /api/admin/verifications - Get pending verifications
router.get('/verifications', adminController.getPendingVerifications);

// GET /api/admin/verifications/all - Get all verifications (with filter)
router.get('/verifications/all', adminController.getAllVerifications);

// PATCH /api/admin/verifications/:userId/approve - Approve verification
router.patch('/verifications/:userId/approve', adminController.approveVerification);

// PATCH /api/admin/verifications/:userId/reject - Reject verification
router.patch('/verifications/:userId/reject', adminController.rejectVerification);

export default router;
