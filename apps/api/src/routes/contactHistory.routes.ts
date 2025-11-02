/**
 * Contact History routes
 */

import { Router } from 'express';
import { contactHistoryController } from '../controllers/contactHistory.controller';
import { authenticate } from '../infrastructure/auth/middleware/auth';
import { asyncHandler } from '../shared/middleware/asyncHandler';
import { validate } from '../shared/middleware/validator';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createContactHistorySchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().min(1),
  duration: z.number().int().min(0).optional().nullable(),
  attachments: z.preprocess(
    (val) => {
      // Handle if attachments comes as string (e.g., from JSON)
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      // If it's already an array, return it
      if (Array.isArray(val)) {
        return val;
      }
      // Otherwise default to empty array
      return val !== undefined && val !== null ? [] : [];
    },
    z.array(z.string()).optional().default([])
  ),
  aiSummary: z.string().optional().nullable(),
});

const updateContactHistorySchema = z.object({
  subject: z.string().max(500).optional().nullable(),
  body: z.string().min(1).optional(),
  duration: z.number().int().min(0).optional().nullable(),
  attachments: z.array(z.string()).optional(),
  aiSummary: z.string().optional().nullable(),
});

// All contact history routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/',
  asyncHandler(contactHistoryController.getAll.bind(contactHistoryController))
);

router.get(
  '/:id',
  asyncHandler(contactHistoryController.getById.bind(contactHistoryController))
);

router.post(
  '/',
  validate(createContactHistorySchema),
  asyncHandler(contactHistoryController.create.bind(contactHistoryController))
);

router.put(
  '/:id',
  validate(updateContactHistorySchema),
  asyncHandler(contactHistoryController.update.bind(contactHistoryController))
);

router.delete(
  '/:id',
  asyncHandler(contactHistoryController.delete.bind(contactHistoryController))
);

export default router;

