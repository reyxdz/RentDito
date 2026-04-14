import { User } from '../models/User';

/**
 * Check if user is admin
 */
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

/**
 * Get all pending verifications
 */
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

/**
 * Get all verifications (all statuses)
 */
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

/**
 * Approve user verification
 */
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

/**
 * Reject user verification
 */
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
