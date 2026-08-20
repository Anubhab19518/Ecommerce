import { getSequelize } from '@infrastructure/database/connection';
import { logger } from '@infrastructure/logging/logger';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';
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
} from './catalog.validator';
import {
  VariantStatus,
  type CategoryModel,
  type EcommerceModel,
  type ProductAttributes,
  type ProductModel,
  type ProductOptionModel,
  type ProductOptionValueModel,
  type ProductVariantModel,
  type UnitModel,
} from './models';

export type ProductResponse = ProductAttributes & {
  computedQuantity: number;
  category?: unknown;
  options?: unknown[];
  variants?: unknown[];
};

/** Helper to convert slug string into valid PostgreSQL LTREE path segment */
export function sanitizeForLtree(slug: string): string {
  // LTREE labels must match [A-Za-z0-9_]{1,256}
  const sanitized = slug.replace(/[^a-zA-Z0-9_]/g, '_');
  return sanitized.length > 0 ? sanitized : 'item';
}

/**
 * Business logic service for the Catalog Module.
 */
export class CatalogService {
  private readonly repo = new CatalogRepository();

  // ========================= Private Helpers =========================

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
    if (unitId) {
      const unit = await this.repo.findUnitById(unitId);
      if (!unit) throw new NotFoundError('Unit');
    }
  }

  private async ensureOption(productId: string, optionId: string): Promise<ProductOptionModel> {
    const option = await this.repo.findProductOptionById(productId, optionId);
    if (!option) throw new NotFoundError('Product option');
    return option;
  }

  private async validateVariantOptionValues(
    productId: string,
    optionValueIds: string[],
    excludeVariantId?: string,
  ): Promise<void> {
    const optionValues = await this.repo.findOptionValuesByIds(optionValueIds);
    if (optionValues.length !== optionValueIds.length) {
      throw new ValidationError('One or more option value IDs are invalid');
    }

    const productOptions = await this.repo.findOptionsByProduct(productId);
    const validOptionIds = new Set(productOptions.map((o) => o.id));
    const seenOptionIds = new Set<string>();

    for (const ov of optionValues) {
      if (!validOptionIds.has(ov.productOptionId)) {
        throw new ValidationError(`Option value "${ov.value}" does not belong to this product`);
      }
      if (seenOptionIds.has(ov.productOptionId)) {
        throw new ValidationError('A variant cannot contain multiple values for the same option');
      }
      seenOptionIds.add(ov.productOptionId);
    }

    const existingVariants = await this.repo.findVariantsByProduct(productId);
    const newCombinationKey = [...optionValueIds].sort().join(':');

    for (const v of existingVariants) {
      if (excludeVariantId && v.id === excludeVariantId) continue;
      const existingKey = (
        (v as unknown as { optionValues?: ProductOptionValueModel[] }).optionValues ?? []
      )
        .map((ov) => ov.id)
        .sort()
        .join(':');
      if (existingKey === newCombinationKey) {
        throw new ConflictError(
          'A variant with this exact combination of option values already exists',
        );
      }
    }
  }

  private async computeCategoryPath(
    ecommerceId: string,
    id: string,
    category: CategoryModel,
    input: UpdateCategoryInput,
  ): Promise<string> {
    const newSlug = input.slug ?? category.slug;
    const ltreeSegment = sanitizeForLtree(newSlug);
    let newParentPath = '';
    const targetParentId = input.parentId !== undefined ? input.parentId : category.parentId;

    if (targetParentId) {
      if (targetParentId === id) {
        throw new ValidationError('A category cannot be its own parent');
      }

      const newParent = await this.repo.findCategoryById(ecommerceId, targetParentId);
      if (!newParent) {
        throw new NotFoundError('Target parent category');
      }

      if (newParent.path === category.path || newParent.path.startsWith(`${category.path}.`)) {
        throw new ValidationError('Cannot move a category under one of its own descendants');
      }

      newParentPath = newParent.path;
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

    const parentChanged = input.parentId !== undefined && input.parentId !== category.parentId;
    const slugChanged = input.slug !== undefined && input.slug !== category.slug;

    if (parentChanged || slugChanged) {
      const newPath = await this.computeCategoryPath(ecommerceId, id, category, input);
      const oldPath = category.path;

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

  async updateProduct(
    ecommerceId: string,
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductModel> {
    const product = await this.ensureProduct(ecommerceId, id);

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
      throw new ValidationError(
        'Cannot directly set product quantity for products with variants. Manage variant quantities instead.',
      );
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

  // ========================= Options & Values =========================

  async createProductOption(
    ecommerceId: string,
    productId: string,
    input: CreateProductOptionInput,
  ): Promise<ProductOptionModel> {
    await this.ensureProduct(ecommerceId, productId);
    await this.validateUnit(input.unitId);

    const options = await this.repo.findOptionsByProduct(productId);
    if (options.some((o) => o.name.toLowerCase() === input.name.toLowerCase())) {
      throw new ConflictError(`Option "${input.name}" already exists for this product`);
    }

    return this.repo.createProductOption(productId, input);
  }

  async listProductOptions(ecommerceId: string, productId: string): Promise<ProductOptionModel[]> {
    await this.ensureProduct(ecommerceId, productId);
    return this.repo.findOptionsByProduct(productId);
  }

  async updateProductOption(
    ecommerceId: string,
    productId: string,
    optionId: string,
    input: UpdateProductOptionInput,
  ): Promise<ProductOptionModel> {
    const option = await this.ensureOption(productId, optionId);
    await this.ensureProduct(ecommerceId, productId);
    await this.validateUnit(input.unitId);

    if (input.name && input.name.toLowerCase() !== option.name.toLowerCase()) {
      const options = await this.repo.findOptionsByProduct(productId);
      const targetName = input.name.toLowerCase();
      if (options.some((o) => o.id !== optionId && o.name.toLowerCase() === targetName)) {
        throw new ConflictError(`Option "${input.name}" already exists for this product`);
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
    await this.ensureOption(productId, optionId);
    await this.ensureProduct(ecommerceId, productId);

    await this.repo.deleteProductOption(optionId);
  }

  async createProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    input: CreateProductOptionValueInput,
  ): Promise<ProductOptionValueModel> {
    await this.ensureProduct(ecommerceId, productId);
    const option = await this.ensureOption(productId, optionId);

    const existingValues =
      (option as unknown as { values?: ProductOptionValueModel[] }).values ?? [];
    if (existingValues.some((v) => v.value.toLowerCase() === input.value.toLowerCase())) {
      throw new ConflictError(
        `Option value "${input.value}" already exists for option "${option.name}"`,
      );
    }

    return this.repo.createProductOptionValue(optionId, input);
  }

  async updateProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    valueId: string,
    input: UpdateProductOptionValueInput,
  ): Promise<ProductOptionValueModel> {
    await this.ensureProduct(ecommerceId, productId);

    const value = await this.repo.findProductOptionValueById(optionId, valueId);
    if (!value) throw new NotFoundError('Option value');

    const updated = await this.repo.updateProductOptionValue(valueId, input);
    if (!updated) throw new NotFoundError('Option value');
    return updated;
  }

  async deleteProductOptionValue(
    ecommerceId: string,
    productId: string,
    optionId: string,
    valueId: string,
  ): Promise<void> {
    await this.ensureProduct(ecommerceId, productId);

    const value = await this.repo.findProductOptionValueById(optionId, valueId);
    if (!value) throw new NotFoundError('Option value');

    await this.repo.deleteProductOptionValue(valueId);
  }

  // ========================= Variants =========================

  async createVariant(
    ecommerceId: string,
    productId: string,
    input: CreateProductVariantInput,
  ): Promise<ProductVariantModel> {
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
    await this.ensureProduct(ecommerceId, productId);
    const variant = await this.repo.findVariantById(productId, variantId);
    if (!variant) throw new NotFoundError('Product variant');

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
}
