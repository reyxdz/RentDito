import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as contractController from '../controllers/contract.controller';
import * as contractValidator from '../validators/contract.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/contracts/create-from-application - Create contract from approved application
router.post(
  '/create-from-application',
  validate(contractValidator.createFromApplicationSchema),
  contractController.createFromApplication
);

// GET /api/contracts/my - Get user's own contracts
router.get('/my', contractController.getMyContracts);

// GET /api/contracts - Get contracts (landlord/staff)
router.get('/', contractController.getContracts);

// GET /api/contracts/:id - Get contract by ID
router.get('/:id', contractController.getContractById);

// PATCH /api/contracts/:id - Update contract (draft only)
router.patch(
  '/:id',
  validate(contractValidator.updateContractSchema),
  contractController.updateContract
);

// POST /api/contracts/:id/sign - Add signature to contract
router.post(
  '/:id/sign',
  validate(contractValidator.signContractSchema),
  contractController.signContract
);

// PATCH /api/contracts/:id/status - Update contract status
router.patch(
  '/:id/status',
  validate(contractValidator.updateStatusSchema),
  contractController.updateStatus
);

// POST /api/contracts/:id/generate-pdf - Generate PDF for contract
router.post('/:id/generate-pdf', contractController.generatePDF);

// GET /api/contracts/:id/download - Get download URL
router.get('/:id/download', contractController.getDownloadUrl);

export default router;
