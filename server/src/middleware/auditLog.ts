import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from './auth';

/**
 * Middleware that logs specific mutating HTTP requests to the `audit_logs`
 * table. Designed to be placed after the authentication middleware.
 */
export const auditLog = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Only log mutating methods
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Hook into the finish event of the response. This fires only after the
  // response has already been sent to the client, so anything that goes
  // wrong writing the audit record below (including the whole insert
  // failing) can never affect -- or delay -- the response the caller
  // already received. The try/catch inside is a second, belt-and-suspenders
  // guarantee: even if `prisma.auditLog.create` rejects, it's caught here
  // and only logged to the server console, never rethrown.
  res.on('finish', async () => {
    // Only log if the request was successful (status code 2xx)
    // Or we could log all. For now, logging all mutating requests might be better for an audit trail.
    // Let's log if user is authenticated
    if (req.user) {
      try {
        const action = `${req.method}_${req.baseUrl}${req.route?.path || ''}`.replace(/\/+/g, '_').replace(/^_|_$/g, '').toUpperCase();

        // Try to infer resource type from baseUrl
        const resourceParts = req.baseUrl.split('/');
        const resourceType = resourceParts.length > 0 ? resourceParts[resourceParts.length - 1] : 'Unknown';

        // Extract ID if available
        const resourceId = (req.params?.id || req.params?.userId || undefined) as string | undefined;

        await prisma.auditLog.create({
          data: {
            // TRANSITIONAL: reads `req.user.pgId` (the Postgres profile
            // UUID), not `req.user.id`, because this middleware was ported
            // to Prisma before the dual-id strangler was collapsed (see
            // middleware/auth.ts). Once collapsed, `id` itself becomes the
            // UUID and this reverts to `id`.
            userId: req.user.pgId,
            action,
            resourceType,
            resourceId,
            ip: req.ip || req.socket.remoteAddress,
            details: {
              method: req.method,
              originalUrl: req.originalUrl,
              status: res.statusCode,
            },
          },
        });
      } catch (error) {
        console.error('Audit Log Error:', error);
      }
    }
  });

  next();
};
