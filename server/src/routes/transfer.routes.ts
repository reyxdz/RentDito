import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as transferController from '../controllers/transfer.controller';
import * as transferValidator from '../validators/transfer.validator';

const router = Router();

router.use(auth);

// POST /api/transfers - Tenant or landlord initiates transfer
router.post(
  '/',
  validate(transferValidator.createTransferRequestSchema),
  transferController.createTransferRequest
);

// GET /api/transfers/my - Tenant's own transfer requests
router.get('/my', transferController.getMyTransferRequests);

// GET /api/transfers - Landlord/staff transfer queue
router.get('/', transferController.getTransferRequests);

// PATCH /api/transfers/:id/approve - Approve transfer request
router.patch(
  '/:id/approve',
  validate(transferValidator.reviewTransferRequestSchema),
  transferController.approveTransferRequest
);

// PATCH /api/transfers/:id/reject - Reject transfer request
router.patch(
  '/:id/reject',
  validate(transferValidator.reviewTransferRequestSchema),
  transferController.rejectTransferRequest
);

// POST /api/transfers/:id/complete - Execute transfer
router.post('/:id/complete', transferController.completeTransferRequest);

export default router;
