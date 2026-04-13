import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as inquiryService from '../services/inquiry.service';

/**
 * POST /api/inquiries - Create inquiry
 */
export const createInquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inquiry = await inquiryService.createInquiry(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Inquiry submitted successfully',
      data: inquiry
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/inquiries/my - Get user's own inquiries
 */
export const getMyInquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inquiries = await inquiryService.getMyInquiries(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: inquiries
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/inquiries/property/:propertyId - Get inquiries for a property
 */
export const getPropertyInquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string
    };

    const inquiries = await inquiryService.getPropertyInquiries(
      req.user!.id,
      req.params.propertyId as string,
      filters
    );

    res.status(200).json({
      status: 'success',
      data: inquiries
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/inquiries/:id - Get inquiry detail
 */
export const getInquiryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inquiry = await inquiryService.getInquiryById(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: inquiry
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/inquiries/:id/status - Update inquiry status
 */
export const updateInquiryStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inquiry = await inquiryService.updateInquiryStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );

    res.status(200).json({
      status: 'success',
      message: 'Inquiry status updated',
      data: inquiry
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
