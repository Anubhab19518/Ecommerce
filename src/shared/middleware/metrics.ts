import type { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '@infrastructure/metrics/metrics';

/**
 * Middleware that records HTTP request duration and counts.
 * Wires prom-client histograms/counters to actual request lifecycle.
 *
 * Uses `res.on('finish')` to capture the final status code,
 * and normalizes route paths to avoid high-cardinality label explosion.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics endpoint itself to avoid self-referencing noise
  if (req.path === '/api/v1/health/metrics') {
    next();
    return;
  }

  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const routePath = (req.route as { path?: string } | undefined)?.path ?? req.path;
    const route = normalizeRoute(routePath, req.baseUrl);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}

/**
 * Normalizes Express route paths to prevent cardinality explosion.
 * e.g. /api/v1/users/550e8400-... → /api/v1/users/:id
 */
function normalizeRoute(routePath: string, baseUrl: string): string {
  const fullPath = `${baseUrl}${routePath}`;
  // Replace UUIDs with :id
  return fullPath.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
}
