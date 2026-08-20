/**
 * Unit tests for the Permission Cache layer.
 *
 * Tests Redis-backed caching of UserPermissionContext
 * with TTL, invalidation, and error resilience.
 */

// Mock infrastructure
jest.mock('@infrastructure/redis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
    smembers: jest.fn(),
    scan: jest.fn(),
    pipeline: jest.fn(() => ({
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  };

  return {
    getRedis: jest.fn(() => mockRedis),
    trackedRedisCommand: jest.fn((_cmd: string, fn: () => Promise<unknown>) => fn()),
  };
});

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@config/index', () => ({
  config: {
    authorization: {
      cacheTtlSeconds: 300,
    },
  },
}));

import { getRedis } from '@infrastructure/redis';
import {
  getUserContext,
  setUserContext,
  invalidateUser,
  invalidateRole,
  invalidateAll,
} from '../authorization.cache';
import type { UserPermissionContext } from '../authorization.types';
import { Action } from '../authorization.types';

const mockRedis = getRedis() as jest.Mocked<ReturnType<typeof getRedis>>;

const sampleContext: UserPermissionContext = {
  userId: 'user-123',
  roles: [
    {
      id: 'role-1',
      name: 'editor',
      description: 'Editor role',
      parentRoleId: null,
      isActive: true,
      metadata: null,
      permissions: [
        {
          id: 'perm-1',
          action: Action.READ,
          subject: 'Article',
          fields: null,
          conditions: null,
          inverted: false,
          reason: null,
          isActive: true,
        },
      ],
    },
  ],
  directPermissions: [],
};

describe('PermissionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserContext()', () => {
    it('should return null on cache miss', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await getUserContext('user-123');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('authz:user:user-123:ctx');
    });

    it('should return parsed context on cache hit', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(sampleContext));

      const result = await getUserContext('user-123');

      expect(result).toEqual(sampleContext);
    });

    it('should return null and log warning on parse error', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue('invalid-json{{{');

      const result = await getUserContext('user-123');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await getUserContext('user-123');

      expect(result).toBeNull();
    });
  });

  describe('setUserContext()', () => {
    it('should serialize and store with TTL', async () => {
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      await setUserContext('user-123', sampleContext);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'authz:user:user-123:ctx',
        300,
        JSON.stringify(sampleContext),
      );
    });

    it('should not throw on Redis error', async () => {
      (mockRedis.setex as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      // Should not throw
      await expect(setUserContext('user-123', sampleContext)).resolves.toBeUndefined();
    });
  });

  describe('invalidateUser()', () => {
    it('should delete the user cache key', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      await invalidateUser('user-123');

      expect(mockRedis.del).toHaveBeenCalledWith('authz:user:user-123:ctx');
    });
  });

  describe('invalidateRole()', () => {
    it('should delete all user caches for users with the role', async () => {
      (mockRedis.smembers as jest.Mock).mockResolvedValue(['user-1', 'user-2']);
      (mockRedis.del as jest.Mock).mockResolvedValue(2);

      await invalidateRole('role-abc');

      expect(mockRedis.smembers).toHaveBeenCalledWith('authz:role:role-abc:users');
      expect(mockRedis.del).toHaveBeenCalledWith('authz:user:user-1:ctx', 'authz:user:user-2:ctx');
    });

    it('should be a no-op if no users have the role', async () => {
      (mockRedis.smembers as jest.Mock).mockResolvedValue([]);

      await invalidateRole('role-empty');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateAll()', () => {
    it('should scan and delete all authz keys', async () => {
      (mockRedis.scan as jest.Mock)
        .mockResolvedValueOnce(['42', ['authz:user:u1:ctx', 'authz:user:u2:ctx']])
        .mockResolvedValueOnce(['0', ['authz:role:r1:users']]);
      (mockRedis.del as jest.Mock).mockResolvedValue(2);

      await invalidateAll();

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });
});
