/**
 * Request validation middleware using Zod
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validate(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError('Validation failed', {
            errors: error.errors,
          })
        );
        return;
      }
      next(error);
    }
  };
}

