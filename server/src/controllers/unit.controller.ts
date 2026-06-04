import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as unitService from '../services/unit.service';

export const getUnits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const filters = {
      propertyId: req.query.propertyId as string,
      status: req.query.status as string,
      accommodationType: req.query.accommodationType as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const result = await unitService.getUnits(userId, filters);
    res.status(200).json({
      status: 'success',
      data: result.units,
      pagination: result.pagination
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getUnitById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unit = await unitService.getUnitById(userId, req.params.id as string);
    res.status(200).json({ status: 'success', data: unit });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const getUnitsByProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const units = await unitService.getUnitsByProperty(userId, req.params.propertyId as string);
    res.status(200).json({ status: 'success', data: units });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const createUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unit = await unitService.createUnit(userId, req.body);
    res.status(201).json({ status: 'success', message: 'Unit created successfully', data: unit });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const updateUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unit = await unitService.updateUnit(userId, req.params.id as string, req.body);
    res.status(200).json({ status: 'success', message: 'Unit updated successfully', data: unit });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const updateUnitStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unit = await unitService.updateUnitStatus(userId, req.params.id as string, req.body.status);
    res.status(200).json({ status: 'success', message: 'Unit status updated', data: unit });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const deleteUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await unitService.deleteUnit(userId, req.params.id as string);
    res.status(200).json({ status: 'success', message: 'Unit deleted successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

export const uploadUnitImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // imageUrls is set by the uploadMultiple middleware after Cloudinary/local upload
    const imageUrls: string[] = req.body.imageUrls;

    if (!imageUrls || imageUrls.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No images provided. Upload image files using multipart/form-data.',
      });
      return;
    }

    const unit = await unitService.uploadUnitImages(userId, req.params.id as string, imageUrls);
    res.status(200).json({ status: 'success', message: 'Images uploaded successfully', data: unit });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
