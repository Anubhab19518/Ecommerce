import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';
import type { ProductDetailSection } from './product.model';

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
  price: number | null;
  offerPrice: number | null;
  details: ProductDetailSection[] | null;
  quantity: number;
  status: VariantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductVariantCreationAttributes = Optional<
  ProductVariantAttributes,
  'id' | 'price' | 'offerPrice' | 'details' | 'quantity' | 'status' | 'createdAt' | 'updatedAt'
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
    offerPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
      field: 'offer_price',
      get() {
        const rawValue = this.getDataValue('offerPrice');
        return rawValue === null || rawValue === undefined
          ? null
          : parseFloat(rawValue as unknown as string);
      },
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(VariantStatus)),
      allowNull: false,
      defaultValue: VariantStatus.ACTIVE,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'product_variants',
    schema: SCHEMA,
    underscored: true,
  },
);

// ========================= VariantOptionValue (Junction) =========================

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
      field: 'variant_id',
    },
    optionValueId: {
      type: DataTypes.UUID,
      primaryKey: true,
      field: 'option_value_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    tableName: 'variant_option_values',
    schema: SCHEMA,
    underscored: true,
  },
);
