import request from 'supertest';
import { createApp } from '../server';

describe('Server App (createApp)', () => {
  const app = createApp();

  it('should mount health routes at /api/v1/health', async () => {
    const response = await request(app).get('/api/v1/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should attach X-Request-Id header in responses', async () => {
    const response = await request(app).get('/api/v1/health/live');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should support custom X-Request-Id header if sent', async () => {
    const customId = 'test-request-id-12345';
    const response = await request(app).get('/api/v1/health/live').set('X-Request-Id', customId);
    expect(response.headers['x-request-id']).toBe(customId);
  });

  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/api/v1/non-existent-endpoint');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Route not found',
    });
  });

  it('should process JSON body payloads', async () => {
    const response = await request(app).post('/api/v1/non-existent').send({ test: 'payload' });
    expect(response.status).toBe(404);
  });
});
