/**
 * Deal routes
 */

import { Router } from 'express';
import { dealController } from '../controllers/deal.controller';
import { authenticate } from '../infrastructure/auth/middleware/auth';
import { asyncHandler } from '../shared/middleware/asyncHandler';
import { validate } from '../shared/middleware/validator';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createDealSchema = z.object({
  customerId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string(),
  title: z.string().min(1).max(255),
  value: z.number().positive(),
  currency: z.string().length(3).optional().default('USD'),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  probability: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().nullable(),
  products: z.array(z.any()).optional().default([]),
});

const updateDealSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  actualCloseDate: z.string().datetime().optional().nullable(),
  probability: z.number().min(0).max(100).optional(),
  stageId: z.string().optional(),
  notes: z.string().optional().nullable(),
  products: z.array(z.any()).optional(),
});

// All deal routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/',
  asyncHandler(dealController.getAll.bind(dealController))
);

router.get(
  '/:id',
  asyncHandler(dealController.getById.bind(dealController))
);

router.post(
  '/',
  validate(createDealSchema),
  asyncHandler(dealController.create.bind(dealController))
);

router.put(
  '/:id',
  validate(updateDealSchema),
  asyncHandler(dealController.update.bind(dealController))
);

router.delete(
  '/:id',
  asyncHandler(dealController.delete.bind(dealController))
);

export default router;

