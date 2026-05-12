import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as adminService from '../services/admin.service';

/**
 * GET /api/admin/stats - Platform KPIs
 */
export const getPlatformStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await adminService.getPlatformStats(req.user!.id);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/admin/users - Get all users (filterable)
 */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      role: req.query.role as string,
      status: req.query.status as string,
      verificationStatus: req.query.verificationStatus as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await adminService.getUsers(req.user!.id, filters);
    res.status(200).json({
      status: 'success',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/admin/users/:id/status - Suspend or activate a user
 */
export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const user = await adminService.updateUserStatus(req.user!.id, req.params.id as string, status);
    res.status(200).json({
      status: 'success',
      message: `User ${status === 'suspended' ? 'suspended' : 'activated'} successfully.`,
      data: user,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/admin/activity - Audit log
 */
export const getActivityLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      userId: req.query.userId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await adminService.getActivityLog(req.user!.id, filters);
    res.status(200).json({
      status: 'success',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/admin/verifications - Get pending verifications
 */
export const getPendingVerifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await adminService.getPendingVerifications(req.user!.id, filters);
    res.status(200).json({
      status: 'success',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/admin/verifications/all - Get all verifications
 */
export const getAllVerifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      verificationStatus: req.query.verificationStatus as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await adminService.getAllVerifications(req.user!.id, filters);
    res.status(200).json({
      status: 'success',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/admin/verifications/:userId/approve - Approve verification
 */
export const approveVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await adminService.approveVerification(req.user!.id, req.params.userId as string);
    res.status(200).json({
      status: 'success',
      message: 'User verification approved',
      data: user,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/admin/verifications/:userId/reject - Reject verification
 */
export const rejectVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const user = await adminService.rejectVerification(req.user!.id, req.params.userId as string, reason);
    res.status(200).json({
      status: 'success',
      message: 'User verification rejected',
      data: user,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
