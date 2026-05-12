import Joi from 'joi';

const inventoryCondition = Joi.string().valid('new', 'good', 'fair', 'poor', 'damaged');
const inventoryStatus = Joi.string().valid('available', 'issued', 'maintenance', 'retired');

export const createInventoryItemSchema = Joi.object({
  propertyId: Joi.string().required(),
  itemName: Joi.string().trim().min(2).max(120).required(),
  serialNumber: Joi.string().trim().max(120).allow('').optional(),
  condition: inventoryCondition.default('good'),
  quantity: Joi.number().integer().min(1).required(),
  status: inventoryStatus.default('available'),
  purchaseDate: Joi.date().iso().optional(),
  purchaseCost: Joi.number().min(0).optional()
});

export const updateInventoryItemSchema = Joi.object({
  itemName: Joi.string().trim().min(2).max(120),
  serialNumber: Joi.string().trim().max(120).allow(''),
  condition: inventoryCondition,
  quantity: Joi.number().integer().min(1),
  status: inventoryStatus,
  purchaseDate: Joi.date().iso(),
  purchaseCost: Joi.number().min(0)
}).min(1);

export const issueInventoryItemSchema = Joi.object({
  tenancyId: Joi.string().required(),
  issuedDate: Joi.date().iso().optional(),
  quantityIssued: Joi.number().integer().min(1).default(1),
  signedFormUrl: Joi.string().uri().allow('').optional()
});

export const returnInventoryItemSchema = Joi.object({
  recordId: Joi.string().required(),
  returnDate: Joi.date().iso().optional(),
  returnCondition: inventoryCondition.optional(),
  damageNotes: Joi.string().trim().max(2000).allow('').optional(),
  isLost: Joi.boolean().default(false)
});

export const reportDamageSchema = Joi.object({
  damageNotes: Joi.string().trim().max(2000).allow('').required(),
  penaltyAmount: Joi.number().min(0).required(),
  deductedFromDeposit: Joi.boolean().default(false),
  status: Joi.string().valid('damaged', 'lost').default('damaged')
});
