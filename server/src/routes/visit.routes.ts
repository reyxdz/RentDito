import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as visitController from '../controllers/visit.controller';
import * as visitValidator from '../validators/visit.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/visits - Create visit request (user, verified)
router.post(
  '/',
  validate(visitValidator.createVisitRequestSchema),
  visitController.createVisitRequest
);

// GET /api/visits/my - Get user's own visit requests
router.get('/my', visitController.getMyVisits);

// GET /api/visits/property/:propertyId - Get visits for a property (landlord/staff)
router.get('/property/:propertyId', visitController.getPropertyVisits);

// PATCH /api/visits/:id/approve - Approve visit request
router.patch('/:id/approve', visitController.approveVisit);

// PATCH /api/visits/:id/schedule - Schedule visit (set date/time)
router.patch(
  '/:id/schedule',
  validate(visitValidator.scheduleVisitSchema),
  visitController.scheduleVisit
);

// PATCH /api/visits/:id/assign - Assign staff to visit
router.patch(
  '/:id/assign',
  validate(visitValidator.assignStaffSchema),
  visitController.assignStaff
);

// PATCH /api/visits/:id/complete - Mark visit as completed
router.patch('/:id/complete', visitController.completeVisit);

// PATCH /api/visits/:id/cancel - Cancel visit
router.patch('/:id/cancel', visitController.cancelVisit);

// PATCH /api/visits/:id/no-show - Mark visit as no-show
router.patch('/:id/no-show', visitController.markNoShow);

export default router;
