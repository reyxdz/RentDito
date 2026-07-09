import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as reportService from '../services/report.service';

export const getOccupancy = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await reportService.getOccupancyStats(userId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

export const getCheckoutForecast = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const forecast = await reportService.getCheckoutForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

export const getVacancyForecast = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const forecast = await reportService.getVacancyForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

export const getReservationForecast = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const forecast = await reportService.getReservationForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};
