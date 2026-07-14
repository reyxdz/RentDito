import mongoose from 'mongoose';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Contract } from '../models/Contract';
import { Tenancy } from '../models/Tenancy';
import { Inquiry } from '../models/Inquiry';
import { VisitRequest } from '../models/VisitRequest';
import { RentalApplication } from '../models/RentalApplication';
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
      expiringContracts: [],
      historicalTrend: [],
      totalRevenueLoss: 0
    };
  }

  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);

  // ── Future expiring contracts ──────────────────────────────
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
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'short' });
    monthlyForecastMap[monthKey] = { month: monthName, year: d.getFullYear(), expiringCount: 0, revenueLoss: 0 };
  }

  let peakMonth: string | null = null;
  let maxExpiring = -1;
  let totalRevenueLoss = 0;

  expiringContracts.forEach(contract => {
    const d = new Date(contract.endDate);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyForecastMap[monthKey]) {
      monthlyForecastMap[monthKey].expiringCount += 1;
      monthlyForecastMap[monthKey].revenueLoss += contract.monthlyRent || 0;
      totalRevenueLoss += contract.monthlyRent || 0;
    }
  });

  const monthlyForecast = Object.values(monthlyForecastMap).map(data => {
    if (data.expiringCount > maxExpiring) {
      maxExpiring = data.expiringCount;
      peakMonth = `${data.month} ${data.year}`;
    }
    return data;
  });

  // ── Historical checkout trend (past 12 months) ─────────────
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 12);

  const historicalCheckouts = await Tenancy.aggregate([
    {
      $match: {
        propertyId: { $in: propertyIds },
        status: 'checked_out',
        checkOutDate: { $gte: twelveMonthsAgo, $lte: now }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$checkOutDate' },
          month: { $month: '$checkOutDate' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Build 12-month historical array
  const historicalTrend: { month: string; year: number; checkouts: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    const match = historicalCheckouts.find(
      (h: any) => h._id.year === d.getFullYear() && h._id.month === d.getMonth() + 1
    );
    historicalTrend.push({ month: monthName, year: d.getFullYear(), checkouts: match ? match.count : 0 });
  }

  return {
    monthlyForecast,
    peakMonth: maxExpiring > 0 ? peakMonth : null,
    totalRevenueLoss,
    historicalTrend,
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

// ─── Vacancy Forecast ────────────────────────────────────────────────────────
export const getVacancyForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return { currentVacant: 0, predictedVacant: 0, totalUnits: 0, propertyBreakdown: [] };
  }

  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(now.getMonth() + 3);

  // Current vacancy per property
  const propertyBreakdown = await Unit.aggregate([
    { $match: { propertyId: { $in: propertyIds } } },
    {
      $group: {
        _id: '$propertyId',
        totalUnits: { $sum: 1 },
        currentVacant: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
        occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } }
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
    { $sort: { 'property.name': 1 } }
  ]);

  // Contracts expiring in next 3 months (predicted additional vacancies)
  const expiringContracts = await Contract.find({
    propertyId: { $in: propertyIds },
    status: { $in: ['active', 'signed'] },
    endDate: { $gte: now, $lte: threeMonthsFromNow }
  }).lean();

  // Count predicted checkouts per property
  const predictedByProperty: Record<string, number> = {};
  expiringContracts.forEach(c => {
    const pid = c.propertyId.toString();
    predictedByProperty[pid] = (predictedByProperty[pid] || 0) + 1;
  });

  let totalUnits = 0;
  let currentVacant = 0;
  let predictedVacant = 0;

  const breakdown = propertyBreakdown.map((row: any) => {
    const pid = row._id.toString();
    const predicted = predictedByProperty[pid] || 0;
    totalUnits += row.totalUnits;
    currentVacant += row.currentVacant;
    predictedVacant += row.currentVacant + predicted;

    return {
      propertyId: pid,
      propertyName: row.property.name,
      totalUnits: row.totalUnits,
      currentVacant: row.currentVacant,
      predictedVacant: row.currentVacant + predicted,
      currentVacancyRate: row.totalUnits > 0 ? (row.currentVacant / row.totalUnits) * 100 : 0,
      predictedVacancyRate: row.totalUnits > 0 ? ((row.currentVacant + predicted) / row.totalUnits) * 100 : 0
    };
  });

  return {
    totalUnits,
    currentVacant,
    predictedVacant,
    currentVacancyRate: totalUnits > 0 ? (currentVacant / totalUnits) * 100 : 0,
    predictedVacancyRate: totalUnits > 0 ? (predictedVacant / totalUnits) * 100 : 0,
    propertyBreakdown: breakdown
  };
};

// ─── Reservation Forecast (Pipeline Counts) ──────────────────────────────────
export const getReservationForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return { pendingInquiries: 0, scheduledVisits: 0, pendingApplications: 0, conversionRate: 0 };
  }

  const [pendingInquiries, scheduledVisits, pendingApplications, totalApplications, approvedApplications] = await Promise.all([
    Inquiry.countDocuments({ propertyId: { $in: propertyIds }, status: { $in: ['new', 'open'] } }),
    VisitRequest.countDocuments({ propertyId: { $in: propertyIds }, status: { $in: ['approved', 'scheduled'] } }),
    RentalApplication.countDocuments({ propertyId: { $in: propertyIds }, status: 'pending_review' }),
    RentalApplication.countDocuments({ propertyId: { $in: propertyIds } }),
    RentalApplication.countDocuments({ propertyId: { $in: propertyIds }, status: 'approved' })
  ]);

  const conversionRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

  return {
    pendingInquiries,
    scheduledVisits,
    pendingApplications,
    totalApplications,
    approvedApplications,
    conversionRate
  };
};
