import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as transferService from '../services/transfer.service';

/**
 * POST /api/transfers - Initiate transfer request
 */
export const createTransferRequest = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const transferRequest = await transferService.createTransferRequest(req.user!.pgId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Transfer request submitted successfully.',
      data: transferRequest
    });
});

/**
 * GET /api/transfers/my - Tenant transfer requests
 */
export const getMyTransferRequests = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const transferRequests = await transferService.getMyTransferRequests(req.user!.pgId);
    res.status(200).json({ status: 'success', data: transferRequests });
});

/**
 * GET /api/transfers - Landlord/staff transfer requests
 */
export const getTransferRequests = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const transferRequests = await transferService.getTransferRequests(req.user!.pgId, {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    });
    res.status(200).json({ status: 'success', data: transferRequests });
});

/**
 * PATCH /api/transfers/:id/approve - Approve request
 */
export const approveTransferRequest = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const transferRequest = await transferService.approveTransferRequest(
      req.user!.pgId,
      req.params.id as string,
      req.body.reviewNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Transfer request approved.',
      data: transferRequest
    });
});

/**
 * PATCH /api/transfers/:id/reject - Reject request
 */
export const rejectTransferRequest = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const transferRequest = await transferService.rejectTransferRequest(
      req.user!.pgId,
      req.params.id as string,
      req.body.reviewNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Transfer request rejected.',
      data: transferRequest
    });
});

/**
 * POST /api/transfers/:id/complete - Execute transfer
 */
export const completeTransferRequest = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await transferService.completeTransferRequest(req.user!.pgId, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Transfer completed successfully.',
      data: result
    });
});
