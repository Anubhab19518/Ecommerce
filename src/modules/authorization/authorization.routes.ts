import { Router } from 'express';
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
} from './authorization.controller';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Routes
// ─────────────────────────────────────────────────────────────
// Mounted at /api/v1/authorization in server.ts.
// All routes are admin-level — protect with auth middleware upstream.
// ─────────────────────────────────────────────────────────────

export const authorizationRoutes = Router();

// ────────── Roles ──────────
authorizationRoutes.get('/roles', listRoles);
authorizationRoutes.post('/roles', createRole);
authorizationRoutes.get('/roles/:id', getRoleById);
authorizationRoutes.patch('/roles/:id', updateRole);
authorizationRoutes.delete('/roles/:id', deleteRole);

// ────────── Role ↔ Permission ──────────
authorizationRoutes.post('/roles/:id/permissions', attachPermission);
authorizationRoutes.delete('/roles/:id/permissions/:permissionId', detachPermission);

// ────────── Permissions ──────────
authorizationRoutes.get('/permissions', listPermissions);
authorizationRoutes.post('/permissions', createPermission);
authorizationRoutes.patch('/permissions/:id', updatePermission);
authorizationRoutes.delete('/permissions/:id', deletePermission);

// ────────── User ↔ Role ──────────
authorizationRoutes.post('/users/:userId/roles', assignRole);
authorizationRoutes.delete('/users/:userId/roles/:roleId', revokeRole);
authorizationRoutes.get('/users/:userId/permissions', getUserPermissions);

// ────────── Diagnostic ──────────
authorizationRoutes.post('/check', checkPermission);

// ────────── Cache Management ──────────
authorizationRoutes.post('/cache/invalidate', invalidateCache);
