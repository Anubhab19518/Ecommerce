import { logger } from '@infrastructure/logging/logger';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Condition Compiler
// ─────────────────────────────────────────────────────────────
// Converts JSON condition templates from the database into
// runtime-evaluable condition objects by interpolating user
// and resource context into placeholder expressions.
//
// Template syntax:
//   ${user.id}       — replaced with context.user.id
//   ${user.email}    — replaced with context.user.email
//   ${now}           — replaced with current ISO timestamp
//   ${env.VAR_NAME}  — replaced with process.env.VAR_NAME
//
// Supported CASL-compatible operators:
//   $eq, $ne, $in, $nin, $gt, $gte, $lt, $lte, $exists, $regex, $all, $elemMatch
// ─────────────────────────────────────────────────────────────

/** Characters allowed in template variable paths (prevents injection). */
const TEMPLATE_VAR_PATTERN = /^\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}$/;

/** Full regex to find all template variables in a string value. */
const TEMPLATE_INTERPOLATION_REGEX = /\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;

/** Operators that are pass-through (no interpolation needed on the operator key). */
const VALID_OPERATORS = new Set([
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$exists',
  '$regex',
  '$all',
  '$elemMatch',
  '$not',
  '$and',
  '$or',
]);

/** Maximum nesting depth to prevent stack overflow on malicious input. */
const MAX_DEPTH = 10;

/**
 * Resolves a dot-separated path against a context object.
 *
 * @example
 * resolvePath('user.id', { user: { id: 'abc' } }) // => 'abc'
 * resolvePath('now', {})                           // => ISO string
 */
function resolvePath(path: string, context: Record<string, unknown>): unknown {
  // Built-in virtual paths
  if (path === 'now') {
    return new Date().toISOString();
  }

  // Environment variable access (read-only, limited to AUTHZ_ prefixed vars for safety)
  if (path.startsWith('env.')) {
    const envKey = path.slice(4);
    if (!envKey.startsWith('AUTHZ_')) {
      logger.warn('Condition compiler: env variable access denied (not AUTHZ_ prefixed)', { path });
      return undefined;
    }
    return process.env[envKey];
  }

  const segments = path.split('.');
  let current: unknown = context;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Interpolates template variables in a single string value.
 *
 * If the entire string is a single template expression (e.g., `${user.id}`),
 * the raw resolved value is returned (preserving type). Otherwise, string
 * concatenation is used (e.g., `prefix-${user.id}-suffix`).
 */
function interpolateString(value: string, context: Record<string, unknown>): unknown {
  // Fast path: entire value is a single template expression
  const exactMatch = TEMPLATE_VAR_PATTERN.exec(value);
  if (exactMatch?.[1]) {
    return resolvePath(exactMatch[1], context);
  }

  // Partial interpolation: replace template vars within a larger string
  return value.replace(TEMPLATE_INTERPOLATION_REGEX, (_match, varPath: string) => {
    const resolved = resolvePath(varPath, context);
    if (resolved === undefined || resolved === null) {
      return '';
    }
    return String(resolved);
  });
}

/**
 * Recursively compiles a condition object by interpolating all
 * template variables against the provided context.
 */
// fallow-ignore-next-line complexity
function compileValue(value: unknown, context: Record<string, unknown>, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    logger.warn('Condition compiler: max depth exceeded, returning value as-is');
    return value;
  }

  // Null / undefined pass-through
  if (value === null || value === undefined) {
    return value;
  }

  // String interpolation
  if (typeof value === 'string') {
    return interpolateString(value, context);
  }

  // Primitives pass-through
  if (typeof value !== 'object') {
    return value;
  }

  // Array — compile each element
  if (Array.isArray(value)) {
    return value.map((item) => compileValue(item, context, depth + 1));
  }

  // Object — compile each value, validate operator keys
  const compiled: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith('$') && !VALID_OPERATORS.has(key)) {
      logger.warn('Condition compiler: unknown operator skipped', { operator: key });
      continue;
    }
    compiled[key] = compileValue(val, context, depth + 1);
  }
  return compiled;
}

/**
 * Compiles a condition template by interpolating context values
 * into template variable placeholders.
 *
 * @param template - The raw condition JSON from the database.
 * @param context  - Runtime context containing user, resource, and environment data.
 * @returns A fully resolved condition object ready for CASL evaluation.
 *
 * @example
 * ```typescript
 * const template = { createdBy: '${user.id}', status: { $in: ['draft', 'review'] } };
 * const context  = { user: { id: 'abc-123' } };
 * const result   = compile(template, context);
 * // => { createdBy: 'abc-123', status: { $in: ['draft', 'review'] } }
 * ```
 */
export function compile(
  template: Record<string, unknown>,
  context: Record<string, unknown>,
): Record<string, unknown> {
  return compileValue(template, context, 0) as Record<string, unknown>;
}

function validateTemplateString(obj: string, path: string, errors: string[]): void {
  const vars = obj.match(TEMPLATE_INTERPOLATION_REGEX);
  if (!vars) return;
  for (const v of vars) {
    if (!TEMPLATE_VAR_PATTERN.test(v)) {
      errors.push(`${path}: malformed template variable "${v}"`);
    }
  }
}

function validateTemplateObject(
  obj: Record<string, unknown>,
  path: string,
  depth: number,
  errors: string[],
  walk: (o: unknown, p: string, d: number) => void,
): void {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$') && !VALID_OPERATORS.has(key)) {
      errors.push(`${path}.${key}: unknown operator`);
    }
    walk(val, `${path}.${key}`, depth + 1);
  }
}

/**
 * Validates that a condition template contains only safe,
 * well-formed template expressions. Returns validation errors.
 */
export function validateTemplate(template: Record<string, unknown>): string[] {
  const errors: string[] = [];

  function walk(obj: unknown, path: string, depth: number): void {
    if (depth > MAX_DEPTH) {
      errors.push(`${path}: exceeds maximum nesting depth of ${MAX_DEPTH}`);
      return;
    }

    if (typeof obj === 'string') {
      validateTemplateString(obj, path, errors);
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => walk(item, `${path}[${idx}]`, depth + 1));
      return;
    }

    if (obj !== null && typeof obj === 'object') {
      validateTemplateObject(obj as Record<string, unknown>, path, depth, errors, walk);
    }
  }

  walk(template, '$', 0);
  return errors;
}
