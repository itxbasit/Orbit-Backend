import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export class ValidationMiddleware {
  static validate(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        res.status(400).json({
          success: false,
          errors
        });
        return;
      }

      next();
    };
  }
}

// Validation schemas
export const ReservationSchema = Joi.object({
  seats: Joi.array()
    .items(Joi.string().pattern(/^[A-Z]\d+$/))
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one seat is required',
      'array.max': 'Cannot reserve more than 10 seats',
      'string.pattern.base': 'Invalid seat format. Use format like "A1", "B2", etc.'
    })
});

export const ThirdPartyReservationSchema = Joi.object({
  userId: Joi.string().required(),
  userName: Joi.string().required(),
  userEmail: Joi.string().email().required(),
  seats: Joi.array()
    .items(Joi.string().pattern(/^[A-Z]\d+$/))
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one seat is required',
      'array.max': 'Cannot reserve more than 10 seats',
      'string.pattern.base': 'Invalid seat format. Use format like "A1", "B2", etc.'
    })
});