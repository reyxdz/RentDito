import { Request, Response } from 'express';
import * as publicService from '../services/public.service';

/**
 * GET /api/public/listings - Get all active properties (no auth)
 */
export const getPublicListings = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * GET /api/public/listings/:id - Get single property with units (no auth)
 */
export const getPublicPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const property = await publicService.getPublicPropertyById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: property,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * GET /api/public/listings/unit/:id - Get single unit detail (no auth)
 */
export const getPublicUnitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const unit = await publicService.getPublicUnitById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: unit,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};
