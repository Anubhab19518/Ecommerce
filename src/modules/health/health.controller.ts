import type { Request, Response, NextFunction } from 'express';
import { register } from '@infrastructure/metrics/metrics';
import { checkLiveness, checkReadiness } from './health.service';
import { readyCheckQuerySchema } from './health.validator';

/**
 * GET /api/v1/health/live
 * Liveness probe — minimal check that the process is alive.
 */
export function livenessHandler(_req: Request, res: Response, next: NextFunction): void {
  try {
    const result = checkLiveness();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/health/ready
 * Readiness probe — checks all external dependencies.
 */
export async function readinessHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = readyCheckQuerySchema.safeParse(req.query);
    const include = query.success ? query.data.include : undefined;
    const result = await checkReadiness(include);
    const statusCode = result.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/health/metrics
 * Exposes Prometheus metrics in text format.
 */
export async function metricsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.status(200).send(await register.metrics());
  } catch (error) {
    next(error);
  }
}
