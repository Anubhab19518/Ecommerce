import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

// ========================= ProductImage =========================

export interface ProductImageAttributes {
  id: string;
  productId: string;
  url: string;
  publicId: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductImageCreationAttributes = Optional<
  ProductImageAttributes,
  'id' | 'publicId' | 'displayOrder' | 'createdAt' | 'updatedAt'
>;

export type ProductImageModel = Model<ProductImageAttributes, ProductImageCreationAttributes> &
  ProductImageAttributes;

export const ProductImageModelDef = getSequelize().define<ProductImageModel>(
  'ProductImage',
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
    url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'public_id',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
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
    tableName: 'product_images',
    schema: SCHEMA,
    underscored: true,
  },
);

// ========================= ProductVariantImage =========================

export interface ProductVariantImageAttributes {
  id: string;
  variantId: string;
  url: string;
  publicId: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductVariantImageCreationAttributes = Optional<
  ProductVariantImageAttributes,
  'id' | 'publicId' | 'displayOrder' | 'createdAt' | 'updatedAt'
>;

export type ProductVariantImageModel = Model<
  ProductVariantImageAttributes,
  ProductVariantImageCreationAttributes
> &
  ProductVariantImageAttributes;

export const ProductVariantImageModelDef = getSequelize().define<ProductVariantImageModel>(
  'ProductVariantImage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'variant_id',
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'public_id',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
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
    tableName: 'product_variant_images',
    schema: SCHEMA,
    underscored: true,
  },
);
