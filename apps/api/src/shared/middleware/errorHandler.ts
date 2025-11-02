/**
 * Global error handling middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  });

  // Handle known application errors
  if (error instanceof AppError) {
    const errorResponse: {
      success: boolean;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    } = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (error.details) {
      errorResponse.error.details = error.details;
    }

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack, details: error }),
    },
  });
}

