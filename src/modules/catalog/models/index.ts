import { CategoryModelDef } from './category.model';
import { EcommerceModelDef } from './ecommerce.model';
import { ProductOptionModelDef, ProductOptionValueModelDef } from './product-option.model';
import { ProductVariantModelDef, VariantOptionValueModelDef } from './product-variant.model';
import { ProductModelDef } from './product.model';
import { UnitModelDef } from './unit.model';

// ========================= Associations =========================

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

// Unit ↔ ProductOption (Optional reference)
UnitModelDef.hasMany(ProductOptionModelDef, { foreignKey: 'unitId', as: 'options' });
ProductOptionModelDef.belongsTo(UnitModelDef, { foreignKey: 'unitId', as: 'unit' });

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

export * from './category.model';
export * from './ecommerce.model';
export * from './product-option.model';
export * from './product-variant.model';
export * from './product.model';
export * from './unit.model';
