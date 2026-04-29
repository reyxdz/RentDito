import Joi from 'joi';

export const createPropertySchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required()
    .messages({
      'string.min': 'Property name must be at least 3 characters',
      'any.required': 'Property name is required',
    }),
  description: Joi.string().trim().min(10).max(2000).required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'any.required': 'Description is required',
    }),
  address: Joi.object({
    street: Joi.string().required().messages({ 'any.required': 'Street address is required' }),
    barangay: Joi.string().trim().allow(''),
    city: Joi.string().required().messages({ 'any.required': 'City is required' }),
    province: Joi.string().required().messages({ 'any.required': 'Province is required' }),
    zipCode: Joi.string().required().messages({ 'any.required': 'Zip code is required' }),
    country: Joi.string().default('Philippines'),
  }).required(),
  amenities: Joi.array().items(Joi.string()).default([]),
  inclusions: Joi.array().items(Joi.string()).default([]),
  propertyType: Joi.string()
    .valid('Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use')
    .required()
    .messages({ 'any.required': 'Property type is required' }),
  status: Joi.string()
    .valid('Active', 'Inactive', 'Maintenance', 'Archived')
    .default('Inactive'),
  venues: Joi.object({
    reviewCenters: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).default([]),
    schools: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).default([]),
    commercial: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).default([]),
  }).default({}),
  billingSettings: Joi.object({
    billingDay: Joi.number().integer().min(1).max(31).default(1),
    dueDay: Joi.number().integer().min(1).max(31).default(5),
    lateFeePercent: Joi.number().min(0).max(100).default(5),
    utilityDefault: Joi.string().valid('included', 'metered', 'shared').default('metered'),
  }).default({}),
  emergencyContacts: Joi.array().items(
    Joi.object({
      name: Joi.string().required().messages({ 'any.required': 'Contact name is required' }),
      phone: Joi.string().required().messages({ 'any.required': 'Contact phone is required' }),
      role: Joi.string().required().messages({ 'any.required': 'Contact role is required' }),
    })
  ).default([]),
  geoCoords: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).optional(),
});

export const updatePropertySchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().min(10).max(2000).optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    barangay: Joi.string().trim().allow('').optional(),
    city: Joi.string().optional(),
    province: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  inclusions: Joi.array().items(Joi.string()).optional(),
  propertyType: Joi.string()
    .valid('Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use')
    .optional(),
  status: Joi.string()
    .valid('Active', 'Inactive', 'Maintenance', 'Archived')
    .optional(),
  venues: Joi.object({
    reviewCenters: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).optional(),
    schools: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).optional(),
    commercial: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().required(),
      })
    ).optional(),
  }).optional(),
  billingSettings: Joi.object({
    billingDay: Joi.number().integer().min(1).max(31).optional(),
    dueDay: Joi.number().integer().min(1).max(31).optional(),
    lateFeePercent: Joi.number().min(0).max(100).optional(),
    utilityDefault: Joi.string().valid('included', 'metered', 'shared').optional(),
  }).optional(),
  emergencyContacts: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      role: Joi.string().required(),
    })
  ).optional(),
  geoCoords: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).optional(),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Active', 'Inactive', 'Maintenance', 'Archived')
    .required()
    .messages({ 'any.required': 'Status is required' }),
});
