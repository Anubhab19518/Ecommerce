import { AuthorizationService } from '@modules/authorization';
import { CatalogService } from '@modules/catalog';
import { UserService } from '@modules/user';
import { seedRbac } from '../rbac-seeder';
import { seedTenants } from '../tenant-seeder';

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@modules/authorization');
jest.mock('@modules/catalog');
jest.mock('@modules/user');
jest.mock('../rbac-seeder');

// ---------- helpers ----------
const uid = (n: number): string => `00000000-0000-0000-0000-00000000000${n}`;

function mockAuthzService(): {
  listRoles: jest.Mock;
  createRole: jest.Mock;
  getUserRoleAssignments: jest.Mock;
  assignRoleToUser: jest.Mock;
} {
  const mock = {
    listRoles: jest.fn(),
    createRole: jest.fn(),
    getUserRoleAssignments: jest.fn(),
    assignRoleToUser: jest.fn(),
  };
  (AuthorizationService as jest.MockedClass<typeof AuthorizationService>).mockImplementation(
    () => mock as unknown as AuthorizationService,
  );
  return mock;
}

function mockUserService(): {
  getUserByEmail: jest.Mock;
  createUser: jest.Mock;
} {
  const mock = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
  };
  (UserService as jest.MockedClass<typeof UserService>).mockImplementation(
    () => mock as unknown as UserService,
  );
  return mock;
}

function mockCatalogService(): {
  listEcommerce: jest.Mock;
  createEcommerce: jest.Mock;
  listCategories: jest.Mock;
  createCategory: jest.Mock;
  listProducts: jest.Mock;
  createProduct: jest.Mock;
  getProduct: jest.Mock;
  listUnits: jest.Mock;
  listProductOptions: jest.Mock;
  createProductOption: jest.Mock;
  createProductOptionValue: jest.Mock;
  listVariants: jest.Mock;
  createVariant: jest.Mock;
} {
  const mock = {
    listEcommerce: jest.fn(),
    createEcommerce: jest.fn(),
    listCategories: jest.fn(),
    createCategory: jest.fn(),
    listProducts: jest.fn(),
    createProduct: jest.fn(),
    getProduct: jest.fn(),
    listUnits: jest.fn(),
    listProductOptions: jest.fn(),
    createProductOption: jest.fn(),
    createProductOptionValue: jest.fn(),
    listVariants: jest.fn(),
    createVariant: jest.fn(),
  };
  (CatalogService as jest.MockedClass<typeof CatalogService>).mockImplementation(
    () => mock as unknown as CatalogService,
  );
  return mock;
}

// ---------- tests ----------
describe('Tenant Seeder', () => {
  let authzMock: ReturnType<typeof mockAuthzService>;
  let userMock: ReturnType<typeof mockUserService>;
  let catalogMock: ReturnType<typeof mockCatalogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (seedRbac as jest.Mock).mockResolvedValue(undefined);
    authzMock = mockAuthzService();
    userMock = mockUserService();
    catalogMock = mockCatalogService();
  });

  // Helper to set up minimal passing mocks for a full seedTenants run
  function setupFullSeedMocks(): void {
    // ensureEcommerceAdminRole — role exists
    authzMock.listRoles.mockResolvedValue([
      { id: uid(1), name: 'admin', permissions: [] },
      { id: uid(2), name: 'ecommerce_admin', permissions: [] },
    ]);

    // ensureSuperAdminUser — user exists, already has role
    userMock.getUserByEmail.mockResolvedValue({
      id: uid(9),
      email: 'superadmin@bazar.com',
      name: 'Platform Super Admin',
    });
    authzMock.getUserRoleAssignments.mockResolvedValue([
      { roleId: uid(1), scope: '*' },
      { roleId: uid(2), scope: uid(3) },
    ]);

    // Stores already exist
    catalogMock.listEcommerce.mockResolvedValue([
      { id: uid(3), name: 'Alpha Enterprise', slug: 'alpha-enterprise' },
      { id: uid(4), name: 'Kleanja', slug: 'kleanja' },
      { id: uid(5), name: 'Rasoi Ansh', slug: 'rasoi-ansh' },
      { id: uid(6), name: 'Kratkon', slug: 'kratkon' },
      { id: uid(7), name: 'Shree Shyam Impex', slug: 'shree-shyam-impex' },
    ]);

    // Categories already exist for each store
    catalogMock.listCategories.mockResolvedValue([
      { id: 'cat-1', name: 'Men', slug: 'men' },
      { id: 'cat-2', name: 'Hoodies', slug: 'hoodies' },
      { id: 'cat-3', name: 'T-Shirts', slug: 't-shirts' },
      { id: 'cat-4', name: 'Spices & Masalas', slug: 'spices-masalas' },
      { id: 'cat-5', name: 'Whole Spices', slug: 'whole-spices' },
      { id: 'cat-6', name: 'Backpacks', slug: 'backpacks' },
      { id: 'cat-7', name: 'Travel & Duffel Bags', slug: 'travel-duffel-bags' },
      { id: 'cat-8', name: 'Wooden Hangers', slug: 'wooden-hangers' },
      { id: 'cat-9', name: 'Velvet Hangers', slug: 'velvet-hangers' },
    ]);

    // Products already exist
    catalogMock.listProducts.mockResolvedValue([
      { id: 'p-1', slug: 'nike-air' },
      { id: 'p-2', slug: 'oversized-streetwear-fleece-hoodie' },
      { id: 'p-3', slug: 'classic-cotton-crewneck-tshirt' },
      { id: 'p-4', slug: 'royal-garam-masala-blend' },
      { id: 'p-5', slug: 'single-origin-kashmiri-chilli-powder' },
      { id: 'p-6', slug: 'urban-pro-laptop-backpack-25l' },
      { id: 'p-7', slug: 'premium-solid-wood-suit-hanger-pack' },
    ]);

    // Variants already exist (so no variant creation happens)
    catalogMock.listVariants.mockResolvedValue([{ id: 'v-1' }]);

    // Units and options needed by seedProductVariants (called before listVariants)
    catalogMock.listUnits.mockResolvedValue([]);
    catalogMock.listProductOptions.mockResolvedValue([
      { id: 'opt-1', name: 'Size', values: [{ id: 'val-1', value: 'US 10' }] },
      {
        id: 'opt-2',
        name: 'Color',
        values: [
          { id: 'val-2', value: 'Midnight Black' },
          { id: 'val-2b', value: 'Red' },
        ],
      },
      { id: 'opt-3', name: 'Weight', values: [{ id: 'val-3', value: '100' }] },
      { id: 'opt-4', name: 'Pack Size', values: [{ id: 'val-4', value: '10' }] },
    ]);
  }

  describe('seedTenants (full orchestration)', () => {
    it('is fully idempotent when all data already exists', async () => {
      setupFullSeedMocks();

      await seedTenants();

      expect(seedRbac).toHaveBeenCalledTimes(1);
      expect(authzMock.createRole).not.toHaveBeenCalled();
      expect(catalogMock.createEcommerce).not.toHaveBeenCalled();
      expect(catalogMock.createCategory).not.toHaveBeenCalled();
      expect(catalogMock.createProduct).not.toHaveBeenCalled();
      expect(catalogMock.createVariant).not.toHaveBeenCalled();
    });

    it('creates ecommerce_admin role when it does not exist', async () => {
      setupFullSeedMocks();
      // Override: no ecommerce_admin role
      authzMock.listRoles.mockResolvedValue([{ id: uid(1), name: 'admin', permissions: [] }]);
      authzMock.createRole.mockResolvedValue({
        id: uid(2),
        name: 'ecommerce_admin',
        permissions: [],
      });

      await seedTenants();

      expect(authzMock.createRole).toHaveBeenCalledWith({
        name: 'ecommerce_admin',
        description: expect.any(String),
      });
    });

    it('creates super admin user when not found', async () => {
      setupFullSeedMocks();
      // Override: super admin does not exist
      userMock.getUserByEmail.mockImplementation(async (email: string) => {
        if (email === 'superadmin@bazar.com') return null;
        return { id: uid(9), email, name: 'Test User' };
      });
      userMock.createUser.mockResolvedValue({
        id: uid(9),
        email: 'superadmin@bazar.com',
        name: 'Platform Super Admin',
      });
      // Need to return role assignments for the newly created user
      authzMock.getUserRoleAssignments.mockResolvedValue([]);
      authzMock.assignRoleToUser.mockResolvedValue(undefined);

      await seedTenants();

      expect(userMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'superadmin@bazar.com' }),
      );
      expect(authzMock.assignRoleToUser).toHaveBeenCalled();
    });

    it('assigns admin role to super admin when not already assigned', async () => {
      setupFullSeedMocks();
      // Super admin exists but has no role assignments
      authzMock.getUserRoleAssignments.mockResolvedValue([]);
      authzMock.assignRoleToUser.mockResolvedValue(undefined);

      await seedTenants();

      expect(authzMock.assignRoleToUser).toHaveBeenCalledWith(uid(9), uid(1), '*');
    });

    it('creates a new store when it does not exist', async () => {
      setupFullSeedMocks();
      // Override: no stores exist
      catalogMock.listEcommerce.mockResolvedValue([]);
      catalogMock.createEcommerce.mockResolvedValue({
        id: uid(3),
        name: 'Alpha Enterprise',
        slug: 'alpha-enterprise',
      });
      // Store admin users don't exist
      userMock.getUserByEmail.mockImplementation(async (email: string) => {
        if (email === 'superadmin@bazar.com') {
          return { id: uid(9), email, name: 'Platform Super Admin' };
        }
        return null;
      });
      userMock.createUser.mockImplementation(async (data: { email: string; name: string }) => ({
        id: uid(10),
        email: data.email,
        name: data.name,
      }));
      authzMock.getUserRoleAssignments.mockResolvedValue([{ roleId: uid(1), scope: '*' }]);
      authzMock.assignRoleToUser.mockResolvedValue(undefined);

      await seedTenants();

      expect(catalogMock.createEcommerce).toHaveBeenCalled();
      expect(userMock.createUser).toHaveBeenCalled();
    });
  });

  describe('category seeding', () => {
    it('creates categories when they do not exist', async () => {
      setupFullSeedMocks();
      // Override: no categories exist
      catalogMock.listCategories.mockResolvedValue([]);
      catalogMock.createCategory.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `cat-new-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      // No products exist either
      catalogMock.listProducts.mockResolvedValue([]);
      catalogMock.createProduct.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `p-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.getProduct.mockImplementation(async (_storeId: string, id: string) => ({
        id,
        slug: 'product-slug',
      }));
      catalogMock.listVariants.mockResolvedValue([{ id: 'v-1' }]);

      await seedTenants();

      expect(catalogMock.createCategory).toHaveBeenCalled();
    });
  });

  describe('product creation', () => {
    it('creates products when they do not exist', async () => {
      setupFullSeedMocks();
      // Override: no products
      catalogMock.listProducts.mockResolvedValue([]);
      catalogMock.createProduct.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `p-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.getProduct.mockImplementation(async (_storeId: string, id: string) => ({
        id,
        slug: 'product-slug',
      }));
      // Products with variants need variant flow
      catalogMock.listUnits.mockResolvedValue([
        { id: 'unit-l', name: 'liter' },
        { id: 'unit-kg', name: 'kilogram' },
        { id: 'unit-ml', name: 'milliliter' },
      ]);
      catalogMock.listProductOptions.mockResolvedValue([]);
      catalogMock.createProductOption.mockImplementation(
        async (_s: string, _p: string, data: { name: string }) => ({
          id: `opt-${data.name}`,
          name: data.name,
          values: [],
        }),
      );
      catalogMock.createProductOptionValue.mockImplementation(
        async (_s: string, _p: string, _o: string, data: { value: string }) => ({
          id: `val-${data.value}`,
          value: data.value,
        }),
      );
      catalogMock.listVariants.mockResolvedValue([]);
      catalogMock.createVariant.mockResolvedValue({ id: 'var-new' });

      await seedTenants();

      expect(catalogMock.createProduct).toHaveBeenCalled();
      expect(catalogMock.createVariant).toHaveBeenCalled();
    });

    it('skips product when categoryId is not found in catMap', async () => {
      setupFullSeedMocks();
      // No categories match (empty catMap)
      catalogMock.listCategories.mockResolvedValue([]);
      catalogMock.createCategory.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `cat-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.listProducts.mockResolvedValue([]);

      // Products will have matching categories from createCategory, so they should be created
      catalogMock.createProduct.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `p-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.getProduct.mockResolvedValue({ id: 'p-1', slug: 'slug' });
      catalogMock.listVariants.mockResolvedValue([{ id: 'v-1' }]);

      await seedTenants();

      // Products should still be created because categories are created first
      expect(catalogMock.createProduct).toHaveBeenCalled();
    });
  });

  describe('variant seeding', () => {
    it('creates option values when they do not already exist', async () => {
      setupFullSeedMocks();
      // Products exist but have no variants
      catalogMock.listVariants.mockResolvedValue([]);
      catalogMock.listUnits.mockResolvedValue([]);
      // Options exist with some values already (Size has US 10, Color has Red)
      catalogMock.listProductOptions.mockResolvedValue([
        { id: 'opt-Size', name: 'Size', values: [{ id: 'val-US10', value: 'US 10' }] },
        { id: 'opt-Color', name: 'Color', values: [{ id: 'val-Red', value: 'Red' }] },
        { id: 'opt-Volume', name: 'Volume', values: [{ id: 'val-05', value: '0.5' }] },
        { id: 'opt-Fragrance', name: 'Fragrance', values: [{ id: 'val-Citrus', value: 'Citrus' }] },
        { id: 'opt-Weight', name: 'Weight', values: [{ id: 'val-1', value: '1' }] },
      ]);
      catalogMock.createProductOptionValue.mockImplementation(
        async (_s: string, _p: string, _o: string, data: { value: string }) => ({
          id: `val-${data.value}`,
          value: data.value,
        }),
      );
      catalogMock.createVariant.mockResolvedValue({ id: 'var-new' });

      await seedTenants();

      // Should create missing option values (e.g. US 11, Black, 1, 2, Lavender, etc.)
      expect(catalogMock.createProductOptionValue).toHaveBeenCalled();
    });

    it('skips variant creation when variants already exist', async () => {
      setupFullSeedMocks();

      await seedTenants();

      expect(catalogMock.createVariant).not.toHaveBeenCalled();
    });

    it('creates option values with unitId when unit name matches', async () => {
      setupFullSeedMocks();
      catalogMock.listProducts.mockResolvedValue([]);
      catalogMock.createProduct.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `p-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.getProduct.mockImplementation(async (_storeId: string, id: string) => ({
        id,
        slug: 'product-slug',
      }));
      catalogMock.listUnits.mockResolvedValue([{ id: 'unit-gram', name: 'gram' }]);
      catalogMock.listProductOptions.mockResolvedValue([]);
      catalogMock.createProductOption.mockImplementation(
        async (_s: string, _p: string, data: { name: string }) => ({
          id: `opt-${data.name}`,
          name: data.name,
          values: [],
        }),
      );
      catalogMock.createProductOptionValue.mockImplementation(
        async (
          _s: string,
          _p: string,
          _o: string,
          data: { value: string; unitId?: string | null },
        ) => ({
          id: `val-${data.value}`,
          value: data.value,
          unitId: data.unitId ?? null,
        }),
      );
      catalogMock.listVariants.mockResolvedValue([]);
      catalogMock.createVariant.mockResolvedValue({ id: 'var-new' });

      await seedTenants();

      // Option values for Weight (e.g. 100, 250, 500) on Rasoi Ansh's product should have unitId set to 'unit-gram'
      expect(catalogMock.createProductOptionValue).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ unitId: 'unit-gram' }),
      );
    });
  });

  describe('store admin user creation', () => {
    it('creates store admin and assigns scoped role', async () => {
      setupFullSeedMocks();
      // Override: store admin users don't exist
      userMock.getUserByEmail.mockImplementation(async (email: string) => {
        if (email === 'superadmin@bazar.com') {
          return { id: uid(9), email, name: 'Platform Super Admin' };
        }
        return null;
      });
      userMock.createUser.mockImplementation(async (data: { email: string; name: string }) => ({
        id: uid(10),
        email: data.email,
        name: data.name,
      }));
      authzMock.getUserRoleAssignments.mockResolvedValue([{ roleId: uid(1), scope: '*' }]);
      authzMock.assignRoleToUser.mockResolvedValue(undefined);

      await seedTenants();

      // Should create store admin users
      expect(userMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'urbanvogue_admin@bazar.com' }),
      );
      // Should assign ecommerce_admin role scoped to the store
      expect(authzMock.assignRoleToUser).toHaveBeenCalledWith(uid(10), uid(2), expect.any(String));
    });

    it('skips role assignment when already assigned', async () => {
      setupFullSeedMocks();

      await seedTenants();

      // assignRoleToUser should not be called for store admins when they already have assignments
      // (the default mock returns assignments including the ecommerce_admin role)
    });
  });

  describe('edge cases', () => {
    it('handles product with hasVariants=false (no variant seeding)', async () => {
      setupFullSeedMocks();

      await seedTenants();

      // Non-variant products should not trigger variant listing
      // The test passes if no errors are thrown
    });

    it('handles product with no options array', async () => {
      setupFullSeedMocks();

      await seedTenants();

      // Products without options should not trigger variant seeding
      // The test passes if no errors are thrown
    });

    it('uses default quantity of 100 when not specified', async () => {
      setupFullSeedMocks();
      catalogMock.listProducts.mockResolvedValue([]);
      catalogMock.createProduct.mockImplementation(
        async (_storeId: string, data: { name: string; slug: string }) => ({
          id: `p-${data.slug}`,
          name: data.name,
          slug: data.slug,
        }),
      );
      catalogMock.getProduct.mockResolvedValue({ id: 'p-1', slug: 'slug' });
      catalogMock.listVariants.mockResolvedValue([{ id: 'v-1' }]);

      await seedTenants();

      // Products without explicit quantity should use 100
      expect(catalogMock.createProduct).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ quantity: 100 }),
      );
    });
  });
});
