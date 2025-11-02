/**
 * Task routes
 */

import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../infrastructure/auth/middleware/auth';
import { asyncHandler } from '../shared/middleware/asyncHandler';
import { validate } from '../shared/middleware/validator';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE']).optional().default('PENDING'),
  dueDate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().datetime().nullable().optional()
  ),
  assigneeId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().uuid().optional()
  ),
  relatedCustomerId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().uuid().nullable().optional()
  ),
  relatedDealId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().uuid().nullable().optional()
  ),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional(),
  relatedCustomerId: z.string().uuid().optional().nullable(),
  relatedDealId: z.string().uuid().optional().nullable(),
  timeSpent: z.number().min(0).optional().nullable(),
});

// All task routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/',
  asyncHandler(taskController.getAll.bind(taskController))
);

router.get(
  '/:id',
  asyncHandler(taskController.getById.bind(taskController))
);

router.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(taskController.create.bind(taskController))
);

router.put(
  '/:id',
  validate(updateTaskSchema),
  asyncHandler(taskController.update.bind(taskController))
);

router.delete(
  '/:id',
  asyncHandler(taskController.delete.bind(taskController))
);

export default router;

