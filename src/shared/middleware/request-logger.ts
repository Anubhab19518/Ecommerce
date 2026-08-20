import type { Request, Response, NextFunction } from 'express';
import { logger } from '@infrastructure/logging/logger';

/**
 * Middleware that logs every HTTP request with method, path, status, and duration.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log after response finishes to capture status code
  // fallow-ignore-next-line complexity
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader('content-length') ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
  });

  next();
}
