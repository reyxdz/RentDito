import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as contractService from '../services/contract.service';

/**
 * POST /api/contracts/create-from-application - Create contract from application
 */
export const createFromApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await contractService.createFromApplication(
      req.user!.id,
      req.body.applicationId
    );

    res.status(201).json({
      status: 'success',
      message: 'Contract created successfully',
      data: contract
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/contracts/my - Get user's contracts
 */
export const getMyContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contracts = await contractService.getMyContracts(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: contracts
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/contracts - Get contracts (landlord/staff)
 */
export const getContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const contracts = await contractService.getContracts(req.user!.id, filters);

    res.status(200).json({
      status: 'success',
      data: contracts
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/contracts/:id - Get contract by ID
 */
export const getContractById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await contractService.getContractById(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: contract
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/contracts/:id - Update contract (draft only)
 */
export const updateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await contractService.updateContract(req.user!.id, req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Contract updated successfully',
      data: contract
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * POST /api/contracts/:id/sign - Add signature to contract
 */
export const signContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { signatureData, role } = req.body;
    const contract = await contractService.addSignature(
      req.user!.id,
      req.params.id as string,
      signatureData,
      role
    );

    res.status(200).json({
      status: 'success',
      message: 'Signature added successfully',
      data: contract
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/contracts/:id/status - Update contract status
 */
export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await contractService.updateStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );

    res.status(200).json({
      status: 'success',
      message: 'Contract status updated',
      data: contract
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * POST /api/contracts/:id/generate-pdf - Generate PDF for contract
 */
export const generatePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await contractService.generatePDF(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'PDF generated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/contracts/:id/download - Get download URL
 */
export const getDownloadUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await contractService.getDownloadUrl(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
