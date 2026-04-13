import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import mongoose from 'mongoose';

/**
 * Get all active properties with metrics (public, no auth)
 */
export const getPublicListings = async (filters: {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
} = {}) => {
  const { city, propertyType, minPrice, maxPrice, page = 1, limit = 20 } = filters;

  // Build filter - only active properties
  const filter: any = { status: 'Active' };
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (propertyType) filter.propertyType = propertyType;

  const skip = (page - 1) * limit;
  const properties = await Property.find(filter)
    .populate('landlordId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Property.countDocuments(filter);

  // Compute metrics and price ranges for each property
  const propertiesWithDetails = await Promise.all(
    properties.map(async (property) => {
      const units = await Unit.find({ 
        propertyId: property._id,
        status: { $in: ['vacant', 'occupied', 'reserved'] } // Exclude maintenance
      }).lean();

      const totalUnits = units.length;
      const vacantUnits = units.filter(u => u.status === 'vacant').length;
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;

      // Calculate price range
      const prices: number[] = [];
      units.forEach(unit => {
        if (unit.roomRent) prices.push(unit.roomRent);
        if (unit.bedspaceRent) prices.push(unit.bedspaceRent);
      });

      const minUnitPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxUnitPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // Apply price filter if specified
      if (minPrice && maxUnitPrice < minPrice) return null;
      if (maxPrice && minUnitPrice > maxPrice) return null;

      return {
        ...property,
        metrics: {
          totalUnits,
          vacantUnits,
          occupiedUnits,
          occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        },
        priceRange: {
          min: minUnitPrice,
          max: maxUnitPrice,
        },
      };
    })
  );

  // Filter out null entries (properties that didn't match price filter)
  const filteredProperties = propertiesWithDetails.filter(p => p !== null);

  return {
    properties: filteredProperties,
    pagination: {
      page,
      limit,
      total: filteredProperties.length,
      pages: Math.ceil(filteredProperties.length / limit),
    },
  };
};

/**
 * Get single property with units (public, no auth)
 */
export const getPublicPropertyById = async (propertyId: string) => {
  const property = await Property.findOne({ _id: propertyId, status: 'Active' })
    .populate('landlordId', 'name email phone')
    .lean();

  if (!property) {
    throw Object.assign(new Error('Property not found or not available'), { statusCode: 404 });
  }

  // Get all non-maintenance units
  const units = await Unit.find({ 
    propertyId: property._id,
    status: { $in: ['vacant', 'occupied', 'reserved'] }
  })
    .sort({ unitIdentifier: 1 })
    .lean();

  const totalUnits = units.length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;

  // Calculate price range
  const prices: number[] = [];
  units.forEach(unit => {
    if (unit.roomRent) prices.push(unit.roomRent);
    if (unit.bedspaceRent) prices.push(unit.bedspaceRent);
  });

  return {
    ...property,
    units,
    metrics: {
      totalUnits,
      vacantUnits,
      occupiedUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    },
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
  };
};

/**
 * Get single unit detail (public, no auth)
 */
export const getPublicUnitById = async (unitId: string) => {
  const unit = await Unit.findOne({ 
    _id: unitId,
    status: { $in: ['vacant', 'occupied', 'reserved'] }
  })
    .populate({
      path: 'propertyId',
      match: { status: 'Active' },
      populate: { path: 'landlordId', select: 'name email phone' }
    })
    .lean();

  if (!unit || !unit.propertyId) {
    throw Object.assign(new Error('Unit not found or not available'), { statusCode: 404 });
  }

  return unit;
};
