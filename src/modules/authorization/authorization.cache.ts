import { config } from '@config/index';
import { logger } from '@infrastructure/logging/logger';
import { getRedis, trackedRedisCommand } from '@infrastructure/redis';
import type { UserPermissionContext } from './authorization.types';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Permission Cache (Redis-backed)
// ─────────────────────────────────────────────────────────────
// Caches the fully-resolved UserPermissionContext in Redis to
// avoid repeated DB queries on every authorization check.
//
// Cache key pattern:
//   authz:user:<userId>:ctx  — user permission context
//   authz:role:<roleId>:users — set of userIds with this role (for invalidation)
//
// NEVER exported from the module barrel (index.ts).
// ─────────────────────────────────────────────────────────────

const KEY_PREFIX = 'authz:user:';
const KEY_SUFFIX = ':ctx';
const ROLE_USERS_PREFIX = 'authz:role:';
const ROLE_USERS_SUFFIX = ':users';

/** Returns the TTL in seconds from config (env var AUTHZ_CACHE_TTL_SECONDS). */
function getTtl(): number {
  return config.authorization.cacheTtlSeconds;
}

function userKey(userId: string): string {
  return `${KEY_PREFIX}${userId}${KEY_SUFFIX}`;
}

function roleUsersKey(roleId: string): string {
  return `${ROLE_USERS_PREFIX}${roleId}${ROLE_USERS_SUFFIX}`;
}

/**
 * Retrieves a cached UserPermissionContext for the given user.
 * Returns null on cache miss or deserialization failure.
 */
export async function getUserContext(userId: string): Promise<UserPermissionContext | null> {
  try {
    const raw = await trackedRedisCommand('authz_get', () => getRedis().get(userKey(userId)));

    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserPermissionContext;
    logger.debug('Authorization cache hit', { userId });
    return parsed;
  } catch (error) {
    logger.warn('Authorization cache read failed, treating as miss', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Stores the UserPermissionContext in Redis with TTL.
 * Also tracks which users belong to which roles for bulk invalidation.
 */
export async function setUserContext(
  userId: string,
  context: UserPermissionContext,
): Promise<void> {
  try {
    const ttl = getTtl();
    const serialized = JSON.stringify(context);

    await trackedRedisCommand('authz_set', () =>
      getRedis().setex(userKey(userId), ttl, serialized),
    );

    // Track user → role mapping for role-level cache invalidation
    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const role of context.roles) {
      pipeline.sadd(roleUsersKey(role.id), userId);
      pipeline.expire(roleUsersKey(role.id), ttl * 2); // Longer TTL for tracking sets
    }
    await trackedRedisCommand('authz_track_roles', () => pipeline.exec());

    logger.debug('Authorization cache set', { userId, ttl, roleCount: context.roles.length });
  } catch (error) {
    // Cache write failure is non-fatal — next request will query the DB
    logger.warn('Authorization cache write failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidates the cached permission context for a single user.
 */
export async function invalidateUser(userId: string): Promise<void> {
  try {
    await trackedRedisCommand('authz_del', () => getRedis().del(userKey(userId)));
    logger.debug('Authorization cache invalidated for user', { userId });
  } catch (error) {
    logger.warn('Authorization cache invalidation failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidates the cached permission context for ALL users who
 * have the given role assigned. Used when a role's permissions change.
 */
export async function invalidateRole(roleId: string): Promise<void> {
  try {
    const redis = getRedis();
    const userIds = await trackedRedisCommand('authz_smembers', () =>
      redis.smembers(roleUsersKey(roleId)),
    );

    if (userIds.length === 0) return;

    const keys = userIds.map(userKey);
    await trackedRedisCommand('authz_del_bulk', () => redis.del(...keys));
    await trackedRedisCommand('authz_del_role_set', () => redis.del(roleUsersKey(roleId)));

    logger.info('Authorization cache invalidated for role', {
      roleId,
      affectedUsers: userIds.length,
    });
  } catch (error) {
    logger.warn('Authorization role cache invalidation failed', {
      roleId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Flushes ALL authorization cache entries. Administrative operation.
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
export async function invalidateAll(): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await trackedRedisCommand('authz_scan', () =>
        redis.scan(cursor, 'MATCH', 'authz:*', 'COUNT', 100),
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await trackedRedisCommand('authz_del_scan', () => redis.del(...keys));
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    logger.info('Authorization cache fully flushed', { totalDeleted });
  } catch (error) {
    logger.warn('Authorization cache full flush failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
