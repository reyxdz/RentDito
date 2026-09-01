import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as applicationService from '../services/application.service';

/**
 * POST /api/applications - Create rental application
 */
export const createApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const application = await applicationService.createApplication(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: application
    });
});

/**
 * GET /api/applications/my - Get user's own applications
 */
export const getMyApplications = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const applications = await applicationService.getMyApplications(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: applications
    });
});

/**
 * GET /api/applications - Get applications for properties (landlord/staff)
 */
export const getApplications = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const applications = await applicationService.getApplications(req.user!.id, filters);

    res.status(200).json({
      status: 'success',
      data: applications
    });
});

/**
 * GET /api/applications/:id - Get application by ID
 */
export const getApplicationById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const application = await applicationService.getApplicationById(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: application
    });
});

/**
 * PATCH /api/applications/:id/review - Set application to under_review
 */
export const reviewApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const application = await applicationService.reviewApplication(
      req.user!.id,
      req.params.id as string,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application set to under review',
      data: application
    });
});

/**
 * PATCH /api/applications/:id/approve - Approve application
 */
export const approveApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const application = await applicationService.approveApplication(
      req.user!.id,
      req.params.id as string,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application approved',
      data: application
    });
});

/**
 * PATCH /api/applications/:id/reject - Reject application
 */
export const rejectApplication = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const application = await applicationService.rejectApplication(
      req.user!.id,
      req.params.id as string,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application rejected',
      data: application
    });
});
