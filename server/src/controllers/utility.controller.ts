import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as utilityService from '../services/utility.service';

export const postReadings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await utilityService.submitMeterReadings(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Meter readings submitted and utility bill created.',
      data: bill
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getConsumption = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await utilityService.getConsumption(req.user!.id, {
      propertyId: req.query.propertyId as string,
      year: req.query.year ? Number(req.query.year) : undefined,
      months: req.query.months ? Number(req.query.months) : undefined
    });
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getHighestUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await utilityService.getHighestUsage(req.user!.id, {
      propertyId: req.query.propertyId as string,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getOverconsumption = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await utilityService.getOverconsumption(req.user!.id, {
      propertyId: req.query.propertyId as string,
      multiplier: req.query.multiplier ? Number(req.query.multiplier) : undefined
    });
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getExpenseSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await utilityService.getExpenseSummary(req.user!.id, {
      propertyId: req.query.propertyId as string
    });
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getUnits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await utilityService.getAvailableUnits(req.user!.id, req.query.propertyId as string);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
