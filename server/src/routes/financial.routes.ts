import { Router } from 'express';
import auth from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as financialController from '../controllers/financial.controller';

const router = Router();

router.use(auth);
router.use(requirePermission('financials'));

// GET /api/financials/summary
router.get('/summary', financialController.getSummary);

// GET /api/financials/monthly
router.get('/monthly', financialController.getMonthly);

// GET /api/financials/by-property
router.get('/by-property', financialController.getByProperty);

export default router;
