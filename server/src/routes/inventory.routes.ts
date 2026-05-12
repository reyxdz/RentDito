import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import { requirePermission } from '../middleware/rbac';
import * as inventoryController from '../controllers/inventory.controller';
import * as inventoryValidator from '../validators/inventory.validator';

const router = Router();

router.use(auth);

// GET /api/inventory - Inventory items for landlord/staff/super_admin
router.get('/', requirePermission('inventory'), inventoryController.getInventoryItems);

// POST /api/inventory - Add inventory item
router.post(
  '/',
  requirePermission('inventory'),
  validate(inventoryValidator.createInventoryItemSchema),
  inventoryController.createInventoryItem
);

// PATCH /api/inventory/:id - Update inventory item
router.patch(
  '/:id',
  requirePermission('inventory'),
  validate(inventoryValidator.updateInventoryItemSchema),
  inventoryController.updateInventoryItem
);

// POST /api/inventory/:id/issue - Issue item to a checked-in tenancy
router.post(
  '/:id/issue',
  requirePermission('inventory'),
  validate(inventoryValidator.issueInventoryItemSchema),
  inventoryController.issueInventoryItem
);

// POST /api/inventory/:id/return - Mark issued item as returned/lost
router.post(
  '/:id/return',
  requirePermission('inventory'),
  validate(inventoryValidator.returnInventoryItemSchema),
  inventoryController.returnInventoryItem
);

// POST /api/inventory/records/:id/damage - Report damaged/lost with penalty
router.post(
  '/records/:id/damage',
  requirePermission('inventory'),
  validate(inventoryValidator.reportDamageSchema),
  inventoryController.reportRecordDamage
);

// GET /api/inventory/records - Inventory records (user sees own tenancy records only)
router.get('/records', inventoryController.getInventoryRecords);

// GET /api/inventory/records/tenancy/:id - Inventory records for a tenancy
router.get('/records/tenancy/:id', inventoryController.getInventoryRecordsByTenancy);

// GET /api/inventory/reports/monthly - Monthly accountability report
router.get('/reports/monthly', requirePermission('inventory'), inventoryController.getMonthlyReport);

export default router;
