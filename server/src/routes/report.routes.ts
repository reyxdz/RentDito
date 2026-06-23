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

// GET /api/reports/vacancy-forecast
router.get('/vacancy-forecast', reportController.getVacancyForecast);

// GET /api/reports/reservation-forecast
router.get('/reservation-forecast', reportController.getReservationForecast);

export default router;
