import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';
import { CatalogService, sanitizeForLtree } from '../catalog.service';
import { VariantStatus } from '../models';

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
      transaction: jest.fn(async (cb?: (t: unknown) => Promise<unknown>) => {
        const t = { commit: jest.fn(), rollback: jest.fn() };
        return cb ? cb(t) : t;
      }),
      query: jest.fn().mockResolvedValue([[]]),
      define: jest.fn(() => modelDef),
    })),
  };
});

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbQueryDuration: {
    startTimer: jest.fn(() => jest.fn()),
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

describe('CatalogService', () => {
  let service: CatalogService;
  let mockRepo: {
    findEcommerceById: jest.Mock;
    findEcommerceBySlug: jest.Mock;
    findAllEcommerce: jest.Mock;
    createEcommerce: jest.Mock;
    updateEcommerce: jest.Mock;
    findCategoryById: jest.Mock;
    findCategoryBySlug: jest.Mock;
    findCategoriesByEcommerce: jest.Mock;
    createCategory: jest.Mock;
    updateCategory: jest.Mock;
    updateCategorySubtreePath: jest.Mock;
    deleteCategory: jest.Mock;
    findProductById: jest.Mock;
    findProductBySlug: jest.Mock;
    findProductsByEcommerce: jest.Mock;
    createProduct: jest.Mock;
    updateProduct: jest.Mock;
    deleteProduct: jest.Mock;
    createProductOption: jest.Mock;
    findOptionsByProduct: jest.Mock;
    findProductOptionById: jest.Mock;
    updateProductOption: jest.Mock;
    deleteProductOption: jest.Mock;
    createProductOptionValue: jest.Mock;
    findProductOptionValueById: jest.Mock;
    findOptionValuesByIds: jest.Mock;
    updateProductOptionValue: jest.Mock;
    deleteProductOptionValue: jest.Mock;
    createProductVariant: jest.Mock;
    findVariantsByProduct: jest.Mock;
    findVariantById: jest.Mock;
    findVariantBySku: jest.Mock;
    updateProductVariant: jest.Mock;
    deleteProductVariant: jest.Mock;
    findAllUnits: jest.Mock;
    findUnitById: jest.Mock;

    createBanner: jest.Mock;
    findBannerById: jest.Mock;
    findBannersByEcommerce: jest.Mock;
    updateBanner: jest.Mock;
    deleteBanner: jest.Mock;
    createOrder: jest.Mock;
    listOrders: jest.Mock;
    getOrderById: jest.Mock;
    updateOrderStatus: jest.Mock;
    createCoupon: jest.Mock;
    findCouponById: jest.Mock;
    getCouponById: jest.Mock;
    getCouponByCode: jest.Mock;
    updateCoupon: jest.Mock;
    deleteCoupon: jest.Mock;
    listCoupons: jest.Mock;
    listCustomers: jest.Mock;
    recordCouponUsage: jest.Mock;
    getCustomerOrderCount: jest.Mock;
    getCustomerCouponUsageCount: jest.Mock;
    getDescendantCategoryIds: jest.Mock;
  };

  const ecommerceId = 'ecom-111';
  const categoryId = 'cat-111';
  const productId = 'prod-111';
  const unitLiterId = 'unit-liter-1';

  beforeEach(() => {
    service = new CatalogService();
    mockRepo = {
      findEcommerceById: jest.fn(),
      findEcommerceBySlug: jest.fn(),
      findAllEcommerce: jest.fn(),
      createEcommerce: jest.fn(),
      updateEcommerce: jest.fn(),
      findCategoryById: jest.fn(),
      findCategoryBySlug: jest.fn(),
      findCategoriesByEcommerce: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      updateCategorySubtreePath: jest.fn(),
      deleteCategory: jest.fn(),
      findProductById: jest.fn(),
      findProductBySlug: jest.fn(),
      findProductsByEcommerce: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      createProductOption: jest.fn(),
      findOptionsByProduct: jest.fn(),
      findProductOptionById: jest.fn(),
      updateProductOption: jest.fn(),
      deleteProductOption: jest.fn(),
      createProductOptionValue: jest.fn(),
      findProductOptionValueById: jest.fn(),
      findOptionValuesByIds: jest.fn(),
      updateProductOptionValue: jest.fn(),
      deleteProductOptionValue: jest.fn(),
      createProductVariant: jest.fn(),
      findVariantsByProduct: jest.fn(),
      findVariantById: jest.fn(),
      findVariantBySku: jest.fn(),
      updateProductVariant: jest.fn(),
      deleteProductVariant: jest.fn(),
      findAllUnits: jest.fn(),
      findUnitById: jest.fn(),

      createBanner: jest.fn(),
      findBannerById: jest.fn(),
      findBannersByEcommerce: jest.fn(),
      updateBanner: jest.fn(),
      deleteBanner: jest.fn(),
      createOrder: jest.fn(),
      listOrders: jest.fn(),
      getOrderById: jest.fn(),
      updateOrderStatus: jest.fn(),
      createCoupon: jest.fn(),
      findCouponById: jest.fn(),
      getCouponById: jest.fn(),
      getCouponByCode: jest.fn(),
      updateCoupon: jest.fn(),
      deleteCoupon: jest.fn(),
      listCoupons: jest.fn(),
      listCustomers: jest.fn(),
      recordCouponUsage: jest.fn(),
      getCustomerOrderCount: jest.fn(),
      getCustomerCouponUsageCount: jest.fn(),
      getDescendantCategoryIds: jest.fn(),
    };

    // Inject mock repository
    (service as unknown as { repo: typeof mockRepo }).repo = mockRepo;
  });

  describe('sanitizeForLtree', () => {
    it('replaces non-alphanumeric characters with underscores', () => {
      expect(sanitizeForLtree('smart-phones')).toBe('smart_phones');
      expect(sanitizeForLtree('mens & womens')).toBe('mens___womens');
      expect(sanitizeForLtree('')).toBe('item');
    });
  });

  describe('Ecommerce Management', () => {
    it('creates ecommerce store when slug is unique', async () => {
      mockRepo.findEcommerceBySlug.mockResolvedValue(null);
      mockRepo.createEcommerce.mockResolvedValue({ id: 'ecom-1', name: 'Store', slug: 'store' });

      const result = await service.createEcommerce({ name: 'Store', slug: 'store' });
      expect(result.id).toBe('ecom-1');
      expect(mockRepo.createEcommerce).toHaveBeenCalledWith({ name: 'Store', slug: 'store' });
    });

    it('throws ConflictError when slug already exists', async () => {
      mockRepo.findEcommerceBySlug.mockResolvedValue({ id: 'ecom-existing' });

      await expect(service.createEcommerce({ name: 'Store', slug: 'store' })).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe('Category Management & LTREE Subtree Safety', () => {
    it('creates root category with correct single-segment path', async () => {
      mockRepo.findCategoryBySlug.mockResolvedValue(null);
      mockRepo.createCategory.mockResolvedValue({
        id: categoryId,
        ecommerceId,
        slug: 'electronics',
        path: 'electronics',
      });

      const result = await service.createCategory(ecommerceId, {
        name: 'Electronics',
        slug: 'electronics',
      });

      expect(mockRepo.createCategory).toHaveBeenCalledWith(
        ecommerceId,
        expect.objectContaining({ path: 'electronics' }),
      );
      expect(result.path).toBe('electronics');
    });

    it('creates nested child category concatenating parent LTREE path', async () => {
      mockRepo.findCategoryBySlug.mockResolvedValue(null);
      mockRepo.findCategoryById.mockResolvedValue({
        id: 'parent-cat',
        ecommerceId,
        path: 'electronics',
      });
      mockRepo.createCategory.mockResolvedValue({
        id: 'child-cat',
        ecommerceId,
        parentId: 'parent-cat',
        slug: 'mobiles',
        path: 'electronics.mobiles',
      });

      const result = await service.createCategory(ecommerceId, {
        name: 'Mobiles',
        slug: 'mobiles',
        parentId: 'parent-cat',
      });

      expect(mockRepo.createCategory).toHaveBeenCalledWith(
        ecommerceId,
        expect.objectContaining({ path: 'electronics.mobiles', parentId: 'parent-cat' }),
      );
      expect(result.path).toBe('electronics.mobiles');
    });

    it('rejects moving a category to be its own parent (Rule 2)', async () => {
      mockRepo.findCategoryById.mockResolvedValue({
        id: categoryId,
        ecommerceId,
        parentId: null,
        slug: 'mobiles',
        path: 'mobiles',
      });

      await expect(
        service.updateCategory(ecommerceId, categoryId, { parentId: categoryId }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects moving a category under one of its own descendants (Rule 3)', async () => {
      mockRepo.findCategoryById
        .mockResolvedValueOnce({
          id: 'cat-root',
          ecommerceId,
          parentId: null,
          slug: 'electronics',
          path: 'electronics',
        })
        .mockResolvedValueOnce({
          id: 'cat-grandchild',
          ecommerceId,
          parentId: 'cat-child',
          slug: 'android',
          path: 'electronics.mobiles.android',
        });

      await expect(
        service.updateCategory(ecommerceId, 'cat-root', { parentId: 'cat-grandchild' }),
      ).rejects.toThrow('Cannot move a category under one of its own descendants');
    });

    it('updates category and atomically updates descendant subtree path (Rule 4 & 5)', async () => {
      mockRepo.findCategoryById
        .mockResolvedValueOnce({
          id: 'cat-mobiles',
          ecommerceId,
          parentId: 'cat-electronics',
          slug: 'mobiles',
          path: 'electronics.mobiles',
        })
        .mockResolvedValueOnce({
          id: 'cat-gadgets',
          ecommerceId,
          parentId: null,
          slug: 'gadgets',
          path: 'gadgets',
        });

      mockRepo.updateCategory.mockResolvedValue({
        id: 'cat-mobiles',
        path: 'gadgets.mobiles',
      });

      await service.updateCategory(ecommerceId, 'cat-mobiles', { parentId: 'cat-gadgets' });

      expect(mockRepo.updateCategorySubtreePath).toHaveBeenCalledWith(
        ecommerceId,
        'electronics.mobiles',
        'gadgets.mobiles',
        expect.anything(),
      );
    });
  });

  describe('Product Management & Quantity Invariants', () => {
    it('creates product without variants using direct product quantity', async () => {
      mockRepo.findProductBySlug.mockResolvedValue(null);
      mockRepo.createProduct.mockResolvedValue({
        id: productId,
        ecommerceId,
        name: 'Apple',
        price: 200,
        quantity: 50,
        hasVariants: false,
      });

      const result = await service.createProduct(ecommerceId, {
        name: 'Apple',
        slug: 'apple',
        price: 200,
        quantity: 50,
        hasVariants: false,
      });

      expect(mockRepo.createProduct).toHaveBeenCalledWith(
        ecommerceId,
        expect.objectContaining({ price: 200, quantity: 50, hasVariants: false }),
      );
      expect(result.quantity).toBe(50);
    });

    it('initializes base quantity to 0 when hasVariants = true', async () => {
      mockRepo.findProductBySlug.mockResolvedValue(null);
      mockRepo.createProduct.mockResolvedValue({
        id: productId,
        ecommerceId,
        name: 'T-Shirt',
        hasVariants: true,
        quantity: 0,
      });

      await service.createProduct(ecommerceId, {
        name: 'T-Shirt',
        slug: 't-shirt',
        price: 500,
        quantity: 999, // Should be overridden to 0 because hasVariants = true
        hasVariants: true,
      });

      expect(mockRepo.createProduct).toHaveBeenCalledWith(
        ecommerceId,
        expect.objectContaining({ quantity: 0, hasVariants: true }),
      );
    });

    it('rejects direct quantity update on products with variants', async () => {
      mockRepo.findProductById.mockResolvedValue({
        id: productId,
        ecommerceId,
        hasVariants: true,
        quantity: 0,
      });

      await expect(
        service.updateProduct(ecommerceId, productId, { quantity: 100 }),
      ).rejects.toThrow(
        'Cannot directly set product quantity for products with variants. Manage variant quantities instead.',
      );
    });

    it('dynamically computes quantity on read from active variants for variant products', async () => {
      mockRepo.findProductById.mockResolvedValue({
        id: productId,
        ecommerceId,
        hasVariants: true,
        quantity: 0,
        variants: [
          { sku: 'TSH-B-S', quantity: 20, status: VariantStatus.ACTIVE },
          { sku: 'TSH-B-M', quantity: 15, status: VariantStatus.ACTIVE },
          { sku: 'TSH-W-L', quantity: 10, status: VariantStatus.INACTIVE }, // Inactive not counted
        ],
        toJSON() {
          return {
            id: productId,
            hasVariants: true,
            quantity: 0,
            variants: this.variants,
          };
        },
      });

      const result = await service.getProduct(ecommerceId, productId);
      expect(result.computedQuantity).toBe(35); // 20 + 15
    });
  });

  describe('Product Options & Shared Units', () => {
    it('creates unit-bearing option (e.g. Volume with Liter unit)', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findOptionsByProduct.mockResolvedValue([]);
      mockRepo.findUnitById.mockResolvedValue({
        id: unitLiterId,
        name: 'Liter',
        symbol: 'L',
        category: 'Volume',
      });
      mockRepo.createProductOption.mockResolvedValue({
        id: 'opt-vol',
        productId,
        name: 'Volume',
        displayOrder: 0,
      });

      const result = await service.createProductOption(ecommerceId, productId, {
        name: 'Volume',
      });

      expect(result.name).toBe('Volume');
    });

    it('creates unit-less option value (e.g. Color with unitId = null)', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValue({
        id: 'opt-col',
        productId,
        name: 'Color',
        values: [],
      });
      mockRepo.createProductOptionValue.mockResolvedValue({
        id: 'val-black',
        productOptionId: 'opt-col',
        value: 'Black',
        unitId: null,
        displayOrder: 0,
      });

      const result = await service.createProductOptionValue(ecommerceId, productId, 'opt-col', {
        value: 'Black',
        unitId: null,
      });

      expect(mockRepo.findUnitById).not.toHaveBeenCalled();
      expect(result.unitId).toBeNull();
    });

    it('rejects option value creation when referenced unitId does not exist', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValue({
        id: 'opt-vol',
        productId,
        name: 'Volume',
        values: [],
      });
      mockRepo.findUnitById.mockResolvedValue(null);

      await expect(
        service.createProductOptionValue(ecommerceId, productId, 'opt-vol', {
          value: '250',
          unitId: 'non-existent-unit',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('updates option value unit successfully when unitId is valid', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValue({
        id: 'opt-vol',
        productId,
        name: 'Volume',
        values: [],
      });
      mockRepo.findProductOptionValueById.mockResolvedValue({
        id: 'val-1',
        productOptionId: 'opt-vol',
        value: '250',
        unitId: null,
      });
      mockRepo.findUnitById.mockResolvedValue({
        id: unitLiterId,
        name: 'Liter',
        symbol: 'L',
      });
      mockRepo.updateProductOptionValue.mockResolvedValue({
        id: 'val-1',
        productOptionId: 'opt-vol',
        value: '250',
        unitId: unitLiterId,
      });

      const updated = await service.updateProductOptionValue(
        ecommerceId,
        productId,
        'opt-vol',
        'val-1',
        {
          unitId: unitLiterId,
        },
      );

      expect(mockRepo.findUnitById).toHaveBeenCalledWith(unitLiterId);
      expect(updated.unitId).toBe(unitLiterId);
    });

    it('rejects option value update when target unitId does not exist', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValue({
        id: 'val-1',
        productOptionId: 'opt-vol',
        value: '250',
      });
      mockRepo.findUnitById.mockResolvedValue(null);

      await expect(
        service.updateProductOptionValue(ecommerceId, productId, 'opt-vol', 'val-1', {
          unitId: 'invalid-unit-id',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Shared Reference Units Querying', () => {
    it('lists all units', async () => {
      const mockUnits = [
        { id: '1', name: 'Liter', symbol: 'L', category: 'Volume' },
        { id: '2', name: 'Kilogram', symbol: 'kg', category: 'Weight' },
      ];
      mockRepo.findAllUnits.mockResolvedValue(mockUnits);

      const result = await service.listUnits();
      expect(result).toHaveLength(2);
      expect(mockRepo.findAllUnits).toHaveBeenCalledWith(undefined);
    });

    it('filters units by category', async () => {
      const mockUnits = [{ id: '1', name: 'Liter', symbol: 'L', category: 'Volume' }];
      mockRepo.findAllUnits.mockResolvedValue(mockUnits);

      const result = await service.listUnits('Volume');
      expect(result).toHaveLength(1);
      expect(mockRepo.findAllUnits).toHaveBeenCalledWith('Volume');
    });

    it('gets unit by id', async () => {
      const mockUnit = { id: '1', name: 'Liter', symbol: 'L', category: 'Volume' };
      mockRepo.findUnitById.mockResolvedValue(mockUnit);

      const result = await service.getUnit('1');
      expect(result.name).toBe('Liter');
    });

    it('throws NotFoundError when getting non-existent unit', async () => {
      mockRepo.findUnitById.mockResolvedValue(null);
      await expect(service.getUnit('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Dynamic Generic Variants & Duplicate Combinations', () => {
    const optColorId = 'opt-color';
    const optSizeId = 'opt-size';
    const valBlackId = 'val-black';
    const valWhiteId = 'val-white';
    const valMediumId = 'val-m';

    it('creates variant and associates option values', async () => {
      mockRepo.findProductById.mockResolvedValue({
        id: productId,
        ecommerceId,
        hasVariants: true,
        update: jest.fn(),
      });
      mockRepo.findVariantBySku.mockResolvedValue(null);
      mockRepo.findOptionValuesByIds.mockResolvedValue([
        { id: valBlackId, productOptionId: optColorId, value: 'Black' },
        { id: valMediumId, productOptionId: optSizeId, value: 'M' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValue([
        { id: optColorId, name: 'Color' },
        { id: optSizeId, name: 'Size' },
      ]);
      mockRepo.findVariantsByProduct.mockResolvedValue([]);
      mockRepo.createProductVariant.mockResolvedValue({
        id: 'var-1',
        sku: 'TSH-BLK-M',
        price: 999,
        quantity: 15,
        status: VariantStatus.ACTIVE,
      });

      const result = await service.createVariant(ecommerceId, productId, {
        sku: 'TSH-BLK-M',
        price: 999,
        quantity: 15,
        optionValueIds: [valBlackId, valMediumId],
      });

      expect(result.sku).toBe('TSH-BLK-M');
      expect(mockRepo.createProductVariant).toHaveBeenCalled();
    });

    it('creates variants for unit-bearing products (e.g. Floor Cleaner: Volume 0.5, 1, 2)', async () => {
      const optVolumeId = 'opt-volume';
      const val05Id = 'val-05';

      mockRepo.findProductById.mockResolvedValue({
        id: productId,
        ecommerceId,
        hasVariants: true,
        update: jest.fn(),
      });
      mockRepo.findVariantBySku.mockResolvedValue(null);
      mockRepo.findOptionValuesByIds.mockResolvedValue([
        { id: val05Id, productOptionId: optVolumeId, value: '0.5' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValue([
        { id: optVolumeId, name: 'Volume', unitId: unitLiterId },
      ]);
      mockRepo.findVariantsByProduct.mockResolvedValue([]);
      mockRepo.createProductVariant.mockResolvedValue({
        id: 'var-fc-05',
        sku: 'FC-05L',
        price: 4.99,
        quantity: 100,
        status: VariantStatus.ACTIVE,
      });

      const result = await service.createVariant(ecommerceId, productId, {
        sku: 'FC-05L',
        price: 4.99,
        quantity: 100,
        optionValueIds: [val05Id],
      });

      expect(result.sku).toBe('FC-05L');
      expect(mockRepo.createProductVariant).toHaveBeenCalled();
    });

    it('rejects variant containing multiple values for the same option', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId, hasVariants: true });
      mockRepo.findVariantBySku.mockResolvedValue(null);
      mockRepo.findOptionValuesByIds.mockResolvedValue([
        { id: valBlackId, productOptionId: optColorId, value: 'Black' },
        { id: valWhiteId, productOptionId: optColorId, value: 'White' }, // Same option!
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValue([{ id: optColorId, name: 'Color' }]);

      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'TSH-INVALID',
          price: 999,
          quantity: 10,
          optionValueIds: [valBlackId, valWhiteId],
        }),
      ).rejects.toThrow('A variant cannot contain multiple values for the same option');
    });

    it('rejects duplicate variant combination for the same product', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId, hasVariants: true });
      mockRepo.findVariantBySku.mockResolvedValue(null);
      mockRepo.findOptionValuesByIds.mockResolvedValue([
        { id: valBlackId, productOptionId: optColorId, value: 'Black' },
        { id: valMediumId, productOptionId: optSizeId, value: 'M' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValue([
        { id: optColorId, name: 'Color' },
        { id: optSizeId, name: 'Size' },
      ]);
      mockRepo.findVariantsByProduct.mockResolvedValue([
        {
          id: 'existing-var',
          sku: 'TSH-EXISTING',
          optionValues: [{ id: valBlackId }, { id: valMediumId }],
        },
      ]);

      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'TSH-DUPLICATE',
          price: 999,
          quantity: 10,
          optionValueIds: [valMediumId, valBlackId], // Same combination in different order
        }),
      ).rejects.toThrow('A variant with this exact combination of option values already exists');
    });

    it('rejects duplicate SKU for the same product', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId, hasVariants: true });
      mockRepo.findVariantBySku.mockResolvedValue({ id: 'existing-sku-var' });

      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'TSH-BLK-M',
          price: 999,
          quantity: 10,
          optionValueIds: [valBlackId],
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('listVariants, getVariant, updateVariant, and deleteVariant', async () => {
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId, hasVariants: true });
      mockRepo.findVariantsByProduct.mockResolvedValue([{ id: 'var-1' }]);
      const list = await service.listVariants(ecommerceId, productId);
      expect(list).toHaveLength(1);

      mockRepo.findVariantById.mockResolvedValueOnce({ id: 'var-1', productId });
      const found = await service.getVariant(ecommerceId, productId, 'var-1');
      expect(found.id).toBe('var-1');

      mockRepo.findVariantById.mockResolvedValueOnce(null);
      await expect(service.getVariant(ecommerceId, productId, 'var-2')).rejects.toThrow(
        NotFoundError,
      );

      mockRepo.findVariantById.mockResolvedValueOnce({ id: 'var-1', productId });
      mockRepo.updateProductVariant.mockResolvedValue({ id: 'var-1', price: 99 });
      const updated = await service.updateVariant(ecommerceId, productId, 'var-1', { price: 99 });
      expect(updated.price).toBe(99);

      mockRepo.findVariantById.mockResolvedValueOnce({ id: 'var-1', productId });
      mockRepo.deleteProductVariant.mockResolvedValue(true);
      await service.deleteVariant(ecommerceId, productId, 'var-1');
      expect(mockRepo.deleteProductVariant).toHaveBeenCalled();
    });
  });

  describe('Ecommerce & Category Management Edge Cases', () => {
    it('listEcommerce and getEcommerce', async () => {
      mockRepo.findAllEcommerce.mockResolvedValue([{ id: ecommerceId }]);
      const list = await service.listEcommerce();
      expect(list).toHaveLength(1);

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      const ecom = await service.getEcommerce(ecommerceId);
      expect(ecom.id).toBe(ecommerceId);

      mockRepo.findEcommerceById.mockResolvedValueOnce(null);
      await expect(service.getEcommerce('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('createEcommerce and updateEcommerce with slug conflicts', async () => {
      mockRepo.findEcommerceBySlug.mockResolvedValueOnce({ id: 'other-ecom' });
      await expect(service.createEcommerce({ name: 'Store', slug: 'store' })).rejects.toThrow(
        ConflictError,
      );

      mockRepo.findEcommerceBySlug.mockResolvedValueOnce({ id: 'other-ecom' });
      await expect(service.updateEcommerce(ecommerceId, { slug: 'store' })).rejects.toThrow(
        ConflictError,
      );

      mockRepo.findEcommerceBySlug.mockResolvedValueOnce(null);
      mockRepo.updateEcommerce.mockResolvedValueOnce({ id: ecommerceId, name: 'Store Updated' });
      const updated = await service.updateEcommerce(ecommerceId, { name: 'Store Updated' });
      expect(updated.name).toBe('Store Updated');

      mockRepo.findEcommerceBySlug.mockResolvedValueOnce(null);
      mockRepo.updateEcommerce.mockResolvedValueOnce(null);
      await expect(service.updateEcommerce(ecommerceId, { name: 'Missing' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('listCategories, getCategory, and deleteCategory', async () => {
      mockRepo.findCategoriesByEcommerce.mockResolvedValue([{ id: categoryId }]);
      const list = await service.listCategories(ecommerceId, true);
      expect(list).toHaveLength(1);

      mockRepo.findCategoryById.mockResolvedValueOnce({ id: categoryId });
      const cat = await service.getCategory(ecommerceId, categoryId);
      expect(cat.id).toBe(categoryId);

      mockRepo.findCategoryById.mockResolvedValueOnce(null);
      await expect(service.getCategory(ecommerceId, 'missing-cat')).rejects.toThrow(NotFoundError);

      mockRepo.findCategoryById.mockResolvedValueOnce({ id: categoryId });
      mockRepo.deleteCategory.mockResolvedValue(true);
      await service.deleteCategory(ecommerceId, categoryId);
      expect(mockRepo.deleteCategory).toHaveBeenCalled();
    });

    it('updateCategory enforces slug conflict, self-parent, cycle, and subtree rewrite', async () => {
      const cat = { id: categoryId, ecommerceId, slug: 'apparel', path: 'apparel', parentId: null };

      // Slug conflict
      mockRepo.findCategoryById.mockResolvedValueOnce(cat);
      mockRepo.findCategoryBySlug.mockResolvedValueOnce({ id: 'other-cat' });
      await expect(
        service.updateCategory(ecommerceId, categoryId, { slug: 'shoes' }),
      ).rejects.toThrow(ConflictError);

      // Self parent
      mockRepo.findCategoryById.mockResolvedValueOnce(cat);
      await expect(
        service.updateCategory(ecommerceId, categoryId, { parentId: categoryId }),
      ).rejects.toThrow('A category cannot be its own parent');

      // Target parent missing
      mockRepo.findCategoryById.mockResolvedValueOnce(cat);
      mockRepo.findCategoryById.mockResolvedValueOnce(null);
      await expect(
        service.updateCategory(ecommerceId, categoryId, { parentId: 'missing-parent' }),
      ).rejects.toThrow('Target parent category');

      // Target parent is descendant (cycle prevention)
      mockRepo.findCategoryById.mockResolvedValueOnce(cat);
      mockRepo.findCategoryById.mockResolvedValueOnce({
        id: 'desc-cat',
        path: 'apparel.shoes.sneakers',
      });
      await expect(
        service.updateCategory(ecommerceId, categoryId, { parentId: 'desc-cat' }),
      ).rejects.toThrow('Cannot move a category under one of its own descendants');

      // Valid update with subtree rewrite
      mockRepo.findCategoryById.mockResolvedValueOnce(cat);
      mockRepo.findCategoryById.mockResolvedValueOnce({ id: 'new-parent', path: 'fashion' });
      mockRepo.updateCategory.mockResolvedValue({ id: categoryId, path: 'fashion.apparel' });
      const res = await service.updateCategory(ecommerceId, categoryId, { parentId: 'new-parent' });
      expect(res.path).toBe('fashion.apparel');
      expect(mockRepo.updateCategorySubtreePath).toHaveBeenCalled();
    });
  });

  describe('Product, Options, and Option Values Edge Cases', () => {
    it('listProducts computes dynamic quantity for variant products', async () => {
      mockRepo.findProductsByEcommerce.mockResolvedValue([
        {
          id: 'p1',
          hasVariants: true,
          quantity: 0,
          variants: [
            { quantity: 10, status: VariantStatus.ACTIVE },
            { quantity: 5, status: VariantStatus.ACTIVE },
            { quantity: 20, status: VariantStatus.INACTIVE }, // Inactive variant excluded
          ],
          toJSON: () => ({ id: 'p1', hasVariants: true, quantity: 0 }),
        },
        {
          id: 'p2',
          hasVariants: false,
          quantity: 15,
          toJSON: () => ({ id: 'p2', hasVariants: false, quantity: 15 }),
        },
      ]);

      const products = await service.listProducts(ecommerceId);
      expect(products[0]?.computedQuantity).toBe(15);
      expect(products[1]?.computedQuantity).toBe(15);
    });

    it('updateProduct rejects direct quantity updates when product has variants', async () => {
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        hasVariants: true,
      });
      await expect(service.updateProduct(ecommerceId, productId, { quantity: 50 })).rejects.toThrow(
        'Cannot directly set product quantity for products with variants',
      );

      // Product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.updateProduct(ecommerceId, productId, { price: 20 })).rejects.toThrow(
        NotFoundError,
      );

      // Slug conflict
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        slug: 'p1',
        hasVariants: false,
      });
      mockRepo.findProductBySlug.mockResolvedValueOnce({ id: 'other-prod' });
      await expect(service.updateProduct(ecommerceId, productId, { slug: 'p2' })).rejects.toThrow(
        ConflictError,
      );

      // Valid update
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        slug: 'p1',
        hasVariants: false,
      });
      mockRepo.updateProduct.mockResolvedValueOnce({ id: productId, price: 29.99 });
      const updated = await service.updateProduct(ecommerceId, productId, { price: 29.99 });
      expect(updated.price).toBe(29.99);
    });

    it('deleteProduct deletes product', async () => {
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.deleteProduct.mockResolvedValue(true);
      await service.deleteProduct(ecommerceId, productId);
      expect(mockRepo.deleteProduct).toHaveBeenCalled();

      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.deleteProduct(ecommerceId, 'missing')).rejects.toThrow(NotFoundError);
    });

    it('Option Values CRUD operations in service', async () => {
      const optColorId = 'opt-color-123';
      mockRepo.findProductById.mockResolvedValue({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValue({
        id: optColorId,
        productId,
        values: [{ id: 'v1', value: 'Red' }],
      });

      // Product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.createProductOptionValue(ecommerceId, productId, optColorId, { value: 'Blue' }),
      ).rejects.toThrow(NotFoundError);

      // Option missing
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValueOnce(null);
      await expect(
        service.createProductOptionValue(ecommerceId, productId, optColorId, { value: 'Blue' }),
      ).rejects.toThrow(NotFoundError);

      // Duplicate option value
      await expect(
        service.createProductOptionValue(ecommerceId, productId, optColorId, { value: 'Red' }),
      ).rejects.toThrow(ConflictError);

      // Unit missing on option value creation
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionById.mockResolvedValueOnce({
        id: optColorId,
        productId,
        values: [],
      });
      mockRepo.findUnitById.mockResolvedValueOnce(null);
      await expect(
        service.createProductOptionValue(ecommerceId, productId, optColorId, {
          value: 'Blue',
          unitId: 'invalid-unit',
        }),
      ).rejects.toThrow(NotFoundError);

      // Valid option value creation
      mockRepo.createProductOptionValue.mockResolvedValue({ id: 'v2', value: 'Blue' });
      const created = await service.createProductOptionValue(ecommerceId, productId, optColorId, {
        value: 'Blue',
      });
      expect(created.value).toBe('Blue');

      // Update option value - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.updateProductOptionValue(ecommerceId, productId, optColorId, 'v2', {
          value: 'Navy',
        }),
      ).rejects.toThrow(NotFoundError);

      // Update option value - value missing
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValueOnce(null);
      await expect(
        service.updateProductOptionValue(ecommerceId, productId, optColorId, 'v2', {
          value: 'Navy',
        }),
      ).rejects.toThrow(NotFoundError);

      // Update option value - unit missing
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValueOnce({ id: 'v2', value: 'Blue' });
      mockRepo.findUnitById.mockResolvedValueOnce(null);
      await expect(
        service.updateProductOptionValue(ecommerceId, productId, optColorId, 'v2', {
          value: 'Navy',
          unitId: 'invalid-unit',
        }),
      ).rejects.toThrow(NotFoundError);

      // Update option value - valid
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValueOnce({ id: 'v2', value: 'Blue' });
      mockRepo.updateProductOptionValue.mockResolvedValueOnce({ id: 'v2', value: 'Navy' });
      const updatedVal = await service.updateProductOptionValue(
        ecommerceId,
        productId,
        optColorId,
        'v2',
        {
          value: 'Navy',
        },
      );
      expect(updatedVal.value).toBe('Navy');

      // Delete option value - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.deleteProductOptionValue(ecommerceId, productId, optColorId, 'v2'),
      ).rejects.toThrow(NotFoundError);

      // Delete option value - value missing
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValueOnce(null);
      await expect(
        service.deleteProductOptionValue(ecommerceId, productId, optColorId, 'v2'),
      ).rejects.toThrow(NotFoundError);

      // Delete option value - valid
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findProductOptionValueById.mockResolvedValueOnce({ id: 'v2' });
      mockRepo.deleteProductOptionValue.mockResolvedValue(true);
      await service.deleteProductOptionValue(ecommerceId, productId, optColorId, 'v2');
      expect(mockRepo.deleteProductOptionValue).toHaveBeenCalled();
    });

    it('createProduct and updateProduct category reference validation', async () => {
      // Create product with duplicate slug
      mockRepo.findProductBySlug.mockResolvedValueOnce({ id: 'existing-p' });
      await expect(
        service.createProduct(ecommerceId, { name: 'P', slug: 'p', price: 10 }),
      ).rejects.toThrow(ConflictError);

      // Create product with non-existent category
      mockRepo.findProductBySlug.mockResolvedValueOnce(null);
      mockRepo.findCategoryById.mockResolvedValueOnce(null);
      await expect(
        service.createProduct(ecommerceId, {
          name: 'P',
          slug: 'p',
          price: 10,
          categoryId: 'missing-cat',
        }),
      ).rejects.toThrow(NotFoundError);

      // Update product with non-existent category
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        slug: 'p',
        hasVariants: false,
      });
      mockRepo.findProductBySlug.mockResolvedValueOnce(null);
      mockRepo.findCategoryById.mockResolvedValueOnce(null);
      await expect(
        service.updateProduct(ecommerceId, productId, { categoryId: 'missing-cat' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('Product Option validation and error handling', async () => {
      const optId = 'opt-123';

      // Create option - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.createProductOption(ecommerceId, productId, { name: 'Color' }),
      ).rejects.toThrow(NotFoundError);

      // Create option - duplicate name
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findOptionsByProduct.mockResolvedValueOnce([{ id: optId, name: 'Color' }]);
      await expect(
        service.createProductOption(ecommerceId, productId, { name: 'color' }),
      ).rejects.toThrow(ConflictError);

      // List options - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.listProductOptions(ecommerceId, productId)).rejects.toThrow(
        NotFoundError,
      );

      // Update option - option missing
      mockRepo.findProductOptionById.mockResolvedValueOnce(null);
      await expect(
        service.updateProductOption(ecommerceId, productId, optId, { name: 'Size' }),
      ).rejects.toThrow(NotFoundError);

      // Update option - product missing
      mockRepo.findProductOptionById.mockResolvedValueOnce({ id: optId, productId, name: 'Color' });
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.updateProductOption(ecommerceId, productId, optId, { name: 'Size' }),
      ).rejects.toThrow(NotFoundError);

      // Update option - duplicate name on another option
      mockRepo.findProductOptionById.mockResolvedValueOnce({ id: optId, productId, name: 'Color' });
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findOptionsByProduct.mockResolvedValueOnce([
        { id: optId, name: 'Color' },
        { id: 'opt-456', name: 'Size' },
      ]);
      await expect(
        service.updateProductOption(ecommerceId, productId, optId, { name: 'size' }),
      ).rejects.toThrow(ConflictError);

      // Delete option - option missing
      mockRepo.findProductOptionById.mockResolvedValueOnce(null);
      await expect(service.deleteProductOption(ecommerceId, productId, optId)).rejects.toThrow(
        NotFoundError,
      );

      // Delete option - product missing
      mockRepo.findProductOptionById.mockResolvedValueOnce({ id: optId, productId, name: 'Color' });
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.deleteProductOption(ecommerceId, productId, optId)).rejects.toThrow(
        NotFoundError,
      );

      // Delete option - valid
      mockRepo.findProductOptionById.mockResolvedValueOnce({ id: optId, productId, name: 'Color' });
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.deleteProductOption.mockResolvedValueOnce(true);
      await service.deleteProductOption(ecommerceId, productId, optId);
      expect(mockRepo.deleteProductOption).toHaveBeenCalledWith(optId);
    });

    it('createVariant and updateVariant validation branches', async () => {
      const varId = 'var-123';
      const val1 = 'val-1';

      // Create variant - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'SKU-1',
          price: 99.99,
          optionValueIds: [val1],
        }),
      ).rejects.toThrow(NotFoundError);

      // Create variant - invalid option values (missing in DB)
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        hasVariants: true,
      });
      mockRepo.findVariantBySku.mockResolvedValueOnce(null);
      mockRepo.findOptionValuesByIds.mockResolvedValueOnce([]); // Empty result
      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'SKU-1',
          price: 99.99,
          optionValueIds: [val1],
        }),
      ).rejects.toThrow('One or more option value IDs are invalid');

      // Create variant - option value belongs to another product
      mockRepo.findProductById.mockResolvedValueOnce({
        id: productId,
        ecommerceId,
        hasVariants: true,
      });
      mockRepo.findVariantBySku.mockResolvedValueOnce(null);
      mockRepo.findOptionValuesByIds.mockResolvedValueOnce([
        { id: val1, productOptionId: 'other-opt', value: 'X' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValueOnce([{ id: 'opt-prod', name: 'Color' }]);
      await expect(
        service.createVariant(ecommerceId, productId, {
          sku: 'SKU-1',
          price: 99.99,
          optionValueIds: [val1],
        }),
      ).rejects.toThrow('does not belong to this product');

      // Update variant - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(
        service.updateVariant(ecommerceId, productId, varId, { price: 50 }),
      ).rejects.toThrow(NotFoundError);

      // Update variant - duplicate SKU
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findVariantById.mockResolvedValueOnce({ id: varId, productId, sku: 'SKU-OLD' });
      mockRepo.findVariantBySku.mockResolvedValueOnce({ id: 'other-var', sku: 'SKU-NEW' });
      await expect(
        service.updateVariant(ecommerceId, productId, varId, { sku: 'SKU-NEW' }),
      ).rejects.toThrow(ConflictError);

      // Update variant - invalid option values (count mismatch)
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findVariantById.mockResolvedValueOnce({ id: varId, productId, sku: 'SKU-1' });
      mockRepo.findOptionValuesByIds.mockResolvedValueOnce([]);
      await expect(
        service.updateVariant(ecommerceId, productId, varId, { optionValueIds: [val1] }),
      ).rejects.toThrow('One or more option value IDs are invalid');

      // Update variant - option value from wrong product
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findVariantById.mockResolvedValueOnce({ id: varId, productId, sku: 'SKU-1' });
      mockRepo.findOptionValuesByIds.mockResolvedValueOnce([
        { id: val1, productOptionId: 'other-opt', value: 'X' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValueOnce([{ id: 'opt-prod', name: 'Color' }]);
      await expect(
        service.updateVariant(ecommerceId, productId, varId, { optionValueIds: [val1] }),
      ).rejects.toThrow('does not belong to this product');

      // Update variant - duplicate option combination with another variant
      mockRepo.findProductById.mockResolvedValueOnce({ id: productId, ecommerceId });
      mockRepo.findVariantById.mockResolvedValueOnce({ id: varId, productId, sku: 'SKU-1' });
      mockRepo.findOptionValuesByIds.mockResolvedValueOnce([
        { id: val1, productOptionId: 'opt-prod', value: 'Red' },
      ]);
      mockRepo.findOptionsByProduct.mockResolvedValueOnce([{ id: 'opt-prod', name: 'Color' }]);
      mockRepo.findVariantsByProduct.mockResolvedValueOnce([
        {
          id: 'other-var',
          sku: 'SKU-2',
          optionValues: [{ id: val1 }],
        },
      ]);
      await expect(
        service.updateVariant(ecommerceId, productId, varId, { optionValueIds: [val1] }),
      ).rejects.toThrow('A variant with this exact combination of option values already exists');

      // List variants - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.listVariants(ecommerceId, productId)).rejects.toThrow(NotFoundError);

      // Delete variant - product missing
      mockRepo.findProductById.mockResolvedValueOnce(null);
      await expect(service.deleteVariant(ecommerceId, productId, varId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
  describe('Units Reference', () => {
    it('listUnits returns units with optional category filter', async () => {
      mockRepo.findAllUnits.mockResolvedValueOnce([
        { id: 'u1', name: 'Kilogram', category: 'Weight' },
      ]);
      const res = await service.listUnits('Weight');
      expect(mockRepo.findAllUnits).toHaveBeenCalledWith('Weight');
      expect(res).toHaveLength(1);
    });

    it('getUnit returns unit or throws NotFoundError', async () => {
      mockRepo.findUnitById.mockResolvedValueOnce({ id: 'u1', name: 'Gram' });
      const unit = await service.getUnit('u1');
      expect(unit.name).toBe('Gram');

      mockRepo.findUnitById.mockResolvedValueOnce(null);
      await expect(service.getUnit('u-missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Hero Banners Management', () => {
    it('createBanner creates a new banner', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.createBanner.mockResolvedValueOnce({
        id: 'b1',
        ecommerceId,
        title: 'Sale',
        displayOrder: 0,
      });
      const res = await service.createBanner(ecommerceId, {
        title: 'Sale',
        imageUrl: 'http://img.jpg',
      });
      expect(res.title).toBe('Sale');
    });

    it('getBanner returns banner or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce({ id: 'b1', ecommerceId, title: 'Sale' });
      const banner = await service.getBanner(ecommerceId, 'b1');
      expect(banner.title).toBe('Sale');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce(null);
      await expect(service.getBanner(ecommerceId, 'b-missing')).rejects.toThrow(NotFoundError);
    });

    it('listBanners returns active or all banners for ecommerce', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannersByEcommerce.mockResolvedValueOnce([
        { id: 'b1', title: 'Sale', isActive: true },
      ]);
      const res = await service.listBanners(ecommerceId, true);
      expect(mockRepo.findBannersByEcommerce).toHaveBeenCalledWith(ecommerceId, true);
      expect(res).toHaveLength(1);
    });

    it('updateBanner updates banner or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce({ id: 'b1', ecommerceId, title: 'Old Sale' });
      mockRepo.updateBanner.mockResolvedValueOnce({ id: 'b1', ecommerceId, title: 'New Sale' });
      const res = await service.updateBanner(ecommerceId, 'b1', { title: 'New Sale' });
      expect(res.title).toBe('New Sale');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce(null);
      await expect(service.updateBanner(ecommerceId, 'b-missing', { title: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('deleteBanner deletes banner or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce({ id: 'b1', ecommerceId });
      mockRepo.deleteBanner.mockResolvedValueOnce(undefined);
      await service.deleteBanner(ecommerceId, 'b1');
      expect(mockRepo.deleteBanner).toHaveBeenCalledWith(ecommerceId, 'b1');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.findBannerById.mockResolvedValueOnce(null);
      await expect(service.deleteBanner(ecommerceId, 'b-missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Orders Management', () => {
    it('createOrder creates order with coupon tracking', async () => {
      mockRepo.findEcommerceById.mockResolvedValue({ id: ecommerceId });
      mockRepo.getCouponByCode.mockResolvedValueOnce({
        id: 'coup-1',
        ecommerceId,
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        targetType: 'ALL_PRODUCTS',
        isActive: true,
      });
      mockRepo.createOrder.mockResolvedValueOnce({
        id: 'ORD-123',
        ecommerceId,
        total: 900,
        couponCode: 'SAVE10',
        couponDiscount: 100,
      });

      const order = await service.createOrder(ecommerceId, {
        id: 'ORD-123',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
        itemsCount: 1,
        shippingAddress: {},
        total: 900,
        couponCode: 'SAVE10',
        items: [
          { id: 'it-1', pricing: { effectivePrice: 1000 }, quantity: 1, product: { id: 'p1' } },
        ],
      });

      expect(order?.id).toBe('ORD-123');
      expect(mockRepo.recordCouponUsage).toHaveBeenCalled();
    });

    it('listOrders returns all orders for store', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.listOrders.mockResolvedValueOnce([{ id: 'ORD-1', total: 500 }]);
      const orders = await service.listOrders(ecommerceId);
      expect(orders).toHaveLength(1);
    });

    it('updateOrderStatus updates status or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getOrderById.mockResolvedValueOnce({ id: 'ORD-1', status: 'PROCESSING' });
      mockRepo.updateOrderStatus.mockResolvedValueOnce({ id: 'ORD-1', status: 'DELIVERED' });

      const updated = await service.updateOrderStatus(ecommerceId, 'ORD-1', 'DELIVERED');
      expect(updated?.status).toBe('DELIVERED');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.updateOrderStatus.mockResolvedValueOnce(null);
      await expect(
        service.updateOrderStatus(ecommerceId, 'ORD-missing', 'DELIVERED'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Coupons Management CRUD', () => {
    it('createCoupon creates coupon or throws ConflictError if code exists', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponByCode.mockResolvedValueOnce(null);
      mockRepo.createCoupon.mockResolvedValueOnce({ id: 'c1', code: 'DIWALI20', name: 'Diwali' });

      const res = await service.createCoupon(ecommerceId, {
        name: 'Diwali',
        code: 'diwali20',
        discountType: 'PERCENTAGE' as any,
        discountValue: 20,
        targetType: 'ALL_PRODUCTS' as any,
      });
      expect(res.code).toBe('DIWALI20');

      // Duplicate conflict
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponByCode.mockResolvedValueOnce({ id: 'c1', code: 'DIWALI20' });
      await expect(
        service.createCoupon(ecommerceId, {
          name: 'Diwali',
          code: 'DIWALI20',
          discountType: 'PERCENTAGE' as any,
          discountValue: 20,
          targetType: 'ALL_PRODUCTS' as any,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('getCoupon returns coupon or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce({ id: 'c1', code: 'DIWALI20' });
      const res = await service.getCouponById(ecommerceId, 'c1');
      expect(res.code).toBe('DIWALI20');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce(null);
      await expect(service.getCouponById(ecommerceId, 'c-missing')).rejects.toThrow(NotFoundError);
    });

    it('updateCoupon updates coupon or throws ConflictError on code collision', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce({ id: 'c1', code: 'OLDCODE' });
      mockRepo.getCouponByCode.mockResolvedValueOnce(null);
      mockRepo.updateCoupon.mockResolvedValueOnce({ id: 'c1', code: 'NEWCODE' });

      const res = await service.updateCoupon(ecommerceId, 'c1', { code: 'NEWCODE' });
      expect(res.code).toBe('NEWCODE');

      // Code collision with another coupon
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce({ id: 'c1', code: 'OLDCODE' });
      mockRepo.getCouponByCode.mockResolvedValueOnce({ id: 'c2', code: 'OTHERCODE' });
      await expect(service.updateCoupon(ecommerceId, 'c1', { code: 'OTHERCODE' })).rejects.toThrow(
        ConflictError,
      );
    });

    it('deleteCoupon deletes coupon or throws NotFoundError', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce({ id: 'c1' });
      mockRepo.deleteCoupon.mockResolvedValueOnce(true);
      await service.deleteCoupon(ecommerceId, 'c1');
      expect(mockRepo.deleteCoupon).toHaveBeenCalledWith(ecommerceId, 'c1');

      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.getCouponById.mockResolvedValueOnce(null);
      await expect(service.deleteCoupon(ecommerceId, 'c-missing')).rejects.toThrow(NotFoundError);
    });

    it('listCoupons returns filtered coupons', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.listCoupons.mockResolvedValueOnce([{ id: 'c1', code: 'CODE1' }]);
      const list = await service.listCoupons(ecommerceId, { search: 'CODE' });
      expect(list).toHaveLength(1);
    });
  });

  describe('Customer Directory', () => {
    it('listCustomers returns customer summaries', async () => {
      mockRepo.findEcommerceById.mockResolvedValueOnce({ id: ecommerceId });
      mockRepo.listCustomers.mockResolvedValueOnce([
        { id: 'u1', name: 'John Doe', email: 'john@example.com', totalOrders: 2, totalSpent: 1200 },
      ]);
      const customers = await service.listCustomers(ecommerceId);
      expect(customers).toHaveLength(1);
      expect(customers[0]?.name).toBe('John Doe');
    });
  });
});
