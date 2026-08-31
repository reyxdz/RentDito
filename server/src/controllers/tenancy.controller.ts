import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as tenancyService from '../services/tenancy.service';

/**
 * POST /api/tenancies/confirm-checkin - Confirm tenant check-in from signed contract
 */
export const confirmCheckin = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { contractId, slotNumber } = req.body;
    const tenancy = await tenancyService.confirmCheckin(
      req.user!.pgId,
      contractId,
      slotNumber
    );

    res.status(201).json({
      status: 'success',
      message: 'Check-in confirmed. Tenancy created successfully.',
      data: tenancy
    });
});

/**
 * GET /api/tenancies/my - Get current user's tenancies
 */
export const getMyTenancies = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const tenancies = await tenancyService.getMyTenancies(req.user!.pgId);

    res.status(200).json({
      status: 'success',
      data: tenancies
    });
});

/**
 * GET /api/tenancies - Get tenancies (landlord/staff)
 */
export const getTenancies = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string,
      propertyId: req.query.propertyId as string
    };

    const tenancies = await tenancyService.getTenancies(req.user!.pgId, filters);

    res.status(200).json({
      status: 'success',
      data: tenancies
    });
});

/**
 * GET /api/tenancies/:id - Get tenancy by ID
 */
export const getTenancyById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const tenancy = await tenancyService.getTenancyById(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: tenancy
    });
});

/**
 * GET /api/tenancies/:id/checkout-review - Pre-checkout review
 */
export const getCheckoutReview = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const review = await tenancyService.getCheckoutReview(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: review
    });
});

/**
 * PATCH /api/tenancies/:id/checkout - Initiate tenant checkout
 */
export const initiateCheckout = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await tenancyService.initiateCheckout(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Checkout completed. Tenancy closed and unit released.',
      data: result
    });
});

/**
 * POST /api/tenancies/:id/comments - Add a comment to a tenancy
 */
export const addComment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ status: 'error', message: 'Comment text is required' });
      return;
    }

    const comment = await tenancyService.addComment(req.user!.pgId, req.params.id as string, text);

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: comment
    });
});

/**
 * GET /api/tenancies/:id/comments - Get comments for a tenancy
 */
export const getComments = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const comments = await tenancyService.getComments(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: comments
    });
});

/**
 * GET /api/tenancies/:id/roommates - Get roommates for a tenancy
 */
export const getRoommates = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const roommates = await tenancyService.getRoommates(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: roommates
    });
});
