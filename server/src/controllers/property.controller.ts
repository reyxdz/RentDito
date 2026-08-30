import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as propertyService from '../services/property.service';

/**
 * GET /api/properties - List all properties (scoped by role)
 */
export const getProperties = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, propertyType, city, page, limit } = req.query;

    const result = await propertyService.getProperties(req.user!.pgId, {
      status: status as string,
      propertyType: propertyType as string,
      city: city as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.properties,
      pagination: result.pagination,
    });
});

/**
 * GET /api/properties/:id - Get single property
 */
export const getPropertyById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const property = await propertyService.getPropertyById(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: property,
    });
});

/**
 * POST /api/properties - Create new property
 */
export const createProperty = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const property = await propertyService.createProperty(req.user!.pgId, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Property created successfully',
      data: property,
    });
});

/**
 * PATCH /api/properties/:id - Update property
 */
export const updateProperty = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const property = await propertyService.updateProperty(
      req.user!.pgId,
      req.params.id as string,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Property updated successfully',
      data: property,
    });
});

/**
 * PATCH /api/properties/:id/status - Update property status
 */
export const updatePropertyStatus = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { status } = req.body;
    const property = await propertyService.updatePropertyStatus(
      req.user!.pgId,
      req.params.id as string,
      status
    );

    res.status(200).json({
      status: 'success',
      message: 'Property status updated successfully',
      data: property,
    });
});

/**
 * DELETE /api/properties/:id - Soft delete property
 */
export const deleteProperty = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    await propertyService.deleteProperty(req.user!.pgId, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Property archived successfully',
    });
});

/**
 * POST /api/properties/:id/images - Upload property images
 */
export const uploadPropertyImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    // imageUrls is set by the uploadMultiple middleware after Cloudinary upload
    const imageUrls: string[] = req.body.imageUrls;
    
    if (!imageUrls || imageUrls.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No images provided. Upload image files using multipart/form-data.',
      });
      return;
    }

    const property = await propertyService.uploadPropertyImages(
      req.user!.pgId,
      req.params.id as string,
      imageUrls
    );

    res.status(200).json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: property,
    });
});
