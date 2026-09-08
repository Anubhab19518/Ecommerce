import { getSequelize } from '@infrastructure/database/connection';
import { CatalogRepository } from '../catalog.repository';
import {
  EcommerceModelDef,
  CategoryModelDef,
  ProductModelDef,
  ProductOptionModelDef,
  ProductOptionValueModelDef,
  ProductVariantModelDef,
  VariantOptionValueModelDef,
  UnitModelDef,
  BannerModelDef,
  CouponModelDef,
  CouponUsageModelDef,
} from '../models';

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbQueryDuration: {
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('@infrastructure/database/connection', () => {
  const mockModel = {
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    belongsToMany: jest.fn(),
  };
  return {
    getSequelize: jest.fn().mockReturnValue({
      define: jest.fn().mockReturnValue(mockModel),
      query: jest.fn().mockResolvedValue([]),
    }),
  };
});

jest.mock('../models', () => ({
  EcommerceModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  CategoryModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  ProductModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  ProductOptionModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  ProductOptionValueModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  ProductVariantModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  VariantOptionValueModelDef: {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  },
  UnitModelDef: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  BannerModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  CouponModelDef: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    increment: jest.fn(),
  },
  CouponUsageModelDef: {
    create: jest.fn(),
    count: jest.fn(),
  },
}));

describe('CatalogRepository', () => {
  let repo: CatalogRepository;

  const validUuid1 = '11111111-1111-4111-8111-111111111111';
  const validUuid2 = '22222222-2222-4222-8222-222222222222';
  const validUuid3 = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CatalogRepository();
  });

  describe('Ecommerce Operations', () => {
    it('findEcommerceById returns record', async () => {
      (EcommerceModelDef.findByPk as jest.Mock).mockResolvedValue({
        id: validUuid1,
        name: 'Store 1',
      });
      const result = await repo.findEcommerceById(validUuid1);
      expect(result).toEqual({ id: validUuid1, name: 'Store 1' });
      expect(EcommerceModelDef.findByPk).toHaveBeenCalledWith(validUuid1);
    });

    it('findEcommerceBySlug returns record', async () => {
      (EcommerceModelDef.findOne as jest.Mock).mockResolvedValue({
        id: validUuid1,
        slug: 'store-1',
      });
      const result = await repo.findEcommerceBySlug('store-1');
      expect(result).toEqual({ id: validUuid1, slug: 'store-1' });
    });

    it('findAllEcommerce returns array', async () => {
      (EcommerceModelDef.findAll as jest.Mock).mockResolvedValue([{ id: validUuid1 }]);
      const result = await repo.findAllEcommerce();
      expect(result).toHaveLength(1);
    });

    it('createEcommerce calls create and returns new record', async () => {
      const mockRecord = { id: validUuid1, name: 'New Store', slug: 'new-store' };
      (EcommerceModelDef.create as jest.Mock).mockResolvedValue(mockRecord);

      const result = await repo.createEcommerce({ name: 'New Store', slug: 'new-store' });
      expect(result).toEqual(mockRecord);
      expect(EcommerceModelDef.create).toHaveBeenCalled();
    });

    it('updateEcommerce updates and returns record when found, or null when not found', async () => {
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (EcommerceModelDef.findByPk as jest.Mock).mockResolvedValueOnce({
        id: validUuid1,
        name: 'Old Store',
        update: updateMock,
      });

      const updated = await repo.updateEcommerce(validUuid1, { name: 'Updated Store' });
      expect(updated).toBeDefined();
      expect(updateMock).toHaveBeenCalledWith(
        { name: 'Updated Store' },
        { transaction: undefined },
      );

      (EcommerceModelDef.findByPk as jest.Mock).mockResolvedValueOnce(null);
      const notFound = await repo.updateEcommerce(validUuid2, { name: 'Nonexistent' });
      expect(notFound).toBeNull();
    });
  });

  describe('Category Operations', () => {
    it('findCategoryById returns record', async () => {
      (CategoryModelDef.findOne as jest.Mock).mockResolvedValue({ id: validUuid2, name: 'Cat 1' });
      const res = await repo.findCategoryById(validUuid1, validUuid2);
      expect(res).toEqual({ id: validUuid2, name: 'Cat 1' });
    });

    it('findCategoryBySlug returns record', async () => {
      (CategoryModelDef.findOne as jest.Mock).mockResolvedValue({ id: validUuid1, slug: 'cat-1' });
      const res = await repo.findCategoryBySlug(validUuid1, 'cat-1');
      expect(res).toEqual({ id: validUuid1, slug: 'cat-1' });
    });

    it('findCategoriesByEcommerce returns array with or without includeInactive', async () => {
      (CategoryModelDef.findAll as jest.Mock).mockResolvedValue([
        { id: validUuid1, isActive: true },
      ]);
      const activeOnly = await repo.findCategoriesByEcommerce(validUuid1, false);
      expect(activeOnly).toHaveLength(1);

      const all = await repo.findCategoriesByEcommerce(validUuid1, true);
      expect(all).toHaveLength(1);
    });

    it('createCategory creates and returns category', async () => {
      (CategoryModelDef.create as jest.Mock).mockResolvedValue({
        id: validUuid2,
        name: 'Electronics',
      });
      const res = await repo.createCategory(validUuid1, {
        name: 'Electronics',
        slug: 'electronics',
        path: 'electronics',
      });
      expect(res).toEqual({ id: validUuid2, name: 'Electronics' });
    });

    it('updateCategory updates when found, returns null when missing', async () => {
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (CategoryModelDef.findOne as jest.Mock).mockResolvedValueOnce({
        id: validUuid2,
        ecommerceId: validUuid1,
        update: updateMock,
      });

      const res = await repo.updateCategory(validUuid1, validUuid2, { name: 'Updated' });
      expect(res).toBeDefined();

      (CategoryModelDef.findOne as jest.Mock).mockResolvedValueOnce(null);
      const missing = await repo.updateCategory(validUuid1, validUuid2, { name: 'Missing' });
      expect(missing).toBeNull();
    });

    it('deleteCategory destroys record when found, returns false when missing', async () => {
      (CategoryModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteCategory(validUuid1, validUuid2);
      expect(deleted).toBe(true);

      (CategoryModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      const notDeleted = await repo.deleteCategory(validUuid1, validUuid2);
      expect(notDeleted).toBe(false);
    });

    it('updateCategorySubtreePath executes raw SQL update', async () => {
      await repo.updateCategorySubtreePath(validUuid1, 'old.path', 'new.path');
    });
  });

  describe('Product Operations', () => {
    it('findProductById with includeDetails', async () => {
      (ProductModelDef.findOne as jest.Mock).mockResolvedValue({ id: validUuid2, name: 'Phone' });
      const res = await repo.findProductById(validUuid1, validUuid2, true);
      expect(res).toEqual({ id: validUuid2, name: 'Phone' });

      const withoutOptions = await repo.findProductById(validUuid1, validUuid2, false);
      expect(withoutOptions).toEqual({ id: validUuid2, name: 'Phone' });
    });

    it('findProductBySlug returns record', async () => {
      (ProductModelDef.findOne as jest.Mock).mockResolvedValue({ id: validUuid1, slug: 'phone' });
      const res = await repo.findProductBySlug(validUuid1, 'phone');
      expect(res).toEqual({ id: validUuid1, slug: 'phone' });
    });

    it('findProductsByEcommerce with filters', async () => {
      (ProductModelDef.findAll as jest.Mock).mockResolvedValue([{ id: validUuid1 }]);
      const res = await repo.findProductsByEcommerce(validUuid1, {
        categoryId: validUuid2,
        status: 'ACTIVE' as never,
      });
      expect(res).toHaveLength(1);
    });

    it('createProduct creates record', async () => {
      (ProductModelDef.create as jest.Mock).mockResolvedValue({ id: validUuid1, name: 'Phone' });
      const res = await repo.createProduct(validUuid1, {
        name: 'Phone',
        slug: 'phone',
        price: 150,
      });
      expect(res).toEqual({ id: validUuid1, name: 'Phone' });
    });

    it('updateProduct updates when found, returns null when missing', async () => {
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (ProductModelDef.findOne as jest.Mock).mockResolvedValueOnce({
        id: validUuid2,
        ecommerceId: validUuid1,
        update: updateMock,
      });

      const res = await repo.updateProduct(validUuid1, validUuid2, { price: 99.99 });
      expect(res).toBeDefined();

      (ProductModelDef.findOne as jest.Mock).mockResolvedValueOnce(null);
      const missing = await repo.updateProduct(validUuid1, validUuid2, { price: 99.99 });
      expect(missing).toBeNull();
    });

    it('deleteProduct destroys product', async () => {
      // Mock cascade: findAll options -> destroy option values -> destroy variants -> destroy options -> destroy product
      (ProductOptionModelDef.findAll as jest.Mock).mockResolvedValueOnce([
        { id: 'opt-1' },
        { id: 'opt-2' },
      ]);
      (ProductOptionValueModelDef.destroy as jest.Mock).mockResolvedValueOnce(3);
      (ProductVariantModelDef.destroy as jest.Mock).mockResolvedValueOnce(2);
      (ProductOptionModelDef.destroy as jest.Mock).mockResolvedValueOnce(2);
      (ProductModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteProduct(validUuid1, validUuid2);
      expect(deleted).toBe(true);

      // Case: product not found (0 rows destroyed), no options
      (ProductOptionModelDef.findAll as jest.Mock).mockResolvedValueOnce([]);
      (ProductVariantModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      (ProductOptionModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      (ProductModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      const notDeleted = await repo.deleteProduct(validUuid1, validUuid2);
      expect(notDeleted).toBe(false);
    });
  });

  describe('Product Options & Option Values Operations', () => {
    it('findProductOptionById and findOptionsByProduct', async () => {
      (ProductOptionModelDef.findOne as jest.Mock).mockResolvedValue({
        id: validUuid2,
        name: 'Color',
      });
      (ProductOptionModelDef.findAll as jest.Mock).mockResolvedValue([
        { id: validUuid2, name: 'Color' },
      ]);

      const opt = await repo.findProductOptionById(validUuid1, validUuid2);
      expect(opt).toBeDefined();

      const opts = await repo.findOptionsByProduct(validUuid1);
      expect(opts).toHaveLength(1);
    });

    it('createProductOption and updateProductOption and deleteProductOption', async () => {
      (ProductOptionModelDef.create as jest.Mock).mockResolvedValue({
        id: validUuid1,
        name: 'Color',
      });
      const created = await repo.createProductOption(validUuid1, { name: 'Color' });
      expect(created).toBeDefined();

      const updateMock = jest.fn().mockResolvedValue(undefined);
      (ProductOptionModelDef.findByPk as jest.Mock).mockResolvedValueOnce({
        id: validUuid1,
        update: updateMock,
      });
      const updated = await repo.updateProductOption(validUuid1, { name: 'Colour' });
      expect(updated).toBeDefined();

      (ProductOptionModelDef.findByPk as jest.Mock).mockResolvedValueOnce(null);
      const updateMissing = await repo.updateProductOption(validUuid1, { name: 'Colour' });
      expect(updateMissing).toBeNull();

      (ProductOptionModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteProductOption(validUuid1);
      expect(deleted).toBe(true);

      (ProductOptionModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      const deleteMissing = await repo.deleteProductOption(validUuid1);
      expect(deleteMissing).toBe(false);
    });

    it('Option Value CRUD operations', async () => {
      (ProductOptionValueModelDef.create as jest.Mock).mockResolvedValue({
        id: validUuid1,
        value: 'Red',
      });
      (ProductOptionValueModelDef.findOne as jest.Mock).mockResolvedValue({
        id: validUuid2,
        value: 'Red',
      });
      (ProductOptionValueModelDef.findAll as jest.Mock).mockResolvedValue([
        { id: validUuid2, value: 'Red' },
      ]);

      const created = await repo.createProductOptionValue(validUuid1, { value: 'Red' });
      expect(created).toBeDefined();

      const found = await repo.findProductOptionValueById(validUuid1, validUuid2);
      expect(found).toBeDefined();

      const byIds = await repo.findOptionValuesByIds([validUuid1]);
      expect(byIds).toHaveLength(1);

      const updateMock = jest.fn().mockResolvedValue(undefined);
      (ProductOptionValueModelDef.findByPk as jest.Mock).mockResolvedValueOnce({
        id: validUuid1,
        update: updateMock,
      });
      const updated = await repo.updateProductOptionValue(validUuid1, { value: 'Crimson' });
      expect(updated).toBeDefined();

      (ProductOptionValueModelDef.findByPk as jest.Mock).mockResolvedValueOnce(null);
      const updateMissing = await repo.updateProductOptionValue(validUuid1, { value: 'Crimson' });
      expect(updateMissing).toBeNull();

      (ProductOptionValueModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteProductOptionValue(validUuid1);
      expect(deleted).toBe(true);

      (ProductOptionValueModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      const deleteMissing = await repo.deleteProductOptionValue(validUuid1);
      expect(deleteMissing).toBe(false);
    });
  });

  describe('Product Variant Operations', () => {
    it('findVariantById and findVariantBySku and findVariantsByProduct', async () => {
      (ProductVariantModelDef.findOne as jest.Mock).mockResolvedValue({
        id: validUuid2,
        sku: 'SKU1',
      });
      (ProductVariantModelDef.findAll as jest.Mock).mockResolvedValue([
        { id: validUuid2, sku: 'SKU1' },
      ]);

      const byId = await repo.findVariantById(validUuid1, validUuid2);
      expect(byId).toBeDefined();

      const bySku = await repo.findVariantBySku(validUuid1, 'SKU1');
      expect(bySku).toBeDefined();

      const byProd = await repo.findVariantsByProduct(validUuid1);
      expect(byProd).toHaveLength(1);
    });

    it('createProductVariant creates variant and joins option values', async () => {
      (ProductVariantModelDef.create as jest.Mock).mockResolvedValue({
        id: validUuid1,
        sku: 'SKU1',
      });
      (VariantOptionValueModelDef.bulkCreate as jest.Mock).mockResolvedValue([]);

      const variant = await repo.createProductVariant(validUuid1, {
        sku: 'SKU1',
        price: 99.99,
        optionValueIds: [validUuid2, validUuid3],
      });
      expect(variant).toBeDefined();
      expect(VariantOptionValueModelDef.bulkCreate).toHaveBeenCalled();
    });

    it('updateProductVariant and deleteProductVariant', async () => {
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (ProductVariantModelDef.findOne as jest.Mock).mockResolvedValueOnce({
        id: validUuid2,
        productId: validUuid1,
        update: updateMock,
      });

      const updated = await repo.updateProductVariant(validUuid1, validUuid2, {
        price: 19.99,
        optionValueIds: [validUuid3],
      });
      expect(updated).toBeDefined();
      expect(VariantOptionValueModelDef.destroy).toHaveBeenCalled();
      expect(VariantOptionValueModelDef.bulkCreate).toHaveBeenCalled();

      (ProductVariantModelDef.findOne as jest.Mock).mockResolvedValueOnce(null);
      const updateMissing = await repo.updateProductVariant(validUuid1, validUuid2, {
        price: 19.99,
      });
      expect(updateMissing).toBeNull();

      (ProductVariantModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteProductVariant(validUuid1, validUuid2);
      expect(deleted).toBe(true);

      (ProductVariantModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      const deleteMissing = await repo.deleteProductVariant(validUuid1, validUuid2);
      expect(deleteMissing).toBe(false);
    });
  });

  describe('Unit Reference Operations', () => {
    it('findAllUnits with or without category', async () => {
      (UnitModelDef.findAll as jest.Mock).mockResolvedValue([{ id: validUuid1, name: 'Liter' }]);
      const all = await repo.findAllUnits();
      expect(all).toHaveLength(1);

      const byCat = await repo.findAllUnits('Volume');
      expect(byCat).toHaveLength(1);
      expect(UnitModelDef.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'Volume' },
        }),
      );
    });

    it('findUnitById returns unit record', async () => {
      (UnitModelDef.findByPk as jest.Mock).mockResolvedValue({ id: validUuid1, name: 'Liter' });
      const unit = await repo.findUnitById(validUuid1);
      expect(unit).toBeDefined();
      expect(unit?.name).toBe('Liter');
    });
  });
  describe('Banner Operations', () => {
    it('creates, reads, lists, updates, and deletes banners', async () => {
      const mockBanner = {
        id: validUuid1,
        ecommerceId: validUuid1,
        title: 'Hero Banner',
        update: jest.fn().mockImplementation(function (this: any, vals: any) {
          Object.assign(this, vals);
          return Promise.resolve(this);
        }),
      };

      (BannerModelDef.create as jest.Mock).mockResolvedValueOnce(mockBanner);
      const created = await repo.createBanner(validUuid1, {
        title: 'Hero Banner',
        imageUrl: 'http://img.jpg',
      });
      expect(created).toBeDefined();

      (BannerModelDef.findOne as jest.Mock).mockResolvedValueOnce(mockBanner);
      const found = await repo.findBannerById(validUuid1, validUuid1);
      expect(found?.title).toBe('Hero Banner');

      (BannerModelDef.findAll as jest.Mock).mockResolvedValueOnce([mockBanner]);
      const list = await repo.findBannersByEcommerce(validUuid1);
      expect(list).toHaveLength(1);

      (BannerModelDef.findOne as jest.Mock).mockResolvedValueOnce(mockBanner);
      const updated = await repo.updateBanner(validUuid1, validUuid1, { title: 'Updated Banner' });
      expect(updated?.title).toBe('Updated Banner');

      (BannerModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteBanner(validUuid1, validUuid1);
      expect(deleted).toBe(true);

      (BannerModelDef.findOne as jest.Mock).mockResolvedValueOnce(null);
      expect(await repo.updateBanner(validUuid1, 'b-missing', { title: 'X' })).toBeNull();

      (BannerModelDef.destroy as jest.Mock).mockResolvedValueOnce(0);
      expect(await repo.deleteBanner(validUuid1, 'b-missing')).toBe(false);
    });
  });

  describe('Order Operations', () => {
    it('creates order, lists orders, finds order by id, and updates order status', async () => {
      const mockSeq = getSequelize();
      // createOrder: 1) INSERT query, 2) getOrderById query
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([]);
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([
        [{ id: 'ORD-123', ecommerce_id: validUuid1, total: 1000, status: 'PROCESSING' }],
      ]);

      const order = await repo.createOrder(validUuid1, {
        id: 'ORD-123',
        customerName: 'Bob',
        customerEmail: 'bob@example.com',
        itemsCount: 1,
        total: 1000,
        shippingAddress: {},
        items: [{ id: '1', quantity: 1, pricing: { effectivePrice: 1000 } }],
      });
      expect(order?.id).toBe('ORD-123');

      // listOrders: returns [records]
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([[{ id: 'ORD-123', total: 1000 }]]);
      const orders = await repo.listOrders(validUuid1);
      expect(orders).toHaveLength(1);

      // getOrderById: returns [records]
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([[{ id: 'ORD-123', total: 1000 }]]);
      const found = await repo.getOrderById(validUuid1, 'ORD-123');
      expect(found?.id).toBe('ORD-123');

      // updateOrderStatus: 1) UPDATE query, 2) getOrderById query
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([]);
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([
        [{ id: 'ORD-123', status: 'DELIVERED' }],
      ]);
      const updated = await repo.updateOrderStatus(validUuid1, 'ORD-123', 'DELIVERED');
      expect(updated?.status).toBe('DELIVERED');
    });
  });

  describe('Coupon Operations', () => {
    it('creates, finds by code/id, updates, and deletes coupons', async () => {
      const mockCoupon = {
        id: validUuid1,
        ecommerceId: validUuid1,
        code: 'SAVE20',
        name: 'Save 20',
        update: jest.fn().mockImplementation(function (this: any, vals: any) {
          Object.assign(this, vals);
          return Promise.resolve(this);
        }),
      };

      (CouponModelDef.create as jest.Mock).mockResolvedValueOnce(mockCoupon);
      const created = await repo.createCoupon(validUuid1, {
        code: 'SAVE20',
        name: 'Save 20',
        discountType: 'PERCENTAGE' as any,
        discountValue: 20,
        targetType: 'ALL_PRODUCTS' as any,
      });
      expect(created).toBeDefined();

      (CouponModelDef.findOne as jest.Mock).mockResolvedValueOnce(mockCoupon);
      const foundByCode = await repo.getCouponByCode(validUuid1, 'save20');
      expect(foundByCode?.code).toBe('SAVE20');

      (CouponModelDef.findOne as jest.Mock).mockResolvedValueOnce(mockCoupon);
      const foundById = await repo.getCouponById(validUuid1, validUuid1);
      expect(foundById?.id).toBe(validUuid1);

      (CouponModelDef.findOne as jest.Mock).mockResolvedValueOnce(mockCoupon);
      const updated = await repo.updateCoupon(validUuid1, validUuid1, { name: 'Save 20 Updated' });
      expect(updated?.name).toBe('Save 20 Updated');

      (CouponModelDef.destroy as jest.Mock).mockResolvedValueOnce(1);
      const deleted = await repo.deleteCoupon(validUuid1, validUuid1);
      expect(deleted).toBe(true);

      (CouponModelDef.findAll as jest.Mock).mockResolvedValueOnce([mockCoupon]);
      const list = await repo.listCoupons(validUuid1, { search: 'SAVE', isActive: true });
      expect(list).toHaveLength(1);
    });

    it('records coupon usage, checks limits and counts customer orders', async () => {
      (CouponUsageModelDef.create as jest.Mock).mockResolvedValueOnce({ id: validUuid1 });
      const mockSeq = getSequelize();
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([]);
      await repo.recordCouponUsage(validUuid1, {
        couponId: validUuid2,
        orderId: 'ORD-123',
        customerEmail: 'cust@example.com',
        discountAmount: 200,
      });
      expect(CouponUsageModelDef.create).toHaveBeenCalled();
      expect(mockSeq.query).toHaveBeenCalled();

      (CouponUsageModelDef.count as jest.Mock).mockResolvedValueOnce(2);
      const userCount = await repo.getCustomerCouponUsageCount(
        validUuid1,
        validUuid2,
        'cust@example.com',
      );
      expect(userCount).toBe(2);

      (mockSeq.query as jest.Mock).mockResolvedValueOnce([{ count: '3' }]);
      const orderCount = await repo.getCustomerOrderCount(validUuid1, 'cust@example.com');
      expect(orderCount).toBe(3);

      (mockSeq.query as jest.Mock).mockResolvedValueOnce([
        { id: 'cat-child' },
        { id: 'cat-grandchild' },
      ]);
      const descCatIds = await repo.getDescendantCategoryIds(validUuid1, 'cat-root');
      expect(descCatIds).toHaveLength(2);
    });
  });

  describe('Customer Directory Query', () => {
    it('aggregates customers from user accounts and order records', async () => {
      const mockSeq = getSequelize();
      (mockSeq.query as jest.Mock).mockResolvedValueOnce([
        {
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '123',
          totalOrders: '2',
          totalSpent: '1500.00',
          firstOrderDate: '2026-01-01',
          lastOrderDate: '2026-08-01',
        },
      ]);

      const customers = await repo.listCustomers(validUuid1);
      expect(customers).toHaveLength(1);
      expect(customers[0]?.name).toBe('John Doe');
      expect(customers[0]?.totalOrders).toBe(2);
      expect(customers[0]?.totalSpent).toBe(1500);
    });
  });
});
