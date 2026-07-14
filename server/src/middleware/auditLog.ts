import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from './auth';

/**
 * Middleware that logs specific mutating HTTP requests to the AuditLog collection.
 * Designed to be placed after the authentication middleware.
 */
export const auditLog = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Only log mutating methods
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Hook into the finish event of the response
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
        const resourceId = req.params?.id || req.params?.userId || undefined;

        const logEntry = new AuditLog({
          userId: req.user.id,
          action,
          resourceType,
          resourceId,
          ip: req.ip || req.socket.remoteAddress,
          details: {
            method: req.method,
            originalUrl: req.originalUrl,
            status: res.statusCode,
          }
        });
        await logEntry.save();
      } catch (error) {
        console.error('Audit Log Error:', error);
      }
    }
  });

  next();
};
