import { z } from 'zod';
import { EcommerceStatus, ProductStatus, VariantStatus } from './models';

// ========================= Shared Schemas =========================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

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

// ========================= Ecommerce Schemas =========================

export const createEcommerceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: slugSchema,
  status: z.nativeEnum(EcommerceStatus).optional().default(EcommerceStatus.ACTIVE),
});

export const updateEcommerceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: slugSchema.optional(),
  status: z.nativeEnum(EcommerceStatus).optional(),
});

export type CreateEcommerceInput = z.input<typeof createEcommerceSchema>;
export type UpdateEcommerceInput = z.input<typeof updateEcommerceSchema>;

// ========================= Category Schemas =========================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: slugSchema,
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: slugSchema.optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

// ========================= Product Schemas =========================

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: slugSchema,
  description: z.string().nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  price: z.number().min(0, 'Price cannot be negative').default(0),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
  hasVariants: z.boolean().optional().default(false),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  hasVariants: z.boolean().optional(),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;

// ========================= Option Schemas =========================

export const createProductOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100),
  unitId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
});

export const updateProductOptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unitId: uuidSchema.nullable().optional(),
  displayOrder: z.number().int().optional(),
});

export type CreateProductOptionInput = z.input<typeof createProductOptionSchema>;
export type UpdateProductOptionInput = z.input<typeof updateProductOptionSchema>;

// ========================= Unit Schemas =========================

export const unitQuerySchema = z.object({
  category: z.string().min(1).max(50).optional(),
});

export type UnitQueryInput = z.infer<typeof unitQuerySchema>;

// ========================= Option Value Schemas =========================

export const createProductOptionValueSchema = z.object({
  value: z.string().min(1, 'Option value is required').max(100),
  displayOrder: z.number().int().optional().default(0),
});

export const updateProductOptionValueSchema = z.object({
  value: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().optional(),
});

export type CreateProductOptionValueInput = z.input<typeof createProductOptionValueSchema>;
export type UpdateProductOptionValueInput = z.input<typeof updateProductOptionValueSchema>;

// ========================= Variant Schemas =========================

export const createProductVariantSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  price: z.number().min(0, 'Price cannot be negative').default(0),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  status: z.nativeEnum(VariantStatus).optional().default(VariantStatus.ACTIVE),
  optionValueIds: z.array(uuidSchema).min(1, 'At least one option value ID is required'),
});

export const updateProductVariantSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  status: z.nativeEnum(VariantStatus).optional(),
  optionValueIds: z.array(uuidSchema).min(1).optional(),
});

export type CreateProductVariantInput = z.input<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.input<typeof updateProductVariantSchema>;
