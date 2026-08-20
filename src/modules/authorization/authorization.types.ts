// ─────────────────────────────────────────────────────────────
// Authorization Module — Type Definitions
// ─────────────────────────────────────────────────────────────
// Shared types used across all layers of the authorization system.
// These types form the contract between layers. CASL types are
// intentionally NOT present here — they live only in the ability factory.
// ─────────────────────────────────────────────────────────────

/**
 * Standard resource actions.
 * Uses string enum for database storage and human readability.
 * `manage` is a wildcard that matches any action (CASL convention).
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage', // Wildcard — grants ALL actions on the subject
}

/**
 * Subject type — string-based resource identifiers.
 * Examples: 'User', 'Article', 'Order', 'Report'
 * `all` is a wildcard matching any subject (CASL convention).
 */
export type Subject = string;

/** Wildcard subject — matches every resource in the system. */
export const SUBJECT_ALL = 'all';

// ─────────────────────────────────────────────────────────────
// Database entity interfaces
// ─────────────────────────────────────────────────────────────

/** A permission rule stored in the database. */
export interface PermissionDefinition {
  readonly id: string;
  readonly action: Action;
  readonly subject: Subject;
  readonly fields: string[] | null;
  readonly conditions: Record<string, unknown> | null;
  readonly inverted: boolean;
  readonly reason: string | null;
  readonly isActive: boolean;
}

/** A role stored in the database. */
export interface RoleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parentRoleId: string | null;
  readonly isActive: boolean;
  readonly metadata: Record<string, unknown> | null;
  readonly permissions: PermissionDefinition[];
}

/** A named, reusable condition template stored in the database. */
export interface ConditionTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly template: Record<string, unknown>;
  readonly isActive: boolean;
}

/** A user ↔ role assignment record. */
export interface UserRoleAssignment {
  readonly id: string;
  readonly userId: string;
  readonly roleId: string;
  readonly scope: string | null;
  readonly assignedAt: Date;
  readonly expiresAt: Date | null;
}

// ─────────────────────────────────────────────────────────────
// Service-layer interfaces
// ─────────────────────────────────────────────────────────────

/**
 * Incoming authorization check request.
 * This is the normalised format that every layer works with.
 */
export interface AuthorizationRequest {
  /** The user to check permissions for. */
  readonly userId: string;
  /** The action being attempted. */
  readonly action: Action;
  /** The resource type being accessed. */
  readonly subject: Subject;
  /** Optional: specific field being accessed (field-level ABAC). */
  readonly field?: string;
  /**
   * Optional: runtime context for ABAC condition evaluation.
   * Typically includes the resource instance data.
   * Example: `{ resource: { createdBy: 'user-123', status: 'draft' } }`
   */
  readonly context?: Record<string, unknown>;
}

/**
 * The result of an authorization check.
 * Returned by `AuthorizationService.can()`.
 */
export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly matchedRule?: {
    readonly action: Action;
    readonly subject: Subject;
    readonly inverted: boolean;
  };
}

/**
 * Aggregated permission context for a single user.
 * Built by the repository, cached in Redis, consumed by the ability factory.
 */
export interface UserPermissionContext {
  readonly userId: string;
  readonly roles: RoleDefinition[];
  /** Reserved for future per-user permission overrides. */
  readonly directPermissions: PermissionDefinition[];
}

// ─────────────────────────────────────────────────────────────
// Input DTOs (used by service and controller layers)
// ─────────────────────────────────────────────────────────────

export interface CreateRoleInput {
  readonly name: string;
  readonly description: string;
  readonly parentRoleId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateRoleInput {
  readonly name?: string;
  readonly description?: string;
  readonly parentRoleId?: string | null;
  readonly isActive?: boolean;
  readonly metadata?: Record<string, unknown> | null;
}

export interface CreatePermissionInput {
  readonly action: Action;
  readonly subject: Subject;
  readonly fields?: string[];
  readonly conditions?: Record<string, unknown>;
  readonly inverted?: boolean;
  readonly reason?: string;
}

export interface UpdatePermissionInput {
  readonly action?: Action;
  readonly subject?: Subject;
  readonly fields?: string[] | null;
  readonly conditions?: Record<string, unknown> | null;
  readonly inverted?: boolean;
  readonly reason?: string | null;
  readonly isActive?: boolean;
}

export interface AssignRoleInput {
  readonly roleId: string;
  readonly scope?: string;
  readonly expiresAt?: Date;
}
