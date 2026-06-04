import { Router } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { uploadDocumentSingle } from '../middleware/upload';
import * as documentController from '../controllers/document.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(auth);

// We require at least landlord or staff role for document management in the hub
router.use(requireRole('landlord', 'staff'));

// Routes
router.get('/', documentController.getDocuments);
router.post('/', ...uploadDocumentSingle('file', 'documents'), documentController.createDocument);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);

export default router;
