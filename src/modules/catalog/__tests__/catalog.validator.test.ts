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
  createBannerSchema,
  updateBannerSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponQuerySchema,
  createOrderSchema,
  updateOrderStatusSchema,
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
    });
  });

  describe('Category Schemas', () => {
    it('validates createCategorySchema', () => {
      expect(
        createCategorySchema.safeParse({
          name: 'Shoes',
          slug: 'shoes',
          parentId: validUuid,
          description: 'Footwear',
        }).success,
      ).toBe(true);

      expect(
        createCategorySchema.safeParse({
          name: 'Clothing',
          slug: 'clothing',
        }).success,
      ).toBe(true);
    });

    it('validates updateCategorySchema', () => {
      expect(updateCategorySchema.safeParse({ name: 'Footwear' }).success).toBe(true);
    });
  });

  describe('Product Schemas', () => {
    it('validates createProductSchema and updateProductSchema', () => {
      expect(
        createProductSchema.safeParse({
          categoryId: validUuid,
          name: 'Running Shoes',
          slug: 'running-shoes',
          price: 99.99,
          offerPrice: 79.99,
          hasVariants: false,
          quantity: 50,
        }).success,
      ).toBe(true);

      expect(
        updateProductSchema.safeParse({
          price: 89.99,
          status: 'ACTIVE',
        }).success,
      ).toBe(true);
    });
  });

  describe('Product Option & Value Schemas', () => {
    it('validates createProductOptionSchema and updateProductOptionSchema', () => {
      expect(createProductOptionSchema.safeParse({ name: 'Size', unitId: validUuid }).success).toBe(
        true,
      );
      expect(createProductOptionSchema.safeParse({ name: '' }).success).toBe(false);
      expect(updateProductOptionSchema.safeParse({ name: 'Color' }).success).toBe(true);
    });

    it('validates createProductOptionValueSchema and updateProductOptionValueSchema', () => {
      expect(
        createProductOptionValueSchema.safeParse({
          value: 'Black',
          unitId: null,
        }).success,
      ).toBe(true);

      expect(
        updateProductOptionValueSchema.safeParse({
          value: '500',
          unitId: validUuid,
        }).success,
      ).toBe(true);
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

  describe('Unit Query Schemas', () => {
    it('validates unitQuerySchema with or without category', () => {
      expect(unitQuerySchema.safeParse({ category: 'Volume' }).success).toBe(true);
      expect(unitQuerySchema.safeParse({}).success).toBe(true);
    });
  });

  describe('Banner Schemas', () => {
    it('validates createBannerSchema and updateBannerSchema', () => {
      expect(
        createBannerSchema.safeParse({
          title: 'Summer Mega Sale',
          imageUrl: 'https://example.com/banner.jpg',
          displayOrder: 1,
          isActive: true,
        }).success,
      ).toBe(true);

      expect(createBannerSchema.safeParse({ title: '', imageUrl: 'not-a-url' }).success).toBe(
        false,
      );
      expect(updateBannerSchema.safeParse({ title: 'Winter Sale' }).success).toBe(true);
    });
  });

  describe('Order Schemas', () => {
    it('validates createOrderSchema with items and customer info', () => {
      expect(
        createOrderSchema.safeParse({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          total: 1500,
          items: [{ id: 'item-1', product: { id: validUuid, name: 'Shoes' }, quantity: 1 }],
          couponCode: 'WELCOME10',
          couponDiscount: 150,
        }).success,
      ).toBe(true);
    });

    it('validates updateOrderStatusSchema', () => {
      expect(updateOrderStatusSchema.safeParse({ status: 'DELIVERED' }).success).toBe(true);
      expect(updateOrderStatusSchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
    });
  });

  describe('Coupon Schemas & Edge Refinements', () => {
    it('validates ALL_PRODUCTS coupon', () => {
      const parsed = createCouponSchema.safeParse({
        name: 'Welcome 10',
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        targetType: 'ALL_PRODUCTS',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects percentage discount greater than 100', () => {
      const parsed = createCouponSchema.safeParse({
        name: 'Super 150',
        code: 'SUPER150',
        discountType: 'PERCENTAGE',
        discountValue: 150,
        targetType: 'ALL_PRODUCTS',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.errors[0]?.message).toContain('cannot exceed 100%');
      }
    });

    it('validates and rejects PRODUCT target rules', () => {
      expect(
        createCouponSchema.safeParse({
          name: 'Prod Discount',
          code: 'PROD10',
          discountType: 'FIXED',
          discountValue: 100,
          targetType: 'PRODUCT',
          rules: { productIds: [validUuid] },
        }).success,
      ).toBe(true);

      const emptyProds = createCouponSchema.safeParse({
        name: 'Prod Discount',
        code: 'PROD10',
        discountType: 'FIXED',
        discountValue: 100,
        targetType: 'PRODUCT',
        rules: { productIds: [] },
      });
      expect(emptyProds.success).toBe(false);
    });

    it('validates and rejects CATEGORY target rules', () => {
      expect(
        createCouponSchema.safeParse({
          name: 'Category Discount',
          code: 'CAT10',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          targetType: 'CATEGORY',
          rules: { categoryId: validUuid },
        }).success,
      ).toBe(true);

      expect(
        createCouponSchema.safeParse({
          name: 'Category Discount',
          code: 'CAT10',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          targetType: 'CATEGORY',
          rules: {},
        }).success,
      ).toBe(false);
    });

    it('validates and rejects USER_BEHAVIOR target rules', () => {
      expect(
        createCouponSchema.safeParse({
          name: 'First Order',
          code: 'FIRST10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          targetType: 'USER_BEHAVIOR',
          rules: { behaviorType: 'FIRST_ORDER' },
        }).success,
      ).toBe(true);

      expect(
        createCouponSchema.safeParse({
          name: 'Min Spend',
          code: 'SPEND500',
          discountType: 'FIXED',
          discountValue: 50,
          targetType: 'USER_BEHAVIOR',
          rules: { behaviorType: 'MIN_ORDER_VALUE', minOrderValue: 500 },
        }).success,
      ).toBe(true);

      expect(
        createCouponSchema.safeParse({
          name: 'Min Spend',
          code: 'SPEND500',
          discountType: 'FIXED',
          discountValue: 50,
          targetType: 'USER_BEHAVIOR',
          rules: { behaviorType: 'MIN_ORDER_VALUE', minOrderValue: 0 },
        }).success,
      ).toBe(false);

      expect(
        createCouponSchema.safeParse({
          name: 'Fifth Order',
          code: 'FIFTH10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          targetType: 'USER_BEHAVIOR',
          rules: { behaviorType: 'ORDER_NUMBER', requiredOrderNumber: 5 },
        }).success,
      ).toBe(true);

      expect(
        createCouponSchema.safeParse({
          name: 'Fifth Order',
          code: 'FIFTH10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          targetType: 'USER_BEHAVIOR',
          rules: { behaviorType: 'ORDER_NUMBER', requiredOrderNumber: 0 },
        }).success,
      ).toBe(false);
    });

    it('validates updateCouponSchema refinements', () => {
      expect(
        updateCouponSchema.safeParse({
          discountType: 'PERCENTAGE',
          discountValue: 25,
        }).success,
      ).toBe(true);

      expect(
        updateCouponSchema.safeParse({
          discountType: 'PERCENTAGE',
          discountValue: 120,
        }).success,
      ).toBe(false);
    });

    it('validates validateCouponSchema and transforms couponQuerySchema', () => {
      expect(
        validateCouponSchema.safeParse({
          code: 'summer20',
          customerEmail: 'test@example.com',
          cartItems: [
            {
              id: 'item-1',
              product: { id: validUuid, name: 'T-Shirt', price: 500 },
              quantity: 2,
              pricing: { effectivePrice: 500 },
            },
          ],
          subtotal: 1000,
        }).success,
      ).toBe(true);

      const queryParsed = couponQuerySchema.safeParse({
        isActive: 'true',
        search: 'SUMMER',
        targetType: 'ALL_PRODUCTS',
      });
      expect(queryParsed.success).toBe(true);
      if (queryParsed.success) {
        expect(queryParsed.data.isActive).toBe(true);
      }
    });
  });
});
