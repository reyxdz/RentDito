import { Router } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as securityController from '../controllers/security.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(auth);

// We require at least landlord or staff role for security management in the hub
router.use(requireRole('landlord', 'staff'));

// Incident Reports
router.get('/incidents', securityController.getIncidentReports);
router.post('/incidents', securityController.createIncidentReport);
router.get('/incidents/:id', securityController.getIncidentReport);
router.patch('/incidents/:id', securityController.updateIncidentReport);
router.delete('/incidents/:id', securityController.deleteIncidentReport);

// Emergency Contacts
router.get('/contacts/:propertyId', securityController.getEmergencyContacts);
router.put('/contacts/:propertyId', securityController.updateEmergencyContacts);

export default router;
