import { AuthRepository } from '../auth.repository';
import type { SessionData } from '../auth.types';

const mockPipeline = {
  set: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  srem: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockRedis = {
  pipeline: jest.fn().mockReturnValue(mockPipeline),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
};

jest.mock('@infrastructure/redis', () => ({
  getRedis: () => mockRedis,
  trackedRedisCommand: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthRepository', () => {
  let repo: AuthRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AuthRepository();
  });

  const sampleSession: SessionData = {
    sessionId: 'session-123',
    userId: 'user-456',
    tokenHash: 'hash-abc',
    createdAt: new Date().toISOString(),
    lastRotatedAt: new Date().toISOString(),
    userAgent: 'Mozilla/5.0',
    ip: '127.0.0.1',
  };

  describe('createSession', () => {
    it('creates session and adds to user session set', async () => {
      await repo.createSession('session-123', sampleSession, 3600);
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith(
        'auth:session:session-123',
        JSON.stringify(sampleSession),
        'EX',
        3600,
      );
      expect(mockPipeline.sadd).toHaveBeenCalledWith('auth:user_sessions:user-456', 'session-123');
      expect(mockPipeline.expire).toHaveBeenCalledWith('auth:user_sessions:user-456', 3600);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('throws error when redis pipeline fails', async () => {
      mockPipeline.exec.mockRejectedValueOnce(new Error('Redis connection lost'));
      await expect(repo.createSession('session-123', sampleSession, 3600)).rejects.toThrow(
        'Redis connection lost',
      );
    });
  });

  describe('getSession', () => {
    it('returns parsed session data on cache hit', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sampleSession));
      const result = await repo.getSession('session-123');
      expect(result).toEqual(sampleSession);
      expect(mockRedis.get).toHaveBeenCalledWith('auth:session:session-123');
    });

    it('returns null on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await repo.getSession('non-existent');
      expect(result).toBeNull();
    });

    it('returns null and logs warning on error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis read failure'));
      const result = await repo.getSession('session-err');
      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('updates session with new TTL', async () => {
      await repo.updateSession('session-123', sampleSession, 3600);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'auth:session:session-123',
        JSON.stringify(sampleSession),
        'EX',
        3600,
      );
    });

    it('throws error on failure', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Redis write failed'));
      await expect(repo.updateSession('session-123', sampleSession, 3600)).rejects.toThrow(
        'Redis write failed',
      );
    });
  });

  describe('deleteSession', () => {
    it('deletes session and removes from user set when session exists', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sampleSession));
      const deleted = await repo.deleteSession('session-123');
      expect(deleted).toBe(true);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:session-123');
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:user_sessions:user-456', 'session-123');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('deletes key directly if getSession returns null', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.del.mockResolvedValueOnce(1);
      const deleted = await repo.deleteSession('session-orphan');
      expect(deleted).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('auth:session:session-orphan');
    });

    it('returns false on error', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.del.mockRejectedValueOnce(new Error('Redis delete failed'));
      const deleted = await repo.deleteSession('session-err');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteUserSessions', () => {
    it('deletes all sessions in user set', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['s1', 's2']);
      await repo.deleteUserSessions('user-456');
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:s1');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:s2');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user_sessions:user-456');
    });

    it('does nothing if user has no sessions', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]);
      await repo.deleteUserSessions('user-empty');
      expect(mockPipeline.del).not.toHaveBeenCalled();
    });

    it('handles redis error gracefully', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('Redis smembers error'));
      await expect(repo.deleteUserSessions('user-err')).resolves.not.toThrow();
    });
  });
});
