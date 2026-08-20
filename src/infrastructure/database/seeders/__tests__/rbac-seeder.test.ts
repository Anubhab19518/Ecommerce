import { Action, AuthorizationService, SUBJECT_ALL } from '@modules/authorization';
import { seedRbac } from '../rbac-seeder';

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@modules/authorization');

describe('RBAC Seeder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates roles, permissions, and attaches them when database is empty', async () => {
    // 1. Initial listRoles: empty
    jest
      .spyOn(AuthorizationService.prototype, 'listRoles')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'role-admin-id', name: 'admin', permissions: [] } as never,
        { id: 'role-indiv-id', name: 'individual', permissions: [] } as never,
      ]);

    // Role creation
    jest
      .spyOn(AuthorizationService.prototype, 'createRole')
      .mockResolvedValueOnce({ id: 'role-admin-id', name: 'admin', permissions: [] } as never)
      .mockResolvedValueOnce({ id: 'role-indiv-id', name: 'individual', permissions: [] } as never);

    // 2. Initial listPermissions: empty
    jest.spyOn(AuthorizationService.prototype, 'listPermissions').mockResolvedValueOnce([]);

    // Permission creation
    const createPermSpy = jest
      .spyOn(AuthorizationService.prototype, 'createPermission')
      .mockResolvedValueOnce({
        id: 'perm-admin-id',
        action: Action.MANAGE,
        subject: SUBJECT_ALL,
      } as never)
      .mockResolvedValueOnce({
        id: 'perm-read-self-id',
        action: Action.READ,
        subject: 'User',
      } as never)
      .mockResolvedValueOnce({
        id: 'perm-update-self-id',
        action: Action.UPDATE,
        subject: 'User',
      } as never);

    const attachSpy = jest
      .spyOn(AuthorizationService.prototype, 'attachPermissionToRole')
      .mockResolvedValue(undefined as never);

    await seedRbac();

    expect(createPermSpy).toHaveBeenCalledTimes(3);
    expect(attachSpy).toHaveBeenCalledWith('role-admin-id', 'perm-admin-id');
    expect(attachSpy).toHaveBeenCalledWith('role-indiv-id', 'perm-read-self-id');
    expect(attachSpy).toHaveBeenCalledWith('role-indiv-id', 'perm-update-self-id');
  });

  it('is idempotent and skips creating or attaching when items already exist', async () => {
    const adminPerm = {
      id: 'perm-admin-id',
      action: Action.MANAGE,
      subject: SUBJECT_ALL,
    };
    const readSelfPerm = {
      id: 'perm-read-self-id',
      action: Action.READ,
      subject: 'User',
      conditions: { id: '${user.id}' },
    };
    const updateSelfPerm = {
      id: 'perm-update-self-id',
      action: Action.UPDATE,
      subject: 'User',
      conditions: { id: '${user.id}' },
    };

    const existingAdminRole = {
      id: 'role-admin-id',
      name: 'admin',
      permissions: [adminPerm],
    };
    const existingIndividualRole = {
      id: 'role-indiv-id',
      name: 'individual',
      permissions: [readSelfPerm, updateSelfPerm],
    };

    jest
      .spyOn(AuthorizationService.prototype, 'listRoles')
      .mockResolvedValueOnce([existingAdminRole, existingIndividualRole] as never)
      .mockResolvedValueOnce([existingAdminRole, existingIndividualRole] as never);

    jest
      .spyOn(AuthorizationService.prototype, 'listPermissions')
      .mockResolvedValueOnce([adminPerm, readSelfPerm, updateSelfPerm] as never);

    const createRoleSpy = jest.spyOn(AuthorizationService.prototype, 'createRole');
    const createPermSpy = jest.spyOn(AuthorizationService.prototype, 'createPermission');
    const attachSpy = jest.spyOn(AuthorizationService.prototype, 'attachPermissionToRole');

    await seedRbac();

    expect(createRoleSpy).not.toHaveBeenCalled();
    expect(createPermSpy).not.toHaveBeenCalled();
    expect(attachSpy).not.toHaveBeenCalled();
  });
});
