import Joi from 'joi';

export const confirmCheckinSchema = Joi.object({
  contractId: Joi.string().required(),
  slotNumber: Joi.number().integer().min(1).max(50).optional()
});
