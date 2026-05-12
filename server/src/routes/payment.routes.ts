import { Router } from 'express';
import auth from '../middleware/auth';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/payments - Get all payments (filterable by tenancyId, method)
router.get('/', paymentController.getPayments);

// GET /api/payments/tenancy/:id - Get payment history for a tenancy
router.get('/tenancy/:id', paymentController.getPaymentsByTenancy);

export default router;
