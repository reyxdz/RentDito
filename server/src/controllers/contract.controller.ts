import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as contractService from '../services/contract.service';

/**
 * POST /api/contracts/create-from-application - Create contract from application
 */
export const createFromApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const contract = await contractService.createFromApplication(
      req.user!.pgId,
      req.body.applicationId
    );

    res.status(201).json({
      status: 'success',
      message: 'Contract created successfully',
      data: contract
    });
});

/**
 * GET /api/contracts/my - Get user's contracts
 */
export const getMyContracts = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const contracts = await contractService.getMyContracts(req.user!.pgId);

    res.status(200).json({
      status: 'success',
      data: contracts
    });
});

/**
 * GET /api/contracts - Get contracts (landlord/staff)
 */
export const getContracts = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const contracts = await contractService.getContracts(req.user!.pgId, filters);

    res.status(200).json({
      status: 'success',
      data: contracts
    });
});

/**
 * GET /api/contracts/:id - Get contract by ID
 */
export const getContractById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const contract = await contractService.getContractById(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: contract
    });
});

/**
 * PATCH /api/contracts/:id - Update contract (draft only)
 */
export const updateContract = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const contract = await contractService.updateContract(req.user!.pgId, req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Contract updated successfully',
      data: contract
    });
});

/**
 * POST /api/contracts/:id/sign - Add signature to contract
 */
export const signContract = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { signatureData, role } = req.body;
    const contract = await contractService.addSignature(
      req.user!.pgId,
      req.params.id as string,
      signatureData,
      role
    );

    res.status(200).json({
      status: 'success',
      message: 'Signature added successfully',
      data: contract
    });
});

/**
 * PATCH /api/contracts/:id/status - Update contract status
 */
export const updateStatus = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const contract = await contractService.updateStatus(
      req.user!.pgId,
      req.params.id as string,
      req.body.status
    );

    res.status(200).json({
      status: 'success',
      message: 'Contract status updated',
      data: contract
    });
});

/**
 * POST /api/contracts/:id/generate-pdf - Generate PDF for contract
 */
export const generatePDF = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await contractService.generatePDF(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'PDF generated successfully',
      data: result
    });
});

/**
 * GET /api/contracts/:id/download - Get download URL
 */
export const getDownloadUrl = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await contractService.getDownloadUrl(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: result
    });
});
