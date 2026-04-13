import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as applicationController from '../controllers/application.controller';
import * as applicationValidator from '../validators/application.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/applications - Create rental application (user, verified)
router.post(
  '/',
  validate(applicationValidator.createApplicationSchema),
  applicationController.createApplication
);

// GET /api/applications/my - Get user's own applications
router.get('/my', applicationController.getMyApplications);

// GET /api/applications - Get applications for properties (landlord/staff)
router.get('/', applicationController.getApplications);

// GET /api/applications/:id - Get application by ID
router.get('/:id', applicationController.getApplicationById);

// PATCH /api/applications/:id/review - Set application to under_review
router.patch(
  '/:id/review',
  validate(applicationValidator.reviewApplicationSchema),
  applicationController.reviewApplication
);

// PATCH /api/applications/:id/approve - Approve application
router.patch(
  '/:id/approve',
  validate(applicationValidator.approveApplicationSchema),
  applicationController.approveApplication
);

// PATCH /api/applications/:id/reject - Reject application
router.patch(
  '/:id/reject',
  validate(applicationValidator.rejectApplicationSchema),
  applicationController.rejectApplication
);

export default router;
