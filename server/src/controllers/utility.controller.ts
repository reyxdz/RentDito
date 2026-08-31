import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as utilityService from '../services/utility.service';

export const postReadings = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const bill = await utilityService.submitMeterReadings(req.user!.pgId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Meter readings submitted and utility bill created.',
      data: bill
    });
});

export const getConsumption = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = await utilityService.getConsumption(req.user!.pgId, {
      propertyId: req.query.propertyId as string,
      year: req.query.year ? Number(req.query.year) : undefined,
      months: req.query.months ? Number(req.query.months) : undefined
    });
    res.status(200).json({ status: 'success', data });
});

export const getHighestUsage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = await utilityService.getHighestUsage(req.user!.pgId, {
      propertyId: req.query.propertyId as string,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(200).json({ status: 'success', data });
});

export const getOverconsumption = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = await utilityService.getOverconsumption(req.user!.pgId, {
      propertyId: req.query.propertyId as string,
      multiplier: req.query.multiplier ? Number(req.query.multiplier) : undefined
    });
    res.status(200).json({ status: 'success', data });
});

export const getExpenseSummary = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = await utilityService.getExpenseSummary(req.user!.pgId, {
      propertyId: req.query.propertyId as string
    });
    res.status(200).json({ status: 'success', data });
});

export const getUnits = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = await utilityService.getAvailableUnits(req.user!.pgId, req.query.propertyId as string);
    res.status(200).json({ status: 'success', data });
});
