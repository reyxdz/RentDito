import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as billingService from '../services/billing.service';

/**
 * GET /api/payments - Get all payments (filterable)
 */
export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      tenancyId: req.query.tenancyId as string,
      method: req.query.method as string
    };
    const payments = await billingService.getPayments(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: payments });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/payments/tenancy/:id - Get payment history for a tenancy
 */
export const getPaymentsByTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await billingService.getPaymentsByTenancy(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: payments });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
