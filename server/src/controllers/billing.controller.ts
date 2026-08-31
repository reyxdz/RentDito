import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as billingService from '../services/billing.service';

/**
 * GET /api/billing - Get bills (landlord/staff/user)
 */
export const getBills = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string,
      tenancyId: req.query.tenancyId as string,
      type: req.query.type as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const result = await billingService.getBills(req.user!.pgId, filters);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
});

/**
 * GET /api/billing/tenancy/:id - Get bills for a tenancy
 */
export const getBillsByTenancy = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bills = await billingService.getBillsByTenancy(req.user!.pgId, req.params.id as string);
    res.status(200).json({ status: 'success', data: bills });
});

/**
 * GET /api/billing/:id - Get bill by ID (with payments)
 */
export const getBillById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.getBillById(req.user!.pgId, req.params.id as string);
    res.status(200).json({ status: 'success', data: bill });
});

/**
 * POST /api/billing - Create manual bill
 */
export const createManualBill = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.createManualBill(req.user!.pgId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Bill created successfully.',
      data: bill
    });
});

/**
 * POST /api/billing/utility - Create utility bill from readings/breakdown
 */
export const createUtilityBill = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.createUtilityBill(req.user!.pgId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Utility bill created successfully.',
      data: bill
    });
});

/**
 * POST /api/billing/combined - Create combined rent + utility bill
 */
export const createCombinedBill = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.createCombinedBill(req.user!.pgId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Combined bill created successfully.',
      data: bill
    });
});

/**
 * POST /api/billing/auto-generate - Auto-generate monthly bills for all active tenancies
 */
export const autoGenerateBills = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { month, year } = req.body;
    const results = await billingService.autoGenerateMonthlyBills(req.user!.pgId, month, year);
    res.status(201).json({
      status: 'success',
      message: `Bills generated: ${results.created} created, ${results.skipped} skipped.`,
      data: results
    });
});

/**
 * PATCH /api/billing/:id - Update bill amounts/readings
 */
export const updateBill = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.updateBill(req.user!.pgId, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Bill updated successfully.',
      data: bill
    });
});

/**
 * POST /api/billing/:id/record-payment - Record a payment against a bill
 */
export const recordPayment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await billingService.recordPayment(req.user!.pgId, req.params.id as string, req.body);
    res.status(201).json({
      status: 'success',
      message: `Payment of ₱${req.body.amount} recorded. Bill status: ${result.bill.status}.`,
      data: result
    });
});

/**
 * POST /api/billing/:id/apply-late-fee - Apply late fee to overdue bill
 */
export const applyLateFee = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await billingService.applyLateFee(req.user!.pgId, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Late fee applied.',
      data: bill
    });
});

/**
 * GET /api/billing/:id/receipt - Generate receipt PDF
 */
export const generateReceipt = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await billingService.generateReceipt(req.user!.pgId, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Receipt generated successfully.',
      data: result
    });
});
