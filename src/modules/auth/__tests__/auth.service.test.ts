import crypto from 'crypto';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@shared/errors';
import { AuthService } from '../auth.service';
import type { SessionData } from '../auth.types';

// Mock Dependencies
const mockRepo = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  deleteUserSessions: jest.fn(),
};

jest.mock('../auth.repository', () => ({
  AuthRepository: jest.fn().mockImplementation(() => mockRepo),
}));

const mockUserService = {
  verifyCredentials: jest.fn(),
  getUserById: jest.fn(),
};

jest.mock('@modules/user', () => ({
  UserService: jest.fn().mockImplementation(() => mockUserService),
}));

const mockAuthzService = {
  getUserRoleAssignments: jest.fn(),
  getUserRoles: jest.fn(),
  getUserPermissions: jest.fn(),
  resolveContext: jest.fn(),
};

jest.mock('@modules/authorization', () => ({
  AuthorizationService: jest.fn().mockImplementation(() => mockAuthzService),
}));

const mockCatalogService = {
  getEcommerce: jest.fn(),
};

jest.mock('@modules/catalog', () => ({
  CatalogService: jest.fn().mockImplementation(() => mockCatalogService),
}));

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  const originalSecret = process.env.JWT_ACCESS_SECRET;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-super-secret-jwt-key-min-32-chars!';
  });

  afterAll(() => {
    process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  const mockUser = {
    id: 'user-111',
    email: 'admin@bazar.com',
    name: 'Bazar Admin',
  };

  const mockEcommerce = {
    id: 'ecom-222',
    name: 'Bazar Store',
    slug: 'bazar-store',
    logo: 'https://bazar.com/logo.png',
    branding: { primaryColor: '#1E60F6' },
  };

  describe('login', () => {
    it('authenticates user and returns tokens + context', async () => {
      mockUserService.verifyCredentials.mockResolvedValueOnce(mockUser);
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      mockAuthzService.getUserRoleAssignments.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-111', roleId: 'r1', scope: 'ecom-222' },
      ]);
      mockAuthzService.getUserRoles.mockResolvedValueOnce([{ id: 'r1', name: 'ecommerce_admin' }]);
      mockAuthzService.getUserPermissions.mockResolvedValueOnce([
        { id: 'p1', action: 'manage', subject: 'Product' },
      ]);
      mockCatalogService.getEcommerce.mockResolvedValueOnce(mockEcommerce);

      const result = await service.login(
        { email: 'admin@bazar.com', password: 'Password123!' },
        { userAgent: 'Jest', ip: '127.0.0.1' },
      );

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.context.user.id).toBe('user-111');
      expect(result.context.organisation?.id).toBe('ecom-222');
      expect(result.context.roles).toEqual(['ecommerce_admin']);
      expect(mockRepo.createSession).toHaveBeenCalled();
    });

    it('throws error when secret is not configured', async () => {
      delete process.env.JWT_ACCESS_SECRET;
      mockUserService.verifyCredentials.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: 'admin@bazar.com', password: 'Password123!' }),
      ).rejects.toThrow('JWT_ACCESS_SECRET is not configured');

      process.env.JWT_ACCESS_SECRET = 'test-super-secret-jwt-key-min-32-chars!';
    });
  });

  describe('refresh', () => {
    it('successfully rotates refresh token and returns new access token', async () => {
      const sessionId = 'session-123';
      const secret = 'original-secret-token';
      const tokenHash = crypto.createHash('sha256').update(secret).digest('hex');
      const refreshToken = `${sessionId}.${secret}`;

      const session: SessionData = {
        sessionId,
        userId: 'user-111',
        tokenHash,
        createdAt: new Date().toISOString(),
        lastRotatedAt: new Date().toISOString(),
      };

      mockRepo.getSession.mockResolvedValueOnce(session);
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);

      const tokens = await service.refresh(refreshToken);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.refreshToken.startsWith(`${sessionId}.`)).toBe(true);
      expect(tokens.refreshToken).not.toBe(refreshToken);
      expect(mockRepo.updateSession).toHaveBeenCalled();
    });

    it('throws UnauthorizedError if refreshToken is empty', async () => {
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError if format is invalid', async () => {
      await expect(service.refresh('invalid-token-no-dot')).rejects.toThrow(
        'Invalid refresh token format',
      );
    });

    it('throws UnauthorizedError if session is not found in Redis', async () => {
      mockRepo.getSession.mockResolvedValueOnce(null);
      await expect(service.refresh('session-999.secret-999')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('detects token reuse and revokes session', async () => {
      const sessionId = 'session-compromised';
      const activeHash = crypto.createHash('sha256').update('active-secret').digest('hex');

      const session: SessionData = {
        sessionId,
        userId: 'user-111',
        tokenHash: activeHash,
        createdAt: new Date().toISOString(),
        lastRotatedAt: new Date().toISOString(),
      };

      mockRepo.getSession.mockResolvedValueOnce(session);

      // Present an old token secret
      const oldRefreshToken = `${sessionId}.old-replayed-secret`;

      await expect(service.refresh(oldRefreshToken)).rejects.toThrow(
        'Invalid or reused refresh token',
      );
      expect(mockRepo.deleteSession).toHaveBeenCalledWith(sessionId);
    });

    it('revokes session and throws error if user account no longer exists', async () => {
      const sessionId = 'session-123';
      const secret = 'secret-val';
      const tokenHash = crypto.createHash('sha256').update(secret).digest('hex');
      const refreshToken = `${sessionId}.${secret}`;

      mockRepo.getSession.mockResolvedValueOnce({
        sessionId,
        userId: 'deleted-user',
        tokenHash,
        createdAt: new Date().toISOString(),
        lastRotatedAt: new Date().toISOString(),
      });
      mockUserService.getUserById.mockRejectedValueOnce(new NotFoundError('User'));

      await expect(service.refresh(refreshToken)).rejects.toThrow('User account not found');
      expect(mockRepo.deleteSession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('logout', () => {
    it('deletes session when valid refreshToken is provided', async () => {
      await service.logout('session-123.secret-456');
      expect(mockRepo.deleteSession).toHaveBeenCalledWith('session-123');
    });

    it('deletes user sessions when userId is provided without refreshToken', async () => {
      await service.logout(undefined, 'user-111');
      expect(mockRepo.deleteUserSessions).toHaveBeenCalledWith('user-111');
    });

    it('falls back to userId if refreshToken format is invalid', async () => {
      await service.logout('malformed-token', 'user-111');
      expect(mockRepo.deleteUserSessions).toHaveBeenCalledWith('user-111');
    });
  });

  describe('getMe', () => {
    it('returns super admin context with explicit requestedEcommerceId', async () => {
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      mockAuthzService.getUserRoleAssignments.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-111', roleId: 'r1', scope: '*' },
      ]);
      mockAuthzService.getUserRoles.mockResolvedValueOnce([{ id: 'r1', name: 'super_admin' }]);
      mockAuthzService.getUserPermissions.mockResolvedValueOnce([
        { id: 'p1', action: 'manage', subject: 'all' },
      ]);
      mockCatalogService.getEcommerce.mockResolvedValueOnce(mockEcommerce);

      const context = await service.getMe('user-111', 'ecom-222');

      expect(context.isSuperAdmin).toBe(true);
      expect(context.organisation?.id).toBe('ecom-222');
      expect(context.roles).toEqual(['super_admin']);
    });

    it('throws ForbiddenError when non-super admin requests an unauthorized store', async () => {
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      mockAuthzService.getUserRoleAssignments.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-111', roleId: 'r1', scope: 'store-A' },
      ]);
      mockAuthzService.getUserRoles.mockResolvedValueOnce([{ id: 'r1', name: 'ecommerce_admin' }]);
      mockAuthzService.getUserPermissions.mockResolvedValueOnce([]);

      await expect(service.getMe('user-111', 'store-B')).rejects.toThrow(ForbiddenError);
    });

    it('handles store not found gracefully', async () => {
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      mockAuthzService.getUserRoleAssignments.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-111', roleId: 'r1', scope: 'store-A' },
      ]);
      mockAuthzService.getUserRoles.mockResolvedValueOnce([{ id: 'r1', name: 'ecommerce_admin' }]);
      mockAuthzService.getUserPermissions.mockResolvedValueOnce([]);
      mockCatalogService.getEcommerce.mockRejectedValueOnce(new NotFoundError('Ecommerce'));

      const context = await service.getMe('user-111');
      expect(context.organisation).toBeNull();
    });

    it('rethrows unexpected catalog errors', async () => {
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      mockAuthzService.getUserRoleAssignments.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-111', roleId: 'r1', scope: 'store-A' },
      ]);
      mockAuthzService.getUserRoles.mockResolvedValueOnce([{ id: 'r1', name: 'ecommerce_admin' }]);
      mockAuthzService.getUserPermissions.mockResolvedValueOnce([]);
      mockCatalogService.getEcommerce.mockRejectedValueOnce(new Error('DB failure'));

      await expect(service.getMe('user-111')).rejects.toThrow('DB failure');
    });
  });
});
