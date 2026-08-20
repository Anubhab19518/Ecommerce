import type { Request, Response, NextFunction } from 'express';
import { login, refresh, logout, getMe } from '../auth.controller';
import { AuthService } from '../auth.service';

jest.mock('../auth.service');

describe('AuthController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('login', () => {
    it('authenticates and sets cookie', async () => {
      req.body = { email: 'admin@bazar.com', password: 'Password123!' };
      const sampleResult = {
        tokens: { accessToken: 'acc-token', refreshToken: 'ref-token' },
        context: {
          user: { id: 'u1', email: 'admin@bazar.com', name: 'Admin' },
          organisation: { id: 'org-1', name: 'Bazar' },
          isSuperAdmin: false,
          roles: ['ecommerce_admin'],
          permissions: ['read:Product'],
        },
      };
      (AuthService.prototype.login as jest.Mock).mockResolvedValueOnce(sampleResult);

      await login(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'ref-token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: expect.objectContaining({
          accessToken: 'acc-token',
          refreshToken: 'ref-token',
        }),
      });
    });

    it('forwards validation error to next', async () => {
      req.body = { email: 'invalid-email' };
      await login(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refresh', () => {
    it('refreshes token from request body', async () => {
      req.body = { refreshToken: 'ref-123' };
      (AuthService.prototype.refresh as jest.Mock).mockResolvedValueOnce({
        accessToken: 'new-acc',
        refreshToken: 'new-ref',
      });

      await refresh(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-ref', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { accessToken: 'new-acc', refreshToken: 'new-ref' },
      });
    });

    it('refreshes token from cookie if not in body', async () => {
      req.body = {};
      (req as Request & { cookies: Record<string, string> }).cookies = {
        refreshToken: 'cookie-ref-123',
      };
      (AuthService.prototype.refresh as jest.Mock).mockResolvedValueOnce({
        accessToken: 'new-acc',
        refreshToken: 'new-ref',
      });

      await refresh(req as Request, res as Response, next);

      expect(AuthService.prototype.refresh).toHaveBeenCalledWith(
        'cookie-ref-123',
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('throws error if refreshToken is missing in both body and cookie', async () => {
      req.body = {};
      await refresh(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('logout', () => {
    it('logs out, clears cookie, and returns 200', async () => {
      req.body = { refreshToken: 'ref-token' };
      (req as Request & { user: { id: string } }).user = { id: 'u1' };

      await logout(req as Request, res as Response, next);

      expect(AuthService.prototype.logout).toHaveBeenCalledWith('ref-token', 'u1');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next if service throws', async () => {
      (AuthService.prototype.logout as jest.Mock).mockRejectedValueOnce(new Error('Logout failed'));
      await logout(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getMe', () => {
    it('returns current user session context', async () => {
      (req as Request & { user: { id: string } }).user = { id: 'u1' };
      req.headers = { 'x-ecommerce-id': 'ecom-1' };
      const sampleCtx = {
        user: { id: 'u1', email: 'admin@bazar.com', name: 'Admin' },
        organisation: { id: 'ecom-1', name: 'Bazar' },
        isSuperAdmin: true,
        roles: ['super_admin'],
        permissions: ['manage:all'],
      };
      (AuthService.prototype.getMe as jest.Mock).mockResolvedValueOnce(sampleCtx);

      await getMe(req as Request, res as Response, next);

      expect(AuthService.prototype.getMe).toHaveBeenCalledWith('u1', 'ecom-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: sampleCtx,
      });
    });

    it('throws error if user is unauthenticated', async () => {
      await getMe(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
