import Joi from 'joi';

export const createInquirySchema = Joi.object({
  propertyId: Joi.string().required(),
  unitId: Joi.string(),
  subject: Joi.string().trim().min(5).max(200).required(),
  initialMessage: Joi.string().trim().min(10).max(1000).required()
});

export const updateInquiryStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'closed', 'converted').required()
});
