/**
 * Deal controller
 * Handles CRUD operations for deals in the sales pipeline
 */

import type { Response } from 'express';
import { successResponse } from '@crm/shared';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../infrastructure/auth/middleware/auth';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

interface Deal {
  id: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: string; // Decimal as string from DB
  currency: string;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  probability: number;
  notes: string | null;
  products: any; // JSON
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DealWithRelations extends Deal {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  pipelineName: string;
}

class DealController {
  /**
   * Get all deals for the authenticated user's organization
   */
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { pipelineId, stageId, customerId } = req.query;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Build query with filters
    let sql = `
      SELECT 
        d.id, d."customerId", d."pipelineId", d."stageId", d.title,
        d.value, d.currency, d."expectedCloseDate", d."actualCloseDate",
        d.probability, d.notes, d.products, d."ownerId",
        d."createdAt", d."updatedAt",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "ownerFirstName",
        u."lastName" as "ownerLastName",
        p.name as "pipelineName"
      FROM deals d
      INNER JOIN customers c ON d."customerId" = c.id
      INNER JOIN users u ON d."ownerId" = u.id
      INNER JOIN pipelines p ON d."pipelineId" = p.id
      INNER JOIN organizations o ON c."organizationId" = o.id
      WHERE o.id = $1 AND c."deletedAt" IS NULL
    `;

    const params: any[] = [userRow.organizationId];
    let paramIndex = 2;

    if (pipelineId) {
      sql += ` AND d."pipelineId" = $${paramIndex++}`;
      params.push(pipelineId);
    }

    if (stageId) {
      sql += ` AND d."stageId" = $${paramIndex++}`;
      params.push(stageId);
    }

    if (customerId) {
      sql += ` AND d."customerId" = $${paramIndex++}`;
      params.push(customerId);
    }

    sql += ` ORDER BY d."createdAt" DESC`;

    const deals = await query<DealWithRelations>(sql, params);

    res.json(successResponse(deals));
  }

  /**
   * Get a single deal by ID
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

    const deal = await queryOne<DealWithRelations>(
      `SELECT 
        d.id, d."customerId", d."pipelineId", d."stageId", d.title,
        d.value, d.currency, d."expectedCloseDate", d."actualCloseDate",
        d.probability, d.notes, d.products, d."ownerId",
        d."createdAt", d."updatedAt",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "ownerFirstName",
        u."lastName" as "ownerLastName",
        p.name as "pipelineName"
       FROM deals d
       INNER JOIN customers c ON d."customerId" = c.id
       INNER JOIN users u ON d."ownerId" = u.id
       INNER JOIN pipelines p ON d."pipelineId" = p.id
       INNER JOIN organizations o ON c."organizationId" = o.id
       WHERE d.id = $1 AND o.id = $2 AND c."deletedAt" IS NULL`,
      [id, userRow.organizationId]
    );

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    res.json(successResponse(deal));
  }

  /**
   * Create a new deal
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const {
      customerId,
      pipelineId,
      stageId,
      title,
      value,
      currency = 'USD',
      expectedCloseDate,
      probability = 0,
      notes,
      products = [],
    } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Verify customer belongs to organization
    const customer = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',
      [customerId, userRow.organizationId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify pipeline belongs to organization
    const pipeline = await queryOne<{ id: string; stages: any }>(
      'SELECT id, stages FROM pipelines WHERE id = $1 AND "organizationId" = $2',
      [pipelineId, userRow.organizationId]
    );

    if (!pipeline) {
      throw new NotFoundError('Pipeline not found');
    }

    // Verify stageId exists in pipeline stages
    const stages = pipeline.stages as any[];
    const stageExists = stages.some((s: any) => s.id === stageId);
    if (!stageExists) {
      throw new ValidationError('Invalid stage ID for this pipeline');
    }

    // Validate probability
    if (probability < 0 || probability > 100) {
      throw new ValidationError('Probability must be between 0 and 100');
    }

    // Create deal
    const result = await query<Deal>(
      `INSERT INTO deals (id, "customerId", "pipelineId", "stageId", title, value, currency,
                         "expectedCloseDate", probability, notes, products, "ownerId",
                         "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id, "customerId", "pipelineId", "stageId", title, value, currency,
                 "expectedCloseDate", "actualCloseDate", probability, notes, products,
                 "ownerId", "createdAt", "updatedAt"`,
      [
        customerId,
        pipelineId,
        stageId,
        title,
        value,
        currency,
        expectedCloseDate || null,
        probability,
        notes || null,
        JSON.stringify(products),
        user.userId,
      ]
    );

    const deal = result[0];

    // Fetch deal with relations for response
    const dealWithRelations = await queryOne<DealWithRelations>(
      `SELECT 
        d.id, d."customerId", d."pipelineId", d."stageId", d.title,
        d.value, d.currency, d."expectedCloseDate", d."actualCloseDate",
        d.probability, d.notes, d.products, d."ownerId",
        d."createdAt", d."updatedAt",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "ownerFirstName",
        u."lastName" as "ownerLastName",
        p.name as "pipelineName"
       FROM deals d
       INNER JOIN customers c ON d."customerId" = c.id
       INNER JOIN users u ON d."ownerId" = u.id
       INNER JOIN pipelines p ON d."pipelineId" = p.id
       WHERE d.id = $1`,
      [deal.id]
    );

    res.status(201).json(successResponse(dealWithRelations));
  }

  /**
   * Update a deal
   */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const {
      title,
      value,
      currency,
      expectedCloseDate,
      actualCloseDate,
      probability,
      stageId,
      notes,
      products,
    } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Check if deal exists and belongs to organization
    const existing = await queryOne<{ id: string; pipelineId: string }>(
      `SELECT d.id, d."pipelineId"
       FROM deals d
       INNER JOIN customers c ON d."customerId" = c.id
       WHERE d.id = $1 AND c."organizationId" = $2`,
      [id, userRow.organizationId]
    );

    if (!existing) {
      throw new NotFoundError('Deal not found');
    }

    // If stageId is being updated, verify it exists in pipeline
    if (stageId) {
      const pipeline = await queryOne<{ stages: any }>(
        'SELECT stages FROM pipelines WHERE id = $1',
        [existing.pipelineId]
      );

      if (pipeline) {
        const stages = pipeline.stages as any[];
        const stageExists = stages.some((s: any) => s.id === stageId);
        if (!stageExists) {
          throw new ValidationError('Invalid stage ID for this pipeline');
        }
      }
    }

    // Validate probability if provided
    if (probability !== undefined && (probability < 0 || probability > 100)) {
      throw new ValidationError('Probability must be between 0 and 100');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      values.push(value);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(currency);
    }
    if (expectedCloseDate !== undefined) {
      updates.push(`"expectedCloseDate" = $${paramIndex++}`);
      values.push(expectedCloseDate || null);
    }
    if (actualCloseDate !== undefined) {
      updates.push(`"actualCloseDate" = $${paramIndex++}`);
      values.push(actualCloseDate || null);
    }
    if (probability !== undefined) {
      updates.push(`probability = $${paramIndex++}`);
      values.push(probability);
    }
    if (stageId !== undefined) {
      updates.push(`"stageId" = $${paramIndex++}`);
      values.push(stageId);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes || null);
    }
    if (products !== undefined) {
      updates.push(`products = $${paramIndex++}`);
      values.push(JSON.stringify(products));
    }

    if (updates.length === 0) {
      // No updates, fetch and return existing deal
      const existingDeal = await queryOne<DealWithRelations>(
        `SELECT 
          d.id, d."customerId", d."pipelineId", d."stageId", d.title,
          d.value, d.currency, d."expectedCloseDate", d."actualCloseDate",
          d.probability, d.notes, d.products, d."ownerId",
          d."createdAt", d."updatedAt",
          c."firstName" as "customerFirstName",
          c."lastName" as "customerLastName",
          c.email as "customerEmail",
          u."firstName" as "ownerFirstName",
          u."lastName" as "ownerLastName",
          p.name as "pipelineName"
         FROM deals d
         INNER JOIN customers c ON d."customerId" = c.id
         INNER JOIN users u ON d."ownerId" = u.id
         INNER JOIN pipelines p ON d."pipelineId" = p.id
         WHERE d.id = $1`,
        [id]
      );

      if (!existingDeal) {
        throw new NotFoundError('Deal not found');
      }

      res.json(successResponse(existingDeal));
      return;
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await query<Deal>(
      `UPDATE deals 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, "customerId", "pipelineId", "stageId", title, value, currency,
                 "expectedCloseDate", "actualCloseDate", probability, notes, products,
                 "ownerId", "createdAt", "updatedAt"`,
      values
    );

    if (result.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    // Fetch deal with relations for response
    const dealWithRelations = await queryOne<DealWithRelations>(
      `SELECT 
        d.id, d."customerId", d."pipelineId", d."stageId", d.title,
        d.value, d.currency, d."expectedCloseDate", d."actualCloseDate",
        d.probability, d.notes, d.products, d."ownerId",
        d."createdAt", d."updatedAt",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "ownerFirstName",
        u."lastName" as "ownerLastName",
        p.name as "pipelineName"
       FROM deals d
       INNER JOIN customers c ON d."customerId" = c.id
       INNER JOIN users u ON d."ownerId" = u.id
       INNER JOIN pipelines p ON d."pipelineId" = p.id
       WHERE d.id = $1`,
      [id]
    );

    res.json(successResponse(dealWithRelations));
  }

  /**
   * Delete a deal
   */
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    // Verify deal belongs to organization
    const result = await query(
      `DELETE FROM deals d
       USING customers c
       WHERE d.id = $1 AND d."customerId" = c.id 
         AND c."organizationId" = $2
       RETURNING d.id`,
      [id, userRow.organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Deal not found');
    }

    res.json(successResponse({ message: 'Deal deleted successfully' }));
  }
}

export const dealController = new DealController();

