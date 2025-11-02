/**
 * Rate limiting middleware
 */

import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

// More lenient limits for development, stricter for production
const isDevelopment = env.NODE_ENV === 'development';

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 10000 : 100, // Very high limit in development (essentially disabled)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // In development, skip rate limiting entirely
    return isDevelopment;
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // Much more lenient in development
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // In development, skip rate limiting entirely
    return isDevelopment;
  },
});

