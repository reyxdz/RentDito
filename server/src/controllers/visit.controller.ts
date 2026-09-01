import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as visitService from '../services/visit.service';

/**
 * POST /api/visits - Create visit request
 */
export const createVisitRequest = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.createVisitRequest(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Visit request submitted successfully',
      data: visit
    });
});

/**
 * GET /api/visits/my - Get user's own visit requests
 */
export const getMyVisits = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visits = await visitService.getMyVisits(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: visits
    });
});

/**
 * GET /api/visits/property/:propertyId - Get visits for a property
 */
export const getPropertyVisits = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string
    };

    const visits = await visitService.getPropertyVisits(
      req.user!.id,
      req.params.propertyId as string,
      filters
    );

    res.status(200).json({
      status: 'success',
      data: visits
    });
});

/**
 * PATCH /api/visits/:id/approve - Approve visit request
 */
export const approveVisit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.approveVisit(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Visit request approved',
      data: visit
    });
});

/**
 * PATCH /api/visits/:id/schedule - Schedule visit
 */
export const scheduleVisit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.scheduleVisit(req.user!.id, req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Visit scheduled successfully',
      data: visit
    });
});

/**
 * PATCH /api/visits/:id/assign - Assign staff to visit
 */
export const assignStaff = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.assignStaff(req.user!.id, req.params.id as string, req.body.staffId);

    res.status(200).json({
      status: 'success',
      message: 'Staff assigned successfully',
      data: visit
    });
});

/**
 * PATCH /api/visits/:id/complete - Mark visit as completed
 */
export const completeVisit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.completeVisit(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Visit marked as completed',
      data: visit
    });
});

/**
 * PATCH /api/visits/:id/cancel - Cancel visit
 */
export const cancelVisit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.cancelVisit(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Visit cancelled',
      data: visit
    });
});

/**
 * PATCH /api/visits/:id/no-show - Mark visit as no-show
 */
export const markNoShow = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const visit = await visitService.markNoShow(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Visit marked as no-show',
      data: visit
    });
});
