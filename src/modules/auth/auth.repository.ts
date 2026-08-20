import { logger } from '@infrastructure/logging/logger';
import { getRedis, trackedRedisCommand } from '@infrastructure/redis';
import type { SessionData } from './auth.types';

// ─────────────────────────────────────────────────────────────
// Auth Module — Session Repository (Redis-backed)
// ─────────────────────────────────────────────────────────────
// NEVER exported from the module's public API (index.ts).
// ─────────────────────────────────────────────────────────────

const SESSION_PREFIX = 'auth:session:';
const USER_SESSIONS_PREFIX = 'auth:user_sessions:';

function sessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}

function userSessionsKey(userId: string): string {
  return `${USER_SESSIONS_PREFIX}${userId}`;
}

export class AuthRepository {
  /**
   * Stores a new session in Redis with TTL.
   */
  async createSession(sessionId: string, data: SessionData, ttlSeconds: number): Promise<void> {
    try {
      const redis = getRedis();
      const sKey = sessionKey(sessionId);
      const uKey = userSessionsKey(data.userId);

      await trackedRedisCommand('createSession', async () => {
        const pipeline = redis.pipeline();
        pipeline.set(sKey, JSON.stringify(data), 'EX', ttlSeconds);
        pipeline.sadd(uKey, sessionId);
        pipeline.expire(uKey, ttlSeconds);
        await pipeline.exec();
      });
    } catch (error) {
      logger.error('Failed to create auth session in Redis', {
        sessionId,
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Retrieves a session by its sessionId.
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const redis = getRedis();
      const key = sessionKey(sessionId);

      const raw = await trackedRedisCommand('getSession', async () => {
        return redis.get(key);
      });

      if (!raw) return null;
      return JSON.parse(raw) as SessionData;
    } catch (error) {
      logger.warn('Failed to retrieve auth session from Redis', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Updates an existing session in Redis, refreshing TTL.
   */
  async updateSession(sessionId: string, data: SessionData, ttlSeconds: number): Promise<void> {
    try {
      const redis = getRedis();
      const sKey = sessionKey(sessionId);

      await trackedRedisCommand('updateSession', async () => {
        await redis.set(sKey, JSON.stringify(data), 'EX', ttlSeconds);
      });
    } catch (error) {
      logger.error('Failed to update auth session in Redis', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deletes a session by sessionId.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const sKey = sessionKey(sessionId);

      const session = await this.getSession(sessionId);
      if (session) {
        const uKey = userSessionsKey(session.userId);
        await trackedRedisCommand('deleteSession', async () => {
          const pipeline = redis.pipeline();
          pipeline.del(sKey);
          pipeline.srem(uKey, sessionId);
          await pipeline.exec();
        });
        return true;
      }

      const result = await trackedRedisCommand('deleteSession', async () => {
        return redis.del(sKey);
      });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete auth session from Redis', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Revokes all active sessions for a given user.
   */
  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const redis = getRedis();
      const uKey = userSessionsKey(userId);

      const sessionIds = await trackedRedisCommand('getUserSessions', async () => {
        return redis.smembers(uKey);
      });

      if (sessionIds.length > 0) {
        await trackedRedisCommand('deleteAllUserSessions', async () => {
          const pipeline = redis.pipeline();
          for (const sId of sessionIds) {
            pipeline.del(sessionKey(sId));
          }
          pipeline.del(uKey);
          await pipeline.exec();
        });
      }
    } catch (error) {
      logger.error('Failed to delete user sessions from Redis', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
