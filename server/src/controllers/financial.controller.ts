import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as financialService from '../services/financial.service';

/**
 * GET /api/financials/summary - Financial summary
 */
export const getSummary = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const summary = await financialService.getFinancialSummary(req.user!.pgId, {
      from: req.query.from as string,
      to: req.query.to as string,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: summary
    });
});

/**
 * GET /api/financials/monthly - Monthly trend
 */
export const getMonthly = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const monthly = await financialService.getMonthlyFinancialTrend(req.user!.pgId, {
      year,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: monthly
    });
});

/**
 * GET /api/financials/by-property - Income grouped by property
 */
export const getByProperty = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const byProperty = await financialService.getFinancialByProperty(req.user!.pgId, {
      from: req.query.from as string,
      to: req.query.to as string,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: byProperty
    });
});
