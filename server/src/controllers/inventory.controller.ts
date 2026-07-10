import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as inventoryService from '../services/inventory.service';

/**
 * GET /api/inventory - Get inventory items (filterable)
 */
export const getInventoryItems = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      propertyId: req.query.propertyId as string,
      status: req.query.status as string,
      condition: req.query.condition as string,
      search: req.query.search as string
    };

    const items = await inventoryService.getInventoryItems(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: items });
});

/**
 * POST /api/inventory - Create inventory item
 */
export const createInventoryItem = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const item = await inventoryService.createInventoryItem(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Inventory item created successfully.',
      data: item
    });
});

/**
 * PATCH /api/inventory/:id - Update inventory item
 */
export const updateInventoryItem = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const item = await inventoryService.updateInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Inventory item updated successfully.',
      data: item
    });
});

/**
 * POST /api/inventory/:id/issue - Issue item to tenancy
 */
export const issueInventoryItem = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const record = await inventoryService.issueInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Inventory item issued successfully.',
      data: record
    });
});

/**
 * POST /api/inventory/:id/return - Return issued item
 */
export const returnInventoryItem = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const record = await inventoryService.returnInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Inventory return processed successfully.',
      data: record
    });
});

/**
 * POST /api/inventory/records/:id/damage - Report damage/loss and penalty
 */
export const reportRecordDamage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const record = await inventoryService.reportRecordDamage(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Damage report saved successfully.',
      data: record
    });
});

/**
 * GET /api/inventory/records - Get inventory records
 */
export const getInventoryRecords = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      propertyId: req.query.propertyId as string,
      tenancyId: req.query.tenancyId as string,
      status: req.query.status as string
    };

    const records = await inventoryService.getInventoryRecords(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: records });
});

/**
 * GET /api/inventory/records/tenancy/:id - Get records for a tenancy
 */
export const getInventoryRecordsByTenancy = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const records = await inventoryService.getInventoryRecordsByTenancy(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: records });
});

/**
 * GET /api/inventory/reports/monthly - Monthly accountability report
 */
export const getMonthlyReport = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const report = await inventoryService.getMonthlyInventoryReport(req.user!.id, {
      month,
      year,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({ status: 'success', data: report });
});
