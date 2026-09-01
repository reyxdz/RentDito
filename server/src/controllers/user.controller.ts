import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as userService from '../services/user.service';

/**
 * GET /api/users/me — Get current user profile (with activeTenancy)
 */
export const getMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await userService.getMe(req.user!.id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
});

/**
 * PATCH /api/users/me — Update profile
 */
export const updateMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await userService.updateMe(req.user!.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Profile updated.',
      data: result,
    });
});

/**
 * PATCH /api/users/me/password — Change password
 */
export const changePassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully.',
    });
});

/**
 * POST /api/users/me/avatar — Upload avatar
 */
export const updateAvatar = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.body.imageUrl) {
      res.status(400).json({ status: 'error', message: 'No image uploaded.' });
      return;
    }
    const result = await userService.updateAvatar(req.user!.id, req.body.imageUrl);
    res.status(200).json({
      status: 'success',
      message: 'Avatar updated.',
      data: result,
    });
});

/**
 * POST /api/users/me/verify — Upload ID photos for verification
 */
export const submitVerification = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const idPhotos = req.body.imageUrls || [];
    const result = await userService.submitVerification(req.user!.id, idPhotos);
    res.status(200).json({
      status: 'success',
      message: 'Verification documents submitted. Review is pending.',
      data: result,
    });
});
