import type { Request, Response, NextFunction } from 'express';
import { logger } from '@infrastructure/logging/logger';
import { ForbiddenError, UnauthorizedError } from '@shared/errors';
import { AuthorizationService } from './authorization.service';
import type { Action, Subject } from './authorization.types';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Express Middleware Factory
// ─────────────────────────────────────────────────────────────
// Provides a reusable `authorize()` function that creates Express
// middleware for route-level authorization checks.
//
// Usage in any module's routes:
//
//   import { authorize, Action } from '@modules/authorization';
//
//   router.get('/articles',
//     authorize({ action: Action.LIST, subject: 'Article' }),
//     listArticles,
//   );
//
//   // With dynamic context (e.g., resource ownership check):
//   router.patch('/articles/:id',
//     authorize({
//       action: Action.UPDATE,
//       subject: 'Article',
//       contextResolver: (req) => ({
//         resource: { id: req.params.id },
//         user: { id: (req as AuthenticatedRequest).user?.id },
//       }),
//     }),
//     updateArticle,
//   );
// ─────────────────────────────────────────────────────────────

/**
 * Expected shape of req.user set by upstream authentication middleware.
 * The authorization module does NOT handle authentication — it assumes
 * the user identity is already verified and attached to the request.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email?: string;
  readonly [key: string]: unknown;
}

/** Extended Request type with authenticated user. */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/** Configuration for the authorize() middleware factory. */
export interface AuthorizeOptions {
  /** The action being performed. */
  readonly action: Action;
  /** The resource type being accessed. */
  readonly subject: Subject;
  /** Optional: specific field being accessed. */
  readonly field?: string;
  /**
   * Optional: a function that extracts ABAC runtime context from the request.
   * Called at middleware execution time with the current request object.
   * Return value is passed as `context` to the authorization check.
   */
  readonly contextResolver?: (req: AuthenticatedRequest) => Record<string, unknown>;
}

// Singleton service instance shared across all middleware
const authorizationService = new AuthorizationService();

/**
 * Creates an Express middleware that enforces authorization for the
 * configured action and subject.
 *
 * The middleware:
 *   1. Extracts the user ID from `req.user.id` (set by auth middleware upstream)
 *   2. Optionally resolves ABAC context via `contextResolver`
 *   3. Calls `AuthorizationService.canOrFail()`
 *   4. Passes to `next()` on success, throws `ForbiddenError` on denial
 *
 * @param options - Action, subject, and optional context resolver.
 * @returns Express middleware function.
 *
 * @example
 * ```typescript
 * // Simple role-based check
 * router.delete('/users/:id', authorize({ action: Action.DELETE, subject: 'User' }), deleteUser);
 *
 * // With ABAC context for ownership-based access
 * router.patch('/posts/:id',
 *   authorize({
 *     action: Action.UPDATE,
 *     subject: 'Post',
 *     contextResolver: (req) => ({
 *       user: { id: req.user?.id },
 *       resource: { id: req.params.id },
 *     }),
 *   }),
 *   updatePost,
 * );
 * ```
 */
function extractAuthenticatedUser(req: Request): {
  authenticatedReq: AuthenticatedRequest;
  userId: string;
} {
  const authenticatedReq = req as AuthenticatedRequest;
  const userId = authenticatedReq.user?.id;

  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  return { authenticatedReq, userId };
}

export function authorize(options: AuthorizeOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { authenticatedReq, userId } = extractAuthenticatedUser(req);

      // Resolve optional ABAC context
      const context = options.contextResolver
        ? options.contextResolver(authenticatedReq)
        : undefined;

      await authorizationService.canOrFail({
        userId,
        action: options.action,
        subject: options.subject,
        field: options.field,
        context,
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
        const authenticatedReq = req as AuthenticatedRequest;
        logger.warn('Authorization denied', {
          userId: authenticatedReq.user?.id,
          action: options.action,
          subject: options.subject,
          path: req.path,
          method: req.method,
        });
      }
      next(error);
    }
  };
}

/**
 * Convenience middleware that checks multiple permissions (ANY of them must pass).
 * Useful for routes that accept multiple action types.
 */
export function authorizeAny(optionsList: AuthorizeOptions[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { authenticatedReq, userId } = extractAuthenticatedUser(req);

      let lastError: Error | null = null;
      for (const options of optionsList) {
        const context = options.contextResolver
          ? options.contextResolver(authenticatedReq)
          : undefined;
        const result = await authorizationService.can({
          userId,
          action: options.action,
          subject: options.subject,
          field: options.field,
          context,
        });

        if (result.allowed) {
          next();
          return;
        }
        lastError = new ForbiddenError(result.reason ?? 'Access denied');
      }

      throw lastError ?? new ForbiddenError('Access denied');
    } catch (error) {
      next(error);
    }
  };
}
