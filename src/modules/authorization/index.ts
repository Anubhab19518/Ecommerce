// ─────────────────────────────────────────────────────────────
// Authorization Module — Public API (Barrel Export)
// ─────────────────────────────────────────────────────────────
// Only the service, routes, middleware, and types are exposed.
// Model, Repository, Cache, Ability Factory, and Condition Compiler
// are intentionally hidden — other modules MUST NOT import them.
// ─────────────────────────────────────────────────────────────

// Service — the primary public interface
export { AuthorizationService } from './authorization.service';

// Routes — admin REST API
export { authorizationRoutes } from './authorization.routes';

// Middleware — route-level authorization for consuming modules
export { authorize, authorizeAny } from './authorization.middleware';
export type {
  AuthorizeOptions,
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authorization.middleware';

// Types — shared interfaces and enums
export { Action, SUBJECT_ALL } from './authorization.types';
export type {
  Subject,
  AuthorizationRequest,
  AuthorizationResult,
  RoleDefinition,
  PermissionDefinition,
  ConditionTemplate,
  UserRoleAssignment,
  UserPermissionContext,
  CreateRoleInput,
  UpdateRoleInput,
  CreatePermissionInput,
  UpdatePermissionInput,
  AssignRoleInput,
} from './authorization.types';
