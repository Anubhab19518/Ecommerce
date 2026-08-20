import type { Request, Response, NextFunction } from 'express';
import {
  listRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  attachPermission,
  detachPermission,
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  assignRole,
  revokeRole,
  getUserPermissions,
  checkPermission,
  invalidateCache,
} from '../authorization.controller';
import { AuthorizationService } from '../authorization.service';
import { Action } from '../authorization.types';

jest.mock('../authorization.service');

const mockAuthorizationService =
  AuthorizationService.prototype as jest.Mocked<AuthorizationService>;

describe('AuthorizationController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';
  const dummyError = new Error('Service error');

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      body: {},
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('Roles handlers', () => {
    it('listRoles should parse query param and return roles', async () => {
      mockReq.query = { includeInactive: 'true' };
      const roles = [{ id: validUuid, name: 'admin' }];
      (mockAuthorizationService.listRoles as jest.Mock).mockResolvedValue(roles);

      await listRoles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthorizationService.listRoles).toHaveBeenCalledWith(true);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: roles });
    });

    it('listRoles should pass error to next on failure', async () => {
      (mockAuthorizationService.listRoles as jest.Mock).mockRejectedValue(dummyError);

      await listRoles(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dummyError);
    });

    it('createRole should parse body and return 201', async () => {
      mockReq.body = { name: 'editor_role', description: 'Editor' };
      const created = { id: validUuid, name: 'editor_role' };
      (mockAuthorizationService.createRole as jest.Mock).mockResolvedValue(created);

      await createRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: created });
    });

    it('createRole error should call next', async () => {
      mockReq.body = { name: 'invalid role name!!!' };

      await createRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('getRoleById should return role by ID', async () => {
      mockReq.params = { id: validUuid };
      const role = { id: validUuid, name: 'admin' };
      (mockAuthorizationService.getRoleById as jest.Mock).mockResolvedValue(role);

      await getRoleById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: role });
    });

    it('getRoleById error should call next', async () => {
      mockReq.params = { id: 'invalid-uuid' };

      await getRoleById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('updateRole should parse params and body and update role', async () => {
      mockReq.params = { id: validUuid };
      mockReq.body = { description: 'Updated desc' };
      const updated = { id: validUuid, description: 'Updated desc' };
      (mockAuthorizationService.updateRole as jest.Mock).mockResolvedValue(updated);

      await updateRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: updated });
    });

    it('updateRole error should call next', async () => {
      mockReq.params = { id: validUuid };
      (mockAuthorizationService.updateRole as jest.Mock).mockRejectedValue(dummyError);

      await updateRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dummyError);
    });

    it('deleteRole should return 204 on success', async () => {
      mockReq.params = { id: validUuid };
      (mockAuthorizationService.deleteRole as jest.Mock).mockResolvedValue(undefined);

      await deleteRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('deleteRole error should call next', async () => {
      mockReq.params = { id: validUuid };
      (mockAuthorizationService.deleteRole as jest.Mock).mockRejectedValue(dummyError);

      await deleteRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dummyError);
    });
  });

  describe('Role-Permission association handlers', () => {
    it('attachPermission should attach permission and return 201', async () => {
      mockReq.params = { id: validUuid };
      mockReq.body = { permissionId: validUuid2 };
      (mockAuthorizationService.attachPermissionToRole as jest.Mock).mockResolvedValue(undefined);

      await attachPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthorizationService.attachPermissionToRole).toHaveBeenCalledWith(
        validUuid,
        validUuid2,
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('attachPermission error should call next', async () => {
      mockReq.params = { id: validUuid };
      mockReq.body = { permissionId: 'invalid' };

      await attachPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('detachPermission should detach permission and return 204', async () => {
      mockReq.params = { id: validUuid, permissionId: validUuid2 };
      (mockAuthorizationService.detachPermissionFromRole as jest.Mock).mockResolvedValue(undefined);

      await detachPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthorizationService.detachPermissionFromRole).toHaveBeenCalledWith(
        validUuid,
        validUuid2,
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('detachPermission error should call next', async () => {
      mockReq.params = { id: validUuid, permissionId: 'invalid' };

      await detachPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Permissions handlers', () => {
    it('listPermissions should return permissions', async () => {
      const permissions = [{ id: validUuid, action: Action.READ, subject: 'Article' }];
      (mockAuthorizationService.listPermissions as jest.Mock).mockResolvedValue(permissions);

      await listPermissions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: permissions });
    });

    it('listPermissions error should call next', async () => {
      (mockAuthorizationService.listPermissions as jest.Mock).mockRejectedValue(dummyError);

      await listPermissions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dummyError);
    });

    it('createPermission should create permission and return 201', async () => {
      mockReq.body = { action: Action.READ, subject: 'Article' };
      const created = { id: validUuid, action: Action.READ, subject: 'Article' };
      (mockAuthorizationService.createPermission as jest.Mock).mockResolvedValue(created);

      await createPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: created });
    });

    it('createPermission error should call next', async () => {
      mockReq.body = {};

      await createPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('updatePermission should update permission', async () => {
      mockReq.params = { id: validUuid };
      mockReq.body = { reason: 'Updated reason' };
      const updated = { id: validUuid, reason: 'Updated reason' };
      (mockAuthorizationService.updatePermission as jest.Mock).mockResolvedValue(updated);

      await updatePermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: updated });
    });

    it('updatePermission error should call next', async () => {
      mockReq.params = { id: 'invalid' };

      await updatePermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('deletePermission should delete permission and return 204', async () => {
      mockReq.params = { id: validUuid };
      (mockAuthorizationService.deletePermission as jest.Mock).mockResolvedValue(undefined);

      await deletePermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('deletePermission error should call next', async () => {
      mockReq.params = { id: 'invalid' };

      await deletePermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('User-Role assignment handlers', () => {
    it('assignRole should assign role to user and return 201', async () => {
      mockReq.params = { userId: validUuid };
      mockReq.body = { roleId: validUuid2, scope: 'tenant:1' };
      const assignment = { userId: validUuid, roleId: validUuid2, scope: 'tenant:1' };
      (mockAuthorizationService.assignRoleToUser as jest.Mock).mockResolvedValue(assignment);

      await assignRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: assignment });
    });

    it('assignRole error should call next', async () => {
      mockReq.params = { userId: 'invalid' };

      await assignRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('revokeRole should revoke role from user and return 204', async () => {
      mockReq.params = { userId: validUuid, roleId: validUuid2 };
      (mockAuthorizationService.revokeRoleFromUser as jest.Mock).mockResolvedValue(undefined);

      await revokeRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('revokeRole error should call next', async () => {
      mockReq.params = { userId: 'invalid', roleId: validUuid2 };

      await revokeRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('getUserPermissions should return user permissions', async () => {
      mockReq.params = { userId: validUuid };
      const perms = [{ action: Action.READ, subject: 'Article' }];
      (mockAuthorizationService.getUserPermissions as jest.Mock).mockResolvedValue(perms);

      await getUserPermissions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: perms });
    });

    it('getUserPermissions error should call next', async () => {
      mockReq.params = { userId: 'invalid' };

      await getUserPermissions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Diagnostic & Cache handlers', () => {
    it('checkPermission should perform permission evaluation check', async () => {
      mockReq.body = { userId: validUuid, action: Action.READ, subject: 'Article' };
      const checkResult = { allowed: true, reason: 'Allowed by role' };
      (mockAuthorizationService.can as jest.Mock).mockResolvedValue(checkResult);

      await checkPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: checkResult });
    });

    it('checkPermission error should call next', async () => {
      mockReq.body = {};

      await checkPermission(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('invalidateCache should invalidate all authorization caches', async () => {
      (mockAuthorizationService.invalidateAllCaches as jest.Mock).mockResolvedValue(undefined);

      await invalidateCache(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'ok',
        message: 'All authorization caches invalidated',
      });
    });

    it('invalidateCache error should call next', async () => {
      (mockAuthorizationService.invalidateAllCaches as jest.Mock).mockRejectedValue(dummyError);

      await invalidateCache(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dummyError);
    });
  });
});
