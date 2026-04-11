import { User } from '../models/User';
import { hash, compare } from '../utils/password';

/**
 * Get the current user's profile, including activeTenancy lookup.
 */
export const getMe = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const userObj: any = user.toObject();

  // Look up active tenancy (lazy import to avoid circular deps)
  try {
    const mongoose = await import('mongoose');
    const TenancyModel = mongoose.default.models['Tenancy'];
    if (TenancyModel) {
      const activeTenancy = await TenancyModel.findOne({
        userId,
        status: 'checked_in',
      }).populate('propertyId unitId');
      userObj.activeTenancy = activeTenancy || null;
    } else {
      userObj.activeTenancy = null;
    }
  } catch {
    userObj.activeTenancy = null;
  }

  return userObj;
};

/**
 * Update the current user's profile fields (name, phone).
 */
export const updateMe = async (userId: string, data: { name?: string; phone?: string }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  await user.save();

  const { passwordHash: _, ...result } = user.toObject();
  return result;
};

/**
 * Change the current user's password.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isMatch = await compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }

  user.passwordHash = await hash(newPassword);
  await user.save();
};

/**
 * Update the user's avatar URL.
 */
export const updateAvatar = async (userId: string, avatarUrl: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true }
  ).select('-passwordHash');

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return user;
};

/**
 * Submit ID photos for verification (sets verificationStatus to 'pending').
 */
export const submitVerification = async (userId: string, idPhotos: string[]) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus === 'verified') {
    throw Object.assign(new Error('Account is already verified.'), { statusCode: 400 });
  }

  if (!idPhotos || idPhotos.length === 0) {
    throw Object.assign(new Error('At least one ID photo is required.'), { statusCode: 400 });
  }

  user.idPhotos = idPhotos;
  user.verificationStatus = 'pending';
  await user.save();

  const { passwordHash: _, ...result } = user.toObject();
  return result;
};
