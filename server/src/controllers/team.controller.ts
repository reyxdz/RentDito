import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as teamService from '../services/team.service';

/**
 * GET /api/team — Get all staff for the current landlord
 */
export const getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await teamService.getStaff(req.user!.id);
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
 * POST /api/team — Invite a new staff member
 */
export const inviteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await teamService.inviteStaff(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Staff member invited successfully.',
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
 * PATCH /api/team/:id/permissions — Update staff permissions
 */
export const updatePermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * PATCH /api/team/:id/properties — Update staff assigned properties
 */
export const updateProperties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/team/:id — Remove a staff member
 */
export const removeStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await teamService.removeStaff(req.params.id as string, req.user!.id);
    res.status(200).json({
      status: 'success',
      message: 'Staff member removed.',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};
