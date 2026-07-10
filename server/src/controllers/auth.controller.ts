import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';

/**
 * POST /api/auth/register
 */
export const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Registration successful',
    data: result,
  });
});

/**
 * POST /api/auth/login
 */
export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: result,
  });
});

/**
 * POST /api/auth/refresh
 */
export const refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  res.status(200).json({
    status: 'success',
    message: 'Token refreshed',
    data: result,
  });
});

/**
 * POST /api/auth/forgot-password
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  // Always return success even if email doesn't exist (security)
  res.status(200).json({
    status: 'success',
    message: 'If that email is registered, a reset link has been sent.',
  });
});

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json({
    status: 'success',
    message: 'Password reset successful. You can now log in with your new password.',
  });
});

/**
 * POST /api/auth/logout
 * Requires authentication.
 */
export const logout = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }
  await authService.logout(req.user.id);
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});
