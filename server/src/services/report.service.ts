import mongoose from 'mongoose';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Contract } from '../models/Contract';
import { User } from '../models/User';

/**
 * Helper to get property IDs accessible by the user
 */
const getAccessiblePropertyIds = async (userId: string): Promise<mongoose.Types.ObjectId[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  let filter: any = {};
  if (user.role === 'landlord') {
    filter = { landlordId: userId };
  } else if (user.role === 'staff') {
    const assignedIds = user.assignedPropertyIds || [];
    filter = { _id: { $in: assignedIds.map(id => new mongoose.Types.ObjectId(id)) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }

  const properties = await Property.find(filter).select('_id name');
  return properties.map(p => p._id as mongoose.Types.ObjectId);
};

export const getOccupancyStats = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return {
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      reservedUnits: 0,
      maintenanceUnits: 0,
      occupancyRate: 0,
      propertyBreakdown: []
    };
  }

  // Aggregate stats across all units
  const stats = await Unit.aggregate([
    { $match: { propertyId: { $in: propertyIds } } },
    {
      $group: {
        _id: null,
        totalUnits: { $sum: 1 },
        occupiedUnits: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
        vacantUnits: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
        reservedUnits: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
        maintenanceUnits: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
      }
    }
  ]);

  const overall = stats[0] || {
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    reservedUnits: 0,
    maintenanceUnits: 0
  };

  const occupancyRate = overall.totalUnits > 0
    ? (overall.occupiedUnits / overall.totalUnits) * 100
    : 0;

  // Breakdown per property
  const breakdown = await Unit.aggregate([
    { $match: { propertyId: { $in: propertyIds } } },
    {
      $group: {
        _id: '$propertyId',
        totalUnits: { $sum: 1 },
        occupiedUnits: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
        vacantUnits: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
        reservedUnits: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
        maintenanceUnits: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: 'properties',
        localField: '_id',
        foreignField: '_id',
        as: 'property'
      }
    },
    { $unwind: '$property' },
    {
      $project: {
        propertyId: '$_id',
        propertyName: '$property.name',
        totalUnits: 1,
        occupiedUnits: 1,
        vacantUnits: 1,
        reservedUnits: 1,
        maintenanceUnits: 1,
        occupancyRate: {
          $cond: [
            { $gt: ['$totalUnits', 0] },
            { $multiply: [{ $divide: ['$occupiedUnits', '$totalUnits'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { propertyName: 1 } }
  ]);

  return {
    ...overall,
    occupancyRate,
    propertyBreakdown: breakdown
  };
};

export const getCheckoutForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return {
      monthlyForecast: [],
      peakMonth: null,
      expiringContracts: []
    };
  }

  // Next 6 months range
  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);

  // Expiring contracts
  const expiringContracts = await Contract.find({
    propertyId: { $in: propertyIds },
    status: { $in: ['active', 'signed'] },
    endDate: { $gte: now, $lte: sixMonthsFromNow }
  })
  .populate('propertyId', 'name')
  .populate('unitId', 'unitIdentifier')
  .populate('userId', 'name')
  .sort({ endDate: 1 })
  .lean();

  // Aggregate by month
  const monthlyForecastMap: Record<string, { month: string; year: number; expiringCount: number; revenueLoss: number }> = {};
  
  // Initialize next 6 months to ensure zeroes are returned
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'short' });
    monthlyForecastMap[monthKey] = {
      month: monthName,
      year: d.getFullYear(),
      expiringCount: 0,
      revenueLoss: 0
    };
  }

  let peakMonth = null;
  let maxExpiring = -1;

  expiringContracts.forEach(contract => {
    const d = new Date(contract.endDate);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyForecastMap[monthKey]) {
      monthlyForecastMap[monthKey].expiringCount += 1;
      monthlyForecastMap[monthKey].revenueLoss += contract.monthlyRent || 0;
    }
  });

  const monthlyForecast = Object.values(monthlyForecastMap).map(data => {
    if (data.expiringCount > maxExpiring) {
      maxExpiring = data.expiringCount;
      peakMonth = `${data.month} ${data.year}`;
    }
    return data;
  });

  return {
    monthlyForecast,
    peakMonth: maxExpiring > 0 ? peakMonth : null,
    expiringContracts: expiringContracts.map(c => ({
      contractId: c._id,
      propertyName: (c.propertyId as any)?.name,
      unitIdentifier: (c.unitId as any)?.unitIdentifier,
      tenantName: (c.userId as any)?.name,
      endDate: c.endDate,
      monthlyRent: c.monthlyRent
    }))
  };
};
