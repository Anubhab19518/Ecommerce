import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../health.routes';

// ---- Mocks ----
jest.mock('@infrastructure/database/connection', () => ({
  checkDatabaseHealth: jest.fn().mockResolvedValue(true),
}));

jest.mock('@infrastructure/redis/connection', () => ({
  checkRedisHealth: jest.fn().mockResolvedValue({ status: 'healthy', latencyMs: 1 }),
}));

jest.mock('@infrastructure/metrics/metrics', () => ({
  appHealthStatus: { set: jest.fn() },
  register: {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('# HELP app_health\n'),
  },
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

describe('Health Routes', () => {
  const app = express();
  app.use('/api/v1/health', healthRoutes);

  describe('GET /api/v1/health/live', () => {
    it('should return 200 with ok status', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 when all checks pass', async () => {
      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.checks).toBeDefined();
    });

    it('should support include query parameter', async () => {
      const res = await request(app).get('/api/v1/health/ready?include=database');

      expect(res.status).toBe(200);
      expect(res.body.checks.database).toBeDefined();
    });
  });

  describe('GET /api/v1/health/metrics', () => {
    it('should return Prometheus metrics in text format', async () => {
      const res = await request(app).get('/api/v1/health/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });
});
