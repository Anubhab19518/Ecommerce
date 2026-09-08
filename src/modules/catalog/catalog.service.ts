import { type Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { getSequelize } from '@infrastructure/database/connection';
import { logger } from '@infrastructure/logging/logger';
import { cloudinaryService } from '@infrastructure/upload/cloudinary.service';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';
import type { CreateOrderInput, CustomerSummary, OrderRecord } from './catalog.repository';
import { CatalogRepository } from './catalog.repository';
import type {
  CreateCategoryInput,
  CreateEcommerceInput,
  CreateProductInput,
  CreateProductOptionInput,
  CreateProductOptionValueInput,
  CreateProductVariantInput,
  UpdateCategoryInput,
  UpdateEcommerceInput,
  UpdateProductInput,
  UpdateProductOptionInput,
  UpdateProductOptionValueInput,
  UpdateProductVariantInput,
  CreateBannerInput,
  UpdateBannerInput,
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponInput,
  CouponQueryInput,
} from './catalog.validator';
import {
  VariantStatus,
  type BannerModel,
  type CategoryModel,
  CouponDiscountType,
  CouponTargetType,
  UserBehaviorRuleType,
  type CouponModel,
  type EcommerceModel,
  type ProductAttributes,
  type ProductImageModel,
  type ProductModel,
  type ProductOptionModel,
  type ProductOptionValueModel,
  type ProductVariantImageModel,
  type ProductVariantModel,
  type UnitModel,
} from './models';

export interface CouponEvaluationResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  eligibleSubtotal: number;
  affectedItemIds?: string[];
  message: string;
}

export type ProductResponse = ProductAttributes & {
  computedQuantity: number;
  category?: unknown;
  options?: unknown[];
  variants?: unknown[];
  images?: unknown[];
};

type CartItemForEvaluation = NonNullable<ValidateCouponInput['cartItems']>[number];
type CouponRules = NonNullable<CouponModel['rules']>;

/** Helper to convert slug string into valid PostgreSQL LTREE path segment */
export function sanitizeForLtree(slug: string): string {
  const sanitized = slug.replace(/[^a-zA-Z0-9_]/g, '_');
  return sanitized.length > 0 ? sanitized : 'item';
}

/**
 * Business logic service for the Catalog Module.
 */
export class CatalogService {
  private readonly repo = new CatalogRepository();

  // ========================= Private Helpers =========================

  private async ensureEcommerce(ecommerceId: string): Promise<void> {
    const store = await this.repo.findEcommerceById(ecommerceId);
    if (!store) throw new NotFoundError('Ecommerce');
  }

  private toProductResponse(product: ProductModel): ProductResponse {
    const variants = (product as unknown as { variants?: ProductVariantModel[] }).variants;
    let computedQuantity = product.quantity;

    if (product.hasVariants && Array.isArray(variants)) {
      computedQuantity = variants
        .filter((v) => v.status === VariantStatus.ACTIVE)
        .reduce((sum, v) => sum + (v.quantity ?? 0), 0);
    }

    return {
      ...product.toJSON(),
      computedQuantity,
    };
  }

  private async ensureProduct(ecommerceId: string, productId: string): Promise<ProductModel> {
    const product = await this.repo.findProductById(ecommerceId, productId);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  private async validateUnit(unitId?: string | null): Promise<void> {
    if (!unitId) return;
    const unit = await this.repo.findUnitById(unitId);
    if (!unit) {
      throw new NotFoundError('Unit');
    }
  }

  // fallow-ignore-next-line complexity
  private async validateVariantOptionValues(
    productId: string,
    valueIds: string[],
    excludeVariantId?: string,
  ): Promise<void> {
    const values = await this.repo.findOptionValuesByIds(valueIds);
    if (values.length !== valueIds.length) {
      throw new ValidationError('One or more option value IDs are invalid');
    }

    const options = await this.repo.findOptionsByProduct(productId);
    const validOptionIds = new Set(options.map((o) => o.id));

    for (const val of values) {
      if (!validOptionIds.has(val.productOptionId)) {
        throw new ValidationError(`Option value "${val.value}" does not belong to this product`);
      }
    }

    const optionUsage = new Map<string, string>();
    for (const val of values) {
      if (optionUsage.has(val.productOptionId)) {
        throw new ValidationError('A variant cannot contain multiple values for the same option');
      }
      optionUsage.set(val.productOptionId, val.id);
    }

    if (optionUsage.size !== options.length) {
      throw new ValidationError('Variant must specify exactly one value for every product option');
    }

    const existingVariants = await this.repo.findVariantsByProduct(productId);
    const sortedTargetIds = [...valueIds].sort().join(',');

    for (const existing of existingVariants) {
      if (excludeVariantId && existing.id === excludeVariantId) continue;
      const existingValues = (existing as unknown as { optionValues?: ProductOptionValueModel[] })
        .optionValues;
      if (Array.isArray(existingValues)) {
        const sortedExistingIds = existingValues
          .map((v) => v.id)
          .sort()
          .join(',');
        if (sortedTargetIds === sortedExistingIds) {
          throw new ConflictError(
            'A variant with this exact combination of option values already exists',
          );
        }
      }
    }
  }

  // ========================= Category Tree Path Helpers =========================

  // fallow-ignore-next-line complexity
  private async buildUpdatedPath(
    ecommerceId: string,
    category: CategoryModel,
    input: UpdateCategoryInput,
  ): Promise<string> {
    const ltreeSegment = input.slug
      ? sanitizeForLtree(input.slug)
      : sanitizeForLtree(category.slug);
    let newParentPath = '';

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        newParentPath = '';
      } else {
        if (input.parentId === category.id) {
          throw new ValidationError('A category cannot be its own parent');
        }
        const newParent = await this.repo.findCategoryById(ecommerceId, input.parentId);
        if (!newParent) {
          throw new NotFoundError('Target parent category');
        }

        if (newParent.path === category.path || newParent.path.startsWith(`${category.path}.`)) {
          throw new ValidationError('Cannot move a category under one of its own descendants');
        }

        newParentPath = newParent.path;
      }
    } else {
      const pathParts = category.path.split('.');
      pathParts.pop();
      newParentPath = pathParts.join('.');
    }

    return newParentPath ? `${newParentPath}.${ltreeSegment}` : ltreeSegment;
  }

  // ========================= Ecommerce =========================

  async getEcommerce(id: string): Promise<EcommerceModel> {
    const ecommerce = await this.repo.findEcommerceById(id);
    if (!ecommerce) throw new NotFoundError('Ecommerce');
    return ecommerce;
  }

  async listEcommerce(): Promise<EcommerceModel[]> {
    return this.repo.findAllEcommerce();
  }

  async createEcommerce(input: CreateEcommerceInput): Promise<EcommerceModel> {
    const existing = await this.repo.findEcommerceBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Ecommerce with slug "${input.slug}" already exists`);
    }

    const ecommerce = await this.repo.createEcommerce(input);
    logger.info('Ecommerce created', { id: ecommerce.id, slug: ecommerce.slug });
    return ecommerce;
  }

  async updateEcommerce(id: string, input: UpdateEcommerceInput): Promise<EcommerceModel> {
    if (input.slug) {
      const existing = await this.repo.findEcommerceBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Ecommerce with slug "${input.slug}" already exists`);
      }
    }

    const updated = await this.repo.updateEcommerce(id, input);
    if (!updated) throw new NotFoundError('Ecommerce');
    return updated;
  }

  // ========================= Categories =========================

  async getCategory(ecommerceId: string, id: string): Promise<CategoryModel> {
    const category = await this.repo.findCategoryById(ecommerceId, id);
    if (!category) throw new NotFoundError('Category');
    return category;
  }

  async listCategories(ecommerceId: string, includeInactive = false): Promise<CategoryModel[]> {
    return this.repo.findCategoriesByEcommerce(ecommerceId, includeInactive);
  }

  async createCategory(ecommerceId: string, input: CreateCategoryInput): Promise<CategoryModel> {
    const existingSlug = await this.repo.findCategoryBySlug(ecommerceId, input.slug);
    if (existingSlug) {
      throw new ConflictError(
        `Category with slug "${input.slug}" already exists in this ecommerce`,
      );
    }

    const ltreeSegment = sanitizeForLtree(input.slug);
    let path = ltreeSegment;

    if (input.parentId) {
      const parent = await this.repo.findCategoryById(ecommerceId, input.parentId);
      if (!parent) {
        throw new NotFoundError('Parent category');
      }
      path = `${parent.path}.${ltreeSegment}`;
    }

    const category = await this.repo.createCategory(ecommerceId, { ...input, path });
    logger.info('Category created', { id: category.id, path, ecommerceId });
    return category;
  }

  async updateCategory(
    ecommerceId: string,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryModel> {
    const category = await this.repo.findCategoryById(ecommerceId, id);
    if (!category) throw new NotFoundError('Category');

    if (input.slug && input.slug !== category.slug) {
      const existingSlug = await this.repo.findCategoryBySlug(ecommerceId, input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError(
          `Category with slug "${input.slug}" already exists in this ecommerce`,
        );
      }
    }

    const oldPath = category.path;
    const newPath = await this.buildUpdatedPath(ecommerceId, category, input);

    if (oldPath !== newPath) {
      const updated = await getSequelize().transaction(async (t) => {
        const cat = await this.repo.updateCategory(ecommerceId, id, { ...input, path: newPath }, t);
        if (oldPath !== newPath) {
          await this.repo.updateCategorySubtreePath(ecommerceId, oldPath, newPath, t);
        }
        return cat;
      });

      if (!updated) throw new NotFoundError('Category');
      logger.info('Category and subtree path updated', { id, oldPath, newPath });
      return updated;
    }

    const updated = await this.repo.updateCategory(ecommerceId, id, input);
    if (!updated) throw new NotFoundError('Category');
    return updated;
  }

  async deleteCategory(ecommerceId: string, id: string): Promise<void> {
    const category = await this.repo.findCategoryById(ecommerceId, id);
    if (!category) throw new NotFoundError('Category');

    await getSequelize().transaction(async (t) => {
      await this.repo.deleteCategory(ecommerceId, id, t);
    });

    logger.info('Category deleted', { id, ecommerceId });
  }

  // ========================= Products =========================

  async getProduct(
    ecommerceId: string,
    id: string,
    includeDetails = true,
  ): Promise<ProductResponse> {
    const product = await this.repo.findProductById(ecommerceId, id, includeDetails);
    if (!product) throw new NotFoundError('Product');
    return this.toProductResponse(product);
  }

  async listProducts(
    ecommerceId: string,
    filter?: { categoryId?: string; status?: string },
  ): Promise<ProductResponse[]> {
    const products = await this.repo.findProductsByEcommerce(ecommerceId, filter);
    return products.map((product) => this.toProductResponse(product));
  }

  async createProduct(ecommerceId: string, input: CreateProductInput): Promise<ProductModel> {
    if (
      input.offerPrice !== null &&
      input.offerPrice !== undefined &&
      input.offerPrice > input.price
    ) {
      throw new ValidationError('Offer price cannot exceed normal price');
    }

    const existingSlug = await this.repo.findProductBySlug(ecommerceId, input.slug);
    if (existingSlug) {
      throw new ConflictError(`Product with slug "${input.slug}" already exists in this ecommerce`);
    }

    if (input.categoryId) {
      const category = await this.repo.findCategoryById(ecommerceId, input.categoryId);
      if (!category) throw new NotFoundError('Category');
    }

    const finalInput = {
      ...input,
      offerPrice: input.offerPrice ?? null,
      quantity: input.hasVariants ? 0 : input.quantity,
    };

    const product = await this.repo.createProduct(ecommerceId, finalInput);
    logger.info('Product created', {
      id: product.id,
      ecommerceId,
      hasVariants: product.hasVariants,
    });
    return product;
  }

  // fallow-ignore-next-line complexity
  async updateProduct(
    ecommerceId: string,
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductModel> {
    const product = await this.ensureProduct(ecommerceId, id);

    const effectivePrice = input.price ?? product.price;
    const effectiveOfferPrice =
      input.offerPrice !== undefined ? input.offerPrice : product.offerPrice;

    if (
      effectiveOfferPrice !== null &&
      effectiveOfferPrice !== undefined &&
      effectiveOfferPrice > effectivePrice
    ) {
      throw new ValidationError('Offer price cannot exceed normal price');
    }

    if (input.slug && input.slug !== product.slug) {
      const existingSlug = await this.repo.findProductBySlug(ecommerceId, input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError(
          `Product with slug "${input.slug}" already exists in this ecommerce`,
        );
      }
    }

    if (input.categoryId) {
      const category = await this.repo.findCategoryById(ecommerceId, input.categoryId);
      if (!category) throw new NotFoundError('Category');
    }

    const willHaveVariants = input.hasVariants ?? product.hasVariants;
    if (willHaveVariants && input.quantity !== undefined) {
      if (input.quantity !== product.quantity) {
        throw new ValidationError(
          'Cannot directly set product quantity for products with variants. Manage variant quantities instead.',
        );
      }
      delete input.quantity;
    }

    const updated = await this.repo.updateProduct(ecommerceId, id, input);
    if (!updated) throw new NotFoundError('Product');
    logger.info('Product updated', { id, ecommerceId });
    return updated;
  }

  async deleteProduct(ecommerceId: string, id: string): Promise<void> {
    await this.ensureProduct(ecommerceId, id);

    await getSequelize().transaction(async (t) => {
      await this.repo.deleteProduct(ecommerceId, id, t);
    });

    logger.info('Product deleted', { id, ecommerceId });
  }

  private validateImageUploadLimit(
    existingCount: number,
    incomingCount: number,
    entityName: string,
  ): void {
    if (existingCount + incomingCount > 10) {
      throw new ValidationError(
        `Cannot upload ${incomingCount} images. ${entityName} already has ${existingCount} images (max limit: 10).`,
      );
    }
  }

  // ========================= Product & Variant Image Handlers =========================

  async uploadProductImages(
    ecommerceId: string,
    productId: string,
    files: Express.Multer.File[],
  ): Promise<ProductImageModel[]> {
    const product = await this.ensureProduct(ecommerceId, productId);
    const existingImages = (product as unknown as { images?: ProductImageModel[] }).images ?? [];

    this.validateImageUploadLimit(existingImages.length, files.length, 'Product');

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinaryService.uploadImageBuffer(file.buffer, 'products');
        return { url: result.url, publicId: result.publicId };
      }),
    );

    const images = await this.repo.addProductImages(productId, uploadResults);
    logger.info('Product images uploaded', { productId, count: images.length });
    return images;
  }

  private async safelyDeleteCloudinaryImage(
    publicId?: string | null,
    itemType = 'product',
  ): Promise<void> {
    if (!publicId) return;
    await cloudinaryService.deleteImage(publicId).catch((err: unknown) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Failed to delete ${itemType} image from Cloudinary`, {
        publicId,
        error: errorMsg,
      });
    });
  }

  async deleteProductImage(ecommerceId: string, productId: string, imageId: string): Promise<void> {
    await this.ensureProduct(ecommerceId, productId);
    const image = await this.repo.findProductImageById(productId, imageId);
    if (!image) throw new NotFoundError('Product image');

    await this.safelyDeleteCloudinaryImage(image.publicId, 'product');

    await this.repo.deleteProductImage(imageId);
    logger.info('Product image deleted', { imageId, productId });
  }

  async uploadVariantImages(
    ecommerceId: string,
    productId: string,
    variantId: string,
    files: Express.Multer.File[],
  ): Promise<ProductVariantImageModel[]> {
    await this.ensureProduct(ecommerceId, productId);
    const variant = await this.getVariant(ecommerceId, productId, variantId);
    const existingImages =
      (variant as unknown as { images?: ProductVariantImageModel[] }).images ?? [];

    this.validateImageUploadLimit(existingImages.length, files.length, 'Variant');

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinaryService.uploadImageBuffer(file.buffer, 'variants');
        return { url: result.url, publicId: result.publicId };
      }),
    );

    const images = await this.repo.addVariantImages(variantId, uploadResults);
    logger.info('Variant images uploaded', { variantId, count: images.length });
    return images;
  }

  async deleteVariantImage(
    ecommerceId: string,
    productId: string,
    variantId: string,
    imageId: string,
  ): Promise<void> {
    await this.ensureProduct(ecommerceId, productId);
    await this.getVariant(ecommerceId, productId, variantId);

    const image = await this.repo.findVariantImageById(variantId, imageId);
    if (!image) throw new NotFoundError('Variant image');

    await this.safelyDeleteCloudinaryImage(image.publicId, 'variant');

    await this.repo.deleteVariantImage(imageId);
    logger.info('Variant image deleted', { imageId, variantId });
  }

  // ========================= Options =========================

  async listProductOptions(ecommerceId: string, productId: string): Promise<ProductOptionModel[]> {
    await this.ensureProduct(ecommerceId, productId);
    return this.repo.findOptionsByProduct(productId);
  }

  async createProductOption(
    ecommerceId: string,
    productId: string,
    input: CreateProductOptionInput,
  ): Promise<ProductOptionModel> {
    await this.ensureProduct(ecommerceId, productId);

    const existingOptions = await this.repo.findOptionsByProduct(productId);
    const duplicate = existingOptions.find(
      (o) => o.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictError(`Option "${input.name}" already exists for this product`);
    }

    const option = await this.repo.createProductOption(productId, input);
    logger.info('Product option created', { id: option.id, name: option.name, productId });
    return option;
  }

  async updateProductOption(
    ecommerceId: string,
    productId: string,
    optionId: string,
    input: UpdateProductOptionInput,
  ): Promise<ProductOptionModel> {
    const existing = await this.repo.findProductOptionById(productId, optionId);
    if (!existing) throw new NotFoundError('Product option');

    await this.ensureProduct(ecommerceId, productId);

    const newName = input.name;
    if (newName && newName.toLowerCase() !== existing.name.toLowerCase()) {
      const allOptions = await this.repo.findOptionsByProduct(productId);
      const duplicate = allOptions.find(
        (o) => o.id !== optionId && o.name.toLowerCase() === newName.toLowerCase(),
      );
      if (duplicate) {
        throw new ConflictError(`Option "${newName}" already exists for this product`);
      }
    }

    const updated = await this.repo.updateProductOption(optionId, input);
    if (!updated) throw new NotFoundError('Product option');
    return updated;
  }

  async deleteProductOption(
    ecommerceId: string,
    productId: string,
    optionId: string,
  ): Promise<void> {
    const existing = await this.repo.findProductOptionById(productId, optionId);
    if (!existing) throw new NotFoundError('Product option');

    await this.ensureProduct(ecommerceId, productId);

    await this.repo.deleteProductOption(optionId);
    logger.info('Product option deleted', { optionId, productId });
  }

  // ========================= Option Values =========================

  async createProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    input: CreateProductOptionValueInput,
  ): Promise<ProductOptionValueModel> {
    await this.ensureProduct(ecommerceId, productId);

    const option = await this.repo.findProductOptionById(productId, optionId);
    if (!option) throw new NotFoundError('Product option');

    await this.validateUnit(input.unitId);

    const existingValues =
      (option as unknown as { values?: ProductOptionValueModel[] }).values ?? [];
    const duplicate = existingValues.find(
      (v) => v.value.toLowerCase() === input.value.toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictError(`Option value "${input.value}" already exists for this option`);
    }

    const val = await this.repo.createProductOptionValue(optionId, input);
    logger.info('Product option value created', { id: val.id, value: val.value, optionId });
    return val;
  }

  private async ensureProductAndOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    valueId: string,
  ): Promise<{ option: ProductOptionModel; valueRecord: ProductOptionValueModel }> {
    await this.ensureProduct(ecommerceId, productId);

    const option = await this.repo.findProductOptionById(productId, optionId);
    if (!option) throw new NotFoundError('Product option');

    const valueRecord = await this.repo.findProductOptionValueById(optionId, valueId);
    if (!valueRecord) throw new NotFoundError('Product option value');

    return { option, valueRecord };
  }

  async updateProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    valueId: string,
    input: UpdateProductOptionValueInput,
  ): Promise<ProductOptionValueModel> {
    const { option, valueRecord } = await this.ensureProductAndOptionValue(
      ecommerceId,
      productId,
      optionId,
      valueId,
    );

    await this.validateUnit(input.unitId);

    const newValue = input.value;
    if (newValue && newValue.toLowerCase() !== valueRecord.value.toLowerCase()) {
      const existingValues =
        (option as unknown as { values?: ProductOptionValueModel[] }).values ?? [];
      const duplicate = existingValues.find(
        (v) => v.id !== valueId && v.value.toLowerCase() === newValue.toLowerCase(),
      );
      if (duplicate) {
        throw new ConflictError(`Option value "${newValue}" already exists for this option`);
      }
    }

    const updated = await this.repo.updateProductOptionValue(valueId, input);
    if (!updated) throw new NotFoundError('Product option value');
    return updated;
  }

  async deleteProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    valueId: string,
  ): Promise<void> {
    await this.ensureProductAndOptionValue(ecommerceId, productId, optionId, valueId);
    await this.repo.deleteProductOptionValue(valueId);
  }

  // ========================= Variants =========================

  async createVariant(
    ecommerceId: string,
    productId: string,
    input: CreateProductVariantInput,
  ): Promise<ProductVariantModel> {
    if (
      input.offerPrice !== null &&
      input.offerPrice !== undefined &&
      input.price !== null &&
      input.price !== undefined &&
      input.offerPrice > input.price
    ) {
      throw new ValidationError('Offer price cannot exceed normal price');
    }

    const product = await this.ensureProduct(ecommerceId, productId);

    const existingSku = await this.repo.findVariantBySku(productId, input.sku);
    if (existingSku) {
      throw new ConflictError(`Variant SKU "${input.sku}" already exists for this product`);
    }

    await this.validateVariantOptionValues(productId, input.optionValueIds);

    return getSequelize().transaction(async (t) => {
      if (!product.hasVariants) {
        await product.update({ hasVariants: true, quantity: 0 }, { transaction: t });
      }

      const variant = await this.repo.createProductVariant(productId, input, t);
      logger.info('Variant created', { id: variant.id, sku: variant.sku, productId });
      return variant;
    });
  }

  async listVariants(ecommerceId: string, productId: string): Promise<ProductVariantModel[]> {
    await this.ensureProduct(ecommerceId, productId);
    return this.repo.findVariantsByProduct(productId);
  }

  async getVariant(
    ecommerceId: string,
    productId: string,
    variantId: string,
  ): Promise<ProductVariantModel> {
    await this.ensureProduct(ecommerceId, productId);
    const variant = await this.repo.findVariantById(productId, variantId);
    if (!variant) throw new NotFoundError('Product variant');
    return variant;
  }

  async updateVariant(
    ecommerceId: string,
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput,
  ): Promise<ProductVariantModel> {
    const product = await this.ensureProduct(ecommerceId, productId);
    const variant = await this.repo.findVariantById(productId, variantId);
    if (!variant) throw new NotFoundError('Product variant');

    const effectivePrice = input.price ?? variant.price ?? product.price;
    const effectiveOfferPrice =
      input.offerPrice !== undefined ? input.offerPrice : variant.offerPrice;

    if (
      effectiveOfferPrice !== null &&
      effectiveOfferPrice !== undefined &&
      effectivePrice !== null &&
      effectivePrice !== undefined &&
      effectiveOfferPrice > effectivePrice
    ) {
      throw new ValidationError('Offer price cannot exceed normal price');
    }

    if (input.sku && input.sku !== variant.sku) {
      const existingSku = await this.repo.findVariantBySku(productId, input.sku);
      if (existingSku && existingSku.id !== variantId) {
        throw new ConflictError(`Variant SKU "${input.sku}" already exists for this product`);
      }
    }

    if (input.optionValueIds) {
      await this.validateVariantOptionValues(productId, input.optionValueIds, variantId);
    }

    const updated = await this.repo.updateProductVariant(productId, variantId, input);
    if (!updated) throw new NotFoundError('Product variant');
    return updated;
  }

  async deleteVariant(ecommerceId: string, productId: string, variantId: string): Promise<void> {
    await this.ensureProduct(ecommerceId, productId);
    const variant = await this.repo.findVariantById(productId, variantId);
    if (!variant) throw new NotFoundError('Product variant');

    await this.repo.deleteProductVariant(productId, variantId);
    logger.info('Variant deleted', { variantId, productId });
  }

  // ========================= Units (Shared Reference Data) =========================

  async listUnits(category?: string): Promise<UnitModel[]> {
    return this.repo.findAllUnits(category);
  }

  async getUnit(id: string): Promise<UnitModel> {
    const unit = await this.repo.findUnitById(id);
    if (!unit) throw new NotFoundError('Unit');
    return unit;
  }

  // ========================= Banners =========================

  async listBanners(ecommerceId: string, onlyActive = false): Promise<BannerModel[]> {
    return this.repo.findBannersByEcommerce(ecommerceId, onlyActive);
  }

  async getBanner(ecommerceId: string, id: string): Promise<BannerModel> {
    const banner = await this.repo.findBannerById(ecommerceId, id);
    if (!banner) throw new NotFoundError('Banner');
    return banner;
  }

  async createBanner(ecommerceId: string, input: CreateBannerInput): Promise<BannerModel> {
    const banner = await this.repo.createBanner(ecommerceId, input);
    logger.info('Banner created', { id: banner.id, ecommerceId });
    return banner;
  }

  async updateBanner(
    ecommerceId: string,
    id: string,
    input: UpdateBannerInput,
  ): Promise<BannerModel> {
    const updated = await this.repo.updateBanner(ecommerceId, id, input);
    if (!updated) throw new NotFoundError('Banner');
    logger.info('Banner updated', { id, ecommerceId });
    return updated;
  }

  async deleteBanner(ecommerceId: string, id: string): Promise<void> {
    const banner = await this.repo.findBannerById(ecommerceId, id);
    if (!banner) throw new NotFoundError('Banner');

    if (banner.publicId) {
      await cloudinaryService.deleteImage(banner.publicId).catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn('Failed to delete banner image from Cloudinary', {
          publicId: banner.publicId,
          error: errorMsg,
        });
      });
    }

    await this.repo.deleteBanner(ecommerceId, id);
    logger.info('Banner deleted', { id, ecommerceId });
  }

  async uploadBannerImage(
    fileBuffer: Buffer,
    _fileName: string,
    _mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    const uploadResult = await cloudinaryService.uploadImageBuffer(fileBuffer, 'banners');
    return { url: uploadResult.url, publicId: uploadResult.publicId };
  }

  // ========================= Orders =========================

  async listOrders(ecommerceId: string): Promise<OrderRecord[]> {
    await this.ensureEcommerce(ecommerceId);
    return this.repo.listOrders(ecommerceId);
  }

  private async processOrderCoupon(
    ecommerceId: string,
    orderId: string,
    input: CreateOrderInput,
    transaction: Transaction,
  ): Promise<{ couponId: string | null; couponCode: string | null; couponDiscount: number }> {
    let couponId = input.couponId ?? null;
    let couponCode = input.couponCode ?? null;
    let couponDiscount = Number(input.couponDiscount) || 0;

    if (!input.couponCode) {
      return { couponId, couponCode, couponDiscount };
    }

    const evalResult = await this.evaluateCoupon(
      ecommerceId,
      {
        code: input.couponCode,
        customerEmail: input.customerEmail,
        cartItems: (input.items as unknown as ValidateCouponInput['cartItems']) ?? [],
        subtotal: input.total + (input.couponDiscount ?? 0),
      },
      transaction,
    );

    if (evalResult.valid) {
      couponId = evalResult.couponId ?? couponId;
      couponCode = evalResult.code ?? couponCode;
      couponDiscount = evalResult.discountAmount ?? couponDiscount;

      if (couponId) {
        await this.repo.recordCouponUsage(
          ecommerceId,
          {
            couponId,
            orderId,
            customerEmail: input.customerEmail,
            discountAmount: couponDiscount,
          },
          transaction,
        );
      }
    }

    return { couponId, couponCode, couponDiscount };
  }

  async createOrder(ecommerceId: string, input: CreateOrderInput): Promise<OrderRecord | null> {
    await this.ensureEcommerce(ecommerceId);
    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const orderId = input.id || uuidv4();
      const couponInfo = await this.processOrderCoupon(ecommerceId, orderId, input, transaction);

      const orderData: CreateOrderInput = {
        ...input,
        id: orderId,
        couponId: couponInfo.couponId,
        couponCode: couponInfo.couponCode,
        couponDiscount: couponInfo.couponDiscount,
      };

      const order = await this.repo.createOrder(ecommerceId, orderData, transaction);
      await transaction.commit();
      logger.info('Order created successfully', { id: orderId, ecommerceId });
      return order;
    } catch (err) {
      logger.error('Failed to create order', { error: err, ecommerceId });
      await transaction.rollback();
      throw err;
    }
  }

  async updateOrderStatus(
    ecommerceId: string,
    orderId: string,
    status: string,
  ): Promise<OrderRecord> {
    await this.ensureEcommerce(ecommerceId);
    const updated = await this.repo.updateOrderStatus(ecommerceId, orderId, status);
    if (!updated) {
      throw new NotFoundError('Order');
    }
    return updated;
  }

  // ========================= Coupons =========================

  async createCoupon(ecommerceId: string, input: CreateCouponInput): Promise<CouponModel> {
    await this.ensureEcommerce(ecommerceId);
    const normalizedCode = input.code.trim().toUpperCase();
    const existing = await this.repo.getCouponByCode(ecommerceId, normalizedCode);
    if (existing) {
      throw new ConflictError(`Coupon with code "${normalizedCode}" already exists`);
    }

    const coupon = await this.repo.createCoupon(ecommerceId, input);
    logger.info('Coupon created', { id: coupon.id, code: coupon.code, ecommerceId });
    return coupon;
  }

  async updateCoupon(
    ecommerceId: string,
    id: string,
    input: UpdateCouponInput,
  ): Promise<CouponModel> {
    await this.ensureEcommerce(ecommerceId);
    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      const existing = await this.repo.getCouponByCode(ecommerceId, normalizedCode);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Coupon with code "${normalizedCode}" already exists`);
      }
    }

    const updated = await this.repo.updateCoupon(ecommerceId, id, input);
    if (!updated) throw new NotFoundError('Coupon');
    logger.info('Coupon updated', { id, ecommerceId });
    return updated;
  }

  async deleteCoupon(ecommerceId: string, id: string): Promise<void> {
    await this.ensureEcommerce(ecommerceId);
    const deleted = await this.repo.deleteCoupon(ecommerceId, id);
    if (!deleted) throw new NotFoundError('Coupon');
    logger.info('Coupon deleted', { id, ecommerceId });
  }

  async getCouponById(ecommerceId: string, id: string): Promise<CouponModel> {
    await this.ensureEcommerce(ecommerceId);
    const coupon = await this.repo.getCouponById(ecommerceId, id);
    if (!coupon) throw new NotFoundError('Coupon');
    return coupon;
  }

  async listCoupons(ecommerceId: string, filter?: CouponQueryInput): Promise<CouponModel[]> {
    await this.ensureEcommerce(ecommerceId);
    return this.repo.listCoupons(ecommerceId, filter);
  }

  // ========================= Centralized Coupon Evaluation Engine =========================

  private validateCouponState(coupon: CouponModel, now: Date): string | null {
    if (!coupon.isActive) return 'Coupon is not active';
    if (coupon.startDate && now < new Date(coupon.startDate)) return 'Coupon is not yet active';
    if (coupon.expiryDate && now > new Date(coupon.expiryDate)) return 'Coupon has expired';
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return 'Coupon usage limit reached';
    }
    return null;
  }

  private async validateCouponLimits(
    ecommerceId: string,
    coupon: CouponModel,
    input: ValidateCouponInput,
    transaction?: Transaction,
  ): Promise<string | null> {
    if (coupon.usageLimitPerUser !== null && input.customerEmail) {
      const userUsageCount = await this.repo.getCustomerCouponUsageCount(
        ecommerceId,
        coupon.id,
        input.customerEmail,
        transaction,
      );
      if (userUsageCount >= coupon.usageLimitPerUser) {
        return 'You have already reached the maximum usage limit for this coupon';
      }
    }
    return null;
  }

  private async checkFirstOrderRule(
    ecommerceId: string,
    email?: string | null,
  ): Promise<string | null> {
    if (!email) return 'Please provide your email address to apply this first-order coupon';
    const orderCount = await this.repo.getCustomerOrderCount(ecommerceId, email);
    return orderCount > 0 ? 'This coupon is valid only for your first order' : null;
  }

  private checkMinOrderValueRule(rules: CouponRules, subtotal: number): string | null {
    const minOrderValue = Number(rules.minOrderValue) || 0;
    if (subtotal < minOrderValue) {
      return `Minimum order value of ₹${minOrderValue.toFixed(2)} required to apply this coupon`;
    }
    return null;
  }

  private async checkOrderNumberRule(
    ecommerceId: string,
    rules: CouponRules,
    email?: string | null,
  ): Promise<string | null> {
    const reqOrderNum = Number(rules.requiredOrderNumber) || 1;
    if (!email) return 'Please provide your email address to apply this coupon';
    const orderCount = await this.repo.getCustomerOrderCount(ecommerceId, email);
    if (orderCount + 1 !== reqOrderNum) {
      return `This coupon is valid only on order #${reqOrderNum}`;
    }
    return null;
  }

  private async resolveBehaviorEligibleItems(
    ecommerceId: string,
    rules: CouponRules,
    input: ValidateCouponInput,
    cartItems: CartItemForEvaluation[],
    totalCartSubtotal: number,
  ): Promise<{ error?: string; eligibleItems: CartItemForEvaluation[] }> {
    const behaviorType = rules.behaviorType;
    let error: string | null = null;

    if (behaviorType === UserBehaviorRuleType.FIRST_ORDER) {
      error = await this.checkFirstOrderRule(ecommerceId, input.customerEmail);
    } else if (behaviorType === UserBehaviorRuleType.MIN_ORDER_VALUE) {
      error = this.checkMinOrderValueRule(rules, input.subtotal ?? totalCartSubtotal);
    } else if (behaviorType === UserBehaviorRuleType.ORDER_NUMBER) {
      error = await this.checkOrderNumberRule(ecommerceId, rules, input.customerEmail);
    }

    if (error) {
      return { error, eligibleItems: [] };
    }
    return { eligibleItems: cartItems };
  }

  private async resolveTargetEligibleItems(
    ecommerceId: string,
    coupon: CouponModel,
    cartItems: CartItemForEvaluation[],
    input: ValidateCouponInput,
    totalCartSubtotal: number,
  ): Promise<{ error?: string; eligibleItems: CartItemForEvaluation[] }> {
    const targetType = coupon.targetType;
    const rules = coupon.rules ?? {};

    if (targetType === CouponTargetType.ALL_PRODUCTS) {
      return { eligibleItems: cartItems };
    }

    if (targetType === CouponTargetType.PRODUCT) {
      const targetProductIds = Array.isArray(rules.productIds) ? rules.productIds : [];
      const eligibleItems = cartItems.filter(
        (it) => it.product?.id && targetProductIds.includes(it.product.id),
      );
      if (eligibleItems.length === 0) {
        return {
          error: 'Coupon is not applicable to any products in your cart',
          eligibleItems: [],
        };
      }
      return { eligibleItems };
    }

    if (targetType === CouponTargetType.CATEGORY) {
      const targetCategoryId = rules.categoryId;
      if (!targetCategoryId) {
        return {
          error: 'Category coupon configuration is missing target category',
          eligibleItems: [],
        };
      }
      const descendantCategoryIds = await this.repo.getDescendantCategoryIds(
        ecommerceId,
        targetCategoryId,
      );
      const eligibleItems = cartItems.filter(
        (it) => it.product?.categoryId && descendantCategoryIds.includes(it.product.categoryId),
      );
      if (eligibleItems.length === 0) {
        return {
          error: 'Coupon is not applicable to any products in the targeted category',
          eligibleItems: [],
        };
      }
      return { eligibleItems };
    }

    if (targetType === CouponTargetType.USER_BEHAVIOR) {
      return this.resolveBehaviorEligibleItems(
        ecommerceId,
        rules,
        input,
        cartItems,
        totalCartSubtotal,
      );
    }

    return { eligibleItems: cartItems };
  }

  private calculateDiscountAmount(
    discountType: CouponDiscountType,
    discountValue: number,
    eligibleSubtotal: number,
  ): number {
    const rawDiscount =
      discountType === CouponDiscountType.PERCENTAGE
        ? (eligibleSubtotal * discountValue) / 100
        : discountValue;
    return Math.max(0, Math.min(eligibleSubtotal, Math.round(rawDiscount * 100) / 100));
  }

  async evaluateCoupon(
    ecommerceId: string,
    input: ValidateCouponInput,
    transaction?: Transaction,
  ): Promise<CouponEvaluationResult> {
    await this.ensureEcommerce(ecommerceId);
    const code = (input.code ?? '').trim().toUpperCase();
    if (!code) {
      return {
        valid: false,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: 'Coupon code is required',
      };
    }

    const coupon = await this.repo.getCouponByCode(ecommerceId, code, transaction);
    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: 'Invalid coupon code',
      };
    }

    const stateError = this.validateCouponState(coupon, new Date());
    if (stateError) {
      return {
        valid: false,
        couponId: coupon.id,
        code: coupon.code,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: stateError,
      };
    }

    const limitError = await this.validateCouponLimits(ecommerceId, coupon, input, transaction);
    if (limitError) {
      return {
        valid: false,
        couponId: coupon.id,
        code: coupon.code,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: limitError,
      };
    }

    const cartItems = Array.isArray(input.cartItems) ? input.cartItems : [];
    const totalCartSubtotal = cartItems.reduce(
      (sum, it) => sum + (it.pricing?.effectivePrice ?? 0) * (it.quantity ?? 1),
      0,
    );

    const { error: targetError, eligibleItems } = await this.resolveTargetEligibleItems(
      ecommerceId,
      coupon,
      cartItems,
      input,
      totalCartSubtotal,
    );
    if (targetError) {
      return {
        valid: false,
        couponId: coupon.id,
        code: coupon.code,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: targetError,
      };
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, it) => sum + (it.pricing?.effectivePrice ?? 0) * (it.quantity ?? 1),
      0,
    );
    const discountAmount = this.calculateDiscountAmount(
      coupon.discountType,
      coupon.discountValue,
      eligibleSubtotal,
    );
    const affectedItemIds = eligibleItems
      .map((it) => it.id ?? it.product?.id)
      .filter((id): id is string => Boolean(id));

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED',
      discountValue: coupon.discountValue,
      discountAmount,
      eligibleSubtotal,
      affectedItemIds,
      message: 'Coupon applied successfully',
    };
  }

  // ========================= Real Customers =========================

  async listCustomers(ecommerceId: string): Promise<CustomerSummary[]> {
    await this.ensureEcommerce(ecommerceId);
    return this.repo.listCustomers(ecommerceId);
  }
}
