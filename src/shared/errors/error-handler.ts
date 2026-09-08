import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from '@infrastructure/logging/logger';
import { AppError } from './app-error';

/**
 * Global Express error-handling middleware.
 * Must be registered AFTER all routes.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof MulterError) {
    let message = `File upload error: ${err.message}`;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed limit (25MB)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field. Please use "images" for product/variant photos or "image" for banners`;
    }

    res.status(400).json({
      status: 'error',
      message,
      code: 'FILE_UPLOAD_ERROR',
      requestId: req.headers['x-request-id'] ?? undefined,
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.errors[0];
    const message = firstIssue?.message ?? 'Validation error';

    res.status(400).json({
      status: 'error',
      message,
      code: 'VALIDATION_ERROR',
      requestId: req.headers['x-request-id'] ?? undefined,
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      context: err.context,
    });

    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.code,
      requestId: req.headers['x-request-id'] ?? undefined,
    });
    return;
  }

  // Unknown / programmer errors — log full stack and return generic 500
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.headers['x-request-id'] ?? undefined,
  });
}
