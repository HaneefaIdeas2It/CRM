/**
 * Pipeline controller
 * Handles operations for sales pipelines
 */

import type { Response } from 'express';
import { successResponse } from '@crm/shared';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../infrastructure/auth/middleware/auth';
import { NotFoundError } from '../shared/errors/AppError';

interface Pipeline {
  id: string;
  name: string;
  stages: any; // JSON
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  organizationId: string;
}

class PipelineController {
  /**
   * Get all pipelines for the authenticated user's organization
   */
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Get all pipelines for the organization
    const pipelines = await query<Pipeline>(
      `SELECT id, name, stages, "isDefault", "createdAt", "updatedAt",
              "createdBy", "organizationId"
       FROM pipelines
       WHERE "organizationId" = $1
       ORDER BY "isDefault" DESC, "createdAt" ASC`,
      [userRow.organizationId]
    );

    res.json(successResponse(pipelines));
  }

  /**
   * Get a single pipeline by ID
   */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    const pipeline = await queryOne<Pipeline>(
      `SELECT id, name, stages, "isDefault", "createdAt", "updatedAt",
              "createdBy", "organizationId"
       FROM pipelines
       WHERE id = $1 AND "organizationId" = $2`,
      [id, userRow.organizationId]
    );

    if (!pipeline) {
      throw new NotFoundError('Pipeline not found');
    }

    res.json(successResponse(pipeline));
  }

  /**
   * Get the default pipeline for the organization
   */
  async getDefault(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    const pipeline = await queryOne<Pipeline>(
      `SELECT id, name, stages, "isDefault", "createdAt", "updatedAt",
              "createdBy", "organizationId"
       FROM pipelines
       WHERE "organizationId" = $1 AND "isDefault" = true
       LIMIT 1`,
      [userRow.organizationId]
    );

    if (!pipeline) {
      // Return first pipeline if no default exists
      const firstPipeline = await queryOne<Pipeline>(
        `SELECT id, name, stages, "isDefault", "createdAt", "updatedAt",
                "createdBy", "organizationId"
         FROM pipelines
         WHERE "organizationId" = $1
         ORDER BY "createdAt" ASC
         LIMIT 1`,
        [userRow.organizationId]
      );

      if (!firstPipeline) {
        throw new NotFoundError('No pipeline found for this organization');
      }

      res.json(successResponse(firstPipeline));
      return;
    }

    res.json(successResponse(pipeline));
  }
}

export const pipelineController = new PipelineController();

