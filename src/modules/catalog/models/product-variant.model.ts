import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export enum VariantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// ========================= ProductVariant =========================

export interface ProductVariantAttributes {
  id: string;
  productId: string;
  sku: string;
  price: number;
  quantity: number;
  status: VariantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductVariantCreationAttributes = Optional<
  ProductVariantAttributes,
  'id' | 'price' | 'quantity' | 'status' | 'createdAt' | 'updatedAt'
>;

export type ProductVariantModel = Model<
  ProductVariantAttributes,
  ProductVariantCreationAttributes
> &
  ProductVariantAttributes;

export const ProductVariantModelDef = getSequelize().define<ProductVariantModel>(
  'ProductVariant',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      get() {
        const rawValue = this.getDataValue('price');
        return rawValue === null ? 0 : parseFloat(rawValue as unknown as string);
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: VariantStatus.ACTIVE,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'product_variants',
    schema: SCHEMA,
    underscored: true,
  },
);

// ========================= VariantOptionValue (Join Table) =========================

export interface VariantOptionValueAttributes {
  variantId: string;
  optionValueId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VariantOptionValueCreationAttributes = Optional<
  VariantOptionValueAttributes,
  'createdAt' | 'updatedAt'
>;

export type VariantOptionValueModel = Model<
  VariantOptionValueAttributes,
  VariantOptionValueCreationAttributes
> &
  VariantOptionValueAttributes;

export const VariantOptionValueModelDef = getSequelize().define<VariantOptionValueModel>(
  'VariantOptionValue',
  {
    variantId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'variant_id',
    },
    optionValueId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      field: 'option_value_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'variant_option_values',
    schema: SCHEMA,
    underscored: true,
  },
);
