/**
 * Redis client configuration
 * Redis is optional - app can work without it (with reduced caching)
 */

import Redis from 'ioredis';
import { env } from './env';

// Create Redis client only if REDIS_URL is provided
let redis: Redis | null = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 50, 2000); // Exponential backoff
    },
    enableOfflineQueue: false,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
    // Don't crash the app if Redis fails
  });
} else {
  console.log('⚠️  Redis not configured - running without caching');
}

// Export a wrapper that handles missing Redis gracefully
export default {
  get: async (key: string): Promise<string | null> => {
    if (!redis) return null;
    try {
      return await redis.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },
  set: async (key: string, value: string, expirySeconds?: number): Promise<void> => {
    if (!redis) return;
    try {
      if (expirySeconds) {
        await redis.setex(key, expirySeconds, value);
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },
  del: async (key: string): Promise<void> => {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  },
  ping: async (): Promise<string | null> => {
    if (!redis) return null;
    try {
      return await redis.ping();
    } catch (error) {
      console.error('Redis ping error:', error);
      return null;
    }
  },
  // Expose raw Redis client for advanced usage (if needed)
  client: redis,
};

