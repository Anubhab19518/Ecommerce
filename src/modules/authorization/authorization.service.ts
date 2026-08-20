import { logger } from '@infrastructure/logging/logger';
import { notificationService, EventType } from '@modules/notification';
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from '@shared/errors';
import { buildAbility, checkAbility } from './authorization.ability-factory';
import * as permissionCache from './authorization.cache';
import { AuthorizationRepository } from './authorization.repository';
import type {
  AuthorizationRequest,
  AuthorizationResult,
  UserPermissionContext,
  RoleDefinition,
  PermissionDefinition,
  ConditionTemplate,
  UserRoleAssignment,
  CreateRoleInput,
  UpdateRoleInput,
  CreatePermissionInput,
  UpdatePermissionInput,
} from './authorization.types';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Service (Public API)
// ─────────────────────────────────────────────────────────────
// This is the ONLY class exported from the module barrel.
// Every authorization check in the system goes through here.
//
// Flow: Service → Cache → Repository → Ability Factory
//
// The service:
//   1. Normalises the request
//   2. Resolves the user's permission context (cache-first)
//   3. Delegates to the ability factory for the CASL check
//   4. Returns a clean AuthorizationResult
// ─────────────────────────────────────────────────────────────

export class AuthorizationService {
  private readonly repo = new AuthorizationRepository();

  // ========================= Core Authorization =========================

  /**
   * Checks whether a user is allowed to perform the requested action.
   * This is the primary entry point for all authorization checks.
   *
   * @param request - Normalized authorization request
   * @returns AuthorizationResult with allowed status and optional reason
   */
  async can(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const context = await this.resolveContext(request.userId);

    // If user has no roles at all, deny immediately
    if (context.roles.length === 0 && context.directPermissions.length === 0) {
      return {
        allowed: false,
        reason: 'No roles assigned to user',
      };
    }

    const ability = buildAbility(context, request.context);
    return checkAbility(ability, request);
  }

  /**
   * Same as `can()`, but throws ForbiddenError on denial.
   * Convenient for use in controllers and middleware.
   */
  async canOrFail(request: AuthorizationRequest): Promise<void> {
    const result = await this.can(request);
    if (!result.allowed) {
      throw new ForbiddenError(result.reason ?? 'Access denied');
    }
  }

  /**
   * Returns the fully-resolved permission context for a user.
   * Includes inherited permissions from role hierarchy.
   * Uses Redis cache with fallback to database.
   */
  async getUserPermissions(userId: string): Promise<PermissionDefinition[]> {
    const context = await this.resolveContext(userId);
    const permissions: PermissionDefinition[] = [];

    for (const role of context.roles) {
      for (const perm of role.permissions) {
        if (perm.isActive) {
          permissions.push(perm);
        }
      }
    }

    // Deduplicate by permission ID
    const seen = new Set<string>();
    return permissions.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  /**
   * Returns all roles assigned to a user (does not include inherited ancestor roles).
   */
  async getUserRoles(userId: string): Promise<RoleDefinition[]> {
    const context = await this.resolveContext(userId);
    return context.roles;
  }

  // ========================= Role Management =========================

  async listRoles(includeInactive = false): Promise<RoleDefinition[]> {
    return this.repo.findAllRoles(includeInactive);
  }

  async getRoleById(id: string): Promise<RoleDefinition> {
    const role = await this.repo.findRoleById(id);
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async createRole(input: CreateRoleInput): Promise<RoleDefinition> {
    // Validate uniqueness
    const existing = await this.repo.findRoleByName(input.name);
    if (existing) {
      throw new ConflictError(`Role "${input.name}" already exists`);
    }

    // Validate parent role exists if specified
    if (input.parentRoleId) {
      const parent = await this.repo.findRoleById(input.parentRoleId);
      if (!parent) {
        throw new ValidationError('Parent role not found', { parentRoleId: input.parentRoleId });
      }
    }

    const role = await this.repo.createRole(input);

    logger.info('Role created', { roleId: role.id, name: role.name });
    return role;
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleDefinition> {
    if (Object.keys(input).length === 0) {
      throw new ValidationError('At least one field must be provided');
    }

    // Validate uniqueness if name is changing
    if (input.name) {
      const existing = await this.repo.findRoleByName(input.name);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Role "${input.name}" already exists`);
      }
    }

    // Prevent circular hierarchy
    if (input.parentRoleId) {
      if (input.parentRoleId === id) {
        throw new ValidationError('A role cannot be its own parent');
      }
      const parent = await this.repo.findRoleById(input.parentRoleId);
      if (!parent) {
        throw new ValidationError('Parent role not found', { parentRoleId: input.parentRoleId });
      }
    }

    const role = await this.repo.updateRole(id, input);
    if (!role) throw new NotFoundError('Role');

    // Invalidate cache for all users with this role
    await permissionCache.invalidateRole(id);

    notificationService.publish(EventType.PERMISSIONS_UPDATED, {
      roleId: id,
      changes: input as Record<string, unknown>,
    });

    logger.info('Role updated', { roleId: id });
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const deleted = await this.repo.deleteRole(id);
    if (!deleted) throw new NotFoundError('Role');

    await permissionCache.invalidateRole(id);

    logger.info('Role deactivated', { roleId: id });
  }

  // ========================= Permission Management =========================

  async listPermissions(includeInactive = false): Promise<PermissionDefinition[]> {
    return this.repo.findAllPermissions(includeInactive);
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionDefinition> {
    return this.repo.createPermission(input);
  }

  async updatePermission(id: string, input: UpdatePermissionInput): Promise<PermissionDefinition> {
    if (Object.keys(input).length === 0) {
      throw new ValidationError('At least one field must be provided');
    }

    const permission = await this.repo.updatePermission(id, input);
    if (!permission) throw new NotFoundError('Permission');

    // Permissions changed → flush all caches (a permission can be in multiple roles)
    await permissionCache.invalidateAll();

    notificationService.publish(EventType.PERMISSIONS_UPDATED, {
      permissionId: id,
      changes: input as Record<string, unknown>,
    });

    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    const deleted = await this.repo.deletePermission(id);
    if (!deleted) throw new NotFoundError('Permission');

    await permissionCache.invalidateAll();
  }

  // ========================= Role ↔ Permission Attachment =========================

  async attachPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    // Validate both exist
    const role = await this.repo.findRoleById(roleId);
    if (!role) throw new NotFoundError('Role');

    const permission = await this.repo.findPermissionById(permissionId);
    if (!permission) throw new NotFoundError('Permission');

    await this.repo.attachPermissionToRole(roleId, permissionId);
    await permissionCache.invalidateRole(roleId);

    notificationService.publish(EventType.PERMISSIONS_UPDATED, {
      roleId,
      permissionId,
      action: 'attached',
    });

    logger.info('Permission attached to role', { roleId, permissionId });
  }

  async detachPermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const detached = await this.repo.detachPermissionFromRole(roleId, permissionId);
    if (!detached) throw new NotFoundError('Role-Permission assignment');

    await permissionCache.invalidateRole(roleId);

    notificationService.publish(EventType.PERMISSIONS_UPDATED, {
      roleId,
      permissionId,
      action: 'detached',
    });

    logger.info('Permission detached from role', { roleId, permissionId });
  }

  // ========================= User ↔ Role Assignment =========================

  async assignRoleToUser(
    userId: string,
    roleId: string,
    scope?: string,
    expiresAt?: Date,
  ): Promise<UserRoleAssignment> {
    const role = await this.repo.findRoleById(roleId);
    if (!role) throw new NotFoundError('Role');

    const assignment = await this.repo.assignRoleToUser(userId, roleId, scope, expiresAt);
    await permissionCache.invalidateUser(userId);

    notificationService.publish(EventType.ROLE_ASSIGNED, {
      userId,
      roleId,
      roleName: role.name,
      scope: scope ?? null,
    });

    logger.info('Role assigned to user', { userId, roleId, roleName: role.name });
    return assignment;
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const revoked = await this.repo.revokeRoleFromUser(userId, roleId);
    if (!revoked) throw new NotFoundError('User-Role assignment');

    await permissionCache.invalidateUser(userId);

    notificationService.publish(EventType.ROLE_REVOKED, { userId, roleId });

    logger.info('Role revoked from user', { userId, roleId });
  }

  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    return this.repo.findUserRoleAssignments(userId);
  }

  // ========================= Condition Templates =========================

  async listConditionTemplates(includeInactive = false): Promise<ConditionTemplate[]> {
    return this.repo.findAllConditionTemplates(includeInactive);
  }

  async createConditionTemplate(
    input: Omit<ConditionTemplate, 'id' | 'isActive'>,
  ): Promise<ConditionTemplate> {
    return this.repo.createConditionTemplate(input);
  }

  // ========================= Cache Management =========================

  async invalidateUserCache(userId: string): Promise<void> {
    await permissionCache.invalidateUser(userId);
    logger.info('User authorization cache invalidated', { userId });
  }

  async invalidateAllCaches(): Promise<void> {
    await permissionCache.invalidateAll();
    logger.info('All authorization caches invalidated');
  }

  // ========================= Internal =========================

  /**
   * Resolves the user's permission context with cache-first strategy.
   * Falls back to database and populates cache on miss.
   */
  private async resolveContext(userId: string): Promise<UserPermissionContext> {
    // Try cache first
    const cached = await permissionCache.getUserContext(userId);
    if (cached) return cached;

    // Cache miss — build from database
    const context = await this.repo.resolveUserPermissionContext(userId);

    // Populate cache (non-blocking — failures are logged, not thrown)
    await permissionCache.setUserContext(userId, context);

    return context;
  }
}
