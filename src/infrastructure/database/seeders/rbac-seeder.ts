import { logger } from '@infrastructure/logging/logger';
import { Action, AuthorizationService, SUBJECT_ALL } from '@modules/authorization';

/**
 * Seeds default RBAC roles and permissions using the public AuthorizationService API.
 * Idempotent: can be executed multiple times safely.
 */
export async function seedRbac(): Promise<void> {
  const authzService = new AuthorizationService();

  logger.info('Starting RBAC seeding...');

  // 1. Ensure Roles Exist
  const existingRoles = await authzService.listRoles(true);
  const roleMap = new Map(existingRoles.map((r) => [r.name, r]));

  let adminRole = roleMap.get('admin');
  if (!adminRole) {
    adminRole = await authzService.createRole({
      name: 'admin',
      description: 'System administrator with full access',
    });
    logger.info('Created "admin" role');
  }

  let individualRole = roleMap.get('individual');
  if (!individualRole) {
    individualRole = await authzService.createRole({
      name: 'individual',
      description: 'Standard user / individual account',
    });
    logger.info('Created "individual" role');
  }

  // 2. Ensure Permissions Exist
  const existingPermissions = await authzService.listPermissions(true);

  // Admin wildcard permission: manage all
  let adminPerm = existingPermissions.find(
    (p) => p.action === Action.MANAGE && p.subject === SUBJECT_ALL,
  );
  if (!adminPerm) {
    adminPerm = await authzService.createPermission({
      action: Action.MANAGE,
      subject: SUBJECT_ALL,
      reason: 'Full administrative access',
    });
    logger.info('Created admin wildcard permission (manage all)');
  }

  // Individual user permissions
  let userReadSelfPerm = existingPermissions.find(
    (p) => p.action === Action.READ && p.subject === 'User',
  );
  if (!userReadSelfPerm) {
    userReadSelfPerm = await authzService.createPermission({
      action: Action.READ,
      subject: 'User',
      conditions: { id: '${user.id}' },
      reason: 'Read own user profile',
    });
    logger.info('Created read own user permission');
  }

  let userUpdateSelfPerm = existingPermissions.find(
    (p) => p.action === Action.UPDATE && p.subject === 'User',
  );
  if (!userUpdateSelfPerm) {
    userUpdateSelfPerm = await authzService.createPermission({
      action: Action.UPDATE,
      subject: 'User',
      conditions: { id: '${user.id}' },
      reason: 'Update own user profile',
    });
    logger.info('Created update own user permission');
  }

  // 3. Attach permissions to roles
  // Re-fetch roles with their attached permissions
  const updatedRoles = await authzService.listRoles(true);
  const updatedAdmin = updatedRoles.find((r) => r.name === 'admin');
  const updatedIndividual = updatedRoles.find((r) => r.name === 'individual');

  if (updatedAdmin && adminPerm) {
    const hasPerm = updatedAdmin.permissions.some((p) => p.id === adminPerm.id);
    if (!hasPerm) {
      await authzService.attachPermissionToRole(updatedAdmin.id, adminPerm.id);
      logger.info('Attached admin permission to "admin" role');
    }
  }

  if (updatedIndividual) {
    const userPermIds = [userReadSelfPerm?.id, userUpdateSelfPerm?.id].filter((id): id is string =>
      Boolean(id),
    );
    for (const permId of userPermIds) {
      const hasPerm = updatedIndividual.permissions.some((p) => p.id === permId);
      if (!hasPerm) {
        await authzService.attachPermissionToRole(updatedIndividual.id, permId);
        logger.info(`Attached permission ${permId} to "individual" role`);
      }
    }
  }

  logger.info('RBAC seeding completed successfully.');
}

// Allow direct execution via ts-node
if (require.main === module) {
  seedRbac()
    .then(() => {
      logger.info('RBAC Seeder script finished');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('RBAC Seeder script failed', { error: (err as Error).message });
      process.exit(1);
    });
}
