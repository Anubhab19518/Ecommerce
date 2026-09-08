import { BannerModelDef } from './banner.model';
import { CategoryModelDef } from './category.model';
import { CouponUsageModelDef } from './coupon-usage.model';
import { CouponModelDef } from './coupon.model';
import { EcommerceModelDef } from './ecommerce.model';
import { ProductImageModelDef, ProductVariantImageModelDef } from './product-image.model';
import { ProductOptionModelDef, ProductOptionValueModelDef } from './product-option.model';
import { ProductVariantModelDef, VariantOptionValueModelDef } from './product-variant.model';
import { ProductModelDef } from './product.model';
import { UnitModelDef } from './unit.model';

// ========================= Associations =========================

// Ecommerce ↔ Coupon
EcommerceModelDef.hasMany(CouponModelDef, { foreignKey: 'ecommerceId', as: 'coupons' });
CouponModelDef.belongsTo(EcommerceModelDef, { foreignKey: 'ecommerceId', as: 'ecommerce' });

// Coupon ↔ CouponUsage
CouponModelDef.hasMany(CouponUsageModelDef, { foreignKey: 'couponId', as: 'usages' });
CouponUsageModelDef.belongsTo(CouponModelDef, { foreignKey: 'couponId', as: 'coupon' });

// Ecommerce ↔ Banner
EcommerceModelDef.hasMany(BannerModelDef, { foreignKey: 'ecommerceId', as: 'banners' });
BannerModelDef.belongsTo(EcommerceModelDef, { foreignKey: 'ecommerceId', as: 'ecommerce' });

// Ecommerce ↔ Category
EcommerceModelDef.hasMany(CategoryModelDef, { foreignKey: 'ecommerceId', as: 'categories' });
CategoryModelDef.belongsTo(EcommerceModelDef, { foreignKey: 'ecommerceId', as: 'ecommerce' });

// Category self-reference (Parent ↔ Children)
CategoryModelDef.hasMany(CategoryModelDef, { foreignKey: 'parentId', as: 'children' });
CategoryModelDef.belongsTo(CategoryModelDef, { foreignKey: 'parentId', as: 'parent' });

// Ecommerce ↔ Product
EcommerceModelDef.hasMany(ProductModelDef, { foreignKey: 'ecommerceId', as: 'products' });
ProductModelDef.belongsTo(EcommerceModelDef, { foreignKey: 'ecommerceId', as: 'ecommerce' });

// Category ↔ Product
CategoryModelDef.hasMany(ProductModelDef, { foreignKey: 'categoryId', as: 'products' });
ProductModelDef.belongsTo(CategoryModelDef, { foreignKey: 'categoryId', as: 'category' });

// Unit ↔ ProductOptionValue (Optional reference)
UnitModelDef.hasMany(ProductOptionValueModelDef, { foreignKey: 'unitId', as: 'optionValues' });
ProductOptionValueModelDef.belongsTo(UnitModelDef, { foreignKey: 'unitId', as: 'unit' });

// Product ↔ ProductOption
ProductModelDef.hasMany(ProductOptionModelDef, { foreignKey: 'productId', as: 'options' });
ProductOptionModelDef.belongsTo(ProductModelDef, { foreignKey: 'productId', as: 'product' });

// ProductOption ↔ ProductOptionValue
ProductOptionModelDef.hasMany(ProductOptionValueModelDef, {
  foreignKey: 'productOptionId',
  as: 'values',
});
ProductOptionValueModelDef.belongsTo(ProductOptionModelDef, {
  foreignKey: 'productOptionId',
  as: 'option',
});

// Product ↔ ProductVariant
ProductModelDef.hasMany(ProductVariantModelDef, { foreignKey: 'productId', as: 'variants' });
ProductVariantModelDef.belongsTo(ProductModelDef, { foreignKey: 'productId', as: 'product' });

// Product ↔ ProductImage
ProductModelDef.hasMany(ProductImageModelDef, { foreignKey: 'productId', as: 'images' });
ProductImageModelDef.belongsTo(ProductModelDef, { foreignKey: 'productId', as: 'product' });

// ProductVariant ↔ ProductVariantImage
ProductVariantModelDef.hasMany(ProductVariantImageModelDef, {
  foreignKey: 'variantId',
  as: 'images',
});
ProductVariantImageModelDef.belongsTo(ProductVariantModelDef, {
  foreignKey: 'variantId',
  as: 'variant',
});

// ProductVariant ↔ ProductOptionValue (M2M through VariantOptionValue)
ProductVariantModelDef.belongsToMany(ProductOptionValueModelDef, {
  through: VariantOptionValueModelDef,
  foreignKey: 'variantId',
  otherKey: 'optionValueId',
  as: 'optionValues',
});
ProductOptionValueModelDef.belongsToMany(ProductVariantModelDef, {
  through: VariantOptionValueModelDef,
  foreignKey: 'optionValueId',
  otherKey: 'variantId',
  as: 'variants',
});

export * from './banner.model';
export * from './category.model';
export * from './coupon-usage.model';
export * from './coupon.model';
export * from './ecommerce.model';
export * from './product-image.model';
export * from './product-option.model';
export * from './product-variant.model';
export * from './product.model';
export * from './unit.model';
