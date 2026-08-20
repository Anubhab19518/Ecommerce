import type { Request, Response, NextFunction } from 'express';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from '@shared/errors';

export interface TokenPayload extends JwtPayload {
  userId?: string;
  id?: string;
  email?: string;
}

/**
 * Authentication middleware that verifies JWT access token from Authorization header.
 * Attaches decoded user payload to req.user for downstream authorization and controller handlers.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Invalid token format');
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new UnauthorizedError('JWT secrets are not configured');
  }

  try {
    const decoded = verify(token, secret) as TokenPayload;
    const userId = decoded.userId ?? decoded.id ?? decoded.sub;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedError('Invalid token payload: missing userId');
    }

    (req as Request & { user?: Record<string, unknown> }).user = {
      id: userId,
      email: decoded.email,
      ...decoded,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
