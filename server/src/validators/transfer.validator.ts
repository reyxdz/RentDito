import Joi from 'joi';

export const createTransferRequestSchema = Joi.object({
  tenancyId: Joi.string().required(),
  toUnitId: Joi.string().required(),
  reason: Joi.string().trim().min(5).max(2000).required()
});

export const reviewTransferRequestSchema = Joi.object({
  reviewNotes: Joi.string().trim().max(2000).allow('').optional()
});
