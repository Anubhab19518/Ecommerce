import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../../server';
import { CatalogRepository } from '../catalog.repository';

// Mock database connection and metrics
jest.mock('@infrastructure/database/connection', () => {
  const modelDef = {
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  return {
    getSequelize: jest.fn(() => ({
      transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
      query: jest.fn().mockResolvedValue([[]]),
      define: jest.fn(() => modelDef),
    })),
  };
});

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbQueryDuration: {
    startTimer: jest.fn(() => jest.fn()),
  },
  httpRequestDuration: {
    startTimer: jest.fn(() => jest.fn()),
  },
  httpRequestsTotal: {
    inc: jest.fn(),
  },
  httpResponseSize: {
    observe: jest.fn(),
  },
}));

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetUserRoleAssignments = jest.fn<Promise<unknown[]>, [string]>();

jest.mock('@modules/authorization', () => ({
  AuthorizationService: jest.fn().mockImplementation(() => ({
    getUserRoleAssignments: (userId: string): Promise<unknown[]> =>
      mockGetUserRoleAssignments(userId),
  })),
  authorizationRoutes: require('express').Router(),
}));

describe('Catalog Routes & Tenant Guard Integration', () => {
  const app = createApp();
  const secret = 'test-secret';
  const tenantAdminId = 'user-tenant-admin';
  const superAdminId = 'user-super-admin';
  const ecommerceId = 'ecom-111';

  let tenantAdminToken: string;
  let superAdminToken: string;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = secret;
    tenantAdminToken = sign({ userId: tenantAdminId }, secret);
    superAdminToken = sign({ userId: superAdminId }, secret);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Tenant Guard Enforcement', () => {
    it('returns 401 Unauthorized when Bearer token is missing', async () => {
      const res = await request(app).get('/api/v1/catalog/categories');
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when user has no role assignments', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/catalog/categories')
        .set('Authorization', `Bearer ${tenantAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('No roles or tenant access assigned to user');
    });

    it('returns 403 Forbidden when tenant admin attempts to access another ecommerce tenant', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      const res = await request(app)
        .get('/api/v1/catalog/categories')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Ecommerce-Id', 'ecom-other-222');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Client cannot target a different ecommerce tenant');
    });

    it('allows Super Admin with global scope to access endpoints', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: superAdminId, roleId: 'r-admin', scope: null }, // Global scope
      ]);

      jest.spyOn(CatalogRepository.prototype, 'findAllEcommerce').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/catalog/ecommerce')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Category Routes', () => {
    it('GET /api/v1/catalog/categories returns tenant categories', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      jest.spyOn(CatalogRepository.prototype, 'findCategoriesByEcommerce').mockResolvedValue([
        {
          id: 'cat-1',
          ecommerceId,
          name: 'Electronics',
          slug: 'electronics',
          path: 'electronics',
          isActive: true,
          sortOrder: 0,
        } as never,
      ]);

      const res = await request(app)
        .get('/api/v1/catalog/categories')
        .set('Authorization', `Bearer ${tenantAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Electronics');
    });
  });

  describe('Product Routes', () => {
    it('POST /api/v1/catalog/products creates a product under tenant', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      jest.spyOn(CatalogRepository.prototype, 'findProductBySlug').mockResolvedValue(null);
      jest.spyOn(CatalogRepository.prototype, 'createProduct').mockResolvedValue({
        id: 'prod-1',
        ecommerceId,
        name: 'Smartphone',
        slug: 'smartphone',
        price: 499.99,
        quantity: 10,
        hasVariants: false,
      } as never);

      const res = await request(app)
        .post('/api/v1/catalog/products')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: 'Smartphone',
          slug: 'smartphone',
          price: 499.99,
          quantity: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Smartphone');
    });
  });

  describe('Unit Reference Routes', () => {
    it('GET /api/v1/catalog/units returns all reference units', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      jest.spyOn(CatalogRepository.prototype, 'findAllUnits').mockResolvedValue([
        {
          id: 'u-1',
          name: 'Liter',
          symbol: 'L',
          category: 'Volume',
        } as never,
        {
          id: 'u-2',
          name: 'Kilogram',
          symbol: 'kg',
          category: 'Weight',
        } as never,
      ]);

      const res = await request(app)
        .get('/api/v1/catalog/units')
        .set('Authorization', `Bearer ${tenantAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Liter');
    });

    it('GET /api/v1/catalog/units?category=Volume filters units by category', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      const spy = jest
        .spyOn(CatalogRepository.prototype, 'findAllUnits')
        .mockResolvedValue([
          { id: 'u-1', name: 'Liter', symbol: 'L', category: 'Volume' } as never,
        ]);

      const res = await request(app)
        .get('/api/v1/catalog/units?category=Volume')
        .set('Authorization', `Bearer ${tenantAdminToken}`);

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith('Volume');
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/catalog/units/:id returns specific unit', async () => {
      const validUnitId = '11111111-1111-4111-8111-111111111111';
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      jest.spyOn(CatalogRepository.prototype, 'findUnitById').mockResolvedValue({
        id: validUnitId,
        name: 'Liter',
        symbol: 'L',
        category: 'Volume',
      } as never);

      const res = await request(app)
        .get(`/api/v1/catalog/units/${validUnitId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Liter');
    });
  });

  describe('Product Options with Units', () => {
    it('POST /api/v1/catalog/products/:productId/options creates an option with unitId', async () => {
      mockGetUserRoleAssignments.mockResolvedValue([
        { userId: tenantAdminId, roleId: 'r1', scope: ecommerceId },
      ]);

      const prodId = '22222222-2222-4222-8222-222222222222';
      const unitId = '11111111-1111-4111-8111-111111111111';

      jest.spyOn(CatalogRepository.prototype, 'findProductById').mockResolvedValue({
        id: prodId,
        ecommerceId,
      } as never);
      jest.spyOn(CatalogRepository.prototype, 'findOptionsByProduct').mockResolvedValue([]);
      jest.spyOn(CatalogRepository.prototype, 'findUnitById').mockResolvedValue({
        id: unitId,
        name: 'Liter',
      } as never);
      jest.spyOn(CatalogRepository.prototype, 'createProductOption').mockResolvedValue({
        id: 'opt-vol',
        productId: prodId,
        name: 'Volume',
        unitId,
        displayOrder: 0,
      } as never);

      const res = await request(app)
        .post(`/api/v1/catalog/products/${prodId}/options`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: 'Volume',
          unitId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Volume');
      expect(res.body.data.unitId).toBe(unitId);
    });
  });
});
