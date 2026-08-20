import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@shared/errors';
import { AuthService } from './auth.service';
import { loginSchema, refreshSchema, logoutSchema } from './auth.validator';

const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

function getCookieToken(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, unknown> }).cookies;
  if (cookies && typeof cookies['refreshToken'] === 'string') {
    return cookies['refreshToken'];
  }
  return undefined;
}

function getUserId(req: Request): string | undefined {
  const user = (req as Request & { user?: Record<string, unknown> }).user;
  if (user && typeof user['id'] === 'string') {
    return user['id'];
  }
  return undefined;
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    const result = await authService.login(input, meta);

    res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      status: 'ok',
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: result.context.user,
        organisation: result.context.organisation,
        isSuperAdmin: result.context.isSuperAdmin,
        roles: result.context.roles,
        permissions: result.context.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = refreshSchema.parse(req.body);
    const refreshToken = body.refreshToken ?? getCookieToken(req);

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required in request body or cookie');
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    const tokens = await authService.refresh(refreshToken, meta);

    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      status: 'ok',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = logoutSchema.parse(req.body);
    const refreshToken = body.refreshToken ?? getCookieToken(req);
    const userId = getUserId(req);

    await authService.logout(refreshToken, userId);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(200).json({
      status: 'ok',
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const requestedEcommerceId = req.headers['x-ecommerce-id'] as string | undefined;
    const context = await authService.getMe(userId, requestedEcommerceId);

    res.status(200).json({
      status: 'ok',
      data: context,
    });
  } catch (error) {
    next(error);
  }
}
