import Joi from 'joi';

export const createVisitRequestSchema = Joi.object({
  propertyId: Joi.string().required(),
  unitId: Joi.string(),
  requestedDate: Joi.date().iso().min('now').required(),
  requestedTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  purpose: Joi.string().valid('viewing', 'inspection').default('viewing'),
  notes: Joi.string().trim().max(500)
});

export const scheduleVisitSchema = Joi.object({
  scheduledDate: Joi.date().iso().min('now').required(),
  scheduledTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
});

export const assignStaffSchema = Joi.object({
  staffId: Joi.string().required()
});

export const updateNotesSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow('')
});
