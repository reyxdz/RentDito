import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
    }),
  phone: Joi.string().trim().allow('').optional(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'any.required': 'Current password is required',
    }),
  newPassword: Joi.string().min(8).max(128).required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'any.required': 'New password is required',
    }),
});
