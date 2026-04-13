import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as propertyService from '../services/property.service';

/**
 * GET /api/properties - List all properties (scoped by role)
 */
export const getProperties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, propertyType, city, page, limit } = req.query;

    const result = await propertyService.getProperties(req.user!.id, {
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * GET /api/properties/:id - Get single property
 */
export const getPropertyById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const property = await propertyService.getPropertyById(req.user!.id, req.params.id as string);

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
 * POST /api/properties - Create new property
 */
export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const property = await propertyService.createProperty(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Property created successfully',
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
 * PATCH /api/properties/:id - Update property
 */
export const updateProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const property = await propertyService.updateProperty(
      req.user!.id,
      req.params.id as string,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Property updated successfully',
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
 * PATCH /api/properties/:id/status - Update property status
 */
export const updatePropertyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const property = await propertyService.updatePropertyStatus(
      req.user!.id,
      req.params.id as string,
      status
    );

    res.status(200).json({
      status: 'success',
      message: 'Property status updated successfully',
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
 * DELETE /api/properties/:id - Soft delete property
 */
export const deleteProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await propertyService.deleteProperty(req.user!.id, req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Property archived successfully',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * POST /api/properties/:id/images - Upload property images
 */
export const uploadPropertyImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
      req.user!.id,
      req.params.id as string,
      imageUrls
    );

    res.status(200).json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: property,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
};
