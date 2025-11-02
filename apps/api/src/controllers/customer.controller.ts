/**
 * Customer controller
 * Handles CRUD operations for customers
 */

import type { Response } from 'express';
import { successResponse } from '@crm/shared';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../infrastructure/auth/middleware/auth';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string | null;
  tags: string[];
  customFields: Record<string, unknown> | null;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class CustomerController {
  /**
   * Get all customers for the authenticated user's organization
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

    // Get all customers for the organization
    const customers = await query<Customer>(
      `SELECT id, "firstName", "lastName", email, phone, company, tags, 
              "customFields", "organizationId", "createdBy", "createdAt", "updatedAt"
       FROM customers 
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       ORDER BY "createdAt" DESC`,
      [userRow.organizationId]
    );

    res.json(successResponse(customers));
  }

  /**
   * Get a single customer by ID
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

    const customer = await queryOne<Customer>(
      `SELECT id, "firstName", "lastName", email, phone, company, tags, 
              "customFields", "organizationId", "createdBy", "createdAt", "updatedAt"
       FROM customers 
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [id, userRow.organizationId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.json(successResponse(customer));
  }

  /**
   * Create a new customer
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { firstName, lastName, email, phone, company, tags, customFields } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Check if customer with email already exists
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE email = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',
      [email.toLowerCase(), userRow.organizationId]
    );

    if (existing) {
      throw new ValidationError('Customer with this email already exists');
    }

    // Create customer
    const result = await query<Customer>(
      `INSERT INTO customers (id, "firstName", "lastName", email, phone, company, tags, 
                              "customFields", "organizationId", "createdBy", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, "firstName", "lastName", email, phone, company, tags, 
                 "customFields", "organizationId", "createdBy", "createdAt", "updatedAt"`,
      [
        firstName,
        lastName,
        email.toLowerCase(),
        phone,
        company || null,
        tags || [],
        customFields ? JSON.stringify(customFields) : null,
        userRow.organizationId,
        user.userId,
      ]
    );

    const customer = result[0];
    res.status(201).json(successResponse(customer));
  }

  /**
   * Update a customer
   */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const { firstName, lastName, email, phone, company, tags, customFields } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Check if customer exists
    const existing = await queryOne<{ id: string; email: string }>(
      'SELECT id, email FROM customers WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',
      [id, userRow.organizationId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Check email uniqueness if changed
    if (email && email.toLowerCase() !== existing.email) {
      const emailExists = await queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE email = $1 AND "organizationId" = $2 AND id != $3 AND "deletedAt" IS NULL',
        [email.toLowerCase(), userRow.organizationId, id]
      );

      if (emailExists) {
        throw new ValidationError('Customer with this email already exists');
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`"firstName" = $${paramIndex++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`"lastName" = $${paramIndex++}`);
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.toLowerCase());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      values.push(company || null);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(tags);
    }
    if (customFields !== undefined) {
      updates.push(`"customFields" = $${paramIndex++}`);
      values.push(customFields ? JSON.stringify(customFields) : null);
    }

    if (updates.length === 0) {
      // No updates, return existing customer
      const customer = await queryOne<Customer>(
        `SELECT id, "firstName", "lastName", email, phone, company, tags, 
                "customFields", "organizationId", "createdBy", "createdAt", "updatedAt"
         FROM customers WHERE id = $1`,
        [id]
      );
      res.json(successResponse(customer));
      return;
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await query<Customer>(
      `UPDATE customers 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} AND "organizationId" = $${paramIndex + 1} AND "deletedAt" IS NULL
       RETURNING id, "firstName", "lastName", email, phone, company, tags, 
                 "customFields", "organizationId", "createdBy", "createdAt", "updatedAt"`,
      [...values, userRow.organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.json(successResponse(result[0]));
  }

  /**
   * Delete a customer (soft delete)
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

    // Soft delete
    const result = await query(
      `UPDATE customers 
       SET "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
       RETURNING id`,
      [id, userRow.organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Customer not found');
    }

    res.json(successResponse({ message: 'Customer deleted successfully' }));
  }
}

export const customerController = new CustomerController();

