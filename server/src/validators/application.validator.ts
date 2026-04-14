import Joi from 'joi';

export const createApplicationSchema = Joi.object({
  propertyId: Joi.string().required(),
  unitId: Joi.string().required(),
  personalDetails: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().pattern(/^[0-9+\-\s()]+$/).required(),
    occupation: Joi.string().trim().min(2).max(100).required(),
    school: Joi.string().trim().max(100),
    address: Joi.string().trim().min(10).max(300).required(),
    emergencyContact: Joi.object({
      name: Joi.string().trim().min(2).max(100).required(),
      phone: Joi.string().trim().pattern(/^[0-9+\-\s()]+$/).required(),
      relationship: Joi.string().trim().min(2).max(50).required()
    }).required()
  }).required(),
  documents: Joi.array().items(Joi.string()).min(1).required()
});

export const reviewApplicationSchema = Joi.object({
  reviewNotes: Joi.string().trim().max(1000)
});

export const approveApplicationSchema = Joi.object({
  reviewNotes: Joi.string().trim().max(1000)
});

export const rejectApplicationSchema = Joi.object({
  reviewNotes: Joi.string().trim().min(10).max(1000).required()
});
