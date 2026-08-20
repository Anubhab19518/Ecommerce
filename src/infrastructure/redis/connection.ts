import Redis from 'ioredis';
import { config } from '@config/index';
import { logger } from '@infrastructure/logging/logger';
import { redisConnectionStatus, redisCommandDuration } from '@infrastructure/metrics/metrics';
import type { HealthCheck } from '@shared/types';

let redisClient: Redis | null = null;

/**
 * Returns the singleton Redis client instance.
 * Creates it on first call (lazy initialization).
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      retryStrategy: (times: number): number | null => {
        if (times > config.redis.maxRetriesPerRequest) {
          redisConnectionStatus.set(0);
          return null; // stop retrying
        }
        return Math.min(times * config.redis.retryDelayMs, 5000);
      },
      lazyConnect: false,
      enableOfflineQueue: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
      redisConnectionStatus.set(1);
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis error', { error: err.message });
      redisConnectionStatus.set(0);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      redisConnectionStatus.set(0);
    });
  }

  return redisClient;
}

/**
 * Wraps a Redis command with duration metric tracking.
 */
export async function trackedRedisCommand<T>(command: string, fn: () => Promise<T>): Promise<T> {
  const end = redisCommandDuration.startTimer({ command });
  try {
    return await fn();
  } finally {
    end();
  }
}

/**
 * Health check for Redis connectivity.
 */
export async function checkRedisHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const redis = getRedis();
    // Fail if status is not 'ready' or 'connect'
    if (!['ready', 'connect'].includes(redis.status)) {
      return { status: 'unhealthy', error: `Redis status: ${redis.status}` };
    }
    await redis.ping();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: 'unhealthy', error: msg };
  }
}

/**
 * Gracefully closes the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
