import { Unit, IUnit } from '../models/Unit';
import { Property } from '../models/Property';
import { User } from '../models/User';
import mongoose from 'mongoose';

/**
 * Get scoped property filter based on user role
 */
const getScopedPropertyFilter = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.role === 'super_admin') {
    return {};
  }

  if (user.role === 'landlord') {
    return { landlordId: userId };
  }

  if (user.role === 'staff') {
    const assignedIds = user.assignedPropertyIds || [];
    return { _id: { $in: assignedIds.map(id => new mongoose.Types.ObjectId(id)) } };
  }

  throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
};

/**
 * Get all units with filters and auto-scoping
 */
export const getUnits = async (
  userId: string,
  filters: {
    propertyId?: string;
    status?: string;
    accommodationType?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { propertyId, status, accommodationType, page = 1, limit = 20 } = filters;

  // Get accessible properties
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await Property.find(propertyFilter).select('_id').lean();
  const accessiblePropertyIds = accessibleProperties.map(p => p._id);

  // Build unit filter
  const unitFilter: any = { propertyId: { $in: accessiblePropertyIds } };
  if (propertyId) unitFilter.propertyId = propertyId;
  if (status) unitFilter.status = status;
  if (accommodationType) unitFilter.accommodationType = accommodationType;

  const skip = (page - 1) * limit;
  const units = await Unit.find(unitFilter)
    .populate('propertyId', 'name address')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Unit.countDocuments(unitFilter);

  return {
    units,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get single unit by ID with auto-scoping
 */
export const getUnitById = async (userId: string, unitId: string) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await Property.find(propertyFilter).select('_id').lean();
  const accessiblePropertyIds = accessibleProperties.map(p => p._id.toString());

  const unit = await Unit.findById(unitId).populate('propertyId', 'name address').lean();

  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(unit.propertyId._id.toString())) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return unit;
};

/**
 * Get units by property ID
 */
export const getUnitsByProperty = async (userId: string, propertyId: string) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const property = await Property.findOne({ ...propertyFilter, _id: propertyId });

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  const units = await Unit.find({ propertyId }).sort({ unitIdentifier: 1 }).lean();
  return units;
};

/**
 * Create new unit
 */
export const createUnit = async (userId: string, data: Partial<IUnit>) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const property = await Property.findOne({ ...propertyFilter, _id: data.propertyId });

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  const unit = await Unit.create(data);
  return unit.populate('propertyId', 'name address');
};

/**
 * Update unit
 */
export const updateUnit = async (userId: string, unitId: string, data: Partial<IUnit>) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await Property.find(propertyFilter).select('_id').lean();
  const accessiblePropertyIds = accessibleProperties.map(p => p._id.toString());

  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(unit.propertyId.toString())) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  Object.assign(unit, data);
  await unit.save();

  return unit.populate('propertyId', 'name address');
};

/**
 * Update unit status
 */
export const updateUnitStatus = async (userId: string, unitId: string, status: string) => {
  return updateUnit(userId, unitId, { status } as any);
};

/**
 * Delete unit
 */
export const deleteUnit = async (userId: string, unitId: string) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await Property.find(propertyFilter).select('_id').lean();
  const accessiblePropertyIds = accessibleProperties.map(p => p._id.toString());

  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(unit.propertyId.toString())) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  await unit.deleteOne();
  return { message: 'Unit deleted successfully' };
};

/**
 * Upload unit images
 */
export const uploadUnitImages = async (userId: string, unitId: string, imageUrls: string[]) => {
  const propertyFilter = await getScopedPropertyFilter(userId);
  const accessibleProperties = await Property.find(propertyFilter).select('_id').lean();
  const accessiblePropertyIds = accessibleProperties.map(p => p._id.toString());

  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
  }

  if (!accessiblePropertyIds.includes(unit.propertyId.toString())) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  unit.images.push(...imageUrls);
  await unit.save();

  return unit.populate('propertyId', 'name address');
};
