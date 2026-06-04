import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as inventoryService from '../services/inventory.service';

/**
 * GET /api/inventory - Get inventory items (filterable)
 */
export const getInventoryItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      propertyId: req.query.propertyId as string,
      status: req.query.status as string,
      condition: req.query.condition as string,
      search: req.query.search as string
    };

    const items = await inventoryService.getInventoryItems(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: items });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/inventory - Create inventory item
 */
export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await inventoryService.createInventoryItem(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Inventory item created successfully.',
      data: item
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * PATCH /api/inventory/:id - Update inventory item
 */
export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await inventoryService.updateInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Inventory item updated successfully.',
      data: item
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/inventory/:id/issue - Issue item to tenancy
 */
export const issueInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await inventoryService.issueInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Inventory item issued successfully.',
      data: record
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/inventory/:id/return - Return issued item
 */
export const returnInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await inventoryService.returnInventoryItem(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Inventory return processed successfully.',
      data: record
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * POST /api/inventory/records/:id/damage - Report damage/loss and penalty
 */
export const reportRecordDamage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await inventoryService.reportRecordDamage(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Damage report saved successfully.',
      data: record
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/inventory/records - Get inventory records
 */
export const getInventoryRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      propertyId: req.query.propertyId as string,
      tenancyId: req.query.tenancyId as string,
      status: req.query.status as string
    };

    const records = await inventoryService.getInventoryRecords(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: records });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/inventory/records/tenancy/:id - Get records for a tenancy
 */
export const getInventoryRecordsByTenancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await inventoryService.getInventoryRecordsByTenancy(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: records });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/inventory/reports/monthly - Monthly accountability report
 */
export const getMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const report = await inventoryService.getMonthlyInventoryReport(req.user!.id, {
      month,
      year,
      propertyId: req.query.propertyId as string
    });

    res.status(200).json({ status: 'success', data: report });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};
