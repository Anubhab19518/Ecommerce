import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export enum EcommerceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface EcommerceAttributes {
  id: string;
  name: string;
  slug: string;
  status: EcommerceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EcommerceCreationAttributes = Optional<
  EcommerceAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type EcommerceModel = Model<EcommerceAttributes, EcommerceCreationAttributes> &
  EcommerceAttributes;

export const EcommerceModelDef = getSequelize().define<EcommerceModel>(
  'Ecommerce',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: EcommerceStatus.ACTIVE,
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
    tableName: 'ecommerce',
    schema: SCHEMA,
    underscored: true,
  },
);
