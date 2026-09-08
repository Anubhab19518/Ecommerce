'use client';

import { logger } from '@infrastructure/logging/logger';
import { AuthorizationService } from '@modules/authorization';
import { CatalogService, EcommerceStatus, ProductStatus, VariantStatus } from '@modules/catalog';
import { UserService } from '@modules/user';
import { seedRbac } from './rbac-seeder';

interface OptionSpec {
  name: string;
  unitName?: string;
  values: string[];
}

interface ProductSpec {
  name: string;
  slug: string;
  categorySlug: string;
  price: number;
  offerPrice?: number | null;
  quantity?: number;
  description: string;
  hasVariants: boolean;
  options?: OptionSpec[];
}

interface TenantSpec {
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  categories: Array<{ name: string; slug: string; description?: string }>;
  products: ProductSpec[];
}

async function ensureEcommerceAdminRole(
  authzService: AuthorizationService,
): Promise<Awaited<ReturnType<AuthorizationService['createRole']>>> {
  const existingRoles = await authzService.listRoles(true);
  let role = existingRoles.find((r) => r.name === 'ecommerce_admin');
  if (!role) {
    role = await authzService.createRole({
      name: 'ecommerce_admin',
      description: 'Store administrator scoped to a single ecommerce organisation',
    });
    logger.info('Created "ecommerce_admin" role');
  }
  return role;
}

async function ensureSuperAdminUser(
  userService: UserService,
  authzService: AuthorizationService,
): Promise<void> {
  let superAdminUser = await userService.getUserByEmail('superadmin@bazar.com');
  if (!superAdminUser) {
    superAdminUser = await userService.createUser({
      email: 'superadmin@bazar.com',
      password: 'Password123!',
      name: 'Platform Super Admin',
    });
    logger.info('Created Super Admin user', { email: superAdminUser.email });
  }

  const existingRoles = await authzService.listRoles(true);
  const adminRole = existingRoles.find((r) => r.name === 'admin');

  if (adminRole) {
    const assignments = await authzService.getUserRoleAssignments(superAdminUser.id);
    const hasAdminAssignment = assignments.some(
      (a) => a.roleId === adminRole.id && (a.scope === '*' || a.scope === null),
    );
    if (!hasAdminAssignment) {
      await authzService.assignRoleToUser(superAdminUser.id, adminRole.id, '*');
      logger.info('Assigned global "admin" role to Super Admin user');
    }
  }
}

async function ensureStoreAdminUser(
  adminEmail: string,
  adminName: string,
  storeId: string,
  ecommerceAdminRole: { id: string },
  userService: UserService,
  authzService: AuthorizationService,
): Promise<void> {
  let adminUser = await userService.getUserByEmail(adminEmail);
  if (!adminUser) {
    adminUser = await userService.createUser({
      email: adminEmail,
      password: 'Password123!',
      name: adminName,
    });
    logger.info('Created store admin user', { email: adminUser.email, storeId });
  }

  const assignments = await authzService.getUserRoleAssignments(adminUser.id);
  const hasAssignment = assignments.some(
    (a) => a.roleId === ecommerceAdminRole.id && a.scope === storeId,
  );
  if (!hasAssignment) {
    await authzService.assignRoleToUser(adminUser.id, ecommerceAdminRole.id, storeId);
    logger.info('Assigned store-scoped role', { user: adminUser.email, scope: storeId });
  }
}

async function seedTenantCategories(
  storeId: string,
  storeName: string,
  categories: Array<{ name: string; slug: string; description?: string }>,
  catalogService: CatalogService,
): Promise<Map<string, string>> {
  const existingCats = await catalogService.listCategories(storeId, true);
  const catMap = new Map<string, string>();

  for (const catDef of categories) {
    let cat = existingCats.find((c) => c.slug === catDef.slug);
    if (!cat) {
      cat = await catalogService.createCategory(storeId, {
        name: catDef.name,
        slug: catDef.slug,
      });
      logger.info('Created category', { store: storeName, category: cat.name });
    }
    catMap.set(catDef.slug, cat.id);
  }

  return catMap;
}

// fallow-ignore-next-line complexity
async function seedSingleTenant(
  tenant: TenantSpec,
  ecommerceAdminRole: { id: string },
  userService: UserService,
  authzService: AuthorizationService,
  catalogService: CatalogService,
): Promise<void> {
  const existingStores = await catalogService.listEcommerce();
  let store =
    existingStores.find((s) => s.slug === tenant.slug) ??
    existingStores.find((s) => s.name === tenant.name);

  if (!store) {
    store = await catalogService.createEcommerce({
      name: tenant.name,
      slug: tenant.slug,
      status: EcommerceStatus.ACTIVE,
    });
    logger.info('Created store', { name: store.name, slug: store.slug, id: store.id });
  } else if (store.name !== tenant.name || store.slug !== tenant.slug) {
    store = await catalogService.updateEcommerce(store.id, {
      name: tenant.name,
      slug: tenant.slug,
    });
    logger.info('Updated store name/slug', { name: store.name, slug: store.slug, id: store.id });
  }

  await ensureStoreAdminUser(
    tenant.adminEmail,
    tenant.adminName,
    store.id,
    ecommerceAdminRole,
    userService,
    authzService,
  );

  const catMap = await seedTenantCategories(
    store.id,
    store.name,
    tenant.categories,
    catalogService,
  );
  await seedTenantProducts(store.id, store.name, tenant.products, catMap, catalogService);
}

async function ensureProduct(
  storeId: string,
  storeName: string,
  pSpec: ProductSpec,
  categoryId: string,
  existingProds: Awaited<ReturnType<CatalogService['listProducts']>>,
  catalogService: CatalogService,
): Promise<{ id: string } | undefined> {
  const existing = existingProds.find((p) => p.slug === pSpec.slug);
  if (existing) return existing;

  const createdModel = await catalogService.createProduct(storeId, {
    name: pSpec.name,
    slug: pSpec.slug,
    categoryId,
    price: pSpec.price,
    offerPrice: pSpec.offerPrice ?? null,
    quantity: pSpec.quantity ?? 100,
    description: pSpec.description,
    status: ProductStatus.ACTIVE,
    hasVariants: pSpec.hasVariants,
  });
  logger.info('Created product', { store: storeName, product: createdModel.name });
  return catalogService.getProduct(storeId, createdModel.id);
}

function shouldSeedVariants(pSpec: ProductSpec): boolean {
  return pSpec.hasVariants && Array.isArray(pSpec.options) && pSpec.options.length > 0;
}

// fallow-ignore-next-line complexity
async function seedTenantProducts(
  storeId: string,
  storeName: string,
  products: ProductSpec[],
  catMap: Map<string, string>,
  catalogService: CatalogService,
): Promise<void> {
  const existingProds = await catalogService.listProducts(storeId);

  for (const pSpec of products) {
    const categoryId = catMap.get(pSpec.categorySlug);
    if (!categoryId) continue;

    const prod = await ensureProduct(
      storeId,
      storeName,
      pSpec,
      categoryId,
      existingProds,
      catalogService,
    );

    if (shouldSeedVariants(pSpec) && prod) {
      await seedProductVariants(storeId, prod.id, pSpec, catalogService);
    }
  }
}

interface OptionValuePair {
  id: string;
  value: string;
}

function computeCartesianProduct(args: OptionValuePair[][]): OptionValuePair[][] {
  let result: OptionValuePair[][] = [[]];

  for (const group of args) {
    const next: OptionValuePair[][] = [];
    for (const existing of result) {
      for (const item of group) {
        next.push([...existing, item]);
      }
    }
    result = next;
  }

  return result;
}

// fallow-ignore-next-line complexity
async function seedProductVariants(
  storeId: string,
  productId: string,
  pSpec: ProductSpec,
  catalogService: CatalogService,
): Promise<void> {
  const allUnits = await catalogService.listUnits();
  const createdOptions: Array<{ id: string; name: string; values: OptionValuePair[] }> = [];

  for (const optDef of pSpec.options ?? []) {
    let option = (await catalogService.listProductOptions(storeId, productId)).find(
      (o) => o.name === optDef.name,
    );

    if (!option) {
      option = await catalogService.createProductOption(storeId, productId, {
        name: optDef.name,
      });
    }

    if (!option) continue;

    const optionValues = (option as unknown as { values?: OptionValuePair[] }).values ?? [];
    const valueObjs: OptionValuePair[] = [];

    for (const valStr of optDef.values) {
      let unitId: string | null = null;
      if (optDef.unitName) {
        const unitName = optDef.unitName;
        const unit = unitName
          ? allUnits.find((u) => u.name.toLowerCase() === unitName.toLowerCase())
          : undefined;
        if (unit) unitId = unit.id;
      }

      let valObj = optionValues.find((v) => v.value === valStr);
      if (!valObj) {
        valObj = await catalogService.createProductOptionValue(storeId, productId, option.id, {
          value: valStr,
          unitId,
        });
      }
      valueObjs.push(valObj);
    }

    createdOptions.push({ id: option.id, name: option.name, values: valueObjs });
  }

  const existingVars = await catalogService.listVariants(storeId, productId);
  if (existingVars.length === 0 && createdOptions.length > 0) {
    const valueCombos = computeCartesianProduct(createdOptions.map((o) => o.values));
    const baseSkuPrefix = pSpec.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);

    for (let idx = 0; idx < valueCombos.length; idx++) {
      const combo = valueCombos[idx];
      if (!combo) continue;
      const valSlug = combo.map((v) => v.value.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');
      const sku = `${baseSkuPrefix}-${valSlug}`;
      const optionValueIds = combo.map((v) => v.id);

      await catalogService.createVariant(storeId, productId, {
        sku,
        price: pSpec.price,
        quantity: 20 + idx * 10,
        status: VariantStatus.ACTIVE,
        optionValueIds,
      });
    }
  }
}

// fallow-ignore-next-line complexity
export async function seedTenants(): Promise<void> {
  const userService = new UserService();
  const authzService = new AuthorizationService();
  const catalogService = new CatalogService();

  logger.info('Starting Multi-Tenant Ecommerce Seeding...');

  await seedRbac();
  const ecommerceAdminRole = await ensureEcommerceAdminRole(authzService);
  await ensureSuperAdminUser(userService, authzService);

  const tenants: TenantSpec[] = [
    {
      name: 'Alpha Enterprise',
      slug: 'alpha-enterprise',
      adminEmail: 'urbanvogue_admin@bazar.com',
      adminName: 'Alex Rivera (Alpha Enterprise)',
      categories: [
        { name: 'Men', slug: 'men', description: 'Men apparel and footwear' },
        { name: 'Hoodies', slug: 'hoodies', description: 'Streetwear hoodies and sweatshirts' },
        { name: 'T-Shirts', slug: 't-shirts', description: 'Cotton tees and basics' },
      ],
      products: [
        {
          name: 'Nike AIR',
          slug: 'nike-air',
          categorySlug: 'men',
          price: 150,
          quantity: 100,
          description: 'Premium cushioning athletic sneakers',
          hasVariants: true,
          options: [
            { name: 'Size', unitName: undefined, values: ['US 10', 'US 11'] },
            { name: 'Color', unitName: undefined, values: ['Red', 'Black'] },
          ],
        },
        {
          name: 'Oversized Streetwear Fleece Hoodie',
          slug: 'oversized-streetwear-fleece-hoodie',
          categorySlug: 'hoodies',
          price: 1899,
          quantity: 60,
          description: 'Heavyweight cotton fleece hoodie with boxy fit',
          hasVariants: false,
        },
        {
          name: 'Classic Cotton Crewneck T-Shirt',
          slug: 'classic-cotton-crewneck-tshirt',
          categorySlug: 't-shirts',
          price: 799,
          quantity: 180,
          description: 'Organic combed cotton daily crewneck tee',
          hasVariants: false,
        },
      ],
    },
    {
      name: 'Kleanja',
      slug: 'kleanja',
      adminEmail: 'pureclean_admin@bazar.com',
      adminName: 'Sarah Jenkins (Kleanja)',
      categories: [],
      products: [],
    },
    {
      name: 'Rasoi Ansh',
      slug: 'rasoi-ansh',
      adminEmail: 'freshharvest_admin@bazar.com',
      adminName: 'David Chen (Rasoi Ansh)',
      categories: [
        {
          name: 'Spices & Masalas',
          slug: 'spices-masalas',
          description: 'Authentic Indian blended spices and curry powders',
        },
        {
          name: 'Whole Spices',
          slug: 'whole-spices',
          description: 'Single-origin farm fresh whole spices',
        },
      ],
      products: [
        {
          name: 'Royal Garam Masala Blend',
          slug: 'royal-garam-masala-blend',
          categorySlug: 'spices-masalas',
          price: 14.99,
          quantity: 200,
          description: 'Signature artisanal blend of 16 roasted whole spices',
          hasVariants: true,
          options: [{ name: 'Weight', unitName: 'gram', values: ['100', '250', '500'] }],
        },
        {
          name: 'Single Origin Kashmiri Chilli Powder',
          slug: 'single-origin-kashmiri-chilli-powder',
          categorySlug: 'spices-masalas',
          price: 9.99,
          quantity: 150,
          description: 'Vibrant natural red chilli powder with mild heat and rich aroma',
          hasVariants: true,
          options: [{ name: 'Weight', unitName: 'gram', values: ['100', '250', '500'] }],
        },
      ],
    },
    {
      name: 'Kratkon',
      slug: 'kratkon',
      adminEmail: 'volttech_admin@bazar.com',
      adminName: 'Elena Rostova (Kratkon)',
      categories: [
        {
          name: 'Backpacks',
          slug: 'backpacks',
          description: 'Ergonomic urban and travel backpacks',
        },
        {
          name: 'Travel & Duffel Bags',
          slug: 'travel-duffel-bags',
          description: 'Water-resistant travel duffels and weekender bags',
        },
      ],
      products: [
        {
          name: 'Urban Pro Laptop Backpack 25L',
          slug: 'urban-pro-laptop-backpack-25l',
          categorySlug: 'backpacks',
          price: 89.99,
          quantity: 60,
          description: 'Water-resistant nylon backpack with 16-inch padded laptop compartment',
          hasVariants: true,
          options: [
            { name: 'Color', unitName: undefined, values: ['Midnight Black', 'Slate Grey'] },
          ],
        },
      ],
    },
    {
      name: 'Shree Shyam Impex',
      slug: 'shree-shyam-impex',
      adminEmail: 'fitpulse_admin@bazar.com',
      adminName: 'Marcus Vance (Shree Shyam Impex)',
      categories: [
        {
          name: 'Wooden Hangers',
          slug: 'wooden-hangers',
          description: 'Solid wood suit and coat hangers for retail & home',
        },
        {
          name: 'Velvet Hangers',
          slug: 'velvet-hangers',
          description: 'Non-slip slim velvet clothes hangers',
        },
      ],
      products: [
        {
          name: 'Premium Solid Wood Suit Hanger Pack',
          slug: 'premium-solid-wood-suit-hanger-pack',
          categorySlug: 'wooden-hangers',
          price: 34.99,
          quantity: 100,
          description: 'Smooth finish natural wood hangers with 360-degree swivel hook',
          hasVariants: true,
          options: [{ name: 'Pack Size', unitName: 'piece', values: ['10', '20', '50'] }],
        },
      ],
    },
  ];

  for (const t of tenants) {
    await seedSingleTenant(t, ecommerceAdminRole, userService, authzService, catalogService);
  }

  logger.info('Multi-Tenant Seeding completed successfully!');
}

if (require.main === module) {
  seedTenants()
    .then(() => {
      logger.info('Done seeding tenants.');
      process.exit(0);
    })
    .catch((err: unknown) => {
      logger.error('Tenant seeding failed:', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    });
}
