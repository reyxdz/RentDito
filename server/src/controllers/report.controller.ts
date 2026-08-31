import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as reportService from '../services/report.service';

export const getOccupancy = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.pgId;
    const stats = await reportService.getOccupancyStats(userId);
    res.status(200).json({ status: 'success', data: stats });
});

export const getCheckoutForecast = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.pgId;
    const forecast = await reportService.getCheckoutForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
});

export const getVacancyForecast = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.pgId;
    const forecast = await reportService.getVacancyForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
});

export const getReservationForecast = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.pgId;
    const forecast = await reportService.getReservationForecast(userId);
    res.status(200).json({ status: 'success', data: forecast });
});
