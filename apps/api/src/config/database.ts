/**
 * Database configuration
 * Using simple pg connection for MVP (database-simple.ts)
 * Prisma client commented out to avoid connection issues
 */

// For MVP, we're using simple pg connection instead of Prisma
// This avoids the authentication issues with Prisma from Windows → Docker

import { db, query, queryOne } from './database-simple';

// Export for backwards compatibility with existing code
export { db, query, queryOne };

// Create a simple prisma-like interface for compatibility
export const prisma = {
  // User operations
  user: {
    findUnique: async (args: { where: { email: string } }) => {
      const { where } = args;
      return queryOne('SELECT * FROM users WHERE email = $1', [where.email.toLowerCase()]);
    },
    create: async (args: { data: any }) => {
      const { data } = args;
      const result = await query(
        `INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, email, "firstName", "lastName", role`,
        [data.email.toLowerCase(), data.passwordHash, data.firstName, data.lastName, data.role || 'USER', data.organizationId, data.isActive !== false]
      );
      return result[0];
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const { where, data } = args;
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.keys(data).forEach((key) => {
        if (key === 'lastLoginAt' && data[key] === undefined) {
          fields.push(`"${key}" = NOW()`);
        } else if (data[key] !== undefined) {
          fields.push(`"${key}" = $${paramIndex}`);
          values.push(data[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return await queryOne('SELECT * FROM users WHERE id = $1', [where.id]);
      }

      values.push(where.id);
      const result = await query(
        `UPDATE users SET ${fields.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result[0];
    },
  },
  // Organization operations
  organization: {
    create: async (args: { data: { name: string } }) => {
      const { data } = args;
      const result = await query(
        `INSERT INTO organizations (id, name, settings, "subscriptionTier", "maxUsers", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, '{}'::jsonb, 'FREE', 5, NOW(), NOW())
         RETURNING id, name, "subscriptionTier"`,
        [data.name]
      );
      return result[0];
    },
    findUnique: async (args: { where: { id: string } }) => {
      return queryOne('SELECT * FROM organizations WHERE id = $1', [args.where.id]);
    },
  },
};

