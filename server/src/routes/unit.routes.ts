import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as unitController from '../controllers/unit.controller';
import * as unitValidator from '../validators/unit.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/units - Get all units with filters
router.get('/', unitController.getUnits);

// GET /api/units/:id - Get single unit
router.get('/:id', unitController.getUnitById);

// GET /api/units/property/:propertyId/units - Get units by property
router.get('/property/:propertyId/units', unitController.getUnitsByProperty);

// POST /api/units - Create new unit
router.post('/', validate(unitValidator.createUnitSchema), unitController.createUnit);

// PATCH /api/units/:id - Update unit
router.patch('/:id', validate(unitValidator.updateUnitSchema), unitController.updateUnit);

// PATCH /api/units/:id/status - Update unit status
router.patch('/:id/status', validate(unitValidator.updateStatusSchema), unitController.updateUnitStatus);

// POST /api/units/:id/images - Upload unit images
router.post('/:id/images', validate(unitValidator.uploadImagesSchema), unitController.uploadUnitImages);

// DELETE /api/units/:id - Delete unit
router.delete('/:id', unitController.deleteUnit);

export default router;
