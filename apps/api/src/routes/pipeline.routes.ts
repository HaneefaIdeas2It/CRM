/**
 * Pipeline routes
 */

import { Router } from 'express';
import { pipelineController } from '../controllers/pipeline.controller';
import { authenticate } from '../infrastructure/auth/middleware/auth';
import { asyncHandler } from '../shared/middleware/asyncHandler';

const router = Router();

// All pipeline routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/',
  asyncHandler(pipelineController.getAll.bind(pipelineController))
);

router.get(
  '/default',
  asyncHandler(pipelineController.getDefault.bind(pipelineController))
);

router.get(
  '/:id',
  asyncHandler(pipelineController.getById.bind(pipelineController))
);

export default router;

