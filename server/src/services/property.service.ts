import { Property, IProperty } from '../models/Property';
import { User } from '../models/User';
import mongoose from 'mongoose';

/**
 * Get scoped query filter based on user role
 */
const getScopedFilter = async (userId: string, baseFilter: any = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Super admin sees all properties
  if (user.role === 'super_admin') {
    return baseFilter;
  }

  // Landlord sees only their properties
  if (user.role === 'landlord') {
    return { ...baseFilter, landlordId: userId };
  }

  // Staff sees only assigned properties
  if (user.role === 'staff') {
    const assignedIds = user.assignedPropertyIds || [];
    return { 
      ...baseFilter, 
      _id: { $in: assignedIds.map(id => new mongoose.Types.ObjectId(id)) } 
    };
  }

  // Regular users cannot access properties
  throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
};

/**
 * Get all properties with auto-scoping
 */
export const getProperties = async (
  userId: string,
  filters: {
    status?: string;
    propertyType?: string;
    city?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const { status, propertyType, city, page = 1, limit = 20 } = filters;

  // Build base filter
  const baseFilter: any = {};
  if (status) baseFilter.status = status;
  if (propertyType) baseFilter.propertyType = propertyType;
  if (city) baseFilter['address.city'] = new RegExp(city, 'i');

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, baseFilter);

  const skip = (page - 1) * limit;
  const properties = await Property.find(scopedFilter)
    .populate('landlordId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Property.countDocuments(scopedFilter);

  // Compute metrics for each property
  const Unit = mongoose.model('Unit');
  const propertiesWithMetrics = await Promise.all(
    properties.map(async (property) => {
      const totalUnits = await Unit.countDocuments({ propertyId: property._id });
      const occupiedUnits = await Unit.countDocuments({ 
        propertyId: property._id, 
        status: 'occupied' 
      });
      const vacantUnits = await Unit.countDocuments({ 
        propertyId: property._id, 
        status: 'vacant' 
      });

      return {
        ...property,
        metrics: {
          totalUnits,
          occupiedUnits,
          vacantUnits,
          occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        },
      };
    })
  );

  return {
    properties: propertiesWithMetrics,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single property by ID with auto-scoping
 */
export const getPropertyById = async (userId: string, propertyId: string) => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { _id: propertyId });

  const property = await Property.findOne(scopedFilter)
    .populate('landlordId', 'name email phone')
    .lean();

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  // Compute metrics
  const Unit = mongoose.model('Unit');
  const totalUnits = await Unit.countDocuments({ propertyId: property._id });
  const occupiedUnits = await Unit.countDocuments({ 
    propertyId: property._id, 
    status: 'occupied' 
  });
  const vacantUnits = await Unit.countDocuments({ 
    propertyId: property._id, 
    status: 'vacant' 
  });

  return {
    ...property,
    metrics: {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    },
  };
};

/**
 * Create new property (landlord only)
 */
export const createProperty = async (userId: string, data: Partial<IProperty>) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Only landlords can create properties
  if (user.role !== 'landlord' && user.role !== 'super_admin') {
    throw Object.assign(new Error('Only landlords can create properties'), { statusCode: 403 });
  }

  const property = await Property.create({
    ...data,
    landlordId: user.role === 'landlord' ? userId : data.landlordId,
  });

  return property.populate('landlordId', 'name email');
};

/**
 * Update property with auto-scoping
 */
export const updateProperty = async (
  userId: string,
  propertyId: string,
  data: Partial<IProperty>
) => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw Object.assign(new Error('Invalid property ID'), { statusCode: 400 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { _id: propertyId });

  const property = await Property.findOneAndUpdate(
    scopedFilter,
    { $set: data },
    { new: true, runValidators: true }
  ).populate('landlordId', 'name email');

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  return property;
};

/**
 * Update property status
 */
export const updatePropertyStatus = async (
  userId: string,
  propertyId: string,
  status: string
) => {
  return updateProperty(userId, propertyId, { status } as any);
};

/**
 * Soft delete property (set status to Archived)
 */
export const deleteProperty = async (userId: string, propertyId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Only landlords and admins can delete
  if (user.role !== 'landlord' && user.role !== 'super_admin') {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }

  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { _id: propertyId });

  const property = await Property.findOneAndUpdate(
    scopedFilter,
    { $set: { status: 'Archived' } },
    { new: true }
  );

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  return property;
};

/**
 * Upload property images
 */
export const uploadPropertyImages = async (
  userId: string,
  propertyId: string,
  imageUrls: string[]
) => {
  // Apply role-based scoping
  const scopedFilter = await getScopedFilter(userId, { _id: propertyId });

  const property = await Property.findOneAndUpdate(
    scopedFilter,
    { $push: { images: { $each: imageUrls } } },
    { new: true }
  );

  if (!property) {
    throw Object.assign(new Error('Property not found or access denied'), { statusCode: 404 });
  }

  return property;
};
