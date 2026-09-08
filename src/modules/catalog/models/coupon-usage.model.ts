import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export interface CouponUsageAttributes {
  id: string;
  ecommerceId: string;
  couponId: string;
  orderId: string;
  customerEmail: string;
  discountAmount: number;
  createdAt: Date;
}

export type CouponUsageCreationAttributes = Optional<CouponUsageAttributes, 'id' | 'createdAt'>;

export type CouponUsageModel = Model<CouponUsageAttributes, CouponUsageCreationAttributes> &
  CouponUsageAttributes;

export const CouponUsageModelDef = getSequelize().define<CouponUsageModel>(
  'CouponUsage',
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
    couponId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'coupon_id',
    },
    orderId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'order_id',
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_email',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'discount_amount',
      get() {
        const rawValue = this.getDataValue('discountAmount');
        return rawValue === null ? 0 : parseFloat(rawValue as unknown as string);
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'coupon_usages',
    schema: SCHEMA,
    underscored: true,
    updatedAt: false,
  },
);
