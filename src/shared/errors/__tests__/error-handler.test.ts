import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { NotFoundError } from '../app-error';
import { errorHandler } from '../error-handler';

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Global errorHandler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      path: '/api/v1/test',
      method: 'GET',
      headers: { 'x-request-id': 'req-123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('handles ZodError with status 400', () => {
    const schema = z.object({ email: z.string().email('Invalid email address') });
    const result = schema.safeParse({ email: 'not-an-email' });
    if (!result.success) {
      errorHandler(result.error, req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email address',
        code: 'VALIDATION_ERROR',
        requestId: 'req-123',
      });
    }
  });

  it('handles ZodError fallback message when no issues present', () => {
    const error = new ZodError([]);
    errorHandler(error, req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      requestId: 'req-123',
    });
  });

  it('handles AppError with corresponding statusCode and code', () => {
    const err = new NotFoundError('User');
    errorHandler(err, req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User not found',
      code: 'NOT_FOUND',
      requestId: 'req-123',
    });
  });

  it('handles unknown generic Error with status 500', () => {
    const err = new Error('Database connection crashed');
    errorHandler(err, req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: 'req-123',
    });
  });
});
