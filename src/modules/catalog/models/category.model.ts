import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export interface CategoryAttributes {
  id: string;
  ecommerceId: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  'id' | 'parentId' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'
>;

export type CategoryModel = Model<CategoryAttributes, CategoryCreationAttributes> &
  CategoryAttributes;

export const CategoryModelDef = getSequelize().define<CategoryModel>(
  'Category',
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
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    path: {
      type: 'LTREE' as unknown as DataTypes.DataType,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    tableName: 'categories',
    schema: SCHEMA,
    underscored: true,
  },
);
