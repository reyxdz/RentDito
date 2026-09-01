import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as landlordApplicationService from '../services/landlord-application.service';

/**
 * POST /api/landlord-applications — Submit application
 */
export const apply = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await landlordApplicationService.apply(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Landlord application submitted successfully.',
      data: result,
    });
});

/**
 * GET /api/landlord-applications/me — Get my application
 */
export const getMyApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await landlordApplicationService.getMyApplication(req.user!.id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
});

/**
 * GET /api/landlord-applications — Get all applications (admin)
 */
export const getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const result = await landlordApplicationService.getAll(status);
    res.status(200).json({
      status: 'success',
      data: result,
    });
});

/**
 * PATCH /api/landlord-applications/:id/approve
 */
export const approve = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await landlordApplicationService.approve(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: 'success',
      message: 'Application approved. User has been promoted to landlord.',
      data: result,
    });
});

/**
 * PATCH /api/landlord-applications/:id/reject
 */
export const reject = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await landlordApplicationService.reject(
      req.params.id as string,
      req.user!.id,
      req.body.reviewNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Application rejected.',
      data: result,
    });
});
