/**
 * Health check routes
 */

import { Router } from 'express';
import { successResponse } from '@crm/shared';
import redis from '../config/redis';
import { query } from '../config/database';

const router = Router();

/**
 * Basic health check
 */
router.get('/', (_req, res) => {
  res.json(successResponse({ status: 'ok', timestamp: new Date().toISOString() }));
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (_req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: { status: 'unknown' },
      cache: { status: 'unknown' },
    },
  };

  // Check database
  try {
    await query('SELECT 1 as test');
    checks.dependencies.database.status = 'ok';
  } catch (error) {
    checks.dependencies.database.status = 'error';
    checks.status = 'degraded';
  }

  // Check Redis (optional)
  try {
    const pingResult = await redis.ping();
    if (pingResult) {
      checks.dependencies.cache.status = 'ok';
    } else {
      checks.dependencies.cache.status = 'not configured';
    }
  } catch (error) {
    checks.dependencies.cache.status = 'error';
    // Don't mark overall status as degraded if Redis fails (it's optional)
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(successResponse(checks));
});

export default router;

