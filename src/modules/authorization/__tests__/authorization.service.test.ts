/**
 * Unit tests for the Authorization Service.
 *
 * Tests the public API layer including permission checks,
 * role management, cache integration, and event publishing.
 */

// ─── Mocks ───

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@modules/notification', () => ({
  notificationService: {
    publish: jest.fn(),
    subscribe: jest.fn(),
  },
  EventType: {
    ROLE_ASSIGNED: 'authorization.role_assigned',
    ROLE_REVOKED: 'authorization.role_revoked',
    PERMISSIONS_UPDATED: 'authorization.permissions_updated',
  },
}));

jest.mock('../authorization.cache', () => ({
  getUserContext: jest.fn(),
  setUserContext: jest.fn(),
  invalidateUser: jest.fn(),
  invalidateRole: jest.fn(),
  invalidateAll: jest.fn(),
}));

jest.mock('../authorization.ability-factory', () => ({
  buildAbility: jest.fn(),
  checkAbility: jest.fn(),
}));

jest.mock('../authorization.repository');

import { notificationService, EventType } from '@modules/notification';
import { ForbiddenError, NotFoundError, ConflictError } from '@shared/errors';
import { buildAbility, checkAbility } from '../authorization.ability-factory';
import * as permissionCache from '../authorization.cache';
import { AuthorizationRepository } from '../authorization.repository';
import { AuthorizationService } from '../authorization.service';
import { Action } from '../authorization.types';
import type { UserPermissionContext, RoleDefinition } from '../authorization.types';

// Get reference to the mocked prototype — all instances share these mocks
const MockedRepo = AuthorizationRepository as jest.MockedClass<typeof AuthorizationRepository>;
const mockCache = permissionCache as jest.Mocked<typeof permissionCache>;
const mockBuildAbility = buildAbility as jest.MockedFunction<typeof buildAbility>;
const mockCheckAbility = checkAbility as jest.MockedFunction<typeof checkAbility>;

const sampleRole: RoleDefinition = {
  id: 'role-1',
  name: 'editor',
  description: 'Editor role',
  parentRoleId: null,
  isActive: true,
  metadata: null,
  permissions: [
    {
      id: 'perm-1',
      action: Action.READ,
      subject: 'Article',
      fields: null,
      conditions: null,
      inverted: false,
      reason: null,
      isActive: true,
    },
  ],
};

const sampleContext: UserPermissionContext = {
  userId: 'user-1',
  roles: [sampleRole],
  directPermissions: [],
};

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let repoInstance: jest.Mocked<AuthorizationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthorizationService();
    // Get the instance that was created inside the service constructor
    repoInstance = MockedRepo.mock.instances[0] as jest.Mocked<AuthorizationRepository>;
  });

  describe('can()', () => {
    it('should return allowed when check passes (cache hit)', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);
      mockBuildAbility.mockReturnValue({} as ReturnType<typeof buildAbility>);
      mockCheckAbility.mockReturnValue({ allowed: true });

      const result = await service.can({
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(true);
      expect(mockCache.getUserContext).toHaveBeenCalledWith('user-1');
    });

    it('should return denied when check fails', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);
      mockBuildAbility.mockReturnValue({} as ReturnType<typeof buildAbility>);
      mockCheckAbility.mockReturnValue({
        allowed: false,
        reason: 'Access denied: cannot delete Article',
      });

      const result = await service.can({
        userId: 'user-1',
        action: Action.DELETE,
        subject: 'Article',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('delete');
    });

    it('should deny immediately when user has no roles', async () => {
      mockCache.getUserContext.mockResolvedValue({
        userId: 'user-1',
        roles: [],
        directPermissions: [],
      });

      const result = await service.can({
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No roles assigned');
      // Should NOT call buildAbility when no roles exist
      expect(mockBuildAbility).not.toHaveBeenCalled();
    });

    it('should fall back to database on cache miss', async () => {
      mockCache.getUserContext.mockResolvedValue(null); // cache miss
      repoInstance.resolveUserPermissionContext.mockResolvedValue(sampleContext);
      mockCache.setUserContext.mockResolvedValue(undefined);
      mockBuildAbility.mockReturnValue({} as ReturnType<typeof buildAbility>);
      mockCheckAbility.mockReturnValue({ allowed: true });

      const result = await service.can({
        userId: 'user-1',
        action: Action.READ,
        subject: 'Article',
      });

      expect(result.allowed).toBe(true);
      expect(repoInstance.resolveUserPermissionContext).toHaveBeenCalledWith('user-1');
      expect(mockCache.setUserContext).toHaveBeenCalledWith('user-1', sampleContext);
    });
  });

  describe('canOrFail()', () => {
    it('should not throw when allowed', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);
      mockBuildAbility.mockReturnValue({} as ReturnType<typeof buildAbility>);
      mockCheckAbility.mockReturnValue({ allowed: true });

      await expect(
        service.canOrFail({ userId: 'user-1', action: Action.READ, subject: 'Article' }),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError when denied', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);
      mockBuildAbility.mockReturnValue({} as ReturnType<typeof buildAbility>);
      mockCheckAbility.mockReturnValue({ allowed: false, reason: 'Not allowed' });

      await expect(
        service.canOrFail({ userId: 'user-1', action: Action.DELETE, subject: 'Article' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('createRole()', () => {
    it('should create a role when name is unique', async () => {
      repoInstance.findRoleByName.mockResolvedValue(null);
      repoInstance.createRole.mockResolvedValue(sampleRole);

      const result = await service.createRole({ name: 'editor', description: 'Editor role' });

      expect(result.name).toBe('editor');
      expect(repoInstance.createRole).toHaveBeenCalled();
    });

    it('should throw ConflictError when name already exists', async () => {
      repoInstance.findRoleByName.mockResolvedValue(sampleRole);

      await expect(
        service.createRole({ name: 'editor', description: 'Duplicate' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('assignRoleToUser()', () => {
    it('should assign role and invalidate cache', async () => {
      repoInstance.findRoleById.mockResolvedValue(sampleRole);
      repoInstance.assignRoleToUser.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        scope: null,
        assignedAt: new Date(),
        expiresAt: null,
      });

      await service.assignRoleToUser('user-1', 'role-1');

      expect(mockCache.invalidateUser).toHaveBeenCalledWith('user-1');
      expect(notificationService.publish).toHaveBeenCalledWith(
        EventType.ROLE_ASSIGNED,
        expect.objectContaining({ userId: 'user-1', roleId: 'role-1' }),
      );
    });

    it('should throw NotFoundError when role does not exist', async () => {
      repoInstance.findRoleById.mockResolvedValue(null);

      await expect(service.assignRoleToUser('user-1', 'nonexistent-role')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('revokeRoleFromUser()', () => {
    it('should revoke role and invalidate cache', async () => {
      repoInstance.revokeRoleFromUser.mockResolvedValue(true);

      await service.revokeRoleFromUser('user-1', 'role-1');

      expect(mockCache.invalidateUser).toHaveBeenCalledWith('user-1');
      expect(notificationService.publish).toHaveBeenCalledWith(
        EventType.ROLE_REVOKED,
        expect.objectContaining({ userId: 'user-1', roleId: 'role-1' }),
      );
    });

    it('should throw NotFoundError when revoking unassigned role', async () => {
      repoInstance.revokeRoleFromUser.mockResolvedValue(false);

      await expect(service.revokeRoleFromUser('user-1', 'role-99')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserPermissions() & getUserRoles()', () => {
    it('should return deduplicated permissions for user', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);

      const perms = await service.getUserPermissions('user-1');
      expect(perms).toHaveLength(1);
      expect(perms[0]!.id).toBe('perm-1');
    });

    it('should return roles assigned to user', async () => {
      mockCache.getUserContext.mockResolvedValue(sampleContext);

      const roles = await service.getUserRoles('user-1');
      expect(roles).toEqual([sampleRole]);
    });
  });

  describe('Role Management Edge Cases', () => {
    it('getRoleById should return role or throw NotFoundError', async () => {
      repoInstance.findRoleById.mockResolvedValue(sampleRole);
      await expect(service.getRoleById('role-1')).resolves.toEqual(sampleRole);

      repoInstance.findRoleById.mockResolvedValue(null);
      await expect(service.getRoleById('invalid')).rejects.toThrow(NotFoundError);
    });

    it('createRole should validate parent role existence', async () => {
      repoInstance.findRoleByName.mockResolvedValue(null);
      repoInstance.findRoleById.mockResolvedValue(null);

      await expect(
        service.createRole({
          name: 'sub_editor',
          description: 'Sub Editor',
          parentRoleId: 'parent-1',
        }),
      ).rejects.toThrow('Parent role not found');
    });

    it('updateRole should throw ValidationError if no fields provided', async () => {
      await expect(service.updateRole('role-1', {})).rejects.toThrow(
        'At least one field must be provided',
      );
    });

    it('updateRole should throw ConflictError if name is taken by another role', async () => {
      repoInstance.findRoleByName.mockResolvedValue({ ...sampleRole, id: 'role-2' });

      await expect(service.updateRole('role-1', { name: 'editor' })).rejects.toThrow(ConflictError);
    });

    it('updateRole should throw ValidationError if setting self as parent', async () => {
      await expect(service.updateRole('role-1', { parentRoleId: 'role-1' })).rejects.toThrow(
        'cannot be its own parent',
      );
    });

    it('updateRole should throw ValidationError if parent role not found', async () => {
      repoInstance.findRoleById.mockResolvedValue(null);

      await expect(service.updateRole('role-1', { parentRoleId: 'missing-role' })).rejects.toThrow(
        'Parent role not found',
      );
    });

    it('deleteRole should deactivate role and invalidate role cache', async () => {
      repoInstance.deleteRole.mockResolvedValue(true);

      await service.deleteRole('role-1');

      expect(mockCache.invalidateRole).toHaveBeenCalledWith('role-1');
    });

    it('deleteRole should throw NotFoundError when role not found', async () => {
      repoInstance.deleteRole.mockResolvedValue(false);

      await expect(service.deleteRole('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Permission Management & Attachment', () => {
    it('listPermissions and createPermission', async () => {
      const perm = {
        id: 'p1',
        action: Action.READ,
        subject: 'File',
        fields: null,
        conditions: null,
        inverted: false,
        reason: null,
        isActive: true,
      };
      repoInstance.findAllPermissions.mockResolvedValue([perm]);
      repoInstance.createPermission.mockResolvedValue(perm);

      expect(await service.listPermissions()).toEqual([perm]);
      expect(await service.createPermission({ action: Action.READ, subject: 'File' })).toEqual(
        perm,
      );
    });

    it('updatePermission should throw ValidationError on empty input', async () => {
      await expect(service.updatePermission('p1', {})).rejects.toThrow(
        'At least one field must be provided',
      );
    });

    it('updatePermission and deletePermission', async () => {
      const perm = {
        id: 'p1',
        action: Action.READ,
        subject: 'File',
        fields: null,
        conditions: null,
        inverted: false,
        reason: null,
        isActive: true,
      };
      repoInstance.updatePermission.mockResolvedValue(perm);
      repoInstance.deletePermission.mockResolvedValue(true);

      await service.updatePermission('p1', { reason: 'new reason' });
      expect(mockCache.invalidateAll).toHaveBeenCalled();

      await service.deletePermission('p1');
      expect(mockCache.invalidateAll).toHaveBeenCalledTimes(2);
    });

    it('attachPermissionToRole and detachPermissionFromRole', async () => {
      repoInstance.findRoleById.mockResolvedValue(sampleRole);
      repoInstance.findPermissionById.mockResolvedValue({
        id: 'perm-1',
        action: Action.READ,
        subject: 'Article',
        fields: null,
        conditions: null,
        inverted: false,
        reason: null,
        isActive: true,
      });
      repoInstance.attachPermissionToRole.mockResolvedValue(undefined);
      repoInstance.detachPermissionFromRole.mockResolvedValue(true);

      await service.attachPermissionToRole('role-1', 'perm-1');
      expect(mockCache.invalidateRole).toHaveBeenCalledWith('role-1');

      await service.detachPermissionFromRole('role-1', 'perm-1');
      expect(mockCache.invalidateRole).toHaveBeenCalledWith('role-1');
    });
  });

  describe('Condition Templates, User Role Assignments & Cache Invalidation', () => {
    it('getUserRoleAssignments, listConditionTemplates, createConditionTemplate', async () => {
      repoInstance.findUserRoleAssignments.mockResolvedValue([]);
      repoInstance.findAllConditionTemplates.mockResolvedValue([]);
      repoInstance.createConditionTemplate.mockResolvedValue({
        id: 't1',
        name: 'test',
        description: 'desc',
        template: {},
        isActive: true,
      });

      expect(await service.getUserRoleAssignments('user-1')).toEqual([]);
      expect(await service.listConditionTemplates()).toEqual([]);
      expect(
        await service.createConditionTemplate({ name: 'test', description: 'desc', template: {} }),
      ).toBeDefined();
    });

    it('invalidateUserCache should invalidate specific user cache', async () => {
      await service.invalidateUserCache('user-1');

      expect(mockCache.invalidateUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('invalidateAllCaches()', () => {
    it('should flush all authorization caches', async () => {
      await service.invalidateAllCaches();

      expect(mockCache.invalidateAll).toHaveBeenCalled();
    });
  });
});
