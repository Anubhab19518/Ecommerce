import { z } from 'zod';
import { EcommerceStatus, ProductStatus, VariantStatus } from './models';

// ========================= Shared Schemas & Refinements =========================

export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  });

function isOfferPriceValid(data: { price?: number | null; offerPrice?: number | null }): boolean {
  if (data.offerPrice === null || data.offerPrice === undefined) return true;
  if (data.price === null || data.price === undefined) return true;
  return data.offerPrice <= data.price;
}

const offerPriceRefinement = {
  message: 'Offer price cannot exceed normal price',
  path: ['offerPrice'],
};

// ========================= Parameter Schemas =========================

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const productParamSchema = z.object({
  productId: uuidSchema,
});

export const optionParamSchema = z.object({
  optionId: uuidSchema,
});

export const valueParamSchema = z.object({
  valueId: uuidSchema,
});

export const variantParamSchema = z.object({
  variantId: uuidSchema,
});

export const productOptionParamSchema = z.object({
  productId: uuidSchema,
  optionId: uuidSchema,
});

export const imageParamSchema = z.object({
  productId: uuidSchema,
  imageId: uuidSchema,
});

export const variantImageParamSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema,
  imageId: uuidSchema,
});

// ========================= Ecommerce Schemas =========================

export const createEcommerceSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100),
  slug: slugSchema,
  status: z.nativeEnum(EcommerceStatus).optional().default(EcommerceStatus.ACTIVE),
  settings: z.record(z.unknown()).optional(),
});

export const updateEcommerceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  status: z.nativeEnum(EcommerceStatus).optional(),
  settings: z.record(z.unknown()).optional(),
});

export type CreateEcommerceInput = z.input<typeof createEcommerceSchema>;
export type UpdateEcommerceInput = z.input<typeof updateEcommerceSchema>;

// ========================= Category Schemas =========================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  parentId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional(),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

// ========================= Product Schemas =========================

export const productDetailSectionSchema = z.object({
  title: z.string().min(1, 'Detail title is required').max(255),
  content: z.string(),
});

export const createProductSchema = z
  .object({
    name: z.string().min(1, 'Product name is required').max(255),
    slug: slugSchema,
    description: z.string().max(2000).optional(),
    details: z.array(productDetailSectionSchema).nullable().optional().default([]),
    categoryId: uuidSchema.optional(),
    price: z.number().min(0, 'Price cannot be negative'),
    offerPrice: z
      .number()
      .min(0, 'Offer price cannot be negative')
      .nullable()
      .optional()
      .default(null),
    taxRate: z
      .number()
      .min(0, 'Tax rate cannot be negative')
      .max(100, 'Tax rate cannot exceed 100%')
      .optional()
      .default(0),
    taxClass: z.string().max(50).nullable().optional().default('GST 18%'),
    quantity: z.number().int().min(0, 'Quantity cannot be negative').optional().default(0),
    status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
    hasVariants: z.boolean().optional().default(false),
  })
  .refine(isOfferPriceValid, offerPriceRefinement);

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    slug: slugSchema.optional(),
    description: z.string().nullable().optional(),
    details: z.array(productDetailSectionSchema).nullable().optional(),
    categoryId: uuidSchema.nullable().optional(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    offerPrice: z.number().min(0, 'Offer price cannot be negative').nullable().optional(),
    taxRate: z
      .number()
      .min(0, 'Tax rate cannot be negative')
      .max(100, 'Tax rate cannot exceed 100%')
      .optional(),
    taxClass: z.string().max(50).nullable().optional(),
    quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    hasVariants: z.boolean().optional(),
  })
  .refine(isOfferPriceValid, offerPriceRefinement);

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;

// ========================= Option Schemas =========================

export const createProductOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100),
  displayOrder: z.number().int().optional().default(0),
});

export const updateProductOptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().optional(),
});

export type CreateProductOptionInput = z.input<typeof createProductOptionSchema>;
export type UpdateProductOptionInput = z.input<typeof updateProductOptionSchema>;

// ========================= Unit Schemas =========================

export const unitQuerySchema = z.object({
  category: z.string().optional(),
});

export type UnitQueryInput = z.infer<typeof unitQuerySchema>;

// ========================= Option Value Schemas =========================

export const createProductOptionValueSchema = z.object({
  value: z.string().min(1, 'Option value is required').max(100),
  unitId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
});

export const updateProductOptionValueSchema = z.object({
  value: z.string().min(1).max(100).optional(),
  unitId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional(),
});

export type CreateProductOptionValueInput = z.input<typeof createProductOptionValueSchema>;
export type UpdateProductOptionValueInput = z.input<typeof updateProductOptionValueSchema>;

// ========================= Variant Schemas =========================

export const createProductVariantSchema = z
  .object({
    sku: z.string().min(1, 'SKU is required').max(100),
    price: z.number().min(0, 'Price cannot be negative').optional().nullable(),
    offerPrice: z
      .number()
      .min(0, 'Offer price cannot be negative')
      .nullable()
      .optional()
      .default(null),
    details: z.array(productDetailSectionSchema).nullable().optional(),
    quantity: z.number().int().min(0, 'Quantity cannot be negative').optional().default(0),
    status: z.nativeEnum(VariantStatus).optional().default(VariantStatus.ACTIVE),
    optionValueIds: z.array(uuidSchema).min(1, 'At least one option value ID is required'),
  })
  .refine(isOfferPriceValid, offerPriceRefinement);

export const updateProductVariantSchema = z
  .object({
    sku: z.string().min(1).max(100).optional(),
    price: z.number().min(0, 'Price cannot be negative').optional().nullable(),
    offerPrice: z.number().min(0, 'Offer price cannot be negative').nullable().optional(),
    details: z.array(productDetailSectionSchema).nullable().optional(),
    quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
    status: z.nativeEnum(VariantStatus).optional(),
    optionValueIds: z.array(uuidSchema).min(1).optional(),
  })
  .refine(isOfferPriceValid, offerPriceRefinement);

export type CreateProductVariantInput = z.input<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.input<typeof updateProductVariantSchema>;

// ========================= Banner Schemas =========================

export const createBannerSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  subtitle: z.string().max(255).nullable().optional(),
  imageUrl: z.string().min(1, 'Image URL is required'),
  publicId: z.string().max(255).nullable().optional(),
  redirectUrl: z.string().max(500).nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateBannerSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).nullable().optional(),
  imageUrl: z.string().optional(),
  publicId: z.string().max(255).nullable().optional(),
  redirectUrl: z.string().max(500).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBannerInput = z.input<typeof createBannerSchema>;
export type UpdateBannerInput = z.input<typeof updateBannerSchema>;

// ========================= Coupon Schemas =========================

export const couponDiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
export const couponTargetTypeSchema = z.enum([
  'ALL_PRODUCTS',
  'PRODUCT',
  'CATEGORY',
  'USER_BEHAVIOR',
]);
export const userBehaviorRuleTypeSchema = z.enum([
  'FIRST_ORDER',
  'MIN_ORDER_VALUE',
  'ORDER_NUMBER',
]);

export const couponRulesSchema = z
  .object({
    productIds: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
    categoryPath: z.string().optional(),
    behaviorType: userBehaviorRuleTypeSchema.optional(),
    minOrderValue: z.number().min(0).optional(),
    requiredOrderNumber: z.number().int().min(1).optional(),
  })
  .default({});

export const createCouponSchema = z
  .object({
    name: z.string().min(1, 'Coupon name is required').max(255),
    code: z
      .string()
      .min(1, 'Coupon code is required')
      .max(50)
      .transform((val) => val.trim().toUpperCase()),
    description: z.string().nullable().optional(),
    discountType: couponDiscountTypeSchema,
    discountValue: z.number().positive('Discount value must be greater than 0'),
    targetType: couponTargetTypeSchema,
    rules: couponRulesSchema.optional().default({}),
    startDate: z.coerce.date().nullable().optional(),
    expiryDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    usageLimit: z
      .number()
      .int()
      .positive('Usage limit must be a positive integer')
      .nullable()
      .optional(),
    usageLimitPerUser: z
      .number()
      .int()
      .positive('Per-user usage limit must be a positive integer')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE') {
        return data.discountValue <= 100;
      }
      return true;
    },
    { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] },
  )
  .refine(
    (data) => {
      if (data.startDate && data.expiryDate) {
        return new Date(data.expiryDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'Expiry date must be after start date', path: ['expiryDate'] },
  )
  .refine(
    (data) => {
      if (data.targetType === 'PRODUCT') {
        return Array.isArray(data.rules?.productIds) && data.rules.productIds.length > 0;
      }
      if (data.targetType === 'CATEGORY') {
        return Boolean(data.rules?.categoryId && data.rules.categoryId.trim().length > 0);
      }
      if (data.targetType === 'USER_BEHAVIOR') {
        if (!data.rules?.behaviorType) return false;
        if (data.rules.behaviorType === 'MIN_ORDER_VALUE') {
          return Boolean(data.rules.minOrderValue && data.rules.minOrderValue > 0);
        }
        if (data.rules.behaviorType === 'ORDER_NUMBER') {
          return Boolean(data.rules.requiredOrderNumber && data.rules.requiredOrderNumber > 0);
        }
        return true;
      }
      return true;
    },
    { message: 'Targeting rules invalid for selected target type', path: ['rules'] },
  );

export const updateCouponSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    code: z
      .string()
      .min(1)
      .max(50)
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    description: z.string().nullable().optional(),
    discountType: couponDiscountTypeSchema.optional(),
    discountValue: z.number().positive().optional(),
    targetType: couponTargetTypeSchema.optional(),
    rules: couponRulesSchema.optional(),
    startDate: z.coerce.date().nullable().optional(),
    expiryDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    usageLimitPerUser: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE' && data.discountValue !== undefined) {
        return data.discountValue <= 100;
      }
      return true;
    },
    { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] },
  );

export const validateCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .transform((val) => val.trim().toUpperCase()),
  customerEmail: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  cartItems: z
    .array(
      z.object({
        id: z.string().optional(),
        product: z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            categoryId: z.string().nullable().optional(),
            price: z.number().optional(),
            offerPrice: z.number().nullable().optional(),
          })
          .optional()
          .default({}),
        productId: z.string().optional(),
        variant: z
          .object({
            id: z.string().optional(),
            sku: z.string().optional(),
          })
          .nullable()
          .optional(),
        quantity: z.number().int().positive().default(1),
        pricing: z
          .object({
            effectivePrice: z.number().min(0).optional(),
          })
          .optional(),
      }),
    )
    .default([]),
  subtotal: z.number().min(0).optional(),
});

export const couponQuerySchema = z.object({
  targetType: couponTargetTypeSchema.optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().optional(),
});

export type CreateCouponInput = z.input<typeof createCouponSchema>;
export type UpdateCouponInput = z.input<typeof updateCouponSchema>;
export type ValidateCouponInput = z.input<typeof validateCouponSchema>;
export type CouponQueryInput = z.infer<typeof couponQuerySchema>;

// ========================= Order Schemas =========================

export const createOrderSchema = z.object({
  id: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().optional().default(''),
  customerPhone: z.string().optional().default(''),
  itemsCount: z.number().int().min(1).optional().default(1),
  total: z.number().min(0, 'Total cannot be negative'),
  status: z.string().optional().default('PROCESSING'),
  shippingAddress: z.record(z.unknown()).optional().default({}),
  items: z.array(z.record(z.unknown())).optional().default([]),
  couponId: z.string().nullable().optional(),
  couponCode: z.string().nullable().optional(),
  couponDiscount: z.number().min(0).optional().default(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;
