import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

// ========================= ProductOption =========================

export interface ProductOptionAttributes {
  id: string;
  productId: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductOptionCreationAttributes = Optional<
  ProductOptionAttributes,
  'id' | 'displayOrder' | 'createdAt' | 'updatedAt'
>;

export type ProductOptionModel = Model<ProductOptionAttributes, ProductOptionCreationAttributes> &
  ProductOptionAttributes;

export const ProductOptionModelDef = getSequelize().define<ProductOptionModel>(
  'ProductOption',
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'product_options',
    schema: SCHEMA,
    underscored: true,
  },
);

// ========================= ProductOptionValue =========================

export interface ProductOptionValueAttributes {
  id: string;
  productOptionId: string;
  unitId: string | null;
  value: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductOptionValueCreationAttributes = Optional<
  ProductOptionValueAttributes,
  'id' | 'unitId' | 'displayOrder' | 'createdAt' | 'updatedAt'
>;

export type ProductOptionValueModel = Model<
  ProductOptionValueAttributes,
  ProductOptionValueCreationAttributes
> &
  ProductOptionValueAttributes;

export const ProductOptionValueModelDef = getSequelize().define<ProductOptionValueModel>(
  'ProductOptionValue',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productOptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_option_id',
    },
    unitId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'unit_id',
    },
    value: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'product_option_values',
    schema: SCHEMA,
    underscored: true,
  },
);
