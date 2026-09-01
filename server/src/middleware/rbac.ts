import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/prisma';

/**
 * Require that the authenticated user has one of the specified roles.
 * Must be used AFTER the `auth` middleware.
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};

/**
 * Require that the user has a specific permission key.
 *
 * Rules:
 *  - super_admin → always passes
 *  - landlord   → always passes (owns everything)
 *  - staff      → must have the key in their permissions[]
 *  - user       → always blocked from hub features
 */
export const requirePermission = (key: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    const { role } = req.user;

    // Super admin and landlord auto-pass
    if (role === 'super_admin' || role === 'landlord') {
      next();
      return;
    }

    // Users are never allowed hub permissions
    if (role === 'user') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    // Staff — check permissions array
    if (role === 'staff') {
      // TRANSITIONAL: reads `req.user.pgId` (the Postgres profile UUID), not
      // `req.user.id`, because this middleware was ported to Prisma before
      // the dual-id strangler was collapsed (see middleware/auth.ts). Once
      // collapsed, `id` itself becomes the UUID and this reverts to `id`.
      const staff = await prisma.profile.findUnique({
        where: { id: req.user.pgId },
        select: { permissions: true },
      });
      if (!staff || !staff.permissions.includes(key)) {
        res.status(403).json({
          status: 'error',
          message: `Access denied. Missing permission: ${key}`,
        });
        return;
      }
      next();
      return;
    }

    res.status(403).json({ status: 'error', message: 'Access denied.' });
  };
};

/**
 * Require that the user has access to the property referenced in req.params.propertyId.
 *
 * Rules:
 *  - super_admin → always passes
 *  - landlord   → property.landlordId must match req.user.id
 *  - staff      → must have a row in staff_property_assignments for this property
 *  - user       → blocked
 */
export const requirePropertyAccess = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    // TRANSITIONAL: `pgId` is the Postgres profile UUID -- see the note in
    // requirePermission() above.
    const { role, pgId: userId } = req.user;
    const propertyId = req.params.propertyId || req.body.propertyId;

    if (!propertyId) {
      res.status(400).json({ status: 'error', message: 'Property ID is required.' });
      return;
    }

    // Super admin always has access
    if (role === 'super_admin') {
      next();
      return;
    }

    // Landlord — must own the property
    if (role === 'landlord') {
      const property = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!property || property.landlordId !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'You do not own this property.',
        });
        return;
      }
      next();
      return;
    }

    // Staff — must be assigned to this property via staff_property_assignments
    if (role === 'staff') {
      const assignment = await prisma.staffPropertyAssignment.findUnique({
        where: { staffId_propertyId: { staffId: userId, propertyId } },
      });
      if (!assignment) {
        res.status(403).json({
          status: 'error',
          message: 'You are not assigned to this property.',
        });
        return;
      }
      next();
      return;
    }

    res.status(403).json({ status: 'error', message: 'Access denied.' });
  };
};
