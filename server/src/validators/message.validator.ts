import Joi from 'joi';

export const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  attachments: Joi.array().items(Joi.string()).max(5)
});
