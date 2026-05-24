import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as tenancyService from '../services/tenancy.service';

/**
 * POST /api/tenancies/confirm-checkin - Confirm tenant check-in from signed contract
 */
export const confirmCheckin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contractId, slotNumber } = req.body;
    const tenancy = await tenancyService.confirmCheckin(
      req.user!.id,
      contractId,
      slotNumber
    );

    res.status(201).json({
      status: 'success',
      message: 'Check-in confirmed. Tenancy created successfully.',
      data: tenancy
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies/my - Get current user's tenancies
 */
export const getMyTenancies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenancies = await tenancyService.getMyTenancies(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: tenancies
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies - Get tenancies (landlord/staff)
 */
export const getTenancies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const tenancies = await tenancyService.getTenancies(req.user!.id, filters);

    res.status(200).json({
      status: 'success',
      data: tenancies
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies/:id - Get tenancy by ID
 */
export const getTenancyById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenancy = await tenancyService.getTenancyById(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: tenancy
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies/:id/checkout-review - Pre-checkout review
 */
export const getCheckoutReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await tenancyService.getCheckoutReview(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: review
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
      details: error.details
    });
  }
};

/**
 * PATCH /api/tenancies/:id/checkout - Initiate tenant checkout
 */
export const initiateCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await tenancyService.initiateCheckout(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Checkout completed. Tenancy closed and unit released.',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
      details: error.details
    });
  }
};

/**
 * POST /api/tenancies/:id/comments - Add a comment to a tenancy
 */
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ status: 'error', message: 'Comment text is required' });
      return;
    }

    const comment = await tenancyService.addComment(req.user!.id, req.params.id as string, text);

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies/:id/comments - Get comments for a tenancy
 */
export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comments = await tenancyService.getComments(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: comments
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * GET /api/tenancies/:id/roommates - Get roommates for a tenancy
 */
export const getRoommates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roommates = await tenancyService.getRoommates(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: roommates
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
