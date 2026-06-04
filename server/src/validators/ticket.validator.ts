import Joi from 'joi';

const categorySchema = Joi.string().valid(
  'plumbing',
  'electrical',
  'structural',
  'appliance',
  'pest',
  'other'
);

const prioritySchema = Joi.string().valid('low', 'medium', 'high', 'urgent');

export const createTicketSchema = Joi.object({
  tenancyId: Joi.string().required(),
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().min(10).max(4000).required(),
  category: categorySchema.required(),
  priority: prioritySchema.default('medium'),
  images: Joi.array().items(Joi.string().uri()).default([])
});

export const assignTicketSchema = Joi.object({
  staffId: Joi.string().required()
});

export const addTicketUpdateSchema = Joi.object({
  message: Joi.string().trim().min(2).max(2000).required()
});

export const resolveTicketSchema = Joi.object({
  resolutionNotes: Joi.string().trim().min(2).max(4000).required()
});

export const closeTicketSchema = Joi.object({
  closingNotes: Joi.string().trim().max(4000).allow('').optional()
});
