import { Request, Response, NextFunction } from 'express';

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes in the Express app.
 *
 * Catches errors thrown or forwarded via `next(err)` and sends
 * a consistent JSON error response.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    // Include stack traces only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
