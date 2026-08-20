import type { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import { UnauthorizedError } from '@shared/errors';
import { authenticate } from '../authentication';

describe('Authentication Middleware', () => {
  const secret = 'test-secret';
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_ACCESS_SECRET: secret };
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws UnauthorizedError when Authorization header is missing', () => {
    expect(() => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError when token prefix is not Bearer', () => {
    mockReq.headers = { authorization: 'Basic 12345' };
    expect(() => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when JWT secret is not configured', () => {
    delete process.env.JWT_ACCESS_SECRET;
    mockReq.headers = { authorization: 'Bearer some.jwt.token' };

    expect(() => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow('JWT secrets are not configured');
  });

  it('throws UnauthorizedError when token is invalid or expired', () => {
    mockReq.headers = { authorization: 'Bearer invalid.token' };

    expect(() => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when payload lacks userId/id/sub', () => {
    const token = sign({ someField: 'value' }, secret);
    mockReq.headers = { authorization: `Bearer ${token}` };

    expect(() => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow('Invalid token payload: missing userId');
  });

  it('attaches user to request and calls next when token is valid', () => {
    const token = sign({ userId: 'user-123', email: 'test@example.com' }, secret);
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request & { user?: { id: string; email?: string } }).user).toEqual(
      expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
      }),
    );
  });
});
