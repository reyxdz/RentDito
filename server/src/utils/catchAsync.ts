import { Request, Response, NextFunction } from 'express';

/**
 * Wrap an async route handler so that any thrown/rejected errors
 * are automatically forwarded to the Express error handler.
 *
 * Usage:
 *   export const getX = catchAsync(async (req, res) => { … });
 */
export const catchAsync = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
