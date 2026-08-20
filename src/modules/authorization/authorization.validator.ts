import { z } from 'zod';
import { Action } from './authorization.types';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Zod Validation Schemas
// ─────────────────────────────────────────────────────────────

const actionEnum = z.nativeEnum(Action);

// ────────── ID params ──────────

export const roleIdParamSchema = z.object({
  id: z.string().uuid('Invalid role ID format'),
});

export const permissionIdParamSchema = z.object({
  permissionId: z.string().uuid('Invalid permission ID format'),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export const rolePermissionParamSchema = z.object({
  id: z.string().uuid('Invalid role ID format'),
  permissionId: z.string().uuid('Invalid permission ID format'),
});

export const userRoleParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  roleId: z.string().uuid('Invalid role ID format'),
});

// ────────── Role schemas ──────────

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be 100 characters or fewer')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Role name must start with a letter and contain only letters, numbers, hyphens, and underscores',
    ),
  description: z.string().max(500).default(''),
  parentRoleId: z.string().uuid('Invalid parent role ID format').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
    .optional(),
  description: z.string().max(500).optional(),
  parentRoleId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// ────────── Permission schemas ──────────

export const createPermissionSchema = z.object({
  action: actionEnum,
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be 100 characters or fewer'),
  fields: z.array(z.string().max(100)).optional(),
  conditions: z.record(z.unknown()).optional(),
  inverted: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export const updatePermissionSchema = z.object({
  action: actionEnum.optional(),
  subject: z.string().min(1).max(100).optional(),
  fields: z.array(z.string().max(100)).nullable().optional(),
  conditions: z.record(z.unknown()).nullable().optional(),
  inverted: z.boolean().optional(),
  reason: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ────────── Attachment schemas ──────────

export const attachPermissionSchema = z.object({
  permissionId: z.string().uuid('Invalid permission ID format'),
});

export const assignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
  scope: z.string().max(255).optional(),
  expiresAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
});

// ────────── Check endpoint schema ──────────

export const checkPermissionSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  action: actionEnum,
  subject: z.string().min(1).max(100),
  field: z.string().max(100).optional(),
  context: z.record(z.unknown()).optional(),
});

// ────────── Inferred types ──────────

export type CreateRoleSchemaInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleSchemaInput = z.infer<typeof updateRoleSchema>;
export type CreatePermissionSchemaInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionSchemaInput = z.infer<typeof updatePermissionSchema>;
export type AttachPermissionSchemaInput = z.infer<typeof attachPermissionSchema>;
export type AssignRoleSchemaInput = z.infer<typeof assignRoleSchema>;
export type CheckPermissionSchemaInput = z.infer<typeof checkPermissionSchema>;
