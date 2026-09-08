import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export interface BannerAttributes {
  id: string;
  ecommerceId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  publicId: string | null;
  redirectUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BannerCreationAttributes = Optional<
  BannerAttributes,
  | 'id'
  | 'subtitle'
  | 'publicId'
  | 'redirectUrl'
  | 'displayOrder'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;

export type BannerModel = Model<BannerAttributes, BannerCreationAttributes> & BannerAttributes;

export const BannerModelDef = getSequelize().define<BannerModel>(
  'Banner',
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'image_url',
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'public_id',
    },
    redirectUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'redirect_url',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'banners',
    schema: SCHEMA,
    underscored: true,
  },
);
