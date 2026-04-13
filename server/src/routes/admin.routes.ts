import { Router } from 'express';
import auth from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/admin/verifications - Get pending verifications
router.get('/verifications', adminController.getPendingVerifications);

// GET /api/admin/verifications/all - Get all verifications (with filter)
router.get('/verifications/all', adminController.getAllVerifications);

// PATCH /api/admin/verifications/:userId/approve - Approve verification
router.patch('/verifications/:userId/approve', adminController.approveVerification);

// PATCH /api/admin/verifications/:userId/reject - Reject verification
router.patch('/verifications/:userId/reject', adminController.rejectVerification);

export default router;
