import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as teamService from '../services/team.service';

/**
 * GET /api/team — Get all staff for the current landlord
 */
export const getStaff = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await teamService.getStaff(req.user!.id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
});

/**
 * POST /api/team — Invite a new staff member
 */
export const inviteStaff = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await teamService.inviteStaff(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Staff member invited successfully.',
      data: result,
    });
});

/**
 * PATCH /api/team/:id/permissions — Update staff permissions
 */
export const updatePermissions = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await teamService.updatePermissions(
      req.params.id as string,
      req.user!.id,
      req.body.permissions
    );
    res.status(200).json({
      status: 'success',
      message: 'Permissions updated.',
      data: result,
    });
});

/**
 * PATCH /api/team/:id/properties — Update staff assigned properties
 */
export const updateProperties = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await teamService.updateAssignedProperties(
      req.params.id as string,
      req.user!.id,
      req.body.propertyIds
    );
    res.status(200).json({
      status: 'success',
      message: 'Assigned properties updated.',
      data: result,
    });
});

/**
 * DELETE /api/team/:id — Remove a staff member
 */
export const removeStaff = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    await teamService.removeStaff(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: 'success',
      message: 'Staff member removed.',
    });
});
