import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as inquiryService from '../services/inquiry.service';

/**
 * POST /api/inquiries - Create inquiry
 */
export const createInquiry = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await inquiryService.createInquiry(req.user!.pgId, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Inquiry submitted successfully',
      data: inquiry
    });
});

/**
 * GET /api/inquiries/my - Get user's own inquiries
 */
export const getMyInquiries = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiries = await inquiryService.getMyInquiries(req.user!.pgId);

    res.status(200).json({
      status: 'success',
      data: inquiries
    });
});

/**
 * GET /api/inquiries/property/:propertyId - Get inquiries for a property
 */
export const getPropertyInquiries = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string
    };

    const inquiries = await inquiryService.getPropertyInquiries(
      req.user!.pgId,
      req.params.propertyId as string,
      filters
    );

    res.status(200).json({
      status: 'success',
      data: inquiries
    });
});

/**
 * GET /api/inquiries/:id - Get inquiry detail
 */
export const getInquiryById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await inquiryService.getInquiryById(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: inquiry
    });
});

/**
 * PATCH /api/inquiries/:id/status - Update inquiry status
 */
export const updateInquiryStatus = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await inquiryService.updateInquiryStatus(
      req.user!.pgId,
      req.params.id as string,
      req.body.status
    );

    res.status(200).json({
      status: 'success',
      message: 'Inquiry status updated',
      data: inquiry
    });
});
