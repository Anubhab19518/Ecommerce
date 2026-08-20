import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { dbQueryDuration } from '@infrastructure/metrics/metrics';
import {
  RoleModelDef,
  PermissionModelDef,
  RolePermissionModelDef,
  UserRoleModelDef,
  PermissionConditionModelDef,
  type RoleModel,
  type PermissionModel,
  type UserRoleModel,
  type PermissionConditionModel,
  type RoleCreationAttributes,
  type PermissionCreationAttributes,
  type RolePermissionCreationAttributes,
  type UserRoleCreationAttributes,
  type PermissionConditionCreationAttributes,
} from './authorization.model';
import type {
  RoleDefinition,
  PermissionDefinition,
  ConditionTemplate,
  UserRoleAssignment,
  UserPermissionContext,
  CreateRoleInput,
  UpdateRoleInput,
  CreatePermissionInput,
  UpdatePermissionInput,
  Action,
} from './authorization.types';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Repository (Data Access Layer)
// ─────────────────────────────────────────────────────────────
// NEVER exported from the module barrel (index.ts).
// All database access for authorization data flows through here.
// ─────────────────────────────────────────────────────────────

/** Maximum role hierarchy depth to prevent infinite loops. */
const MAX_HIERARCHY_DEPTH = 10;

// ─────────────────────────── Mappers ────────────────────────

function toPermissionDefinition(model: PermissionModel): PermissionDefinition {
  return {
    id: model.id,
    action: model.action as Action,
    subject: model.subject,
    fields: model.fields,
    conditions: model.conditionsJson,
    inverted: model.inverted,
    reason: model.reason,
    isActive: model.isActive,
  };
}

function toRoleDefinition(model: RoleModel, permissions: PermissionDefinition[]): RoleDefinition {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    parentRoleId: model.parentRoleId,
    isActive: model.isActive,
    metadata: model.metadata,
    permissions,
  };
}

function toRoleDefinitionWithPermissions(role: RoleModel | null): RoleDefinition | null {
  if (!role) return null;
  const perms =
    ((role as unknown as Record<string, unknown>).permissions as PermissionModel[] | undefined) ??
    [];
  return toRoleDefinition(role, perms.map(toPermissionDefinition));
}

function toUserRoleAssignment(model: UserRoleModel): UserRoleAssignment {
  return {
    id: model.id,
    userId: model.userId,
    roleId: model.roleId,
    scope: model.scope,
    assignedAt: model.assignedAt,
    expiresAt: model.expiresAt,
  };
}

function toConditionTemplate(model: PermissionConditionModel): ConditionTemplate {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    template: model.template,
    isActive: model.isActive,
  };
}

// ─────────────────────────── Repository ────────────────────────

export class AuthorizationRepository {
  // ========================= Roles =========================

  async findAllRoles(includeInactive = false): Promise<RoleDefinition[]> {
    const end = dbQueryDuration.startTimer({ operation: 'findAllRoles', model: 'Authorization' });
    const where = includeInactive ? {} : { isActive: true };
    const roles = await RoleModelDef.findAll({
      where,
      include: [{ model: PermissionModelDef, as: 'permissions', through: { attributes: [] } }],
      order: [['name', 'ASC']],
    });
    end();

    return roles.map((role) => {
      const perms =
        ((role as unknown as Record<string, unknown>).permissions as
          | PermissionModel[]
          | undefined) ?? [];
      return toRoleDefinition(role, perms.map(toPermissionDefinition));
    });
  }

  async findRoleById(id: string): Promise<RoleDefinition | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findRoleById', model: 'Authorization' });
    const role = await RoleModelDef.findByPk(id, {
      include: [{ model: PermissionModelDef, as: 'permissions', through: { attributes: [] } }],
    });
    end();

    return toRoleDefinitionWithPermissions(role);
  }

  async findRoleByName(name: string): Promise<RoleDefinition | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findRoleByName', model: 'Authorization' });
    const role = await RoleModelDef.findOne({
      where: { name },
      include: [{ model: PermissionModelDef, as: 'permissions', through: { attributes: [] } }],
    });
    end();

    return toRoleDefinitionWithPermissions(role);
  }

  async createRole(input: CreateRoleInput): Promise<RoleDefinition> {
    const end = dbQueryDuration.startTimer({ operation: 'createRole', model: 'Authorization' });
    const role = await RoleModelDef.create({
      id: uuidv4(),
      name: input.name,
      description: input.description,
      parentRoleId: input.parentRoleId ?? null,
      metadata: input.metadata ?? null,
    } as RoleCreationAttributes);
    end();

    return toRoleDefinition(role, []);
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleDefinition | null> {
    const role = await RoleModelDef.findByPk(id);
    if (!role) return null;

    const end = dbQueryDuration.startTimer({ operation: 'updateRole', model: 'Authorization' });
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.parentRoleId !== undefined) updateData.parentRoleId = input.parentRoleId;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await role.update(updateData);
    end();

    return this.findRoleById(id);
  }

  async deleteRole(id: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({ operation: 'deleteRole', model: 'Authorization' });
    // Soft-delete: set isActive = false
    const [count] = await RoleModelDef.update({ isActive: false } as Record<string, unknown>, {
      where: { id },
    });
    end();
    return count > 0;
  }

  // ========================= Permissions =========================

  async findAllPermissions(includeInactive = false): Promise<PermissionDefinition[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findAllPermissions',
      model: 'Authorization',
    });
    const where = includeInactive ? {} : { isActive: true };
    const permissions = await PermissionModelDef.findAll({
      where,
      order: [
        ['subject', 'ASC'],
        ['action', 'ASC'],
      ],
    });
    end();
    return permissions.map(toPermissionDefinition);
  }

  async findPermissionById(id: string): Promise<PermissionDefinition | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findPermissionById',
      model: 'Authorization',
    });
    const permission = await PermissionModelDef.findByPk(id);
    end();
    return permission ? toPermissionDefinition(permission) : null;
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionDefinition> {
    const end = dbQueryDuration.startTimer({
      operation: 'createPermission',
      model: 'Authorization',
    });
    const permission = await PermissionModelDef.create({
      id: uuidv4(),
      action: input.action,
      subject: input.subject,
      fields: input.fields ?? null,
      conditionsJson: input.conditions ?? null,
      inverted: input.inverted ?? false,
      reason: input.reason ?? null,
    } as PermissionCreationAttributes);
    end();
    return toPermissionDefinition(permission);
  }

  async updatePermission(
    id: string,
    input: UpdatePermissionInput,
  ): Promise<PermissionDefinition | null> {
    const permission = await PermissionModelDef.findByPk(id);
    if (!permission) return null;

    const end = dbQueryDuration.startTimer({
      operation: 'updatePermission',
      model: 'Authorization',
    });
    const updateData: Record<string, unknown> = {};
    if (input.action !== undefined) updateData.action = input.action;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.fields !== undefined) updateData.fields = input.fields;
    if (input.conditions !== undefined) updateData.conditionsJson = input.conditions;
    if (input.inverted !== undefined) updateData.inverted = input.inverted;
    if (input.reason !== undefined) updateData.reason = input.reason;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    await permission.update(updateData);
    end();
    return toPermissionDefinition(permission);
  }

  async deletePermission(id: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deletePermission',
      model: 'Authorization',
    });
    const [count] = await PermissionModelDef.update(
      { isActive: false } as Record<string, unknown>,
      { where: { id } },
    );
    end();
    return count > 0;
  }

  // ========================= Role ↔ Permission =========================

  async attachPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const end = dbQueryDuration.startTimer({
      operation: 'attachPermission',
      model: 'Authorization',
    });
    await RolePermissionModelDef.findOrCreate({
      where: { roleId, permissionId },
      defaults: { id: uuidv4(), roleId, permissionId } as RolePermissionCreationAttributes,
    });
    end();
  }

  async detachPermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'detachPermission',
      model: 'Authorization',
    });
    const count = await RolePermissionModelDef.destroy({ where: { roleId, permissionId } });
    end();
    return count > 0;
  }

  // ========================= User ↔ Role =========================

  async findRolesByUserId(userId: string): Promise<RoleDefinition[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findRolesByUserId',
      model: 'Authorization',
    });

    // Find non-expired, active role assignments
    const assignments = await UserRoleModelDef.findAll({
      where: {
        userId,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
      },
      include: [
        {
          model: RoleModelDef,
          as: 'role',
          where: { isActive: true },
          include: [{ model: PermissionModelDef, as: 'permissions', through: { attributes: [] } }],
        },
      ],
    });
    end();

    const roles: RoleDefinition[] = [];
    for (const assignment of assignments) {
      const roleData = (assignment as unknown as Record<string, unknown>).role as
        | RoleModel
        | undefined;
      if (!roleData) continue;

      const perms =
        ((roleData as unknown as Record<string, unknown>).permissions as
          | PermissionModel[]
          | undefined) ?? [];
      roles.push(toRoleDefinition(roleData, perms.map(toPermissionDefinition)));
    }

    return roles;
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    scope?: string,
    expiresAt?: Date,
  ): Promise<UserRoleAssignment> {
    const end = dbQueryDuration.startTimer({
      operation: 'assignRoleToUser',
      model: 'Authorization',
    });
    const [assignment] = await UserRoleModelDef.findOrCreate({
      where: { userId, roleId },
      defaults: {
        id: uuidv4(),
        userId,
        roleId,
        scope: scope ?? null,
        expiresAt: expiresAt ?? null,
      } as UserRoleCreationAttributes,
    });
    end();
    return toUserRoleAssignment(assignment);
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'revokeRoleFromUser',
      model: 'Authorization',
    });
    const count = await UserRoleModelDef.destroy({ where: { userId, roleId } });
    end();
    return count > 0;
  }

  async findUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findUserRoleAssignments',
      model: 'Authorization',
    });
    const assignments = await UserRoleModelDef.findAll({ where: { userId } });
    end();
    return assignments.map(toUserRoleAssignment);
  }

  // ========================= Role Hierarchy Resolution =========================

  /**
   * Resolves the full permission set for a user including inherited
   * permissions from the role hierarchy. Walks up `parentRoleId` links
   * with a depth guard to prevent infinite loops.
   */
  async resolveUserPermissionContext(userId: string): Promise<UserPermissionContext> {
    const directRoles = await this.findRolesByUserId(userId);

    // Collect all permissions including inherited ones
    const allPermissions: PermissionDefinition[] = [];
    const visitedRoleIds = new Set<string>();
    const resolvedRoles: RoleDefinition[] = [];

    const resolveRole = async (role: RoleDefinition, depth: number): Promise<void> => {
      if (depth > MAX_HIERARCHY_DEPTH) return;
      if (visitedRoleIds.has(role.id)) return;
      visitedRoleIds.add(role.id);

      resolvedRoles.push(role);

      // Add this role's direct permissions
      for (const perm of role.permissions) {
        if (perm.isActive) {
          allPermissions.push(perm);
        }
      }

      // Walk up the hierarchy
      if (role.parentRoleId) {
        const parentRole = await this.findRoleById(role.parentRoleId);
        if (parentRole?.isActive) {
          await resolveRole(parentRole, depth + 1);
        }
      }
    };

    for (const role of directRoles) {
      await resolveRole(role, 0);
    }

    return {
      userId,
      roles: resolvedRoles,
      directPermissions: [], // Reserved for future per-user overrides
    };
  }

  // ========================= Condition Templates =========================

  async findAllConditionTemplates(includeInactive = false): Promise<ConditionTemplate[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findConditionTemplates',
      model: 'Authorization',
    });
    const where = includeInactive ? {} : { isActive: true };
    const templates = await PermissionConditionModelDef.findAll({
      where,
      order: [['name', 'ASC']],
    });
    end();
    return templates.map(toConditionTemplate);
  }

  async createConditionTemplate(
    input: Omit<ConditionTemplate, 'id' | 'isActive'>,
  ): Promise<ConditionTemplate> {
    const end = dbQueryDuration.startTimer({
      operation: 'createConditionTemplate',
      model: 'Authorization',
    });
    const template = await PermissionConditionModelDef.create({
      id: uuidv4(),
      name: input.name,
      description: input.description,
      template: input.template,
    } as PermissionConditionCreationAttributes);
    end();
    return toConditionTemplate(template);
  }

  // ========================= Bulk Queries =========================

  /**
   * Returns all user IDs that currently hold the given role.
   * Used for targeted cache invalidation.
   */
  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findUserIdsByRoleId',
      model: 'Authorization',
    });
    const assignments = await UserRoleModelDef.findAll({
      where: { roleId },
      attributes: ['userId'],
    });
    end();
    return assignments.map((a) => a.userId);
  }
}
