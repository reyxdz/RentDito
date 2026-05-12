import { User } from '../models/User';
import { Property } from '../models/Property';
import { Tenancy } from '../models/Tenancy';
import { Bill } from '../models/Bill';
import { AuditLog } from '../models/AuditLog';
import { LandlordApplication } from '../models/LandlordApplication';
import { Notification } from '../models/Notification';

// ─────────────────────────────────────────────────────────────
//  Access Guard
// ─────────────────────────────────────────────────────────────

const checkAdminAccess = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied. Admin only.'), { statusCode: 403 });
  }
  return user;
};

// ─────────────────────────────────────────────────────────────
//  Platform KPIs (GET /stats)
// ─────────────────────────────────────────────────────────────

export const getPlatformStats = async (adminId: string) => {
  await checkAdminAccess(adminId);

  // Run all aggregations in parallel
  const [
    totalUsers,
    totalLandlords,
    totalStaff,
    totalProperties,
    activeTenancies,
    totalTenancies,
    pendingVerifications,
    pendingLandlordApps,
    revenueAgg,
    monthlyGrowth,
    usersByRole,
    recentUsers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'landlord' }),
    User.countDocuments({ role: 'staff' }),
    Property.countDocuments(),
    Tenancy.countDocuments({ status: 'checked_in' }),
    Tenancy.countDocuments(),
    User.countDocuments({ verificationStatus: 'pending' }),
    LandlordApplication.countDocuments({ status: 'pending' }),
    // Total revenue from paid bills
    Bill.aggregate([
      { $match: { status: { $in: ['paid', 'partial'] } } },
      { $group: { _id: null, totalCollected: { $sum: '$paidAmount' }, totalBilled: { $sum: '$totalAmount' } } }
    ]),
    // Monthly user growth (last 6 months)
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Users by role breakdown
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    // 5 most recent users
    User.find()
      .select('name email role status createdAt avatar')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  const revenue = revenueAgg[0] || { totalCollected: 0, totalBilled: 0 };

  return {
    overview: {
      totalUsers,
      totalLandlords,
      totalStaff,
      totalProperties,
      activeTenancies,
      totalTenancies,
      pendingVerifications,
      pendingLandlordApps
    },
    financial: {
      totalCollected: revenue.totalCollected,
      totalBilled: revenue.totalBilled,
      collectionRate: revenue.totalBilled > 0
        ? Math.round((revenue.totalCollected / revenue.totalBilled) * 100)
        : 0
    },
    charts: {
      monthlyGrowth: monthlyGrowth.map((item: any) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count
      })),
      usersByRole: usersByRole.map((item: any) => ({
        role: item._id,
        count: item.count
      }))
    },
    recentUsers
  };
};

// ─────────────────────────────────────────────────────────────
//  User Management (GET /users, PATCH /users/:id/status)
// ─────────────────────────────────────────────────────────────

export const getUsers = async (
  adminId: string,
  filters: {
    role?: string;
    status?: string;
    verificationStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { role, status, verificationStatus, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (role) query.role = role;
  if (status) query.status = status;
  if (verificationStatus) query.verificationStatus = verificationStatus;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -refreshToken -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export const updateUserStatus = async (
  adminId: string,
  targetUserId: string,
  newStatus: 'active' | 'suspended'
) => {
  await checkAdminAccess(adminId);

  const user = await User.findById(targetUserId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (user.role === 'super_admin') {
    throw Object.assign(new Error('Cannot modify another super admin'), { statusCode: 403 });
  }

  user.status = newStatus;
  await user.save();

  // Log the action
  await AuditLog.create({
    userId: adminId,
    action: newStatus === 'suspended' ? 'user_suspended' : 'user_activated',
    resourceType: 'User',
    resourceId: targetUserId,
    details: { targetUserEmail: user.email, newStatus }
  });

  // Notify the user
  await Notification.create({
    userId: targetUserId,
    type: 'system',
    title: newStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
    message: newStatus === 'suspended'
      ? 'Your account has been suspended by an administrator. Contact support for more information.'
      : 'Your account has been reactivated. You may now log in and use the platform.',
    link: '/'
  });

  const { passwordHash: _, ...result } = user.toObject();
  return result;
};

// ─────────────────────────────────────────────────────────────
//  Activity / Audit Log (GET /activity)
// ─────────────────────────────────────────────────────────────

export const getActivityLog = async (
  adminId: string,
  filters: {
    action?: string;
    resourceType?: string;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { action, resourceType, userId, page = 1, limit = 30 } = filters;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (userId) query.userId = userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email avatar role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// ─────────────────────────────────────────────────────────────
//  Verification endpoints (existing — preserved)
// ─────────────────────────────────────────────────────────────

export const getPendingVerifications = async (
  adminId: string,
  filters: { page?: number; limit?: number } = {}
) => {
  await checkAdminAccess(adminId);

  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const users = await User.find({ verificationStatus: 'pending' })
    .select('-passwordHash -refreshToken -resetPasswordToken')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments({ verificationStatus: 'pending' });

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getAllVerifications = async (
  adminId: string,
  filters: {
    verificationStatus?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  await checkAdminAccess(adminId);

  const { verificationStatus, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }

  const users = await User.find(filter)
    .select('-passwordHash -refreshToken -resetPasswordToken')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(filter);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const approveVerification = async (adminId: string, targetUserId: string) => {
  await checkAdminAccess(adminId);

  const user = await User.findById(targetUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'pending') {
    throw Object.assign(
      new Error('User verification is not pending'),
      { statusCode: 400 }
    );
  }

  user.verificationStatus = 'verified';
  await user.save();

  const { passwordHash: _, ...result } = user.toObject();
  return result;
};

export const rejectVerification = async (
  adminId: string,
  targetUserId: string,
  reason?: string
) => {
  await checkAdminAccess(adminId);

  const user = await User.findById(targetUserId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'pending') {
    throw Object.assign(
      new Error('User verification is not pending'),
      { statusCode: 400 }
    );
  }

  user.verificationStatus = 'unverified';
  user.idPhotos = []; // Clear ID photos on rejection
  await user.save();

  const { passwordHash: _, ...result } = user.toObject();
  return { ...result, rejectionReason: reason };
};
