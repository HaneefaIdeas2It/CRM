/**
 * Task controller
 * Handles CRUD operations for tasks
 */

import type { Response } from 'express';
import { successResponse } from '@crm/shared';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../infrastructure/auth/middleware/auth';
import { NotFoundError } from '../shared/errors/AppError';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  assigneeId: string;
  relatedCustomerId: string | null;
  relatedDealId: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  timeSpent: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskWithRelations extends Task {
  assigneeFirstName: string;
  assigneeLastName: string;
  assigneeEmail: string;
  customerFirstName: string | null;
  customerLastName: string | null;
}

class TaskController {
  /**
   * Get all tasks for the authenticated user's organization
   */
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { status, priority, assigneeId, customerId, dueDateFrom, dueDateTo } = req.query;

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
        t.id, t.title, t.description, t.priority, t.status, t."dueDate",
        t."assigneeId", t."relatedCustomerId", t."relatedDealId",
        t."isRecurring", t."recurrenceRule", t."timeSpent", t."completedAt",
        t."createdAt", t."updatedAt",
        u."firstName" as "assigneeFirstName",
        u."lastName" as "assigneeLastName",
        u.email as "assigneeEmail",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName"
      FROM tasks t
      INNER JOIN users u ON t."assigneeId" = u.id
      LEFT JOIN customers c ON t."relatedCustomerId" = c.id
      WHERE u."organizationId" = $1
    `;

    const params: any[] = [userRow.organizationId];
    let paramIndex = 2;

    // Add filters
    if (status) {
      sql += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      sql += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (assigneeId) {
      sql += ` AND t."assigneeId" = $${paramIndex++}`;
      params.push(assigneeId);
    }

    if (customerId) {
      sql += ` AND t."relatedCustomerId" = $${paramIndex++}`;
      params.push(customerId);
    }

    if (dueDateFrom) {
      sql += ` AND t."dueDate" >= $${paramIndex++}`;
      params.push(dueDateFrom);
    }

    if (dueDateTo) {
      sql += ` AND t."dueDate" <= $${paramIndex++}`;
      params.push(dueDateTo);
    }

    sql += ` ORDER BY 
      CASE t.status
        WHEN 'PENDING' THEN 1
        WHEN 'IN_PROGRESS' THEN 2
        WHEN 'COMPLETE' THEN 3
      END,
      CASE t.priority
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'LOW' THEN 3
      END,
      t."dueDate" ASC NULLS LAST`;

    const tasks = await query<TaskWithRelations>(sql, params);

    res.json(successResponse(tasks));
  }

  /**
   * Get a single task by ID
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

    const task = await queryOne<TaskWithRelations>(
      `SELECT 
        t.id, t.title, t.description, t.priority, t.status, t."dueDate",
        t."assigneeId", t."relatedCustomerId", t."relatedDealId",
        t."isRecurring", t."recurrenceRule", t."timeSpent", t."completedAt",
        t."createdAt", t."updatedAt",
        u."firstName" as "assigneeFirstName",
        u."lastName" as "assigneeLastName",
        u.email as "assigneeEmail",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName"
       FROM tasks t
       INNER JOIN users u ON t."assigneeId" = u.id
       LEFT JOIN customers c ON t."relatedCustomerId" = c.id
       WHERE t.id = $1 AND u."organizationId" = $2`,
      [id, userRow.organizationId]
    );

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    res.json(successResponse(task));
  }

  /**
   * Create a new task
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const {
      title,
      description,
      priority = 'MEDIUM',
      status = 'PENDING',
      dueDate,
      assigneeId,
      relatedCustomerId,
      relatedDealId,
      isRecurring = false,
      recurrenceRule,
    } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Verify assignee belongs to organization
    const assignee = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 AND "organizationId" = $2',
      [assigneeId || user.userId, userRow.organizationId]
    );

    if (!assignee) {
      throw new NotFoundError('Assignee not found');
    }

    // Verify customer belongs to organization if provided
    if (relatedCustomerId) {
      const customer = await queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',
        [relatedCustomerId, userRow.organizationId]
      );

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // Create task
    const result = await query<Task>(
      `INSERT INTO tasks (id, title, description, priority, status, "dueDate",
                         "assigneeId", "relatedCustomerId", "relatedDealId",
                         "isRecurring", "recurrenceRule", "timeSpent", "completedAt",
                         "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, NOW(), NOW())
       RETURNING id, title, description, priority, status, "dueDate",
                 "assigneeId", "relatedCustomerId", "relatedDealId",
                 "isRecurring", "recurrenceRule", "timeSpent", "completedAt",
                 "createdAt", "updatedAt"`,
      [
        title,
        description || null,
        priority,
        status,
        dueDate || null,
        assigneeId || user.userId,
        relatedCustomerId || null,
        relatedDealId || null,
        isRecurring,
        recurrenceRule || null,
      ]
    );

    const task = result[0];

    // Fetch task with relations for response
    const taskWithRelations = await queryOne<TaskWithRelations>(
      `SELECT 
        t.id, t.title, t.description, t.priority, t.status, t."dueDate",
        t."assigneeId", t."relatedCustomerId", t."relatedDealId",
        t."isRecurring", t."recurrenceRule", t."timeSpent", t."completedAt",
        t."createdAt", t."updatedAt",
        u."firstName" as "assigneeFirstName",
        u."lastName" as "assigneeLastName",
        u.email as "assigneeEmail",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName"
       FROM tasks t
       INNER JOIN users u ON t."assigneeId" = u.id
       LEFT JOIN customers c ON t."relatedCustomerId" = c.id
       WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json(successResponse(taskWithRelations));
  }

  /**
   * Update a task
   */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assigneeId,
      relatedCustomerId,
      relatedDealId,
      timeSpent,
      completedAt,
    } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Check if task exists and belongs to organization
    const existing = await queryOne<{ id: string }>(
      `SELECT t.id
       FROM tasks t
       INNER JOIN users u ON t."assigneeId" = u.id
       WHERE t.id = $1 AND u."organizationId" = $2`,
      [id, userRow.organizationId]
    );

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    // Verify assignee if provided
    if (assigneeId) {
      const assignee = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE id = $1 AND "organizationId" = $2',
        [assigneeId, userRow.organizationId]
      );

      if (!assignee) {
        throw new NotFoundError('Assignee not found');
      }
    }

    // Verify customer if provided
    if (relatedCustomerId) {
      const customer = await queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',
        [relatedCustomerId, userRow.organizationId]
      );

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // If marking as complete, set completedAt
    if (status === 'COMPLETE' && !completedAt) {
      req.body.completedAt = new Date().toISOString();
    } else if (status !== 'COMPLETE') {
      req.body.completedAt = null;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      // Auto-set completedAt based on status
      if (status === 'COMPLETE') {
        updates.push(`"completedAt" = NOW()`);
      } else {
        updates.push(`"completedAt" = NULL`);
      }
    }
    if (dueDate !== undefined) {
      updates.push(`"dueDate" = $${paramIndex++}`);
      values.push(dueDate || null);
    }
    if (assigneeId !== undefined) {
      updates.push(`"assigneeId" = $${paramIndex++}`);
      values.push(assigneeId);
    }
    if (relatedCustomerId !== undefined) {
      updates.push(`"relatedCustomerId" = $${paramIndex++}`);
      values.push(relatedCustomerId || null);
    }
    if (relatedDealId !== undefined) {
      updates.push(`"relatedDealId" = $${paramIndex++}`);
      values.push(relatedDealId || null);
    }
    if (timeSpent !== undefined) {
      updates.push(`"timeSpent" = $${paramIndex++}`);
      values.push(timeSpent || null);
    }

    if (updates.length === 0) {
      // No updates, fetch and return existing task
      const existingTask = await queryOne<TaskWithRelations>(
        `SELECT 
          t.id, t.title, t.description, t.priority, t.status, t."dueDate",
          t."assigneeId", t."relatedCustomerId", t."relatedDealId",
          t."isRecurring", t."recurrenceRule", t."timeSpent", t."completedAt",
          t."createdAt", t."updatedAt",
          u."firstName" as "assigneeFirstName",
          u."lastName" as "assigneeLastName",
          u.email as "assigneeEmail",
          c."firstName" as "customerFirstName",
          c."lastName" as "customerLastName"
         FROM tasks t
         INNER JOIN users u ON t."assigneeId" = u.id
         LEFT JOIN customers c ON t."relatedCustomerId" = c.id
         WHERE t.id = $1`,
        [id]
      );

      if (!existingTask) {
        throw new NotFoundError('Task not found');
      }

      res.json(successResponse(existingTask));
      return;
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await query<Task>(
      `UPDATE tasks 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, title, description, priority, status, "dueDate",
                 "assigneeId", "relatedCustomerId", "relatedDealId",
                 "isRecurring", "recurrenceRule", "timeSpent", "completedAt",
                 "createdAt", "updatedAt"`,
      values
    );

    if (result.length === 0) {
      throw new NotFoundError('Task not found');
    }

    // Fetch task with relations for response
    const taskWithRelations = await queryOne<TaskWithRelations>(
      `SELECT 
        t.id, t.title, t.description, t.priority, t.status, t."dueDate",
        t."assigneeId", t."relatedCustomerId", t."relatedDealId",
        t."isRecurring", t."recurrenceRule", t."timeSpent", t."completedAt",
        t."createdAt", t."updatedAt",
        u."firstName" as "assigneeFirstName",
        u."lastName" as "assigneeLastName",
        u.email as "assigneeEmail",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName"
       FROM tasks t
       INNER JOIN users u ON t."assigneeId" = u.id
       LEFT JOIN customers c ON t."relatedCustomerId" = c.id
       WHERE t.id = $1`,
      [id]
    );

    res.json(successResponse(taskWithRelations));
  }

  /**
   * Delete a task
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

    // Verify task belongs to organization
    const result = await query(
      `DELETE FROM tasks t
       USING users u
       WHERE t.id = $1 AND t."assigneeId" = u.id AND u."organizationId" = $2
       RETURNING t.id`,
      [id, userRow.organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Task not found');
    }

    res.json(successResponse({ message: 'Task deleted successfully' }));
  }
}

export const taskController = new TaskController();

