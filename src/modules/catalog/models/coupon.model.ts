import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CouponTargetType {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  USER_BEHAVIOR = 'USER_BEHAVIOR',
}

export enum UserBehaviorRuleType {
  FIRST_ORDER = 'FIRST_ORDER',
  MIN_ORDER_VALUE = 'MIN_ORDER_VALUE',
  ORDER_NUMBER = 'ORDER_NUMBER',
}

export interface CouponRules {
  productIds?: string[];
  categoryId?: string;
  categoryPath?: string;
  behaviorType?: UserBehaviorRuleType;
  minOrderValue?: number;
  requiredOrderNumber?: number;
}

export interface CouponAttributes {
  id: string;
  ecommerceId: string;
  name: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  targetType: CouponTargetType;
  rules: CouponRules;
  startDate: Date | null;
  expiryDate: Date | null;
  isActive: boolean;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponCreationAttributes = Optional<
  CouponAttributes,
  | 'id'
  | 'description'
  | 'rules'
  | 'startDate'
  | 'expiryDate'
  | 'isActive'
  | 'usageLimit'
  | 'usageLimitPerUser'
  | 'usageCount'
  | 'createdAt'
  | 'updatedAt'
>;

export type CouponModel = Model<CouponAttributes, CouponCreationAttributes> & CouponAttributes;

export const CouponModelDef = getSequelize().define<CouponModel>(
  'Coupon',
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    discountType: {
      type: DataTypes.ENUM(...Object.values(CouponDiscountType)),
      allowNull: false,
      field: 'discount_type',
    },
    discountValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'discount_value',
      get() {
        const rawValue = this.getDataValue('discountValue');
        return rawValue === null ? 0 : parseFloat(rawValue as unknown as string);
      },
    },
    targetType: {
      type: DataTypes.ENUM(...Object.values(CouponTargetType)),
      allowNull: false,
      field: 'target_type',
    },
    rules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_date',
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiry_date',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'usage_limit',
    },
    usageLimitPerUser: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'usage_limit_per_user',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'usage_count',
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
    tableName: 'coupons',
    schema: SCHEMA,
    underscored: true,
  },
);
