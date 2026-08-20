// ─────────────────────────────────────────────────────────────
// Authorization Module — Ability Factory
// ─────────────────────────────────────────────────────────────
// ██  CASL ISOLATION BOUNDARY  ██
//
// This is the ONLY file in the entire codebase that imports
// @casl/ability. Every other layer works exclusively with the
// plain TypeScript interfaces defined in authorization.types.ts.
//
// If CASL is ever replaced, only this file needs to change.
// ─────────────────────────────────────────────────────────────

import { createMongoAbility } from '@casl/ability';
import type { ForcedSubject, MongoAbility, RawRuleOf, MongoQuery } from '@casl/ability';
import { logger } from '@infrastructure/logging/logger';
import { compile as compileConditions } from './authorization.condition-compiler';
import type {
  Action,
  AuthorizationRequest,
  AuthorizationResult,
  PermissionDefinition,
  UserPermissionContext,
} from './authorization.types';

// ─────────────────────── CASL type aliases (internal only) ──

type AppAbility = MongoAbility<[Action, string | ForcedSubject<string>], MongoQuery>;
type AppRawRule = RawRuleOf<AppAbility>;

// ─────────────────────────────────────────────────────────────
// Ability Construction
// ─────────────────────────────────────────────────────────────

/**
 * Converts a database PermissionDefinition into a CASL raw rule.
 * Handles conditions, fields, inverted (forbid) rules, and reasons.
 */
function toRawRule(
  permission: PermissionDefinition,
  runtimeContext?: Record<string, unknown>,
): AppRawRule {
  const rule: AppRawRule = {
    action: permission.action,
    subject: permission.subject,
  };

  // Field-level permissions
  if (permission.fields && permission.fields.length > 0) {
    rule.fields = permission.fields;
  }

  // ABAC conditions — compile template variables with runtime context
  if (permission.conditions && Object.keys(permission.conditions).length > 0) {
    const context = runtimeContext ?? {};
    rule.conditions = compileConditions(permission.conditions, context);
  }

  // Deny rules
  if (permission.inverted) {
    rule.inverted = true;
  }

  // Human-readable denial reason
  if (permission.reason) {
    rule.reason = permission.reason;
  }

  return rule;
}

/**
 * Builds a CASL Ability instance from a fully-resolved UserPermissionContext.
 *
 * The resulting ability is a short-lived, request-scoped object. It should
 * NOT be cached — the UserPermissionContext is cached instead (in Redis).
 *
 * @param context - The aggregated roles and permissions for a user.
 * @param runtimeContext - Optional runtime data for ABAC condition interpolation
 *                         (e.g., the resource being accessed).
 * @returns A CASL MongoAbility instance.
 */
export function buildAbility(
  context: UserPermissionContext,
  runtimeContext?: Record<string, unknown>,
): AppAbility {
  const rules: AppRawRule[] = [];

  // Collect permissions from all roles (already includes inherited via hierarchy)
  for (const role of context.roles) {
    for (const permission of role.permissions) {
      if (!permission.isActive) continue;
      rules.push(toRawRule(permission, runtimeContext));
    }
  }

  // Direct user permissions (reserved for future per-user overrides)
  for (const permission of context.directPermissions) {
    if (!permission.isActive) continue;
    rules.push(toRawRule(permission, runtimeContext));
  }

  logger.debug('Ability built', {
    userId: context.userId,
    roleCount: context.roles.length,
    ruleCount: rules.length,
  });

  return createMongoAbility<[Action, string | ForcedSubject<string>]>(rules);
}

/**
 * Checks whether the given ability permits the requested action.
 * Returns a clean AuthorizationResult — no CASL types leak out.
 *
 * @param ability - A CASL Ability instance (from buildAbility).
 * @param request - The normalized authorization request.
 * @returns An AuthorizationResult with allowed status and reason.
 */
export function checkAbility(
  ability: AppAbility,
  request: AuthorizationRequest,
): AuthorizationResult {
  const { action, subject, field } = request;

  // Field-level check
  if (field) {
    const allowed = ability.can(action, subject, field);
    if (!allowed) {
      const rule = ability.relevantRuleFor(action, subject, field);
      return {
        allowed: false,
        reason: rule?.reason ?? `Access denied: cannot ${action} field "${field}" on ${subject}`,
        matchedRule: rule
          ? {
              action: rule.action as Action,
              subject: rule.subject as string,
              inverted: !!rule.inverted,
            }
          : undefined,
      };
    }
    return { allowed: true };
  }

  // Subject-level check
  const allowed = ability.can(action, subject);
  if (!allowed) {
    const rule = ability.relevantRuleFor(action, subject);
    return {
      allowed: false,
      reason: rule?.reason ?? `Access denied: cannot ${action} ${subject}`,
      matchedRule: rule
        ? {
            action: rule.action as Action,
            subject: rule.subject as string,
            inverted: !!rule.inverted,
          }
        : undefined,
    };
  }

  return { allowed: true };
}
