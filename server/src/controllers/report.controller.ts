import { Request, Response } from 'express';
import * as reportService from '../services/report.service';

export const getOccupancy = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await reportService.getOccupancyStats(userId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

export const getCheckoutForecast = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const forecast = await reportService.getCheckoutForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};
