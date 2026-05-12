import { Bill } from '../models/Bill';
import { Property } from '../models/Property';
import { Tenancy } from '../models/Tenancy';
import { Unit } from '../models/Unit';
import { User } from '../models/User';
import { createUtilityBill } from './billing.service';

const verifyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const property = await Property.findById(propertyId);
  if (!property) throw Object.assign(new Error('Property not found'), { statusCode: 404 });

  const isLandlord = property.landlordId.toString() === userId;
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(id => id.toString() === propertyId);
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
};

const resolveManagedPropertyIds = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (user.role === 'super_admin') {
    const props = await Property.find({}).select('_id');
    return props.map(p => p._id);
  }

  if (user.role === 'landlord') {
    const props = await Property.find({ landlordId: userId }).select('_id');
    return props.map(p => p._id);
  }

  if (user.role === 'staff') {
    return user.assignedPropertyIds || [];
  }

  throw Object.assign(new Error('Access denied'), { statusCode: 403 });
};

export const submitMeterReadings = async (userId: string, data: {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  allocationMode?: 'full' | 'per_head';
  utilityBreakdown: {
    electricity?: { previousReading: number; currentReading: number; rate: number };
    water?: { previousReading: number; currentReading: number; rate: number };
    internet?: { amount: number };
    others?: { description?: string; amount: number };
  };
  notes?: string;
}) => {
  const tenancy: any = await Tenancy.findById(data.tenancyId);
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  await verifyManagementAccess(userId, tenancy.propertyId.toString());
  return createUtilityBill(userId, data);
};

export const getConsumption = async (
  userId: string,
  params: { propertyId?: string; year?: number; months?: number } = {}
) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const months = params.months || 6;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);

  const query: any = {
    propertyId: { $in: propertyIds },
    createdAt: { $gte: start, $lte: end },
    type: { $in: ['utility', 'combined'] }
  };
  if (params.propertyId) query.propertyId = params.propertyId;
  if (params.year) {
    query['billingPeriod.start'] = {
      $gte: new Date(params.year, 0, 1),
      $lte: new Date(params.year, 11, 31)
    };
  }

  const bills = await Bill.find(query).lean();
  const grouped = new Map<string, { electricity: number; water: number; utilityAmount: number }>();

  for (const bill of bills) {
    const d = new Date(bill.billingPeriod?.start || bill.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped.has(key)) grouped.set(key, { electricity: 0, water: 0, utilityAmount: 0 });

    const row = grouped.get(key)!;
    row.electricity += bill.utilityBreakdown?.electricity?.consumption || 0;
    row.water += bill.utilityBreakdown?.water?.consumption || 0;
    row.utilityAmount += bill.utilityAmount || 0;
  }

  return [...grouped.entries()]
    .map(([period, values]) => ({ period, ...values }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

export const getHighestUsage = async (userId: string, params: { propertyId?: string; limit?: number } = {}) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const query: any = {
    propertyId: { $in: propertyIds },
    type: { $in: ['utility', 'combined'] }
  };
  if (params.propertyId) query.propertyId = params.propertyId;

  const bills: any[] = await Bill.find(query).populate('unitId', 'unitIdentifier').lean();
  const usageMap = new Map<string, { unitId: string; unitIdentifier: string; total: number }>();

  for (const bill of bills) {
    const unitId = bill.unitId?._id?.toString?.() || bill.unitId?.toString?.();
    if (!unitId) continue;
    const unitIdentifier = bill.unitId?.unitIdentifier || 'Unknown Unit';
    const usage = (bill.utilityBreakdown?.electricity?.consumption || 0) + (bill.utilityBreakdown?.water?.consumption || 0);
    if (!usageMap.has(unitId)) usageMap.set(unitId, { unitId, unitIdentifier, total: 0 });
    usageMap.get(unitId)!.total += usage;
  }

  return [...usageMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, params.limit || 10);
};

export const getOverconsumption = async (userId: string, params: { propertyId?: string; multiplier?: number } = {}) => {
  const ranked = await getHighestUsage(userId, { propertyId: params.propertyId, limit: 1000 });
  if (!ranked.length) return [];
  const total = ranked.reduce((sum, row) => sum + row.total, 0);
  const avg = total / ranked.length;
  const threshold = avg * (params.multiplier || 1.5);

  return ranked
    .filter(row => row.total > threshold)
    .map(row => ({
      ...row,
      average: Number(avg.toFixed(2)),
      threshold: Number(threshold.toFixed(2))
    }));
};

export const getExpenseSummary = async (userId: string, params: { propertyId?: string } = {}) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const query: any = {
    propertyId: { $in: propertyIds },
    type: { $in: ['utility', 'combined'] }
  };
  if (params.propertyId) query.propertyId = params.propertyId;

  const bills = await Bill.find(query).lean();
  let electricity = 0;
  let water = 0;
  let internet = 0;
  let others = 0;

  for (const bill of bills) {
    electricity += bill.utilityBreakdown?.electricity?.amount || 0;
    water += bill.utilityBreakdown?.water?.amount || 0;
    internet += bill.utilityBreakdown?.internet?.amount || 0;
    others += bill.utilityBreakdown?.others?.amount || 0;
  }

  return {
    electricity: Number(electricity.toFixed(2)),
    water: Number(water.toFixed(2)),
    internet: Number(internet.toFixed(2)),
    others: Number(others.toFixed(2)),
    total: Number((electricity + water + internet + others).toFixed(2))
  };
};

export const getAvailableUnits = async (userId: string, propertyId?: string) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const query: any = { propertyId: { $in: propertyIds } };
  if (propertyId) query.propertyId = propertyId;
  return Unit.find(query).select('_id unitIdentifier propertyId').lean();
};
