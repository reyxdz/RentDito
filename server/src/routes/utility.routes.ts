import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import { requirePermission } from '../middleware/rbac';
import * as utilityController from '../controllers/utility.controller';
import * as utilityValidator from '../validators/utility.validator';

const router = Router();

router.use(auth);
router.use(requirePermission('utilities'));

router.get('/consumption', utilityController.getConsumption);
router.get('/highest-usage', utilityController.getHighestUsage);
router.get('/overconsumption', utilityController.getOverconsumption);
router.get('/expense-summary', utilityController.getExpenseSummary);
router.get('/units', utilityController.getUnits);

router.post(
  '/readings',
  validate(utilityValidator.submitReadingsSchema),
  utilityController.postReadings
);

export default router;
