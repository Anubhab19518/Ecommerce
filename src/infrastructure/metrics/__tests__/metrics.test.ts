import {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  dbQueryDuration,
  redisCommandDuration,
  appHealthStatus,
  dbConnectionStatus,
  redisConnectionStatus,
} from '../metrics';

describe('Prometheus Metrics Infrastructure', () => {
  it('should export an initialized Registry instance', () => {
    expect(register).toBeDefined();
    expect(typeof register.metrics).toBe('function');
  });

  it('should collect default metrics with app_ prefix', async () => {
    const metricsOutput = await register.metrics();
    expect(metricsOutput).toContain('app_');
  });

  it('should define and allow observing httpRequestDuration histogram', () => {
    expect(httpRequestDuration).toBeDefined();
    expect(() =>
      httpRequestDuration.observe({ method: 'GET', route: '/health', status_code: '200' }, 0.05),
    ).not.toThrow();
  });

  it('should define and allow incrementing httpRequestsTotal counter', () => {
    expect(httpRequestsTotal).toBeDefined();
    expect(() =>
      httpRequestsTotal.inc({ method: 'POST', route: '/users', status_code: '201' }),
    ).not.toThrow();
  });

  it('should define and allow observing dbQueryDuration histogram', () => {
    expect(dbQueryDuration).toBeDefined();
    expect(() =>
      dbQueryDuration.observe({ operation: 'SELECT', model: 'User' }, 0.01),
    ).not.toThrow();
  });

  it('should define and allow observing redisCommandDuration histogram', () => {
    expect(redisCommandDuration).toBeDefined();
    expect(() => redisCommandDuration.observe({ command: 'get' }, 0.002)).not.toThrow();
  });

  it('should define and update appHealthStatus gauge', () => {
    expect(appHealthStatus).toBeDefined();
    appHealthStatus.set(1);
    appHealthStatus.set(0);
  });

  it('should define and update dbConnectionStatus gauge', () => {
    expect(dbConnectionStatus).toBeDefined();
    dbConnectionStatus.set(1);
    dbConnectionStatus.set(0);
  });

  it('should define and update redisConnectionStatus gauge', () => {
    expect(redisConnectionStatus).toBeDefined();
    redisConnectionStatus.set(1);
    redisConnectionStatus.set(0);
  });
});
