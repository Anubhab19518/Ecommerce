import crypto from 'crypto';
import { sign, type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@infrastructure/logging/logger';
import { AuthorizationService } from '@modules/authorization';
import { CatalogService } from '@modules/catalog';
import { UserService } from '@modules/user';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@shared/errors';
import { AuthRepository } from './auth.repository';
import type {
  AuthTokens,
  LoginResult,
  SessionData,
  UserSessionContext,
  AuthenticatedUser,
  AuthenticatedOrganisation,
} from './auth.types';
import type { LoginInput } from './auth.validator';

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ACCESS_EXPIRES_IN = '15m';

export class AuthService {
  private readonly repo = new AuthRepository();
  private readonly userService = new UserService();
  private readonly authzService = new AuthorizationService();
  private readonly catalogService = new CatalogService();

  private getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    return secret;
  }

  private hashToken(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  private generateAccessToken(user: AuthenticatedUser): string {
    const payload = {
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
    };
    const options: SignOptions = {
      expiresIn: ACCESS_EXPIRES_IN,
    };
    return sign(payload, this.getAccessSecret(), options);
  }

  private parseRefreshToken(token: string): { sessionId: string; secret: string } {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new UnauthorizedError('Invalid refresh token format');
    }
    return { sessionId: parts[0], secret: parts[1] };
  }

  /**
   * Authenticates user credentials, creates a Redis session, and issues tokens.
   */
  async login(input: LoginInput, meta?: { userAgent?: string; ip?: string }): Promise<LoginResult> {
    const user = await this.userService.verifyCredentials(input.email, input.password);

    const userObj: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const sessionId = uuidv4();
    const tokenSecret = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(tokenSecret);

    const now = new Date().toISOString();
    const sessionData: SessionData = {
      sessionId,
      userId: user.id,
      tokenHash,
      createdAt: now,
      lastRotatedAt: now,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    };

    await this.repo.createSession(sessionId, sessionData, REFRESH_TTL_SECONDS);

    const accessToken = this.generateAccessToken(userObj);
    const refreshToken = `${sessionId}.${tokenSecret}`;

    const context = await this.getMe(user.id);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      context,
    };
  }

  /**
   * Validates refresh token, rotates session secret, and returns new tokens.
   */
  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const { sessionId, secret } = this.parseRefreshToken(refreshToken);
    const session = await this.repo.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const incomingHash = this.hashToken(secret);

    // Reuse detection: If incoming token hash does not match current session hash,
    // potential token theft! Invalidate entire session.
    if (session.tokenHash !== incomingHash) {
      logger.warn('Refresh token reuse detected. Revoking session immediately.', {
        sessionId,
        userId: session.userId,
      });
      await this.repo.deleteSession(sessionId);
      throw new UnauthorizedError('Invalid or reused refresh token');
    }

    // Verify user exists and is active
    let user;
    try {
      user = await this.userService.getUserById(session.userId);
    } catch {
      await this.repo.deleteSession(sessionId);
      throw new UnauthorizedError('User account not found');
    }

    // Rotate refresh token secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const updatedSession: SessionData = {
      ...session,
      tokenHash: this.hashToken(newSecret),
      lastRotatedAt: new Date().toISOString(),
      userAgent: meta?.userAgent ?? session.userAgent,
      ip: meta?.ip ?? session.ip,
    };

    await this.repo.updateSession(sessionId, updatedSession, REFRESH_TTL_SECONDS);

    const userObj: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const newAccessToken = this.generateAccessToken(userObj);
    const newRefreshToken = `${sessionId}.${newSecret}`;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out user by revoking the Redis session.
   */
  async logout(refreshToken?: string, userId?: string): Promise<void> {
    if (refreshToken) {
      try {
        const { sessionId } = this.parseRefreshToken(refreshToken);
        await this.repo.deleteSession(sessionId);
        return;
      } catch {
        // Fallback to userId if token parsing fails
      }
    }

    if (userId) {
      await this.repo.deleteUserSessions(userId);
    }
  }

  private resolveTargetEcommerceId(
    assignments: Array<{ scope: string | null }>,
    isSuperAdmin: boolean,
    requestedEcommerceId?: string,
  ): string | null {
    if (!requestedEcommerceId) {
      const specific = assignments.find((a) => a.scope && a.scope !== '*');
      return specific?.scope ?? null;
    }

    if (isSuperAdmin) {
      return requestedEcommerceId;
    }

    const hasScope = assignments.some(
      (a) => a.scope === requestedEcommerceId || a.scope === null || a.scope === '*',
    );
    if (!hasScope) {
      throw new ForbiddenError('Access to requested ecommerce organisation is not authorized');
    }
    return requestedEcommerceId;
  }

  private async loadOrganisation(ecommerceId: string): Promise<AuthenticatedOrganisation | null> {
    try {
      const store = await this.catalogService.getEcommerce(ecommerceId);
      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolves authenticated user profile, roles, permissions, and tenant organization context.
   */
  async getMe(userId: string, requestedEcommerceId?: string): Promise<UserSessionContext> {
    const user = await this.userService.getUserById(userId);
    const assignments = await this.authzService.getUserRoleAssignments(userId);
    const roles = await this.authzService.getUserRoles(userId);
    const permissions = await this.authzService.getUserPermissions(userId);

    const roleNames = roles.map((r) => r.name);
    const permissionStrings = permissions.map((p) => `${p.action}:${p.subject}`);

    const isSuperAdmin =
      roleNames.includes('super_admin') ||
      roleNames.includes('admin') ||
      assignments.some((a) => a.scope === null || a.scope === '*');

    const targetEcommerceId = this.resolveTargetEcommerceId(
      assignments,
      isSuperAdmin,
      requestedEcommerceId,
    );

    const organisation = targetEcommerceId ? await this.loadOrganisation(targetEcommerceId) : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organisation,
      isSuperAdmin,
      roles: roleNames,
      permissions: permissionStrings,
    };
  }
}
