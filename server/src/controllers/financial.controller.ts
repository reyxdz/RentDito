import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as financialService from '../services/financial.service';

/**
 * GET /api/financials/summary - Financial summary
 */
export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await financialService.getFinancialSummary(req.user!.id, {
      from: req.query.from as string,
      to: req.query.to as string,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/financials/monthly - Monthly trend
 */
export const getMonthly = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const monthly = await financialService.getMonthlyFinancialTrend(req.user!.id, {
      year,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: monthly
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/financials/by-property - Income grouped by property
 */
export const getByProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const byProperty = await financialService.getFinancialByProperty(req.user!.id, {
      from: req.query.from as string,
      to: req.query.to as string,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({
      status: 'success',
      data: byProperty
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
