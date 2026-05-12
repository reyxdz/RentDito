import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as transferService from '../services/transfer.service';

/**
 * POST /api/transfers - Initiate transfer request
 */
export const createTransferRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transferRequest = await transferService.createTransferRequest(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Transfer request submitted successfully.',
      data: transferRequest
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/transfers/my - Tenant transfer requests
 */
export const getMyTransferRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transferRequests = await transferService.getMyTransferRequests(req.user!.id);
    res.status(200).json({ status: 'success', data: transferRequests });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/transfers - Landlord/staff transfer requests
 */
export const getTransferRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transferRequests = await transferService.getTransferRequests(req.user!.id, {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    });
    res.status(200).json({ status: 'success', data: transferRequests });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/transfers/:id/approve - Approve request
 */
export const approveTransferRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transferRequest = await transferService.approveTransferRequest(
      req.user!.id,
      req.params.id as string,
      req.body.reviewNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Transfer request approved.',
      data: transferRequest
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/transfers/:id/reject - Reject request
 */
export const rejectTransferRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transferRequest = await transferService.rejectTransferRequest(
      req.user!.id,
      req.params.id as string,
      req.body.reviewNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Transfer request rejected.',
      data: transferRequest
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/transfers/:id/complete - Execute transfer
 */
export const completeTransferRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await transferService.completeTransferRequest(req.user!.id, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Transfer completed successfully.',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
