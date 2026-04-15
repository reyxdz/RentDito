import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Generic Joi validation middleware factory.
 * Validates req.body against the provided schema.
 * Returns 400 with structured error messages on failure.
 */
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Replace body with validated/stripped value
    req.body = value;
    next();
  };
};

export default validate;
