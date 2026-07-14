import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as tenancyController from '../controllers/tenancy.controller';
import * as tenancyValidator from '../validators/tenancy.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/tenancies/confirm-checkin - Confirm check-in from signed contract
router.post(
  '/confirm-checkin',
  validate(tenancyValidator.confirmCheckinSchema),
  tenancyController.confirmCheckin
);

// GET /api/tenancies/my - Get current user's tenancies
router.get('/my', tenancyController.getMyTenancies);

// GET /api/tenancies - Get tenancies (landlord/staff)
router.get('/', tenancyController.getTenancies);

// GET /api/tenancies/:id/checkout-review - Pre-checkout review
router.get('/:id/checkout-review', tenancyController.getCheckoutReview);

// GET /api/tenancies/:id - Get tenancy by ID
router.get('/:id', tenancyController.getTenancyById);

// PATCH /api/tenancies/:id/checkout - Initiate checkout
router.patch('/:id/checkout', tenancyController.initiateCheckout);

// POST /api/tenancies/:id/comments - Add a comment to a tenancy
router.post('/:id/comments', tenancyController.addComment);

// GET /api/tenancies/:id/comments - Get comments for a tenancy
router.get('/:id/comments', tenancyController.getComments);

// GET /api/tenancies/:id/roommates - Get roommates for a tenancy
router.get('/:id/roommates', tenancyController.getRoommates);

export default router;
