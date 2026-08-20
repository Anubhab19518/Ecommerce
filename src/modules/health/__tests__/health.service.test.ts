import { checkDatabaseHealth } from '@infrastructure/database/connection';
import { checkRedisHealth } from '@infrastructure/redis/connection';
import { checkLiveness, checkReadiness } from '../health.service';

// ---- Mocks ----
jest.mock('@infrastructure/database/connection', () => ({
  checkDatabaseHealth: jest.fn(),
}));

jest.mock('@infrastructure/redis/connection', () => ({
  checkRedisHealth: jest.fn(),
}));

jest.mock('@infrastructure/metrics/metrics', () => ({
  appHealthStatus: { set: jest.fn() },
}));

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@modules/notification', () => ({
  notificationService: { publish: jest.fn() },
  EventType: { HEALTH_CHECK_FAILED: 'health.check_failed' },
}));

const mockedCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<
  typeof checkDatabaseHealth
>;
const mockedCheckRedisHealth = checkRedisHealth as jest.MockedFunction<typeof checkRedisHealth>;

describe('Health Service - Liveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ok status with uptime', () => {
    const result = checkLiveness();

    expect(result).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
    });
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('Health Service - Readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ok when all dependencies are healthy', async () => {
    mockedCheckDatabaseHealth.mockResolvedValue(true);
    mockedCheckRedisHealth.mockResolvedValue({ status: 'healthy', latencyMs: 2 });

    const result = await checkReadiness();

    expect(result.status).toBe('ok');
    expect(result.checks.database!.status).toBe('healthy');
    expect(result.checks.redis!.status).toBe('healthy');
  });

  it('should return error when database is unhealthy', async () => {
    mockedCheckDatabaseHealth.mockResolvedValue(false);
    mockedCheckRedisHealth.mockResolvedValue({ status: 'healthy', latencyMs: 2 });

    const result = await checkReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.database!.status).toBe('unhealthy');
    expect(result.checks.redis!.status).toBe('healthy');
  });

  it('should return error when redis throws', async () => {
    mockedCheckDatabaseHealth.mockResolvedValue(true);
    mockedCheckRedisHealth.mockRejectedValue(new Error('Connection refused'));

    const result = await checkReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.redis!.status).toBe('unhealthy');
    expect(result.checks.redis!.error).toBe('Connection refused');
  });

  it('should filter checks when include parameter is provided', async () => {
    mockedCheckDatabaseHealth.mockResolvedValue(true);

    const result = await checkReadiness(['database']);

    expect(result.checks.database).toBeDefined();
    expect(result.checks.redis).toBeUndefined();
  });

  it('should include latency measurements', async () => {
    mockedCheckDatabaseHealth.mockResolvedValue(true);
    mockedCheckRedisHealth.mockResolvedValue({ status: 'healthy', latencyMs: 5 });

    const result = await checkReadiness();

    expect(result.checks.database!.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.checks.redis!.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
