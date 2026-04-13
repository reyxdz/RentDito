import Joi from 'joi';

export const createUnitSchema = Joi.object({
  propertyId: Joi.string().required(),
  unitIdentifier: Joi.string().trim().required(),
  accommodationType: Joi.string().valid('room', 'bedspace').required(),
  roomRent: Joi.number().min(0),
  bedspaceRent: Joi.number().min(0),
  perHeadRate: Joi.number().min(0),
  deposit: Joi.number().min(0).required(),
  capacity: Joi.number().integer().min(1).required(),
  maxOccupants: Joi.number().integer().min(1).required(),
  sizeSqm: Joi.number().min(0),
  features: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string()),
  status: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance'),
  slots: Joi.array().items(
    Joi.object({
      slotNumber: Joi.number().integer().min(1).required(),
      status: Joi.string().valid('vacant', 'occupied', 'reserved'),
      tenancyId: Joi.string()
    })
  )
});

export const updateUnitSchema = Joi.object({
  unitIdentifier: Joi.string().trim(),
  accommodationType: Joi.string().valid('room', 'bedspace'),
  roomRent: Joi.number().min(0),
  bedspaceRent: Joi.number().min(0),
  perHeadRate: Joi.number().min(0),
  deposit: Joi.number().min(0),
  capacity: Joi.number().integer().min(1),
  maxOccupants: Joi.number().integer().min(1),
  sizeSqm: Joi.number().min(0),
  features: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string()),
  status: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance'),
  slots: Joi.array().items(
    Joi.object({
      slotNumber: Joi.number().integer().min(1).required(),
      status: Joi.string().valid('vacant', 'occupied', 'reserved'),
      tenancyId: Joi.string()
    })
  )
}).min(1);

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance').required()
});

export const uploadImagesSchema = Joi.object({
  images: Joi.array().items(Joi.string()).min(1).required()
});
