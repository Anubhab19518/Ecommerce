import Redis from 'ioredis';
import { getRedis, trackedRedisCommand, checkRedisHealth, closeRedis } from '../connection';

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockRedisConnectionStatusSet = jest.fn();

jest.mock('ioredis');

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: (...args: unknown[]): void => {
      mockLoggerInfo(...args);
    },
    warn: (...args: unknown[]): void => {
      mockLoggerWarn(...args);
    },
    error: (...args: unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

jest.mock('@infrastructure/metrics/metrics', () => ({
  redisConnectionStatus: {
    set: (...args: unknown[]): void => {
      mockRedisConnectionStatusSet(...args);
    },
  },
  redisCommandDuration: {
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  },
}));

type EventHandler = (...args: unknown[]) => void;

describe('Redis Connection Infrastructure', () => {
  let mockPing: jest.MockedFunction<() => Promise<string>>;
  let mockQuit: jest.MockedFunction<() => Promise<string>>;
  let mockOn: jest.MockedFunction<(event: string, cb: EventHandler) => void>;
  let eventListeners: Record<string, EventHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners = {};
    mockPing = jest.fn().mockResolvedValue('PONG');
    mockQuit = jest.fn().mockResolvedValue('OK');
    mockOn = jest.fn().mockImplementation((event: string, cb: EventHandler) => {
      eventListeners[event] = cb;
    });

    (Redis as unknown as jest.Mock).mockImplementation((options) => {
      if (typeof options?.retryStrategy === 'function') {
        const retryDelay = options.retryStrategy(1);
        expect(typeof retryDelay).toBe('number');

        const nullDelay = options.retryStrategy(999);
        expect(nullDelay).toBeNull();
      }

      return {
        status: 'ready',
        ping: mockPing,
        quit: mockQuit,
        on: mockOn,
      };
    });
  });

  afterEach(async () => {
    await closeRedis();
  });

  describe('getRedis', () => {
    it('should initialize and return singleton Redis client instance', () => {
      const redis1 = getRedis();
      const redis2 = getRedis();

      expect(redis1).toBe(redis2);
      expect(Redis).toHaveBeenCalledTimes(1);
    });

    it('should register event listeners for connect, error, and close', () => {
      getRedis();

      eventListeners['connect']?.();
      expect(mockLoggerInfo).toHaveBeenCalledWith('Redis connected');
      expect(mockRedisConnectionStatusSet).toHaveBeenCalledWith(1);

      eventListeners['error']?.(new Error('Connection error'));
      expect(mockLoggerError).toHaveBeenCalledWith('Redis error', {
        error: 'Connection error',
      });
      expect(mockRedisConnectionStatusSet).toHaveBeenCalledWith(0);

      eventListeners['close']?.();
      expect(mockLoggerWarn).toHaveBeenCalledWith('Redis connection closed');
      expect(mockRedisConnectionStatusSet).toHaveBeenCalledWith(0);
    });
  });

  describe('trackedRedisCommand', () => {
    it('should measure command duration and return function result', async () => {
      const mockEnd = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const { redisCommandDuration } = require('@infrastructure/metrics/metrics');
      (redisCommandDuration.startTimer as jest.Mock).mockReturnValueOnce(mockEnd);

      const result = await trackedRedisCommand('get', async () => 'test-val');

      expect(result).toBe('test-val');
      expect(mockEnd.mock.calls.length).toBe(1);
    });

    it('should ensure timer end is called even if command function throws', async () => {
      const mockEnd = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const { redisCommandDuration } = require('@infrastructure/metrics/metrics');
      (redisCommandDuration.startTimer as jest.Mock).mockReturnValueOnce(mockEnd);

      await expect(
        trackedRedisCommand('set', async () => {
          throw new Error('Command failed');
        }),
      ).rejects.toThrow('Command failed');

      expect(mockEnd.mock.calls.length).toBe(1);
    });
  });

  describe('checkRedisHealth', () => {
    it('should return healthy status when redis status is ready and ping succeeds', async () => {
      const health = await checkRedisHealth();
      expect(health.status).toBe('healthy');
      expect(typeof health.latencyMs).toBe('number');
    });

    it('should return unhealthy if redis status is not ready or connect', async () => {
      const redis = getRedis();
      (redis as unknown as { status: string }).status = 'disconnected';

      const health = await checkRedisHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Redis status: disconnected');
    });

    it('should return unhealthy if ping throws an error object', async () => {
      mockPing.mockRejectedValueOnce(new Error('Ping timeout'));
      const health = await checkRedisHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Ping timeout');
    });

    it('should return unhealthy if ping throws a non-Error string', async () => {
      mockPing.mockRejectedValueOnce('Network failure');
      const health = await checkRedisHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Network failure');
    });
  });

  describe('closeRedis', () => {
    it('should close connection and reset singleton instance', async () => {
      getRedis();
      await closeRedis();

      expect(mockQuit.mock.calls.length).toBe(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('Redis connection closed');

      getRedis();
      expect(Redis).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if redisClient is null', async () => {
      await closeRedis();
      expect(mockQuit.mock.calls.length).toBe(0);
    });
  });
});
