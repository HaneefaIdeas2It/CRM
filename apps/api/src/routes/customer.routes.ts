/**
 * Customer routes
 */

import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../infrastructure/auth/middleware/auth';
import { asyncHandler } from '../shared/middleware/asyncHandler';
import { validate } from '../shared/middleware/validator';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  company: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional().nullable(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(20).optional(),
  company: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional().nullable(),
});

// All customer routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/',
  asyncHandler(customerController.getAll.bind(customerController))
);

router.get(
  '/:id',
  asyncHandler(customerController.getById.bind(customerController))
);

router.post(
  '/',
  validate(createCustomerSchema),
  asyncHandler(customerController.create.bind(customerController))
);

router.put(
  '/:id',
  validate(updateCustomerSchema),
  asyncHandler(customerController.update.bind(customerController))
);

router.delete(
  '/:id',
  asyncHandler(customerController.delete.bind(customerController))
);

export default router;

