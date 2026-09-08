import type { CatalogRepository } from '../catalog.repository';
import { CatalogService } from '../catalog.service';
import { CouponDiscountType, CouponTargetType, UserBehaviorRuleType } from '../models';

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
    count: jest.fn(),
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

describe('Coupon Service & Evaluation Engine', () => {
  let service: CatalogService;
  let repoMock: jest.Mocked<CatalogRepository>;

  const mockEcommerceId = '3a2bdaa8-668a-46ab-86aa-bccc3764ae87';

  beforeEach(() => {
    service = new CatalogService();
    repoMock = (service as any).repo;
    jest.spyOn(service as any, 'ensureEcommerce').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Targeting', () => {
    it('applies percentage discount only to eligible product in cart', async () => {
      const mockCoupon: any = {
        id: 'coupon-prod-1',
        ecommerceId: mockEcommerceId,
        code: 'NIKE10',
        name: '10% off Nike Shoes',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        targetType: CouponTargetType.PRODUCT,
        rules: { productIds: ['prod-nike-1'] },
        isActive: true,
        startDate: null,
        expiryDate: null,
        usageLimit: null,
        usageLimitPerUser: null,
        usageCount: 0,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        {
          id: 'item-1',
          product: {
            id: 'prod-nike-1',
            name: 'Nike Air Pro',
            categoryId: 'cat-shoes',
            price: 2000,
          },
          quantity: 1,
          pricing: { effectivePrice: 2000 },
        },
        {
          id: 'item-2',
          product: {
            id: 'prod-adidas-2',
            name: 'Adidas Runner',
            categoryId: 'cat-shoes',
            price: 3000,
          },
          quantity: 1,
          pricing: { effectivePrice: 3000 },
        },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'nike10',
        customerEmail: 'test@example.com',
        cartItems,
        subtotal: 5000,
      });

      expect(result.valid).toBe(true);
      expect(result.code).toBe('NIKE10');
      expect(result.discountAmount).toBe(200); // 10% of 2000
      expect(result.eligibleSubtotal).toBe(2000);
      expect(result.affectedItemIds).toEqual(['item-1']);
    });

    it('rejects coupon when cart contains no eligible products', async () => {
      const mockCoupon: any = {
        id: 'coupon-prod-1',
        ecommerceId: mockEcommerceId,
        code: 'NIKE10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        targetType: CouponTargetType.PRODUCT,
        rules: { productIds: ['prod-nike-1'] },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        {
          id: 'item-2',
          product: { id: 'prod-adidas-2', name: 'Adidas Runner', price: 3000 },
          quantity: 1,
          pricing: { effectivePrice: 3000 },
        },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'NIKE10',
        cartItems,
      });

      expect(result.valid).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.message).toContain('not applicable to any products');
    });
  });

  describe('Category Hierarchy Targeting (LTREE)', () => {
    it('applies category discount to products in descendant categories', async () => {
      const mockCoupon: any = {
        id: 'coupon-cat-1',
        ecommerceId: mockEcommerceId,
        code: 'ETHNIC500',
        name: '₹500 off Ethnic Wear',
        discountType: CouponDiscountType.FIXED,
        discountValue: 500,
        targetType: CouponTargetType.CATEGORY,
        rules: { categoryId: 'cat-ethnic' },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);
      // 'cat-kurtas' is a descendant of 'cat-ethnic'
      jest
        .spyOn(repoMock, 'getDescendantCategoryIds')
        .mockResolvedValue(['cat-ethnic', 'cat-kurtas', 'cat-sherwanis']);

      const cartItems = [
        {
          id: 'item-1',
          product: {
            id: 'prod-kurta-1',
            name: 'Sangria Kurta',
            categoryId: 'cat-kurtas',
            price: 1200,
          },
          quantity: 1,
          pricing: { effectivePrice: 1200 },
        },
        {
          id: 'item-2',
          product: {
            id: 'prod-shoes-1',
            name: 'Sneakers',
            categoryId: 'cat-footwear',
            price: 2000,
          },
          quantity: 1,
          pricing: { effectivePrice: 2000 },
        },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'ETHNIC500',
        cartItems,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(500);
      expect(result.eligibleSubtotal).toBe(1200);
      expect(result.affectedItemIds).toEqual(['item-1']);
    });
  });

  describe('All Products Targeting', () => {
    it('applies percentage discount across all items in cart', async () => {
      const mockCoupon: any = {
        id: 'coupon-all-1',
        ecommerceId: mockEcommerceId,
        code: 'NEWYEAR20',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 20,
        targetType: CouponTargetType.ALL_PRODUCTS,
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        {
          id: 'item-1',
          product: { id: 'p1', name: 'Item 1' },
          quantity: 2,
          pricing: { effectivePrice: 1000 }, // 2000
        },
        {
          id: 'item-2',
          product: { id: 'p2', name: 'Item 2' },
          quantity: 1,
          pricing: { effectivePrice: 1000 }, // 1000
        },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'NEWYEAR20',
        cartItems,
        subtotal: 3000,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(600); // 20% of 3000
      expect(result.eligibleSubtotal).toBe(3000);
      expect(result.affectedItemIds).toEqual(['item-1', 'item-2']);
    });
  });

  describe('User Behavior Rules', () => {
    it('FIRST_ORDER rule succeeds for new customer with 0 prior orders', async () => {
      const mockCoupon: any = {
        id: 'coupon-first-1',
        ecommerceId: mockEcommerceId,
        code: 'FIRST10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        targetType: CouponTargetType.USER_BEHAVIOR,
        rules: { behaviorType: UserBehaviorRuleType.FIRST_ORDER },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);
      jest.spyOn(repoMock, 'getCustomerOrderCount').mockResolvedValue(0);

      const cartItems = [
        { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 1500 } },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'FIRST10',
        customerEmail: 'newuser@example.com',
        cartItems,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(150);
    });

    it('FIRST_ORDER rule fails for returning customer with existing orders', async () => {
      const mockCoupon: any = {
        id: 'coupon-first-1',
        ecommerceId: mockEcommerceId,
        code: 'FIRST10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        targetType: CouponTargetType.USER_BEHAVIOR,
        rules: { behaviorType: UserBehaviorRuleType.FIRST_ORDER },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);
      jest.spyOn(repoMock, 'getCustomerOrderCount').mockResolvedValue(2);

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'FIRST10',
        customerEmail: 'returning@example.com',
        cartItems: [
          { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 1500 } },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('first order');
    });

    it('MIN_ORDER_VALUE rule succeeds when subtotal meets threshold', async () => {
      const mockCoupon: any = {
        id: 'coupon-spend-1',
        ecommerceId: mockEcommerceId,
        code: 'SPEND5000',
        discountType: CouponDiscountType.FIXED,
        discountValue: 500,
        targetType: CouponTargetType.USER_BEHAVIOR,
        rules: { behaviorType: UserBehaviorRuleType.MIN_ORDER_VALUE, minOrderValue: 5000 },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 5000 } },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'SPEND5000',
        cartItems,
        subtotal: 5000,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(500);
    });

    it('MIN_ORDER_VALUE rule fails when subtotal is below threshold', async () => {
      const mockCoupon: any = {
        id: 'coupon-spend-1',
        ecommerceId: mockEcommerceId,
        code: 'SPEND5000',
        discountType: CouponDiscountType.FIXED,
        discountValue: 500,
        targetType: CouponTargetType.USER_BEHAVIOR,
        rules: { behaviorType: UserBehaviorRuleType.MIN_ORDER_VALUE, minOrderValue: 5000 },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 4999 } },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'SPEND5000',
        cartItems,
        subtotal: 4999,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Minimum order value');
    });

    it('ORDER_NUMBER rule verifies exact order sequence number', async () => {
      const mockCoupon: any = {
        id: 'coupon-ord5-1',
        ecommerceId: mockEcommerceId,
        code: 'ORDER5',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 20,
        targetType: CouponTargetType.USER_BEHAVIOR,
        rules: { behaviorType: UserBehaviorRuleType.ORDER_NUMBER, requiredOrderNumber: 5 },
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);
      // Customer currently has 4 orders, placing 5th order!
      jest.spyOn(repoMock, 'getCustomerOrderCount').mockResolvedValue(4);

      const cartItems = [
        { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 1000 } },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'ORDER5',
        customerEmail: 'loyal@example.com',
        cartItems,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(200);
    });
  });

  describe('Discount Floor & Safety Clamping', () => {
    it('clamps fixed discount so it never exceeds eligible item subtotal', async () => {
      const mockCoupon: any = {
        id: 'coupon-big-1',
        ecommerceId: mockEcommerceId,
        code: 'SAVE1000',
        discountType: CouponDiscountType.FIXED,
        discountValue: 1000,
        targetType: CouponTargetType.ALL_PRODUCTS,
        isActive: true,
      };

      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const cartItems = [
        { id: 'item-1', product: { id: 'p1' }, quantity: 1, pricing: { effectivePrice: 400 } },
      ];

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'SAVE1000',
        cartItems,
        subtotal: 400,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(400); // Clamped to 400, never results in negative total!
    });
  });

  describe('Status, Dates and Limits', () => {
    it('rejects inactive coupon', async () => {
      const mockCoupon: any = {
        id: 'c1',
        code: 'INACTIVE',
        isActive: false,
      };
      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const result = await service.evaluateCoupon(mockEcommerceId, { code: 'INACTIVE' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not active');
    });

    it('rejects expired coupon', async () => {
      const mockCoupon: any = {
        id: 'c1',
        code: 'EXPIRED',
        isActive: true,
        expiryDate: new Date(Date.now() - 86400000), // Yesterday
      };
      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const result = await service.evaluateCoupon(mockEcommerceId, { code: 'EXPIRED' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('rejects coupon when global usage limit is reached', async () => {
      const mockCoupon: any = {
        id: 'c1',
        code: 'LIMITED',
        isActive: true,
        usageLimit: 10,
        usageCount: 10,
      };
      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);

      const result = await service.evaluateCoupon(mockEcommerceId, { code: 'LIMITED' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('usage limit reached');
    });

    it('rejects coupon when per-user usage limit is reached', async () => {
      const mockCoupon: any = {
        id: 'c1',
        code: 'ONCEPERUSER',
        isActive: true,
        usageLimitPerUser: 1,
        usageCount: 5,
      };
      jest.spyOn(repoMock, 'getCouponByCode').mockResolvedValue(mockCoupon);
      jest.spyOn(repoMock, 'getCustomerCouponUsageCount').mockResolvedValue(1);

      const result = await service.evaluateCoupon(mockEcommerceId, {
        code: 'ONCEPERUSER',
        customerEmail: 'user@example.com',
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('maximum usage limit');
    });
  });
});
