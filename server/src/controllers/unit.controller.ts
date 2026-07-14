import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as unitService from '../services/unit.service';

export const getUnits = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
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
});

export const getUnitById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const unit = await unitService.getUnitById(userId, req.params.id as string);
    res.status(200).json({ status: 'success', data: unit });
});

export const getUnitsByProperty = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const units = await unitService.getUnitsByProperty(userId, req.params.propertyId as string);
    res.status(200).json({ status: 'success', data: units });
});

export const createUnit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const unit = await unitService.createUnit(userId, req.body);
    res.status(201).json({ status: 'success', message: 'Unit created successfully', data: unit });
});

export const updateUnit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const unit = await unitService.updateUnit(userId, req.params.id as string, req.body);
    res.status(200).json({ status: 'success', message: 'Unit updated successfully', data: unit });
});

export const updateUnitStatus = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const unit = await unitService.updateUnitStatus(userId, req.params.id as string, req.body.status);
    res.status(200).json({ status: 'success', message: 'Unit status updated', data: unit });
});

export const deleteUnit = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const result = await unitService.deleteUnit(userId, req.params.id as string);
    res.status(200).json({ status: 'success', message: 'Unit deleted successfully' });
});

export const uploadUnitImages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
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
});
