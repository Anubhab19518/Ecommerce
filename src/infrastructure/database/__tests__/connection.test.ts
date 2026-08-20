import { Sequelize } from 'sequelize';
import { getSequelize, checkDatabaseHealth, closeDatabase } from '../connection';

const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockDbConnectionStatusSet = jest.fn();

jest.mock('@config/index', () => ({
  config: {
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
      user: 'test_user',
      password: 'test_password',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      logging: true,
    },
  },
}));

jest.mock('sequelize');

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    debug: (...args: unknown[]): void => {
      mockLoggerDebug(...args);
    },
    info: (...args: unknown[]): void => {
      mockLoggerInfo(...args);
    },
    error: (...args: unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbConnectionStatus: {
    set: (...args: unknown[]): void => {
      mockDbConnectionStatusSet(...args);
    },
  },
}));

describe('Database Connection', () => {
  let mockAuthenticate: jest.MockedFunction<() => Promise<void>>;
  let mockClose: jest.MockedFunction<() => Promise<void>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate = jest.fn().mockResolvedValue(undefined);
    mockClose = jest.fn().mockResolvedValue(undefined);

    (Sequelize as unknown as jest.Mock).mockImplementation((_db, _user, _pass, options) => {
      if (typeof options?.logging === 'function') {
        options.logging('SELECT 1', 5);
      }
      return {
        authenticate: mockAuthenticate,
        close: mockClose,
      };
    });
  });

  afterEach(async () => {
    await closeDatabase();
  });

  describe('getSequelize', () => {
    it('should create and return a single Sequelize instance (singleton)', () => {
      const instance1 = getSequelize();
      const instance2 = getSequelize();

      expect(instance1).toBe(instance2);
      expect(Sequelize).toHaveBeenCalledTimes(1);
    });

    it('should invoke logger.debug when logging option function is invoked', () => {
      getSequelize();
      expect(mockLoggerDebug).toHaveBeenCalledWith('SELECT 1', { durationMs: 5 });
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true and set metric to 1 when authenticate succeeds', async () => {
      mockAuthenticate.mockResolvedValueOnce(undefined);
      const isHealthy = await checkDatabaseHealth();

      expect(isHealthy).toBe(true);
      expect(mockAuthenticate.mock.calls.length).toBe(1);
      expect(mockDbConnectionStatusSet).toHaveBeenCalledWith(1);
    });

    it('should return false, set metric to 0, and log error when authenticate fails', async () => {
      const dbError = new Error('Connection refused');
      mockAuthenticate.mockRejectedValueOnce(dbError);

      const isHealthy = await checkDatabaseHealth();

      expect(isHealthy).toBe(false);
      expect(mockDbConnectionStatusSet).toHaveBeenCalledWith(0);
      expect(mockLoggerError).toHaveBeenCalledWith('Database health check failed', {
        error: dbError,
      });
    });
  });

  describe('closeDatabase', () => {
    it('should close database pool and reset singleton instance', async () => {
      getSequelize();
      await closeDatabase();

      expect(mockClose.mock.calls.length).toBe(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('Database connection pool closed');

      getSequelize();
      expect(Sequelize).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if sequelizeInstance is null', async () => {
      await closeDatabase();
      expect(mockClose.mock.calls.length).toBe(0);
    });
  });
});
