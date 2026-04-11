import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as landlordApplicationService from '../services/landlord-application.service';

/**
 * POST /api/landlord-applications — Submit application
 */
export const apply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await landlordApplicationService.apply(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Landlord application submitted successfully.',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * GET /api/landlord-applications/me — Get my application
 */
export const getMyApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await landlordApplicationService.getMyApplication(req.user!.id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * GET /api/landlord-applications — Get all applications (admin)
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const result = await landlordApplicationService.getAll(status);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * PATCH /api/landlord-applications/:id/approve
 */
export const approve = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await landlordApplicationService.approve(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: 'success',
      message: 'Application approved. User has been promoted to landlord.',
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * PATCH /api/landlord-applications/:id/reject
 */
export const reject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};
