import type { Request, Response, NextFunction } from 'express';
import { logger } from '@infrastructure/logging/logger';
import { ForbiddenError, UnauthorizedError } from '@shared/errors';
import { authorize, authorizeAny, type AuthenticatedRequest } from '../authorization.middleware';
import { AuthorizationService } from '../authorization.service';
import { Action } from '../authorization.types';

jest.mock('../authorization.service');

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuthorizationService =
  AuthorizationService.prototype as jest.Mocked<AuthorizationService>;

describe('Authorization Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'user-123', email: 'test@example.com' },
      path: '/test-path',
      method: 'GET',
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('authorize', () => {
    it('should throw UnauthorizedError if user is not attached to request', async () => {
      mockReq.user = undefined;
      const middleware = authorize({ action: Action.READ, subject: 'Article' });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(logger.warn).toHaveBeenCalledWith('Authorization denied', expect.any(Object));
    });

    it('should call canOrFail and call next() on success', async () => {
      (mockAuthorizationService.canOrFail as jest.Mock).mockResolvedValue(undefined);
      const middleware = authorize({
        action: Action.UPDATE,
        subject: 'Article',
        contextResolver: (req) => ({ userEmail: req.user?.email }),
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthorizationService.canOrFail).toHaveBeenCalledWith({
        userId: 'user-123',
        action: Action.UPDATE,
        subject: 'Article',
        field: undefined,
        context: { userEmail: 'test@example.com' },
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should log warning and call next(error) on ForbiddenError', async () => {
      const forbiddenError = new ForbiddenError('Access Denied');
      (mockAuthorizationService.canOrFail as jest.Mock).mockRejectedValue(forbiddenError);
      const middleware = authorize({ action: Action.DELETE, subject: 'Article' });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Authorization denied', {
        userId: 'user-123',
        action: Action.DELETE,
        subject: 'Article',
        path: '/test-path',
        method: 'GET',
      });
      expect(mockNext).toHaveBeenCalledWith(forbiddenError);
    });
  });

  describe('authorizeAny', () => {
    it('should throw UnauthorizedError if user is missing', async () => {
      mockReq.user = undefined;
      const middleware = authorizeAny([{ action: Action.READ, subject: 'Article' }]);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next() as soon as one permission passes', async () => {
      (mockAuthorizationService.can as jest.Mock)
        .mockResolvedValueOnce({ allowed: false, reason: 'Denied first' })
        .mockResolvedValueOnce({ allowed: true });

      const middleware = authorizeAny([
        { action: Action.UPDATE, subject: 'Article' },
        { action: Action.MANAGE, subject: 'Article' },
      ]);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthorizationService.can).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next(ForbiddenError) when no options match', async () => {
      (mockAuthorizationService.can as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Insufficient role',
      });

      const middleware = authorizeAny([
        { action: Action.UPDATE, subject: 'Article' },
        { action: Action.DELETE, subject: 'Article' },
      ]);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
