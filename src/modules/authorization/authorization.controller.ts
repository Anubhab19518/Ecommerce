import type { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from './authorization.service';
import {
  createRoleSchema,
  updateRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  attachPermissionSchema,
  assignRoleSchema,
  checkPermissionSchema,
  roleIdParamSchema,
  rolePermissionParamSchema,
  userIdParamSchema,
  userRoleParamSchema,
} from './authorization.validator';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Controller (Admin Endpoints)
// ─────────────────────────────────────────────────────────────
// Thin handler layer — validates input and delegates to service.
// ─────────────────────────────────────────────────────────────

const authorizationService = new AuthorizationService();

// ========================= Roles =========================

/** GET /api/v1/authorization/roles */
export async function listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const roles = await authorizationService.listRoles(includeInactive);
    res.json({ status: 'ok', data: roles });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/authorization/roles */
export async function createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createRoleSchema.parse(req.body);
    const role = await authorizationService.createRole(input);
    res.status(201).json({ status: 'ok', data: role });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/authorization/roles/:id */
export async function getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const role = await authorizationService.getRoleById(id);
    res.json({ status: 'ok', data: role });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/v1/authorization/roles/:id */
export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const input = updateRoleSchema.parse(req.body);
    const role = await authorizationService.updateRole(id, input);
    res.json({ status: 'ok', data: role });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/authorization/roles/:id */
export async function deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    await authorizationService.deleteRole(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Role ↔ Permission =========================

/** POST /api/v1/authorization/roles/:id/permissions */
export async function attachPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const { permissionId } = attachPermissionSchema.parse(req.body);
    await authorizationService.attachPermissionToRole(id, permissionId);
    res.status(201).json({ status: 'ok', message: 'Permission attached to role' });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/authorization/roles/:id/permissions/:permissionId */
export async function detachPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, permissionId } = rolePermissionParamSchema.parse(req.params);
    await authorizationService.detachPermissionFromRole(id, permissionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Permissions =========================

/** GET /api/v1/authorization/permissions */
export async function listPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const permissions = await authorizationService.listPermissions(includeInactive);
    res.json({ status: 'ok', data: permissions });
  } catch (error) {
    next(error);
  }
}

/** POST /api/v1/authorization/permissions */
export async function createPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createPermissionSchema.parse(req.body);
    const permission = await authorizationService.createPermission(input);
    res.status(201).json({ status: 'ok', data: permission });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/v1/authorization/permissions/:id */
export async function updatePermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    const input = updatePermissionSchema.parse(req.body);
    const permission = await authorizationService.updatePermission(id, input);
    res.json({ status: 'ok', data: permission });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/authorization/permissions/:id */
export async function deletePermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = roleIdParamSchema.parse(req.params);
    await authorizationService.deletePermission(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= User ↔ Role =========================

/** POST /api/v1/authorization/users/:userId/roles */
export async function assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = userIdParamSchema.parse(req.params);
    const { roleId, scope, expiresAt } = assignRoleSchema.parse(req.body);
    const assignment = await authorizationService.assignRoleToUser(
      userId,
      roleId,
      scope,
      expiresAt,
    );
    res.status(201).json({ status: 'ok', data: assignment });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/v1/authorization/users/:userId/roles/:roleId */
export async function revokeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, roleId } = userRoleParamSchema.parse(req.params);
    await authorizationService.revokeRoleFromUser(userId, roleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/authorization/users/:userId/permissions */
export async function getUserPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = userIdParamSchema.parse(req.params);
    const permissions = await authorizationService.getUserPermissions(userId);
    res.json({ status: 'ok', data: permissions });
  } catch (error) {
    next(error);
  }
}

// ========================= Diagnostic =========================

/** POST /api/v1/authorization/check */
export async function checkPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = checkPermissionSchema.parse(req.body);
    const result = await authorizationService.can(input);
    res.json({ status: 'ok', data: result });
  } catch (error) {
    next(error);
  }
}

// ========================= Cache Management =========================

/** POST /api/v1/authorization/cache/invalidate */
export async function invalidateCache(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authorizationService.invalidateAllCaches();
    res.json({ status: 'ok', message: 'All authorization caches invalidated' });
  } catch (error) {
    next(error);
  }
}
