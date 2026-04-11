import { Router } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as controller from '../controllers/team.controller';

const router = Router();

// All routes require auth + landlord role
router.use(auth);
router.use(requireRole('landlord'));

router.get('/', controller.getStaff);
router.post('/', controller.inviteStaff);
router.patch('/:id/permissions', controller.updatePermissions);
router.patch('/:id/properties', controller.updateProperties);
router.delete('/:id', controller.removeStaff);

export default router;
