import { Action } from '../authorization.types';
import {
  roleIdParamSchema,
  permissionIdParamSchema,
  userIdParamSchema,
  rolePermissionParamSchema,
  userRoleParamSchema,
  createRoleSchema,
  updateRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  attachPermissionSchema,
  assignRoleSchema,
  checkPermissionSchema,
} from '../authorization.validator';

describe('Authorization Validators', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('ID param schemas', () => {
    it('should validate roleIdParamSchema', () => {
      expect(roleIdParamSchema.parse({ id: validUuid })).toEqual({ id: validUuid });
      expect(() => roleIdParamSchema.parse({ id: 'invalid' })).toThrow();
    });

    it('should validate permissionIdParamSchema', () => {
      expect(permissionIdParamSchema.parse({ permissionId: validUuid })).toEqual({
        permissionId: validUuid,
      });
      expect(() => permissionIdParamSchema.parse({ permissionId: 'invalid' })).toThrow();
    });

    it('should validate userIdParamSchema', () => {
      expect(userIdParamSchema.parse({ userId: validUuid })).toEqual({ userId: validUuid });
      expect(() => userIdParamSchema.parse({ userId: 'invalid' })).toThrow();
    });

    it('should validate rolePermissionParamSchema', () => {
      expect(rolePermissionParamSchema.parse({ id: validUuid, permissionId: validUuid })).toEqual({
        id: validUuid,
        permissionId: validUuid,
      });
      expect(() =>
        rolePermissionParamSchema.parse({ id: validUuid, permissionId: 'invalid' }),
      ).toThrow();
    });

    it('should validate userRoleParamSchema', () => {
      expect(userRoleParamSchema.parse({ userId: validUuid, roleId: validUuid })).toEqual({
        userId: validUuid,
        roleId: validUuid,
      });
      expect(() => userRoleParamSchema.parse({ userId: 'invalid', roleId: validUuid })).toThrow();
    });
  });

  describe('Role schemas', () => {
    it('should validate createRoleSchema with defaults', () => {
      const result = createRoleSchema.parse({ name: 'admin_role' });
      expect(result.name).toBe('admin_role');
      expect(result.description).toBe('');
    });

    it('should fail createRoleSchema for invalid role name regex', () => {
      expect(() => createRoleSchema.parse({ name: '123_invalid' })).toThrow();
    });

    it('should validate updateRoleSchema', () => {
      const result = updateRoleSchema.parse({ name: 'new_name', isActive: true });
      expect(result.name).toBe('new_name');
      expect(result.isActive).toBe(true);
    });
  });

  describe('Permission schemas', () => {
    it('should validate createPermissionSchema', () => {
      const result = createPermissionSchema.parse({
        action: Action.READ,
        subject: 'Document',
      });
      expect(result.action).toBe(Action.READ);
      expect(result.inverted).toBe(false);
    });

    it('should validate updatePermissionSchema', () => {
      const result = updatePermissionSchema.parse({
        action: Action.MANAGE,
        reason: 'Updated reason',
      });
      expect(result.action).toBe(Action.MANAGE);
    });
  });

  describe('Attachment schemas', () => {
    it('should validate attachPermissionSchema', () => {
      const result = attachPermissionSchema.parse({ permissionId: validUuid });
      expect(result.permissionId).toBe(validUuid);
    });

    it('should validate assignRoleSchema with date transform', () => {
      const isoDate = '2030-01-01T00:00:00.000Z';
      const result = assignRoleSchema.parse({
        roleId: validUuid,
        scope: 'tenant:123',
        expiresAt: isoDate,
      });
      expect(result.roleId).toBe(validUuid);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt?.toISOString()).toBe(isoDate);
    });
  });

  describe('checkPermissionSchema', () => {
    it('should validate checkPermissionSchema', () => {
      const result = checkPermissionSchema.parse({
        userId: validUuid,
        action: Action.CREATE,
        subject: 'Post',
        field: 'title',
        context: { ownerId: '123' },
      });
      expect(result.userId).toBe(validUuid);
      expect(result.action).toBe(Action.CREATE);
    });
  });
});
