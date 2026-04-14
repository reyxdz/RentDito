import { Router } from 'express';
import auth from '../middleware/auth';
import * as propertyController from '../controllers/property.controller';
import validate from '../middleware/validate';
import { uploadMultiple } from '../middleware/upload';
import {
  createPropertySchema,
  updatePropertySchema,
  updateStatusSchema,
} from '../validators/property.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/properties - List properties (auto-scoped by role)
router.get('/', propertyController.getProperties);

// GET /api/properties/:id - Get single property
router.get('/:id', propertyController.getPropertyById);

// POST /api/properties - Create property (landlord only)
router.post(
  '/',
  validate(createPropertySchema),
  propertyController.createProperty
);

// PATCH /api/properties/:id - Update property
router.patch(
  '/:id',
  validate(updatePropertySchema),
  propertyController.updateProperty
);

// PATCH /api/properties/:id/status - Update property status
router.patch(
  '/:id/status',
  validate(updateStatusSchema),
  propertyController.updatePropertyStatus
);

// DELETE /api/properties/:id - Soft delete (archive) property
router.delete('/:id', propertyController.deleteProperty);

// POST /api/properties/:id/images - Upload property images
router.post(
  '/:id/images',
  ...uploadMultiple('images', 'properties'),
  propertyController.uploadPropertyImages
);

export default router;
