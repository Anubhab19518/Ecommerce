import {
  uuidSchema,
  slugSchema,
  idParamSchema,
  productParamSchema,
  optionParamSchema,
  valueParamSchema,
  variantParamSchema,
  productOptionParamSchema,
  createEcommerceSchema,
  updateEcommerceSchema,
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createProductOptionSchema,
  updateProductOptionSchema,
  createProductOptionValueSchema,
  updateProductOptionValueSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  unitQuerySchema,
} from '../catalog.validator';

describe('Catalog Validator Schemas', () => {
  const validUuid = '11111111-1111-4111-8111-111111111111';

  describe('Shared Schemas', () => {
    it('uuidSchema validates valid UUID and rejects invalid UUID', () => {
      expect(uuidSchema.safeParse(validUuid).success).toBe(true);
      expect(uuidSchema.safeParse('invalid-uuid').success).toBe(false);
    });

    it('slugSchema validates alphanumeric with hyphens', () => {
      expect(slugSchema.safeParse('valid-slug-123').success).toBe(true);
      expect(slugSchema.safeParse('INVALID_SLUG').success).toBe(false);
      expect(slugSchema.safeParse('slug with spaces').success).toBe(false);
    });

    it('param schemas parse valid UUIDs', () => {
      expect(idParamSchema.safeParse({ id: validUuid }).success).toBe(true);
      expect(productParamSchema.safeParse({ productId: validUuid }).success).toBe(true);
      expect(optionParamSchema.safeParse({ optionId: validUuid }).success).toBe(true);
      expect(valueParamSchema.safeParse({ valueId: validUuid }).success).toBe(true);
      expect(variantParamSchema.safeParse({ variantId: validUuid }).success).toBe(true);
      expect(
        productOptionParamSchema.safeParse({ productId: validUuid, optionId: validUuid }).success,
      ).toBe(true);
    });
  });

  describe('Ecommerce Schemas', () => {
    it('validates createEcommerceSchema', () => {
      expect(
        createEcommerceSchema.safeParse({ name: 'Acme', slug: 'acme', status: 'ACTIVE' }).success,
      ).toBe(true);
      expect(createEcommerceSchema.safeParse({ name: '', slug: 'acme' }).success).toBe(false);
    });

    it('validates updateEcommerceSchema', () => {
      expect(updateEcommerceSchema.safeParse({ name: 'Acme 2' }).success).toBe(true);
      expect(updateEcommerceSchema.safeParse({ status: 'SUSPENDED' }).success).toBe(true);
    });
  });

  describe('Category Schemas', () => {
    it('validates createCategorySchema', () => {
      expect(
        createCategorySchema.safeParse({
          name: 'Electronics',
          slug: 'electronics',
          parentId: validUuid,
          sortOrder: 1,
          isActive: true,
        }).success,
      ).toBe(true);
    });

    it('validates updateCategorySchema', () => {
      expect(
        updateCategorySchema.safeParse({
          name: 'Consumer Electronics',
          parentId: null,
        }).success,
      ).toBe(true);
    });
  });

  describe('Product Schemas', () => {
    it('validates createProductSchema and defaults', () => {
      const res = createProductSchema.safeParse({
        name: 'Phone',
        slug: 'phone',
        price: 499.99,
        quantity: 10,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe('DRAFT');
        expect(res.data.hasVariants).toBe(false);
      }
    });

    it('validates updateProductSchema', () => {
      expect(
        updateProductSchema.safeParse({
          price: 599.99,
          status: 'ACTIVE',
        }).success,
      ).toBe(true);
    });
  });

  describe('Product Options & Option Values Schemas', () => {
    it('validates createProductOptionSchema with optional unitId', () => {
      expect(
        createProductOptionSchema.safeParse({
          name: 'Volume',
          unitId: validUuid,
          displayOrder: 0,
        }).success,
      ).toBe(true);

      expect(
        createProductOptionSchema.safeParse({
          name: 'Color',
        }).success,
      ).toBe(true);
    });

    it('validates updateProductOptionSchema', () => {
      expect(updateProductOptionSchema.safeParse({ name: 'Size', unitId: null }).success).toBe(
        true,
      );
    });

    it('validates option value schemas', () => {
      expect(
        createProductOptionValueSchema.safeParse({ value: 'Red', displayOrder: 1 }).success,
      ).toBe(true);
      expect(updateProductOptionValueSchema.safeParse({ value: 'Blue' }).success).toBe(true);
    });
  });

  describe('Product Variant Schemas', () => {
    it('validates createProductVariantSchema', () => {
      expect(
        createProductVariantSchema.safeParse({
          sku: 'SKU123',
          price: 29.99,
          quantity: 100,
          status: 'ACTIVE',
          optionValueIds: [validUuid],
        }).success,
      ).toBe(true);

      // Must have at least 1 option value
      expect(
        createProductVariantSchema.safeParse({
          sku: 'SKU123',
          optionValueIds: [],
        }).success,
      ).toBe(false);
    });

    it('validates updateProductVariantSchema', () => {
      expect(
        updateProductVariantSchema.safeParse({
          price: 34.99,
          quantity: 80,
          optionValueIds: [validUuid],
        }).success,
      ).toBe(true);
    });
  });

  describe('Unit Query Schema', () => {
    it('validates unitQuerySchema with or without category', () => {
      expect(unitQuerySchema.safeParse({ category: 'Volume' }).success).toBe(true);
      expect(unitQuerySchema.safeParse({}).success).toBe(true);
    });
  });
});
