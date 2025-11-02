/**
 * Contact History controller
 * Handles CRUD operations for contact history entries
 */

import type { Response } from 'express';
import { successResponse } from '@crm/shared';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../infrastructure/auth/middleware/auth';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';

interface ContactHistory {
  id: string;
  customerId: string;
  type: string;
  subject: string | null;
  body: string;
  duration: number | null;
  attachments: string[];
  aiSummary: string | null;
  createdAt: Date;
  createdBy: string;
}

interface ContactHistoryWithRelations extends ContactHistory {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorEmail: string;
}

class ContactHistoryController {
  /**
   * Get all contact history entries for the authenticated user's organization
   */
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { customerId, type, limit = '50', offset = '0' } = req.query;

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
        ch.id, ch."customerId", ch.type, ch.subject, ch.body, ch.duration,
        ch.attachments, ch."aiSummary", ch."createdAt", ch."createdBy",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "creatorFirstName",
        u."lastName" as "creatorLastName",
        u.email as "creatorEmail"
      FROM contact_history ch
      INNER JOIN customers c ON ch."customerId" = c.id
      INNER JOIN users u ON ch."createdBy" = u.id
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
    `;

    const params: any[] = [userRow.organizationId];
    let paramIndex = 2;

    if (customerId) {
      sql += ` AND ch."customerId" = $${paramIndex++}`;
      params.push(customerId);
    }

    if (type) {
      sql += ` AND ch.type = $${paramIndex++}`;
      params.push(type);
    }

    sql += ` ORDER BY ch."createdAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const contacts = await query<ContactHistoryWithRelations>(sql, params);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM contact_history ch
      INNER JOIN customers c ON ch."customerId" = c.id
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
    `;
    const countParams: any[] = [userRow.organizationId];
    let countParamIndex = 2;

    if (customerId) {
      countSql += ` AND ch."customerId" = $${countParamIndex++}`;
      countParams.push(customerId);
    }

    if (type) {
      countSql += ` AND ch.type = $${countParamIndex++}`;
      countParams.push(type);
    }

    const countResult = await queryOne<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult?.total || '0', 10);

    res.json(
      successResponse(contacts, {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        hasMore: parseInt(offset as string, 10) + contacts.length < total,
      })
    );
  }

  /**
   * Get a single contact history entry by ID
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

    const contact = await queryOne<ContactHistoryWithRelations>(
      `SELECT 
        ch.id, ch."customerId", ch.type, ch.subject, ch.body, ch.duration,
        ch.attachments, ch."aiSummary", ch."createdAt", ch."createdBy",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "creatorFirstName",
        u."lastName" as "creatorLastName",
        u.email as "creatorEmail"
       FROM contact_history ch
       INNER JOIN customers c ON ch."customerId" = c.id
       INNER JOIN users u ON ch."createdBy" = u.id
       WHERE ch.id = $1 AND c."organizationId" = $2 AND c."deletedAt" IS NULL`,
      [id, userRow.organizationId]
    );

    if (!contact) {
      throw new NotFoundError('Contact history entry not found');
    }

    res.json(successResponse(contact));
  }

  /**
   * Create a new contact history entry
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const {
      customerId,
      type,
      subject,
      body,
      duration,
      attachments,
      aiSummary,
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

    // Validate type
    const validTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
    if (!validTypes.includes(type)) {
      throw new ValidationError('Invalid contact type. Must be one of: CALL, EMAIL, MEETING, NOTE');
    }

    // Validate duration if provided
    if (duration !== undefined && duration !== null && duration < 0) {
      throw new ValidationError('Duration must be a positive number');
    }

    // Create contact history entry
    // Handle attachments array - normalize to ensure proper format
    let attachmentsArray: string[] = [];
    
    // Normalize attachments - handle undefined, null, string, or array
    if (attachments === undefined || attachments === null) {
      attachmentsArray = [];
    } else if (Array.isArray(attachments)) {
      attachmentsArray = attachments;
    } else if (typeof attachments === 'string') {
      // If it's a string, try to parse it
      try {
        const parsed = JSON.parse(attachments);
        attachmentsArray = Array.isArray(parsed) ? parsed : [];
      } catch {
        attachmentsArray = [];
      }
    } else {
      attachmentsArray = [];
    }
    
    // Format attachments as PostgreSQL array literal
    // Use ARRAY[]::TEXT[] syntax directly in SQL to avoid pg library conversion issues
    let attachmentsValue: string;
    let queryParams: any[];
    
    if (attachmentsArray.length === 0) {
      // Empty array
      attachmentsValue = `ARRAY[]::TEXT[]`;
      queryParams = [
        customerId,
        type,
        subject || null,
        body,
        duration || null,
        aiSummary || null,
        user.userId,
      ];
    } else {
      // Non-empty array - format as PostgreSQL array literal with proper escaping
      const escapedValues = attachmentsArray.map(val => 
        `'${String(val).replace(/'/g, "''")}'`
      );
      attachmentsValue = `ARRAY[${escapedValues.join(',')}]::TEXT[]`;
      queryParams = [
        customerId,
        type,
        subject || null,
        body,
        duration || null,
        aiSummary || null,
        user.userId,
      ];
    }
    
    const result = await query<ContactHistory>(
      `INSERT INTO contact_history (id, "customerId", type, subject, body, duration,
                                   attachments, "aiSummary", "createdAt", "createdBy")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, ${attachmentsValue}, $6, NOW(), $7)
       RETURNING id, "customerId", type, subject, body, duration, attachments,
                 "aiSummary", "createdAt", "createdBy"`,
      queryParams
    );

    const contact = result[0];

    // Fetch contact with relations for response
    const contactWithRelations = await queryOne<ContactHistoryWithRelations>(
      `SELECT 
        ch.id, ch."customerId", ch.type, ch.subject, ch.body, ch.duration,
        ch.attachments, ch."aiSummary", ch."createdAt", ch."createdBy",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "creatorFirstName",
        u."lastName" as "creatorLastName",
        u.email as "creatorEmail"
       FROM contact_history ch
       INNER JOIN customers c ON ch."customerId" = c.id
       INNER JOIN users u ON ch."createdBy" = u.id
       WHERE ch.id = $1`,
      [contact.id]
    );

    res.status(201).json(successResponse(contactWithRelations));
  }

  /**
   * Update a contact history entry
   */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const user = req.user!;
    const { subject, body, duration, attachments, aiSummary } = req.body;

    // Get user's organization
    const userRow = await queryOne<{ organizationId: string }>(
      'SELECT "organizationId" FROM users WHERE id = $1',
      [user.userId]
    );

    if (!userRow) {
      throw new NotFoundError('User not found');
    }

    // Check if contact exists and belongs to organization
    const existing = await queryOne<{ id: string }>(
      `SELECT ch.id
       FROM contact_history ch
       INNER JOIN customers c ON ch."customerId" = c.id
       WHERE ch.id = $1 AND c."organizationId" = $2`,
      [id, userRow.organizationId]
    );

    if (!existing) {
      throw new NotFoundError('Contact history entry not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(subject || null);
    }
    if (body !== undefined) {
      updates.push(`body = $${paramIndex++}`);
      values.push(body);
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration || null);
    }
    if (attachments !== undefined) {
      // Normalize attachments array
      let attachmentsArray: string[] = [];
      if (attachments === null) {
        attachmentsArray = [];
      } else if (Array.isArray(attachments)) {
        attachmentsArray = attachments;
      } else if (typeof attachments === 'string') {
        try {
          const parsed = JSON.parse(attachments);
          attachmentsArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          attachmentsArray = [];
        }
      } else {
        attachmentsArray = [];
      }
      
      // Format as PostgreSQL array literal (same approach as create method)
      if (attachmentsArray.length === 0) {
        // Empty array - use direct SQL syntax
        updates.push(`attachments = ARRAY[]::TEXT[]`);
      } else {
        // Non-empty array - format as PostgreSQL array literal with proper escaping
        const escapedValues = attachmentsArray.map(val => 
          `'${String(val).replace(/'/g, "''")}'`
        );
        updates.push(`attachments = ARRAY[${escapedValues.join(',')}]::TEXT[]`);
      }
    }
    if (aiSummary !== undefined) {
      updates.push(`"aiSummary" = $${paramIndex++}`);
      values.push(aiSummary || null);
    }

    if (updates.length === 0) {
      // No updates, fetch and return existing contact
      const existingContact = await queryOne<ContactHistoryWithRelations>(
        `SELECT 
          ch.id, ch."customerId", ch.type, ch.subject, ch.body, ch.duration,
          ch.attachments, ch."aiSummary", ch."createdAt", ch."createdBy",
          c."firstName" as "customerFirstName",
          c."lastName" as "customerLastName",
          c.email as "customerEmail",
          u."firstName" as "creatorFirstName",
          u."lastName" as "creatorLastName",
          u.email as "creatorEmail"
         FROM contact_history ch
         INNER JOIN customers c ON ch."customerId" = c.id
         INNER JOIN users u ON ch."createdBy" = u.id
         WHERE ch.id = $1`,
        [id]
      );

      if (!existingContact) {
        throw new NotFoundError('Contact history entry not found');
      }

      res.json(successResponse(existingContact));
      return;
    }

    values.push(id);

    const result = await query<ContactHistory>(
      `UPDATE contact_history 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, "customerId", type, subject, body, duration, attachments,
                 "aiSummary", "createdAt", "createdBy"`,
      values
    );

    if (result.length === 0) {
      throw new NotFoundError('Contact history entry not found');
    }

    // Fetch contact with relations for response
    const contactWithRelations = await queryOne<ContactHistoryWithRelations>(
      `SELECT 
        ch.id, ch."customerId", ch.type, ch.subject, ch.body, ch.duration,
        ch.attachments, ch."aiSummary", ch."createdAt", ch."createdBy",
        c."firstName" as "customerFirstName",
        c."lastName" as "customerLastName",
        c.email as "customerEmail",
        u."firstName" as "creatorFirstName",
        u."lastName" as "creatorLastName",
        u.email as "creatorEmail"
       FROM contact_history ch
       INNER JOIN customers c ON ch."customerId" = c.id
       INNER JOIN users u ON ch."createdBy" = u.id
       WHERE ch.id = $1`,
      [id]
    );

    res.json(successResponse(contactWithRelations));
  }

  /**
   * Delete a contact history entry
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

    // Verify contact belongs to organization
    const result = await query(
      `DELETE FROM contact_history ch
       USING customers c
       WHERE ch.id = $1 AND ch."customerId" = c.id 
         AND c."organizationId" = $2
       RETURNING ch.id`,
      [id, userRow.organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Contact history entry not found');
    }

    res.json(successResponse({ message: 'Contact history entry deleted successfully' }));
  }
}

export const contactHistoryController = new ContactHistoryController();

