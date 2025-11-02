/**
 * Environment configuration with validation
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('4000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(), // Optional - app can work without Redis
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRATION_TIME: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION_TIME: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.string().regex(/^\d+$/).default('12'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = loadEnv();

