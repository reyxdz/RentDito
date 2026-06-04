import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as billingController from '../controllers/billing.controller';
import * as billingValidator from '../validators/billing.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/billing - Get bills (landlord/staff: scoped by property, user: own tenancy bills)
router.get('/', billingController.getBills);

// GET /api/billing/tenancy/:id - Get bills for a specific tenancy
router.get('/tenancy/:id', billingController.getBillsByTenancy);

// POST /api/billing - Create manual bill
router.post(
  '/',
  validate(billingValidator.createManualBillSchema),
  billingController.createManualBill
);

// POST /api/billing/utility - Create utility bill from readings/breakdown
router.post(
  '/utility',
  validate(billingValidator.createUtilityBillSchema),
  billingController.createUtilityBill
);

// POST /api/billing/combined - Create combined rent + utility bill
router.post(
  '/combined',
  validate(billingValidator.createCombinedBillSchema),
  billingController.createCombinedBill
);

// POST /api/billing/auto-generate - Auto-generate monthly bills for all active tenancies
router.post(
  '/auto-generate',
  validate(billingValidator.autoGenerateSchema),
  billingController.autoGenerateBills
);

// GET /api/billing/:id - Get bill by ID (with payments)
router.get('/:id', billingController.getBillById);

// PATCH /api/billing/:id - Update bill amounts/readings
router.patch(
  '/:id',
  validate(billingValidator.updateBillSchema),
  billingController.updateBill
);

// POST /api/billing/:id/record-payment - Record a payment
router.post(
  '/:id/record-payment',
  validate(billingValidator.recordPaymentSchema),
  billingController.recordPayment
);

// POST /api/billing/:id/apply-late-fee - Apply late fee to overdue bill
router.post('/:id/apply-late-fee', billingController.applyLateFee);

// GET /api/billing/:id/receipt - Generate receipt PDF
router.get('/:id/receipt', billingController.generateReceipt);

export default router;
