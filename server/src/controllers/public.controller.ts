import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import * as publicService from '../services/public.service';

/**
 * GET /api/public/listings - Get all active properties (no auth)
 */
export const getPublicListings = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const filters = {
      city: req.query.city as string,
      propertyType: req.query.propertyType as string,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await publicService.getPublicListings(filters);

    res.status(200).json({
      status: 'success',
      data: result.properties,
      pagination: result.pagination,
    });
});

/**
 * GET /api/public/listings/:id - Get single property with units (no auth)
 */
export const getPublicPropertyById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const property = await publicService.getPublicPropertyById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: property,
    });
});

/**
 * GET /api/public/listings/unit/:id - Get single unit detail (no auth)
 */
export const getPublicUnitById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const unit = await publicService.getPublicUnitById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: unit,
    });
});
