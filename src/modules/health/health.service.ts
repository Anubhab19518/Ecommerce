import { checkDatabaseHealth } from '@infrastructure/database/connection';
import { logger } from '@infrastructure/logging/logger';
import { appHealthStatus } from '@infrastructure/metrics/metrics';
import { checkRedisHealth } from '@infrastructure/redis/connection';
import { notificationService, EventType } from '@modules/notification';
import type { HealthCheckResponse, HealthCheck } from '@shared/types';

/**
 * Liveness check — confirms the process is running.
 * Lightweight, no external dependency checks.
 */
export function checkLiveness(): { status: 'ok'; uptime: number } {
  return {
    status: 'ok',
    uptime: process.uptime(),
  };
}

/**
 * Readiness check — confirms all dependencies are healthy.
 * Checks: database, redis.
 * Optionally filter checks via `include` parameter.
 */
export async function checkReadiness(include?: string[]): Promise<HealthCheckResponse> {
  const checks: Record<string, HealthCheck> = {};

  const runCheck = async (
    _name: string,
    fn: () => Promise<HealthCheck | boolean>,
  ): Promise<HealthCheck> => {
    const start = Date.now();
    try {
      const result = await fn();
      const checkResult: HealthCheck =
        typeof result === 'boolean'
          ? { status: result ? 'healthy' : 'unhealthy', latencyMs: Date.now() - start }
          : result;
      return { ...checkResult, latencyMs: checkResult.latencyMs ?? Date.now() - start };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: msg };
    }
  };

  const shouldCheck = (name: string): boolean => !include || include.includes(name);

  // Database check
  if (shouldCheck('database')) {
    checks.database = await runCheck('database', checkDatabaseHealth);
  }

  // Redis check
  if (shouldCheck('redis')) {
    checks.redis = await runCheck('redis', checkRedisHealth);
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  appHealthStatus.set(allHealthy ? 1 : 0);

  // Emit event if any check failed
  if (!allHealthy) {
    const failed = Object.entries(checks)
      .filter(([, c]) => c.status !== 'healthy')
      .map(([name]) => name);

    notificationService.publish(EventType.HEALTH_CHECK_FAILED, {
      component: failed.join(', '),
      error: 'One or more health checks failed',
    });

    logger.warn(`Health check failed for: ${failed.join(', ')}`, { checks });
  }

  return {
    status: allHealthy ? 'ok' : 'error',
    uptime: process.uptime(),
    checks,
  };
}
