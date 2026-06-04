import Joi from 'joi';

export const submitReadingsSchema = Joi.object({
  tenancyId: Joi.string().required(),
  billingPeriod: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required(),
  dueDate: Joi.date().iso().required(),
  allocationMode: Joi.string().valid('full', 'per_head').default('full'),
  utilityBreakdown: Joi.object({
    electricity: Joi.object({
      previousReading: Joi.number().min(0).required(),
      currentReading: Joi.number().min(0).required(),
      rate: Joi.number().min(0).required()
    }).optional(),
    water: Joi.object({
      previousReading: Joi.number().min(0).required(),
      currentReading: Joi.number().min(0).required(),
      rate: Joi.number().min(0).required()
    }).optional(),
    internet: Joi.object({
      amount: Joi.number().min(0).default(0)
    }).optional(),
    others: Joi.object({
      description: Joi.string().trim().allow('').optional(),
      amount: Joi.number().min(0).default(0)
    }).optional()
  }).required(),
  notes: Joi.string().trim().max(2000).allow('').optional()
});

export const consumptionQuerySchema = Joi.object({
  propertyId: Joi.string().optional(),
  year: Joi.number().integer().min(2020).max(2100).optional(),
  months: Joi.number().integer().min(1).max(24).optional()
});

export const highestUsageQuerySchema = Joi.object({
  propertyId: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

export const overconsumptionQuerySchema = Joi.object({
  propertyId: Joi.string().optional(),
  multiplier: Joi.number().min(1).max(5).optional()
});

export const expenseSummaryQuerySchema = Joi.object({
  propertyId: Joi.string().optional()
});
