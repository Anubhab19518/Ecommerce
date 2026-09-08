import {
  BannerModelDef,
  CategoryModelDef,
  CouponModelDef,
  CouponUsageModelDef,
  EcommerceModelDef,
  ProductModelDef,
  ProductOptionModelDef,
  ProductOptionValueModelDef,
  ProductVariantModelDef,
  VariantOptionValueModelDef,
  UnitModelDef,
  CouponDiscountType,
  CouponTargetType,
  UserBehaviorRuleType,
} from '../models';

describe('Catalog Models & Getters', () => {
  it('exports all models and enums properly', () => {
    expect(EcommerceModelDef).toBeDefined();
    expect(CategoryModelDef).toBeDefined();
    expect(ProductModelDef).toBeDefined();
    expect(ProductOptionModelDef).toBeDefined();
    expect(ProductOptionValueModelDef).toBeDefined();
    expect(ProductVariantModelDef).toBeDefined();
    expect(VariantOptionValueModelDef).toBeDefined();
    expect(UnitModelDef).toBeDefined();
    expect(BannerModelDef).toBeDefined();
    expect(CouponModelDef).toBeDefined();
    expect(CouponUsageModelDef).toBeDefined();
    expect(CouponDiscountType.PERCENTAGE).toBe('PERCENTAGE');
    expect(CouponTargetType.ALL_PRODUCTS).toBe('ALL_PRODUCTS');
    expect(UserBehaviorRuleType.FIRST_ORDER).toBe('FIRST_ORDER');
  });

  it('Product model price and offerPrice getters format numbers correctly', () => {
    const rawDef = ProductModelDef.rawAttributes;
    const priceGetter = (rawDef.price as any).get;
    const offerPriceGetter = (rawDef.offerPrice as any).get;

    // Price getter
    const mockContext1 = { getDataValue: () => '99.99' };
    expect(priceGetter.call(mockContext1)).toBe(99.99);

    const mockContext2 = { getDataValue: () => null };
    expect(priceGetter.call(mockContext2)).toBe(0);

    // OfferPrice getter
    const mockContext3 = { getDataValue: () => '79.50' };
    expect(offerPriceGetter.call(mockContext3)).toBe(79.5);

    const mockContext4 = { getDataValue: () => null };
    expect(offerPriceGetter.call(mockContext4)).toBeNull();

    const mockContext5 = { getDataValue: () => undefined };
    expect(offerPriceGetter.call(mockContext5)).toBeNull();
  });

  it('ProductVariant model price and offerPrice getters format numbers correctly', () => {
    const rawDef = ProductVariantModelDef.rawAttributes;
    const priceGetter = (rawDef.price as any).get;
    const offerPriceGetter = (rawDef.offerPrice as any).get;

    const mockContext1 = { getDataValue: () => '49.99' };
    expect(priceGetter.call(mockContext1)).toBe(49.99);

    const mockContext2 = { getDataValue: () => null };
    expect(priceGetter.call(mockContext2)).toBe(0);

    const mockContext3 = { getDataValue: () => '39.99' };
    expect(offerPriceGetter.call(mockContext3)).toBe(39.99);

    const mockContext4 = { getDataValue: () => null };
    expect(offerPriceGetter.call(mockContext4)).toBeNull();
  });

  it('Coupon model discountValue getter formats number correctly', () => {
    const rawDef = CouponModelDef.rawAttributes;
    const discountGetter = (rawDef.discountValue as any).get;

    const mockContext1 = { getDataValue: () => '20.00' };
    expect(discountGetter.call(mockContext1)).toBe(20);

    const mockContext2 = { getDataValue: () => null };
    expect(discountGetter.call(mockContext2)).toBe(0);
  });

  it('CouponUsage model discountAmount getter formats number correctly', () => {
    const rawDef = CouponUsageModelDef.rawAttributes;
    const amountGetter = (rawDef.discountAmount as any).get;

    const mockContext1 = { getDataValue: () => '150.75' };
    expect(amountGetter.call(mockContext1)).toBe(150.75);

    const mockContext2 = { getDataValue: () => null };
    expect(amountGetter.call(mockContext2)).toBe(0);
  });
});
