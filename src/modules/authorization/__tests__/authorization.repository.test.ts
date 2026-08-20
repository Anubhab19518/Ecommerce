import {
  RoleModelDef,
  PermissionModelDef,
  RolePermissionModelDef,
  UserRoleModelDef,
  PermissionConditionModelDef,
} from '../authorization.model';
import { AuthorizationRepository } from '../authorization.repository';
import { Action } from '../authorization.types';

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbQueryDuration: {
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('../authorization.model', () => ({
  RoleModelDef: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  PermissionModelDef: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  RolePermissionModelDef: {
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
  UserRoleModelDef: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
  PermissionConditionModelDef: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

describe('AuthorizationRepository', () => {
  let repository: AuthorizationRepository;

  const validUuid1 = '11111111-1111-1111-1111-111111111111';
  const validUuid2 = '22222222-2222-2222-2222-222222222222';
  const validUuid3 = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AuthorizationRepository();
  });

  describe('Role Operations', () => {
    it('findAllRoles should return role definitions with permissions', async () => {
      const mockRole = {
        id: validUuid1,
        name: 'admin',
        description: 'Admin role',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions: [
          {
            id: validUuid2,
            action: Action.MANAGE,
            subject: 'all',
            fields: null,
            conditionsJson: null,
            inverted: false,
            reason: null,
            isActive: true,
          },
        ],
      };
      (RoleModelDef.findAll as jest.Mock).mockResolvedValue([mockRole]);

      const result = await repository.findAllRoles(true);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('admin');
      expect(result[0]!.permissions[0]!.action).toBe(Action.MANAGE);
    });

    it('findRoleById should return null when role is missing', async () => {
      (RoleModelDef.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findRoleById(validUuid1);

      expect(result).toBeNull();
    });

    it('findRoleByName should return role definition when found', async () => {
      const mockRole = {
        id: validUuid1,
        name: 'editor',
        description: '',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions: [],
      };
      (RoleModelDef.findOne as jest.Mock).mockResolvedValue(mockRole);

      const result = await repository.findRoleByName('editor');

      expect(result).toEqual({
        id: validUuid1,
        name: 'editor',
        description: '',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions: [],
      });
    });

    it('createRole should create and return a role definition', async () => {
      const mockCreatedRole = {
        id: validUuid1,
        name: 'viewer',
        description: 'Viewer role',
        parentRoleId: null,
        isActive: true,
        metadata: null,
      };
      (RoleModelDef.create as jest.Mock).mockResolvedValue(mockCreatedRole);

      const result = await repository.createRole({ name: 'viewer', description: 'Viewer role' });

      expect(result.name).toBe('viewer');
      expect(result.permissions).toEqual([]);
    });

    it('updateRole should update role properties and return refreshed role', async () => {
      const mockRoleInstance = {
        id: validUuid1,
        name: 'viewer',
        update: jest.fn().mockResolvedValue(true),
      };
      (RoleModelDef.findByPk as jest.Mock).mockResolvedValueOnce(mockRoleInstance);
      (RoleModelDef.findByPk as jest.Mock).mockResolvedValueOnce({
        ...mockRoleInstance,
        name: 'super_viewer',
        description: 'updated',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions: [],
      });

      const result = await repository.updateRole(validUuid1, {
        name: 'super_viewer',
        description: 'updated',
      });

      expect(mockRoleInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'super_viewer' }),
      );
      expect(result?.name).toBe('super_viewer');
    });

    it('updateRole should return null if role does not exist', async () => {
      (RoleModelDef.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.updateRole(validUuid1, { name: 'new' });

      expect(result).toBeNull();
    });

    it('deleteRole should soft delete by updating isActive to false', async () => {
      (RoleModelDef.update as jest.Mock).mockResolvedValue([1]);

      const result = await repository.deleteRole(validUuid1);

      expect(result).toBe(true);
      expect(RoleModelDef.update).toHaveBeenCalledWith(
        { isActive: false },
        { where: { id: validUuid1 } },
      );
    });
  });

  describe('Permission Operations', () => {
    it('findAllPermissions should return permission definitions', async () => {
      const mockPerm = {
        id: validUuid2,
        action: Action.READ,
        subject: 'Article',
        fields: ['title'],
        conditionsJson: null,
        inverted: false,
        reason: null,
        isActive: true,
      };
      (PermissionModelDef.findAll as jest.Mock).mockResolvedValue([mockPerm]);

      const result = await repository.findAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0]!.subject).toBe('Article');
    });

    it('findPermissionById should return permission or null', async () => {
      (PermissionModelDef.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findPermissionById(validUuid2);

      expect(result).toBeNull();
    });

    it('createPermission should create and return permission definition', async () => {
      const mockCreated = {
        id: validUuid2,
        action: Action.CREATE,
        subject: 'Post',
        fields: null,
        conditionsJson: null,
        inverted: false,
        reason: null,
        isActive: true,
      };
      (PermissionModelDef.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await repository.createPermission({ action: Action.CREATE, subject: 'Post' });

      expect(result.action).toBe(Action.CREATE);
    });

    it('updatePermission should update permission and return definition', async () => {
      const mockPermInstance = {
        id: validUuid2,
        action: Action.READ,
        subject: 'Post',
        update: jest.fn().mockResolvedValue(true),
      };
      (PermissionModelDef.findByPk as jest.Mock).mockResolvedValue(mockPermInstance);

      const result = await repository.updatePermission(validUuid2, {
        action: Action.UPDATE,
        reason: 'Changed',
      });

      expect(mockPermInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ action: Action.UPDATE, reason: 'Changed' }),
      );
      expect(result).toBeDefined();
    });

    it('deletePermission should set isActive to false', async () => {
      (PermissionModelDef.update as jest.Mock).mockResolvedValue([1]);

      const result = await repository.deletePermission(validUuid2);

      expect(result).toBe(true);
    });
  });

  describe('Role-Permission and User-Role Associations', () => {
    it('attachPermissionToRole should call findOrCreate', async () => {
      (RolePermissionModelDef.findOrCreate as jest.Mock).mockResolvedValue([{}, true]);

      await repository.attachPermissionToRole(validUuid1, validUuid2);

      expect(RolePermissionModelDef.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { roleId: validUuid1, permissionId: validUuid2 } }),
      );
    });

    it('detachPermissionFromRole should return boolean based on destroyed count', async () => {
      (RolePermissionModelDef.destroy as jest.Mock).mockResolvedValue(1);

      const result = await repository.detachPermissionFromRole(validUuid1, validUuid2);

      expect(result).toBe(true);
    });

    it('assignRoleToUser should create and return UserRoleAssignment', async () => {
      const mockAssignment = {
        id: validUuid3,
        userId: validUuid1,
        roleId: validUuid2,
        scope: 'tenant:1',
        assignedAt: new Date(),
        expiresAt: null,
      };
      (UserRoleModelDef.findOrCreate as jest.Mock).mockResolvedValue([mockAssignment, true]);

      const result = await repository.assignRoleToUser(validUuid1, validUuid2, 'tenant:1');

      expect(result.userId).toBe(validUuid1);
      expect(result.scope).toBe('tenant:1');
    });

    it('revokeRoleFromUser should destroy user role assignment', async () => {
      (UserRoleModelDef.destroy as jest.Mock).mockResolvedValue(1);

      const result = await repository.revokeRoleFromUser(validUuid1, validUuid2);

      expect(result).toBe(true);
    });

    it('findUserRoleAssignments should list user role assignments', async () => {
      const mockAssignment = {
        id: validUuid3,
        userId: validUuid1,
        roleId: validUuid2,
        scope: null,
        assignedAt: new Date(),
        expiresAt: null,
      };
      (UserRoleModelDef.findAll as jest.Mock).mockResolvedValue([mockAssignment]);

      const result = await repository.findUserRoleAssignments(validUuid1);

      expect(result).toHaveLength(1);
    });

    it('findUserIdsByRoleId should return array of user IDs', async () => {
      (UserRoleModelDef.findAll as jest.Mock).mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);

      const result = await repository.findUserIdsByRoleId(validUuid2);

      expect(result).toEqual(['u1', 'u2']);
    });
  });

  describe('Role Hierarchy & Condition Templates', () => {
    it('resolveUserPermissionContext should traverse hierarchy and combine active permissions', async () => {
      const parentRole = {
        id: validUuid2,
        name: 'parent',
        description: '',
        parentRoleId: null,
        isActive: true,
        metadata: null,
        permissions: [
          {
            id: 'p2',
            action: Action.READ,
            subject: 'Global',
            fields: null,
            conditionsJson: null,
            inverted: false,
            reason: null,
            isActive: true,
          },
        ],
      };

      const childRole = {
        id: validUuid1,
        name: 'child',
        description: '',
        parentRoleId: validUuid2,
        isActive: true,
        metadata: null,
        permissions: [
          {
            id: 'p1',
            action: Action.CREATE,
            subject: 'Local',
            fields: null,
            conditionsJson: null,
            inverted: false,
            reason: null,
            isActive: true,
          },
        ],
      };

      // Mock findRolesByUserId returning childRole
      (UserRoleModelDef.findAll as jest.Mock).mockResolvedValue([
        {
          role: childRole,
        },
      ]);

      // Mock findRoleById for parent resolution
      (RoleModelDef.findByPk as jest.Mock).mockResolvedValue(parentRole);

      const context = await repository.resolveUserPermissionContext('u1');

      expect(context.userId).toBe('u1');
      expect(context.roles).toHaveLength(2);
    });

    it('findAllConditionTemplates and createConditionTemplate', async () => {
      const mockTemplate = {
        id: validUuid3,
        name: 'isOwner',
        description: 'Checks owner',
        template: { ownerId: '${user.id}' },
        isActive: true,
      };
      (PermissionConditionModelDef.findAll as jest.Mock).mockResolvedValue([mockTemplate]);
      (PermissionConditionModelDef.create as jest.Mock).mockResolvedValue(mockTemplate);

      const templates = await repository.findAllConditionTemplates();
      expect(templates).toHaveLength(1);

      const created = await repository.createConditionTemplate({
        name: 'isOwner',
        description: 'Checks owner',
        template: { ownerId: '${user.id}' },
      });
      expect(created.name).toBe('isOwner');
    });
  });
});
