import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as billingService from '../services/billing.service';

/**
 * GET /api/billing - Get bills (landlord/staff/user)
 */
export const getBills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string,
      tenancyId: req.query.tenancyId as string,
      type: req.query.type as string
    };
    const bills = await billingService.getBills(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: bills });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/billing/tenancy/:id - Get bills for a tenancy
 */
export const getBillsByTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bills = await billingService.getBillsByTenancy(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: bills });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/billing/:id - Get bill by ID (with payments)
 */
export const getBillById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.getBillById(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: bill });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing - Create manual bill
 */
export const createManualBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.createManualBill(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Bill created successfully.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing/utility - Create utility bill from readings/breakdown
 */
export const createUtilityBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.createUtilityBill(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Utility bill created successfully.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing/combined - Create combined rent + utility bill
 */
export const createCombinedBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.createCombinedBill(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Combined bill created successfully.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing/auto-generate - Auto-generate monthly bills for all active tenancies
 */
export const autoGenerateBills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;
    const results = await billingService.autoGenerateMonthlyBills(req.user!.id, month, year);
    res.status(201).json({
      status: 'success',
      message: `Bills generated: ${results.created} created, ${results.skipped} skipped.`,
      data: results
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/billing/:id - Update bill amounts/readings
 */
export const updateBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.updateBill(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Bill updated successfully.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing/:id/record-payment - Record a payment against a bill
 */
export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await billingService.recordPayment(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({
      status: 'success',
      message: `Payment of ₱${req.body.amount} recorded. Bill status: ${result.bill.status}.`,
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/billing/:id/apply-late-fee - Apply late fee to overdue bill
 */
export const applyLateFee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await billingService.applyLateFee(req.user!.id, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Late fee applied.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/billing/:id/receipt - Generate receipt PDF
 */
export const generateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await billingService.generateReceipt(req.user!.id, req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Receipt generated successfully.',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
