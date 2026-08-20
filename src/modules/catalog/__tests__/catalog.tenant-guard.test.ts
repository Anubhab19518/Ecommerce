import type { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '@modules/authorization';
import { ForbiddenError, UnauthorizedError } from '@shared/errors';
import { catalogTenantGuard, type CatalogRequest } from '../catalog.tenant-guard';

jest.mock('@modules/authorization');

describe('catalogTenantGuard', () => {
  let req: Partial<CatalogRequest> & { user?: { id?: string } };
  let res: Partial<Response>;
  let next: NextFunction;

  const validUserId = '11111111-1111-4111-8111-111111111111';
  const tenantId1 = '22222222-2222-4222-8222-222222222222';
  const tenantId2 = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      headers: {},
      query: {},
      params: {},
      body: {},
      user: { id: validUserId },
    };
    res = {};
    next = jest.fn();
  });

  it('throws UnauthorizedError if req.user is missing', async () => {
    delete req.user;
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('throws ForbiddenError if user has no assigned roles', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([]);

    await catalogTenantGuard(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('allows Super Admin (null scope) without client ecommerce ID', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: null,
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.isSuperAdmin).toBe(true);
    expect(req.ecommerceId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('allows Super Admin (* scope) with client ecommerce ID from header', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: '*',
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    req.headers = { 'x-ecommerce-id': tenantId1 };
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.isSuperAdmin).toBe(true);
    expect(req.ecommerceId).toBe(tenantId1);
    expect(next).toHaveBeenCalledWith();
  });

  it('extracts client ecommerce ID from query, params, or body', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: 'global',
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    // From query
    req.query = { ecommerceId: tenantId1 };
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.ecommerceId).toBe(tenantId1);

    // From params
    req.query = {};
    req.params = { ecommerceId: tenantId2 };
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.ecommerceId).toBe(tenantId2);

    // From body
    req.params = {};
    req.body = { ecommerceId: tenantId1 };
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.ecommerceId).toBe(tenantId1);
  });

  it('sets ecommerceId for regular tenant admin', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: tenantId1,
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    await catalogTenantGuard(req as Request, res as Response, next);
    expect(req.isSuperAdmin).toBe(false);
    expect(req.ecommerceId).toBe(tenantId1);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects regular tenant admin attempting cross-tenant access', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: tenantId1,
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    req.headers = { 'x-ecommerce-id': tenantId2 }; // Different store
    await catalogTenantGuard(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('rejects if non-superadmin has only empty/invalid scopes', async () => {
    jest.spyOn(AuthorizationService.prototype, 'getUserRoleAssignments').mockResolvedValue([
      {
        id: 'ura-1',
        userId: validUserId,
        roleId: 'r1',
        scope: '',
        assignedAt: new Date(),
        expiresAt: null,
      },
    ]);

    await catalogTenantGuard(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
