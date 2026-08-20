/**
 * Unit tests for the Ability Factory.
 *
 * Tests that CASL abilities are correctly built from
 * PermissionDefinitions and that authorization checks
 * produce the expected AuthorizationResult.
 */

// Mock logger and condition compiler
jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../authorization.condition-compiler', () => ({
  compile: jest.fn((template: Record<string, unknown>, _context: Record<string, unknown>) => {
    // Simple pass-through for most tests; specific tests override this
    return template;
  }),
}));

import { buildAbility, checkAbility } from '../authorization.ability-factory';
import { compile as mockCompile } from '../authorization.condition-compiler';
import { Action } from '../authorization.types';
import type { UserPermissionContext, PermissionDefinition } from '../authorization.types';

function makePermission(overrides: Partial<PermissionDefinition> = {}): PermissionDefinition {
  return {
    id: 'perm-1',
    action: Action.READ,
    subject: 'Article',
    fields: null,
    conditions: null,
    inverted: false,
    reason: null,
    isActive: true,
    ...overrides,
  };
}

function makeContext(
  permissions: PermissionDefinition[],
  userId = 'user-1',
): UserPermissionContext {
  return {
    userId,
    roles: [
      {
        id: 'role-1',
        name: 'test-role',
        description: 'Test role',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions,
      },
    ],
    directPermissions: [],
  };
}

describe('AbilityFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildAbility() + checkAbility()', () => {
    it('should allow action when permission exists', () => {
      const context = makeContext([makePermission({ action: Action.READ, subject: 'Article' })]);
      const ability = buildAbility(context);

      const result = checkAbility(ability, {
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny action when no matching permission exists', () => {
      const context = makeContext([makePermission({ action: Action.READ, subject: 'Article' })]);
      const ability = buildAbility(context);

      const result = checkAbility(ability, {
        userId: 'user-1',
        action: Action.DELETE,
        subject: 'Article',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should deny action when subject does not match', () => {
      const context = makeContext([makePermission({ action: Action.READ, subject: 'Article' })]);
      const ability = buildAbility(context);

      const result = checkAbility(ability, {
        userId: 'user-1',
        action: Action.READ,
        subject: 'User',
      });

      expect(result.allowed).toBe(false);
    });

    it('should handle manage action as wildcard', () => {
      const context = makeContext([makePermission({ action: Action.MANAGE, subject: 'Article' })]);
      const ability = buildAbility(context);

      // Manage should grant all actions
      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.CREATE, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.UPDATE, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.DELETE, subject: 'Article' }).allowed,
      ).toBe(true);

      // But not on a different subject
      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'User' }).allowed,
      ).toBe(false);
    });

    it('should handle manage on "all" subject as superadmin', () => {
      const context = makeContext([makePermission({ action: Action.MANAGE, subject: 'all' })]);
      const ability = buildAbility(context);

      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.DELETE, subject: 'User' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.CREATE, subject: 'Report' }).allowed,
      ).toBe(true);
    });

    it('should handle inverted (deny) rules', () => {
      const context = makeContext([
        makePermission({ action: Action.MANAGE, subject: 'Article' }),
        makePermission({
          id: 'perm-deny',
          action: Action.DELETE,
          subject: 'Article',
          inverted: true,
          reason: 'Articles cannot be deleted',
        }),
      ]);
      const ability = buildAbility(context);

      // Can read/update but NOT delete
      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.UPDATE, subject: 'Article' }).allowed,
      ).toBe(true);

      const deleteResult = checkAbility(ability, {
        userId: 'u',
        action: Action.DELETE,
        subject: 'Article',
      });
      expect(deleteResult.allowed).toBe(false);
      expect(deleteResult.reason).toBe('Articles cannot be deleted');
    });

    it('should skip inactive permissions', () => {
      const context = makeContext([
        makePermission({ action: Action.READ, subject: 'Article', isActive: false }),
      ]);
      const ability = buildAbility(context);

      const result = checkAbility(ability, {
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(false);
    });

    it('should handle field-level permissions', () => {
      const context = makeContext([
        makePermission({ action: Action.READ, subject: 'User', fields: ['name', 'email'] }),
      ]);
      const ability = buildAbility(context);

      // Allowed fields
      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'User', field: 'name' })
          .allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'User', field: 'email' })
          .allowed,
      ).toBe(true);

      // Disallowed field
      const result = checkAbility(ability, {
        userId: 'u',
        action: Action.READ,
        subject: 'User',
        field: 'password',
      });
      expect(result.allowed).toBe(false);
    });

    it('should compile conditions when present', () => {
      const conditions = { createdBy: '${user.id}' };
      const context = makeContext([
        makePermission({ action: Action.READ, subject: 'Article', conditions }),
      ]);

      buildAbility(context, { user: { id: 'user-1' } });

      expect(mockCompile).toHaveBeenCalledWith(conditions, { user: { id: 'user-1' } });
    });

    it('should handle multiple roles with merged permissions', () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        roles: [
          {
            id: 'role-1',
            name: 'editor',
            description: '',
            parentRoleId: null,
            isActive: true,
            metadata: null,
            permissions: [makePermission({ id: 'p1', action: Action.READ, subject: 'Article' })],
          },
          {
            id: 'role-2',
            name: 'moderator',
            description: '',
            parentRoleId: null,
            isActive: true,
            metadata: null,
            permissions: [makePermission({ id: 'p2', action: Action.DELETE, subject: 'Comment' })],
          },
        ],
        directPermissions: [],
      };
      const ability = buildAbility(context);

      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'Article' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.DELETE, subject: 'Comment' }).allowed,
      ).toBe(true);
      expect(
        checkAbility(ability, { userId: 'u', action: Action.DELETE, subject: 'Article' }).allowed,
      ).toBe(false);
    });

    it('should handle direct permissions (per-user overrides)', () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        roles: [],
        directPermissions: [
          makePermission({ id: 'dp1', action: Action.READ, subject: 'AuditLog' }),
        ],
      };
      const ability = buildAbility(context);

      expect(
        checkAbility(ability, { userId: 'u', action: Action.READ, subject: 'AuditLog' }).allowed,
      ).toBe(true);
    });

    it('should handle empty context (no roles, no permissions)', () => {
      const context: UserPermissionContext = {
        userId: 'user-1',
        roles: [],
        directPermissions: [],
      };
      const ability = buildAbility(context);

      const result = checkAbility(ability, {
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(false);
    });
  });
});
