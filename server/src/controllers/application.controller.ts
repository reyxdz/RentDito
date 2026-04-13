import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as applicationService from '../services/application.service';

/**
 * POST /api/applications - Create rental application
 */
export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await applicationService.createApplication(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/applications/my - Get user's own applications
 */
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applications = await applicationService.getMyApplications(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: applications
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/applications - Get applications for properties (landlord/staff)
 */
export const getApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const applications = await applicationService.getApplications(req.user!.id, filters);

    res.status(200).json({
      status: 'success',
      data: applications
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/applications/:id - Get application by ID
 */
export const getApplicationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await applicationService.getApplicationById(req.user!.id, req.params.id);

    res.status(200).json({
      status: 'success',
      data: application
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/applications/:id/review - Set application to under_review
 */
export const reviewApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await applicationService.reviewApplication(
      req.user!.id,
      req.params.id,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application set to under review',
      data: application
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/applications/:id/approve - Approve application
 */
export const approveApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await applicationService.approveApplication(
      req.user!.id,
      req.params.id,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application approved',
      data: application
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/applications/:id/reject - Reject application
 */
export const rejectApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await applicationService.rejectApplication(
      req.user!.id,
      req.params.id,
      req.body.reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Application rejected',
      data: application
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
