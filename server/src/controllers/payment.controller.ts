import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as billingService from '../services/billing.service';

/**
 * GET /api/payments - Get all payments (filterable)
 */
export const getPayments = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      tenancyId: req.query.tenancyId as string,
      method: req.query.method as string
    };
    const payments = await billingService.getPayments(req.user!.pgId, filters);
    res.status(200).json({ status: 'success', data: payments });
});

/**
 * GET /api/payments/tenancy/:id - Get payment history for a tenancy
 */
export const getPaymentsByTenancy = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const payments = await billingService.getPaymentsByTenancy(req.user!.pgId, req.params.id as string);
    res.status(200).json({ status: 'success', data: payments });
});
