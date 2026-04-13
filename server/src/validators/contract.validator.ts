import Joi from 'joi';

export const createFromApplicationSchema = Joi.object({
  applicationId: Joi.string().required()
});

export const updateContractSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  lockInPeriod: Joi.number().min(0).max(60),
  monthlyRent: Joi.number().min(0),
  securityDeposit: Joi.number().min(0),
  advancePayment: Joi.number().min(0),
  utilityIncludedInRent: Joi.boolean(),
  rateType: Joi.string().valid('fixed', 'submetered'),
  terms: Joi.string().trim().max(5000).allow('')
}).min(1);

export const signContractSchema = Joi.object({
  signatureData: Joi.string().required(),
  role: Joi.string().valid('landlord', 'tenant').required()
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'pending_review', 'pending_signature', 'signed', 'active', 'expired', 'terminated')
    .required()
});
