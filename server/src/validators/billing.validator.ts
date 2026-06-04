import Joi from 'joi';

export const createManualBillSchema = Joi.object({
  tenancyId: Joi.string().required(),
  type: Joi.string().valid('rent', 'utility', 'penalty', 'combined').required(),
  billingPeriod: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required(),
  rentAmount: Joi.number().min(0).default(0),
  utilityAmount: Joi.number().min(0).default(0),
  penaltyAmount: Joi.number().min(0).default(0),
  dueDate: Joi.date().iso().required(),
  utilityBreakdown: Joi.object({
    electricity: Joi.object({
      previousReading: Joi.number(),
      currentReading: Joi.number(),
      consumption: Joi.number(),
      rate: Joi.number(),
      amount: Joi.number().min(0).default(0)
    }),
    water: Joi.object({
      previousReading: Joi.number(),
      currentReading: Joi.number(),
      consumption: Joi.number(),
      rate: Joi.number(),
      amount: Joi.number().min(0).default(0)
    }),
    internet: Joi.object({
      amount: Joi.number().min(0).default(0)
    }),
    others: Joi.object({
      description: Joi.string().trim(),
      amount: Joi.number().min(0).default(0)
    })
  }).optional(),
  notes: Joi.string().trim().max(2000).allow('').optional()
});

export const autoGenerateSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2020).max(2100).optional()
});

export const createUtilityBillSchema = Joi.object({
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

export const createCombinedBillSchema = Joi.object({
  tenancyId: Joi.string().required(),
  billingPeriod: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required(),
  dueDate: Joi.date().iso().required(),
  rentAmount: Joi.number().min(0).required(),
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
  }).optional(),
  allocationMode: Joi.string().valid('full', 'per_head').default('full'),
  penaltyAmount: Joi.number().min(0).default(0),
  notes: Joi.string().trim().max(2000).allow('').optional()
});

export const updateBillSchema = Joi.object({
  rentAmount: Joi.number().min(0),
  utilityAmount: Joi.number().min(0),
  penaltyAmount: Joi.number().min(0),
  dueDate: Joi.date().iso(),
  utilityBreakdown: Joi.object({
    electricity: Joi.object({
      previousReading: Joi.number(),
      currentReading: Joi.number(),
      consumption: Joi.number(),
      rate: Joi.number(),
      amount: Joi.number().min(0).default(0)
    }),
    water: Joi.object({
      previousReading: Joi.number(),
      currentReading: Joi.number(),
      consumption: Joi.number(),
      rate: Joi.number(),
      amount: Joi.number().min(0).default(0)
    }),
    internet: Joi.object({
      amount: Joi.number().min(0).default(0)
    }),
    others: Joi.object({
      description: Joi.string().trim(),
      amount: Joi.number().min(0).default(0)
    })
  }),
  notes: Joi.string().trim().max(2000).allow('')
}).min(1);

export const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).required(),
  method: Joi.string().valid('cash', 'gcash', 'bank_transfer', 'other').required(),
  paymentDate: Joi.date().iso().optional(),
  referenceNumber: Joi.string().trim().max(100).allow('').optional(),
  proofImageUrl: Joi.string().uri().allow('').optional(),
  notes: Joi.string().trim().max(2000).allow('').optional()
});
