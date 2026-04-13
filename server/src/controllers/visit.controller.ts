import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as visitService from '../services/visit.service';

/**
 * POST /api/visits - Create visit request
 */
export const createVisitRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.createVisitRequest(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Visit request submitted successfully',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/visits/my - Get user's own visit requests
 */
export const getMyVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visits = await visitService.getMyVisits(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: visits
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/visits/property/:propertyId - Get visits for a property
 */
export const getPropertyVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string
    };

    const visits = await visitService.getPropertyVisits(
      req.user!.id,
      req.params.propertyId,
      filters
    );

    res.status(200).json({
      status: 'success',
      data: visits
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/approve - Approve visit request
 */
export const approveVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.approveVisit(req.user!.id, req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Visit request approved',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/schedule - Schedule visit
 */
export const scheduleVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.scheduleVisit(req.user!.id, req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Visit scheduled successfully',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/assign - Assign staff to visit
 */
export const assignStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.assignStaff(req.user!.id, req.params.id, req.body.staffId);

    res.status(200).json({
      status: 'success',
      message: 'Staff assigned successfully',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/complete - Mark visit as completed
 */
export const completeVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.completeVisit(req.user!.id, req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Visit marked as completed',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/cancel - Cancel visit
 */
export const cancelVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.cancelVisit(req.user!.id, req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Visit cancelled',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/visits/:id/no-show - Mark visit as no-show
 */
export const markNoShow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visit = await visitService.markNoShow(req.user!.id, req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Visit marked as no-show',
      data: visit
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
