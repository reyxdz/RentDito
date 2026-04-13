import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as inquiryController from '../controllers/inquiry.controller';
import * as inquiryValidator from '../validators/inquiry.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/inquiries - Create inquiry (user, must be verified)
router.post(
  '/',
  validate(inquiryValidator.createInquirySchema),
  inquiryController.createInquiry
);

// GET /api/inquiries/my - Get user's own inquiries
router.get('/my', inquiryController.getMyInquiries);

// GET /api/inquiries/property/:propertyId - Get inquiries for a property (landlord/staff)
router.get('/property/:propertyId', inquiryController.getPropertyInquiries);

// GET /api/inquiries/:id - Get inquiry detail with conversation
router.get('/:id', inquiryController.getInquiryById);

// PATCH /api/inquiries/:id/status - Update inquiry status (close/convert)
router.patch(
  '/:id/status',
  validate(inquiryValidator.updateInquiryStatusSchema),
  inquiryController.updateInquiryStatus
);

export default router;
