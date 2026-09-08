import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface ProductDetailSection {
  title: string;
  content: string;
}

export interface ProductAttributes {
  id: string;
  ecommerceId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  details: ProductDetailSection[] | null;
  price: number;
  offerPrice: number | null;
  taxRate: number;
  taxClass: string | null;
  quantity: number;
  status: ProductStatus;
  hasVariants: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductCreationAttributes = Optional<
  ProductAttributes,
  | 'id'
  | 'categoryId'
  | 'description'
  | 'details'
  | 'price'
  | 'offerPrice'
  | 'taxRate'
  | 'taxClass'
  | 'quantity'
  | 'status'
  | 'hasVariants'
  | 'createdAt'
  | 'updatedAt'
>;

export type ProductModel = Model<ProductAttributes, ProductCreationAttributes> & ProductAttributes;

export const ProductModelDef = getSequelize().define<ProductModel>(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ecommerceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ecommerce_id',
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
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
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_rate',
      get() {
        const rawValue = this.getDataValue('taxRate');
        return rawValue === null || rawValue === undefined
          ? 0
          : parseFloat(rawValue as unknown as string);
      },
    },
    taxClass: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'GST 18%',
      field: 'tax_class',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ProductStatus)),
      allowNull: false,
      defaultValue: ProductStatus.DRAFT,
    },
    hasVariants: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_variants',
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
    tableName: 'products',
    schema: SCHEMA,
    underscored: true,
  },
);
