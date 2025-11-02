/**
 * Authentication routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../shared/middleware/asyncHandler';
import { validate } from '../shared/middleware/validator';
import { authLimiter } from '../shared/middleware/rateLimiter';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Routes
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.post('/refresh', asyncHandler(authController.refresh));

router.post('/logout', asyncHandler(authController.logout));

export default router;

