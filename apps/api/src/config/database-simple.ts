/**
 * Simple database connection using pg (node-postgres)
 * Replaces Prisma for MVP to avoid connection issues
 */

import { Pool, types } from 'pg';
import { env } from './env';

// Configure pg to properly handle arrays
// PostgreSQL returns arrays as text, we need to parse them correctly
types.setTypeParser(types.builtins.TEXT, (val) => val);

// Handle PostgreSQL TEXT[] arrays (OID 1009)
// Using number type assertion since TypeScript types don't include all OIDs
types.setTypeParser(1009 as any, (val: string) => {
  // Handle PostgreSQL array format: {value1,value2} or {}
  if (!val) return [];
  if (val === '{}') return [];
  return val.slice(1, -1).split(',').filter(Boolean);
});

// Create a connection pool
export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup (lazy - doesn't block)
db.on('connect', () => {
  console.log('✅ Database connected successfully');
});

db.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  // Don't throw - let the app continue and handle errors at query time
});

// Helper function to execute queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  try {
    const result = await db.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to execute a query and get first row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.end();
});

