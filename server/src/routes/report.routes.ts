import { Router } from 'express';
import auth from '../middleware/auth';
import * as reportController from '../controllers/report.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/reports/occupancy
router.get('/occupancy', reportController.getOccupancy);

// GET /api/reports/checkout-forecast
router.get('/checkout-forecast', reportController.getCheckoutForecast);

export default router;
