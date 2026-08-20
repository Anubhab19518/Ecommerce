import type { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '@modules/authorization';
import { ForbiddenError, UnauthorizedError } from '@shared/errors';

export interface CatalogRequest extends Request {
  ecommerceId?: string;
  isSuperAdmin?: boolean;
}

const authzService = new AuthorizationService();

function extractClientEcommerceId(req: Request): string | undefined {
  const headerVal = req.headers['x-ecommerce-id'];
  if (typeof headerVal === 'string') return headerVal;

  const queryVal = req.query.ecommerceId;
  if (typeof queryVal === 'string') return queryVal;

  const paramVal = req.params.ecommerceId;
  if (typeof paramVal === 'string') return paramVal;

  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body === 'object' && typeof body.ecommerceId === 'string') {
    return body.ecommerceId;
  }

  return undefined;
}

/**
 * Tenant resolution and authorization guard.
 *
 * Enforces that:
 * 1. The authenticated user's role assignment scope is the sole authority for tenant identification.
 * 2. An Ecommerce Admin can only access their assigned ecommerce scope.
 * 3. Client-supplied ecommerce IDs cannot be used to bypass tenant authority.
 * 4. Super Admins (unscoped/wildcard) are explicitly verified before operating on a specific tenant.
 */
export async function catalogTenantGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (!userId) {
      throw new UnauthorizedError('User authentication required');
    }

    const catalogReq = req as CatalogRequest;
    const assignments = await authzService.getUserRoleAssignments(userId);

    if (assignments.length === 0) {
      throw new ForbiddenError('No roles or tenant access assigned to user');
    }

    // Check for global Super Admin role (scope: null or '*')
    const isSuperAdmin = assignments.some(
      (a) => a.scope === null || a.scope === '*' || a.scope === 'global',
    );

    catalogReq.isSuperAdmin = isSuperAdmin;

    const clientEcommerceId = extractClientEcommerceId(req);

    if (isSuperAdmin) {
      if (clientEcommerceId) {
        catalogReq.ecommerceId = clientEcommerceId;
      }
      return next();
    }

    // Regular tenant admin: find authorized tenant scope
    const tenantScopes = assignments
      .map((a) => a.scope)
      .filter((scope): scope is string => Boolean(scope) && scope !== '*' && scope !== 'global');

    if (tenantScopes.length === 0) {
      throw new ForbiddenError('No ecommerce tenant assigned to this user');
    }

    const primaryScope = tenantScopes[0];

    // Validate that any client-supplied ecommerce ID matches the authorized scope
    if (clientEcommerceId && clientEcommerceId !== primaryScope) {
      throw new ForbiddenError('Access denied: Client cannot target a different ecommerce tenant');
    }

    catalogReq.ecommerceId = primaryScope;
    next();
  } catch (error) {
    next(error);
  }
}
