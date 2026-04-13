import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

// No authentication required for public routes

// GET /api/public/listings - Get all active properties
router.get('/listings', publicController.getPublicListings);

// GET /api/public/listings/:id - Get single property with units
router.get('/listings/:id', publicController.getPublicPropertyById);

// GET /api/public/listings/unit/:id - Get single unit detail
router.get('/listings/unit/:id', publicController.getPublicUnitById);

export default router;
