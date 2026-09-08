export interface CreateOrderInput {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemsCount: number;
  total: number;
  status?: string;
  shippingAddress: Record<string, unknown>;
  items: unknown[];
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
}

export interface OrderRecord {
  id: string;
  ecommerceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  itemsCount: number;
  total: number;
  status: string;
  shippingAddress: Record<string, unknown>;
  items: unknown[];
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  lastOrderDate: string;
  status: 'VIP' | 'ACTIVE';
}

import { Op, QueryTypes, type Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { getSequelize } from '@infrastructure/database/connection';
import { dbQueryDuration } from '@infrastructure/metrics/metrics';
import type {
  CreateEcommerceInput,
  UpdateEcommerceInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateProductOptionInput,
  UpdateProductOptionInput,
  CreateProductOptionValueInput,
  UpdateProductOptionValueInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  CreateBannerInput,
  UpdateBannerInput,
  CreateCouponInput,
  UpdateCouponInput,
  CouponQueryInput,
} from './catalog.validator';
import {
  BannerModelDef,
  EcommerceModelDef,
  CategoryModelDef,
  ProductModelDef,
  ProductOptionModelDef,
  ProductOptionValueModelDef,
  ProductVariantModelDef,
  VariantOptionValueModelDef,
  ProductImageModelDef,
  ProductVariantImageModelDef,
  UnitModelDef,
  CouponModelDef,
  CouponUsageModelDef,
  type BannerModel,
  type EcommerceModel,
  type CategoryModel,
  type ProductModel,
  type ProductOptionModel,
  type ProductOptionValueModel,
  type ProductVariantModel,
  type ProductImageModel,
  type ProductVariantImageModel,
  type UnitModel,
  type CouponDiscountType,
  type CouponTargetType,
  type CouponRules,
  type CouponModel,
  type CouponUsageModel,
} from './models';

/**
 * Data access layer for Catalog Module.
 * NEVER exported from the module barrel (index.ts).
 */
export class CatalogRepository {
  // ========================= Ecommerce =========================

  async findEcommerceById(id: string): Promise<EcommerceModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findEcommerceById', model: 'Ecommerce' });
    const record = await EcommerceModelDef.findByPk(id);
    end();
    return record;
  }

  async findEcommerceBySlug(slug: string): Promise<EcommerceModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findEcommerceBySlug',
      model: 'Ecommerce',
    });
    const record = await EcommerceModelDef.findOne({ where: { slug } });
    end();
    return record;
  }

  async findAllEcommerce(): Promise<EcommerceModel[]> {
    const end = dbQueryDuration.startTimer({ operation: 'findAllEcommerce', model: 'Ecommerce' });
    const records = await EcommerceModelDef.findAll({ order: [['created_at', 'DESC']] });
    end();
    return records;
  }

  async createEcommerce(
    input: CreateEcommerceInput,
    transaction?: Transaction,
  ): Promise<EcommerceModel> {
    const end = dbQueryDuration.startTimer({ operation: 'createEcommerce', model: 'Ecommerce' });
    const record = await EcommerceModelDef.create(
      {
        id: uuidv4(),
        ...input,
      },
      { transaction },
    );
    end();
    return record;
  }

  async updateEcommerce(
    id: string,
    input: UpdateEcommerceInput,
    transaction?: Transaction,
  ): Promise<EcommerceModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'updateEcommerce', model: 'Ecommerce' });
    const record = await this.findEcommerceById(id);
    if (!record) {
      end();
      return null;
    }
    await record.update(input, { transaction });
    end();
    return record;
  }

  // ========================= Categories =========================

  async findCategoryById(ecommerceId: string, id: string): Promise<CategoryModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findCategoryById', model: 'Category' });
    const record = await CategoryModelDef.findOne({
      where: { id, ecommerceId },
      include: [{ model: CategoryModelDef, as: 'children' }],
    });
    end();
    return record;
  }

  async findCategoryBySlug(ecommerceId: string, slug: string): Promise<CategoryModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findCategoryBySlug', model: 'Category' });
    const record = await CategoryModelDef.findOne({ where: { ecommerceId, slug } });
    end();
    return record;
  }

  async findCategoriesByEcommerce(
    ecommerceId: string,
    includeInactive = false,
  ): Promise<CategoryModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findCategoriesByEcommerce',
      model: 'Category',
    });
    const where: Record<string, unknown> = { ecommerceId };
    if (!includeInactive) {
      where.isActive = true;
    }
    const records = await CategoryModelDef.findAll({
      where,
      order: [
        ['sort_order', 'ASC'],
        ['name', 'ASC'],
      ],
      include: [{ model: CategoryModelDef, as: 'children' }],
    });
    end();
    return records;
  }

  async createCategory(
    ecommerceId: string,
    input: CreateCategoryInput & { path: string },
    transaction?: Transaction,
  ): Promise<CategoryModel> {
    const end = dbQueryDuration.startTimer({ operation: 'createCategory', model: 'Category' });
    const record = await CategoryModelDef.create(
      {
        id: uuidv4(),
        ecommerceId,
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        path: input.path,
        sortOrder: input.displayOrder ?? 0,
        isActive: true,
      },
      { transaction },
    );
    end();
    return record;
  }

  async updateCategory(
    ecommerceId: string,
    id: string,
    input: UpdateCategoryInput & { path?: string },
    transaction?: Transaction,
  ): Promise<CategoryModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'updateCategory', model: 'Category' });
    const record = await CategoryModelDef.findOne({ where: { id, ecommerceId } });
    if (!record) {
      end();
      return null;
    }
    await record.update(input, { transaction });
    end();
    return record;
  }

  /**
   * Atomically updates all descendant category paths when a parent category is moved.
   */
  async updateCategorySubtreePath(
    ecommerceId: string,
    oldPath: string,
    newPath: string,
    transaction?: Transaction,
  ): Promise<void> {
    const end = dbQueryDuration.startTimer({
      operation: 'updateCategorySubtreePath',
      model: 'Category',
    });
    // In PostgreSQL LTREE:
    // UPDATE catalog_module.categories
    // SET path = :newPath || subpath(path, nlevel(:oldPath))
    // WHERE path <@ :oldPath AND ecommerce_id = :ecommerceId
    await getSequelize().query(
      `UPDATE catalog_module.categories
       SET path = CAST(:newPath AS ltree) || subpath(path, nlevel(CAST(:oldPath AS ltree)))
       WHERE path <@ CAST(:oldPath AS ltree) AND ecommerce_id = :ecommerceId`,
      {
        replacements: { newPath, oldPath, ecommerceId },
        transaction,
      },
    );
    end();
  }

  async deleteCategory(
    ecommerceId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const end = dbQueryDuration.startTimer({ operation: 'deleteCategory', model: 'Category' });
    const deleted = await CategoryModelDef.destroy({
      where: { id, ecommerceId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  // ========================= Products =========================

  async findProductById(
    ecommerceId: string,
    id: string,
    includeDetails = false,
  ): Promise<ProductModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findProductById', model: 'Product' });
    const includes = includeDetails
      ? [
          { model: CategoryModelDef, as: 'category' },
          { model: ProductImageModelDef, as: 'images' },
          {
            model: ProductOptionModelDef,
            as: 'options',
            include: [
              {
                model: ProductOptionValueModelDef,
                as: 'values',
                include: [{ model: UnitModelDef, as: 'unit' }],
              },
            ],
          },
          {
            model: ProductVariantModelDef,
            as: 'variants',
            include: [
              {
                model: ProductOptionValueModelDef,
                as: 'optionValues',
                include: [{ model: UnitModelDef, as: 'unit' }],
              },
              { model: ProductVariantImageModelDef, as: 'images' },
            ],
          },
        ]
      : [
          { model: CategoryModelDef, as: 'category' },
          { model: ProductImageModelDef, as: 'images' },
        ];

    const record = await ProductModelDef.findOne({
      where: { id, ecommerceId },
      include: includes,
    });
    end();
    return record;
  }

  async findProductBySlug(ecommerceId: string, slug: string): Promise<ProductModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findProductBySlug', model: 'Product' });
    const record = await ProductModelDef.findOne({ where: { ecommerceId, slug } });
    end();
    return record;
  }

  // fallow-ignore-next-line complexity
  async findProductsByEcommerce(
    ecommerceId: string,
    filter?: { categoryId?: string; status?: string },
  ): Promise<ProductModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findProductsByEcommerce',
      model: 'Product',
    });
    const where: Record<string, unknown> = { ecommerceId };

    if (filter?.categoryId) {
      const targetCategory = await CategoryModelDef.findOne({
        where: { id: filter.categoryId, ecommerceId },
      });

      if (targetCategory) {
        const descendantCategories = await getSequelize().query<{ id: string }>(
          `SELECT id FROM catalog_module.categories WHERE path <@ CAST(:path AS ltree) AND ecommerce_id = :ecommerceId`,
          {
            replacements: { path: targetCategory.path, ecommerceId },
            type: QueryTypes.SELECT,
          },
        );
        const categoryIds = descendantCategories.map((c) => c.id);
        where.categoryId = { [Op.in]: categoryIds };
      } else {
        where.categoryId = filter.categoryId;
      }
    }

    if (filter?.status) where.status = filter.status;

    const records = await ProductModelDef.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: CategoryModelDef, as: 'category' },
        { model: ProductImageModelDef, as: 'images' },
        {
          model: ProductVariantModelDef,
          as: 'variants',
          include: [
            { model: ProductOptionValueModelDef, as: 'optionValues' },
            { model: ProductVariantImageModelDef, as: 'images' },
          ],
        },
      ],
    });
    end();
    return records;
  }

  async createProduct(
    ecommerceId: string,
    input: CreateProductInput,
    transaction?: Transaction,
  ): Promise<ProductModel> {
    const end = dbQueryDuration.startTimer({ operation: 'createProduct', model: 'Product' });
    const record = await ProductModelDef.create(
      {
        id: uuidv4(),
        ecommerceId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        details: input.details ?? [],
        price: input.price ?? 0,
        offerPrice: input.offerPrice ?? null,
        taxRate: input.taxRate ?? 0.0,
        taxClass: input.taxClass ?? 'GST 18%',
        quantity: input.quantity ?? 0,
        status: input.status,
        hasVariants: input.hasVariants ?? false,
      },
      { transaction },
    );
    end();
    return record;
  }

  async updateProduct(
    ecommerceId: string,
    id: string,
    input: UpdateProductInput,
    transaction?: Transaction,
  ): Promise<ProductModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'updateProduct', model: 'Product' });
    const record = await ProductModelDef.findOne({ where: { id, ecommerceId } });
    if (!record) {
      end();
      return null;
    }
    await record.update(input, { transaction });
    end();
    return record;
  }

  async deleteProduct(
    ecommerceId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const end = dbQueryDuration.startTimer({ operation: 'deleteProduct', model: 'Product' });

    // Clean up child options and variants to avoid FK constraint error
    const options = await ProductOptionModelDef.findAll({ where: { productId: id }, transaction });
    const optionIds = options.map((o) => o.id);
    if (optionIds.length > 0) {
      await ProductOptionValueModelDef.destroy({
        where: { productOptionId: optionIds },
        transaction,
      });
    }
    await ProductVariantModelDef.destroy({ where: { productId: id }, transaction });
    await ProductOptionModelDef.destroy({ where: { productId: id }, transaction });

    const deleted = await ProductModelDef.destroy({
      where: { id, ecommerceId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  // ========================= Options & Values =========================

  async createProductOption(
    productId: string,
    input: CreateProductOptionInput,
    transaction?: Transaction,
  ): Promise<ProductOptionModel> {
    const end = dbQueryDuration.startTimer({
      operation: 'createProductOption',
      model: 'ProductOption',
    });
    const record = await ProductOptionModelDef.create(
      {
        id: uuidv4(),
        productId,
        name: input.name,
        displayOrder: input.displayOrder ?? 0,
      },
      { transaction },
    );
    end();
    return record;
  }

  async findOptionsByProduct(productId: string): Promise<ProductOptionModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findOptionsByProduct',
      model: 'ProductOption',
    });
    const records = await ProductOptionModelDef.findAll({
      where: { productId },
      order: [['display_order', 'ASC']],
      include: [
        {
          model: ProductOptionValueModelDef,
          as: 'values',
          include: [{ model: UnitModelDef, as: 'unit' }],
        },
      ],
    });
    end();
    return records;
  }

  async findProductOptionById(
    productId: string,
    optionId: string,
  ): Promise<ProductOptionModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findProductOptionById',
      model: 'ProductOption',
    });
    const record = await ProductOptionModelDef.findOne({
      where: { id: optionId, productId },
      include: [
        {
          model: ProductOptionValueModelDef,
          as: 'values',
          include: [{ model: UnitModelDef, as: 'unit' }],
        },
      ],
    });
    end();
    return record;
  }

  async updateProductOption(
    optionId: string,
    input: UpdateProductOptionInput,
    transaction?: Transaction,
  ): Promise<ProductOptionModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'updateProductOption',
      model: 'ProductOption',
    });
    const record = await ProductOptionModelDef.findByPk(optionId);
    if (!record) {
      end();
      return null;
    }
    await record.update(input, { transaction });
    end();
    return record;
  }

  async deleteProductOption(optionId: string, transaction?: Transaction): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteProductOption',
      model: 'ProductOption',
    });
    const deleted = await ProductOptionModelDef.destroy({ where: { id: optionId }, transaction });
    end();
    return deleted > 0;
  }

  async createProductOptionValue(
    productOptionId: string,
    input: CreateProductOptionValueInput,
    transaction?: Transaction,
  ): Promise<ProductOptionValueModel> {
    const end = dbQueryDuration.startTimer({
      operation: 'createProductOptionValue',
      model: 'ProductOptionValue',
    });
    const record = await ProductOptionValueModelDef.create(
      {
        id: uuidv4(),
        productOptionId,
        unitId: input.unitId ?? null,
        value: input.value,
        displayOrder: input.displayOrder ?? 0,
      },
      { transaction },
    );
    end();
    return record;
  }

  async findProductOptionValueById(
    productOptionId: string,
    valueId: string,
  ): Promise<ProductOptionValueModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findProductOptionValueById',
      model: 'ProductOptionValue',
    });
    const record = await ProductOptionValueModelDef.findOne({
      where: { id: valueId, productOptionId },
      include: [{ model: UnitModelDef, as: 'unit' }],
    });
    end();
    return record;
  }

  async findOptionValuesByIds(valueIds: string[]): Promise<ProductOptionValueModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findOptionValuesByIds',
      model: 'ProductOptionValue',
    });
    const records = await ProductOptionValueModelDef.findAll({
      where: { id: { [Op.in]: valueIds } },
    });
    end();
    return records;
  }

  async updateProductOptionValue(
    valueId: string,
    input: UpdateProductOptionValueInput,
    transaction?: Transaction,
  ): Promise<ProductOptionValueModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'updateProductOptionValue',
      model: 'ProductOptionValue',
    });
    const record = await ProductOptionValueModelDef.findByPk(valueId);
    if (!record) {
      end();
      return null;
    }
    await record.update(input, { transaction });
    end();
    return record;
  }

  async deleteProductOptionValue(valueId: string, transaction?: Transaction): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteProductOptionValue',
      model: 'ProductOptionValue',
    });
    const deleted = await ProductOptionValueModelDef.destroy({
      where: { id: valueId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  // ========================= Variants =========================

  async createProductVariant(
    productId: string,
    input: CreateProductVariantInput,
    transaction?: Transaction,
  ): Promise<ProductVariantModel> {
    const end = dbQueryDuration.startTimer({
      operation: 'createProductVariant',
      model: 'ProductVariant',
    });
    const variantId = uuidv4();
    const variant = await ProductVariantModelDef.create(
      {
        id: variantId,
        productId,
        sku: input.sku,
        price: input.price ?? 0,
        quantity: input.quantity ?? 0,
        status: input.status,
      },
      { transaction },
    );

    // Link option values
    if (input.optionValueIds.length > 0) {
      const joinRecords = input.optionValueIds.map((optionValueId) => ({
        variantId,
        optionValueId,
      }));
      await VariantOptionValueModelDef.bulkCreate(joinRecords, { transaction });
    }

    end();
    return variant;
  }

  async findVariantsByProduct(productId: string): Promise<ProductVariantModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findVariantsByProduct',
      model: 'ProductVariant',
    });
    const records = await ProductVariantModelDef.findAll({
      where: { productId },
      order: [['created_at', 'ASC']],
      include: [
        { model: ProductOptionValueModelDef, as: 'optionValues' },
        { model: ProductVariantImageModelDef, as: 'images' },
      ],
    });
    end();
    return records;
  }

  async findVariantById(productId: string, variantId: string): Promise<ProductVariantModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findVariantById',
      model: 'ProductVariant',
    });
    const record = await ProductVariantModelDef.findOne({
      where: { id: variantId, productId },
      include: [
        { model: ProductOptionValueModelDef, as: 'optionValues' },
        { model: ProductVariantImageModelDef, as: 'images' },
      ],
    });
    end();
    return record;
  }

  async findVariantBySku(productId: string, sku: string): Promise<ProductVariantModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findVariantBySku',
      model: 'ProductVariant',
    });
    const record = await ProductVariantModelDef.findOne({ where: { productId, sku } });
    end();
    return record;
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput,
    transaction?: Transaction,
  ): Promise<ProductVariantModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'updateProductVariant',
      model: 'ProductVariant',
    });
    const variant = await ProductVariantModelDef.findOne({ where: { id: variantId, productId } });
    if (!variant) {
      end();
      return null;
    }

    await variant.update(input, { transaction });

    if (input.optionValueIds) {
      await VariantOptionValueModelDef.destroy({ where: { variantId }, transaction });
      const joinRecords = input.optionValueIds.map((optionValueId) => ({
        variantId,
        optionValueId,
      }));
      await VariantOptionValueModelDef.bulkCreate(joinRecords, { transaction });
    }

    end();
    return variant;
  }

  async deleteProductVariant(
    productId: string,
    variantId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteProductVariant',
      model: 'ProductVariant',
    });
    const deleted = await ProductVariantModelDef.destroy({
      where: { id: variantId, productId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  // ========================= Units (Shared Reference Data) =========================

  async findAllUnits(category?: string): Promise<UnitModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findAllUnits',
      model: 'Unit',
    });
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    const records = await UnitModelDef.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    end();
    return records;
  }

  async findUnitById(id: string): Promise<UnitModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findUnitById',
      model: 'Unit',
    });
    const record = await UnitModelDef.findByPk(id);
    end();
    return record;
  }

  // ========================= Product & Variant Images =========================

  async addProductImages(
    productId: string,
    images: Array<{ url: string; publicId: string | null; displayOrder?: number }>,
    transaction?: Transaction,
  ): Promise<ProductImageModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'addProductImages',
      model: 'ProductImage',
    });
    const records = await ProductImageModelDef.bulkCreate(
      images.map((img, idx) => ({
        productId,
        url: img.url,
        publicId: img.publicId,
        displayOrder: img.displayOrder ?? idx,
      })),
      { transaction },
    );
    end();
    return records;
  }

  async findProductImageById(
    productId: string,
    imageId: string,
  ): Promise<ProductImageModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findProductImageById',
      model: 'ProductImage',
    });
    const record = await ProductImageModelDef.findOne({
      where: { id: imageId, productId },
    });
    end();
    return record;
  }

  async deleteProductImage(imageId: string, transaction?: Transaction): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteProductImage',
      model: 'ProductImage',
    });
    const deleted = await ProductImageModelDef.destroy({
      where: { id: imageId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  async addVariantImages(
    variantId: string,
    images: Array<{ url: string; publicId: string | null; displayOrder?: number }>,
    transaction?: Transaction,
  ): Promise<ProductVariantImageModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'addVariantImages',
      model: 'ProductVariantImage',
    });
    const records = await ProductVariantImageModelDef.bulkCreate(
      images.map((img, idx) => ({
        variantId,
        url: img.url,
        publicId: img.publicId,
        displayOrder: img.displayOrder ?? idx,
      })),
      { transaction },
    );
    end();
    return records;
  }

  async findVariantImageById(
    variantId: string,
    imageId: string,
  ): Promise<ProductVariantImageModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findVariantImageById',
      model: 'ProductVariantImage',
    });
    const record = await ProductVariantImageModelDef.findOne({
      where: { id: imageId, variantId },
    });
    end();
    return record;
  }

  async deleteVariantImage(imageId: string, transaction?: Transaction): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteVariantImage',
      model: 'ProductVariantImage',
    });
    const deleted = await ProductVariantImageModelDef.destroy({
      where: { id: imageId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  // ========================= Banners =========================

  async findBannersByEcommerce(ecommerceId: string, onlyActive = false): Promise<BannerModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findBannersByEcommerce',
      model: 'Banner',
    });
    const where: Record<string, unknown> = { ecommerceId };
    if (onlyActive) where.isActive = true;

    const records = await BannerModelDef.findAll({
      where,
      order: [
        ['display_order', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });
    end();
    return records;
  }

  async findBannerById(ecommerceId: string, id: string): Promise<BannerModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'findBannerById',
      model: 'Banner',
    });
    const record = await BannerModelDef.findOne({
      where: { id, ecommerceId },
    });
    end();
    return record;
  }

  async createBanner(ecommerceId: string, input: CreateBannerInput): Promise<BannerModel> {
    const end = dbQueryDuration.startTimer({
      operation: 'createBanner',
      model: 'Banner',
    });
    const record = await BannerModelDef.create({
      ecommerceId,
      ...input,
    });
    end();
    return record;
  }

  async updateBanner(
    ecommerceId: string,
    id: string,
    input: UpdateBannerInput,
  ): Promise<BannerModel | null> {
    const end = dbQueryDuration.startTimer({
      operation: 'updateBanner',
      model: 'Banner',
    });
    const banner = await this.findBannerById(ecommerceId, id);
    if (!banner) {
      end();
      return null;
    }
    await banner.update(input);
    end();
    return banner;
  }

  async deleteBanner(ecommerceId: string, id: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({
      operation: 'deleteBanner',
      model: 'Banner',
    });
    const deleted = await BannerModelDef.destroy({
      where: { id, ecommerceId },
    });
    end();
    return deleted > 0;
  }

  // ========================= Orders =========================

  async listOrders(ecommerceId: string): Promise<OrderRecord[]> {
    const end = dbQueryDuration.startTimer({ model: 'orders', operation: 'listOrders' });
    const sequelize = getSequelize();
    const [records] = await sequelize.query(
      `SELECT id, ecommerce_id AS "ecommerceId", customer_name AS "customerName", customer_email AS "customerEmail", customer_phone AS "customerPhone", items_count AS "itemsCount", total, status, shipping_address AS "shippingAddress", items, coupon_id AS "couponId", coupon_code AS "couponCode", coupon_discount AS "couponDiscount", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM catalog_module.orders
       WHERE ecommerce_id = :ecommerceId
       ORDER BY created_at DESC`,
      { replacements: { ecommerceId } },
    );
    end();
    return records as OrderRecord[];
  }

  async getOrderById(
    ecommerceId: string,
    orderId: string,
    transaction?: Transaction,
  ): Promise<OrderRecord | null> {
    const end = dbQueryDuration.startTimer({ model: 'orders', operation: 'getOrderById' });
    const sequelize = getSequelize();
    const [records] = await sequelize.query(
      `SELECT id, ecommerce_id AS "ecommerceId", customer_name AS "customerName", customer_email AS "customerEmail", customer_phone AS "customerPhone", items_count AS "itemsCount", total, status, shipping_address AS "shippingAddress", items, coupon_id AS "couponId", coupon_code AS "couponCode", coupon_discount AS "couponDiscount", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM catalog_module.orders
       WHERE ecommerce_id = :ecommerceId AND id = :orderId`,
      { replacements: { ecommerceId, orderId }, transaction },
    );
    end();
    const row = (records as OrderRecord[])[0];
    return row ?? null;
  }

  async createOrder(
    ecommerceId: string,
    data: CreateOrderInput,
    transaction?: Transaction,
  ): Promise<OrderRecord | null> {
    const end = dbQueryDuration.startTimer({ model: 'orders', operation: 'createOrder' });
    const sequelize = getSequelize();
    const status = data.status ?? 'PROCESSING';
    const orderId = data.id || uuidv4();
    await sequelize.query(
      `INSERT INTO catalog_module.orders (id, ecommerce_id, customer_name, customer_email, customer_phone, items_count, total, status, shipping_address, items, coupon_id, coupon_code, coupon_discount)
       VALUES (:id, :ecommerceId, :customerName, :customerEmail, :customerPhone, :itemsCount, :total, :status, :shippingAddress, :items, :couponId, :couponCode, :couponDiscount)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      {
        replacements: {
          id: orderId,
          ecommerceId,
          customerName: data.customerName,
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone ?? null,
          itemsCount: data.itemsCount ?? (data.items?.length || 1),
          total: data.total,
          status,
          shippingAddress: JSON.stringify(data.shippingAddress || {}),
          items: JSON.stringify(data.items || []),
          couponId: data.couponId ?? null,
          couponCode: data.couponCode ?? null,
          couponDiscount: Number(data.couponDiscount) || 0.0,
        },
        transaction,
      },
    );
    end();
    return this.getOrderById(ecommerceId, orderId, transaction);
  }

  async updateOrderStatus(
    ecommerceId: string,
    orderId: string,
    status: string,
  ): Promise<OrderRecord | null> {
    const end = dbQueryDuration.startTimer({ model: 'orders', operation: 'updateOrderStatus' });
    const sequelize = getSequelize();
    await sequelize.query(
      `UPDATE catalog_module.orders SET status = :status, updated_at = CURRENT_TIMESTAMP
       WHERE ecommerce_id = :ecommerceId AND id = :orderId`,
      { replacements: { ecommerceId, orderId, status } },
    );
    end();
    return this.getOrderById(ecommerceId, orderId);
  }

  // ========================= Coupons =========================

  async createCoupon(
    ecommerceId: string,
    data: CreateCouponInput,
    transaction?: Transaction,
  ): Promise<CouponModel> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'create' });
    const code = data.code.trim().toUpperCase();
    const coupon = await CouponModelDef.create(
      {
        ecommerceId,
        name: data.name,
        code,
        description: data.description ?? null,
        discountType: data.discountType as CouponDiscountType,
        discountValue: data.discountValue,
        targetType: data.targetType as CouponTargetType,
        rules: (data.rules as CouponRules) ?? {},
        startDate: data.startDate ? new Date(data.startDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive ?? true,
        usageLimit: data.usageLimit ?? null,
        usageLimitPerUser: data.usageLimitPerUser ?? null,
        usageCount: 0,
      },
      { transaction },
    );
    end();
    return coupon;
  }

  async updateCoupon(
    ecommerceId: string,
    id: string,
    data: UpdateCouponInput,
    transaction?: Transaction,
  ): Promise<CouponModel | null> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'update' });
    const coupon = await CouponModelDef.findOne({ where: { id, ecommerceId }, transaction });
    if (!coupon) {
      end();
      return null;
    }

    const updates: Record<string, unknown> = { ...data };
    if (data.code !== undefined) updates.code = data.code.trim().toUpperCase();
    if (data.startDate !== undefined) {
      updates.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.expiryDate !== undefined) {
      updates.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    }

    await coupon.update(updates, { transaction });
    end();
    return coupon;
  }

  async deleteCoupon(ecommerceId: string, id: string, transaction?: Transaction): Promise<boolean> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'delete' });
    const deleted = await CouponModelDef.destroy({
      where: { id, ecommerceId },
      transaction,
    });
    end();
    return deleted > 0;
  }

  async getCouponById(
    ecommerceId: string,
    id: string,
    transaction?: Transaction,
  ): Promise<CouponModel | null> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'getById' });
    const coupon = await CouponModelDef.findOne({
      where: { id, ecommerceId },
      transaction,
    });
    end();
    return coupon;
  }

  async getCouponByCode(
    ecommerceId: string,
    code: string,
    transaction?: Transaction,
  ): Promise<CouponModel | null> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'getByCode' });
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await CouponModelDef.findOne({
      where: { ecommerceId, code: normalizedCode },
      transaction,
    });
    end();
    return coupon;
  }

  async listCoupons(ecommerceId: string, filter?: CouponQueryInput): Promise<CouponModel[]> {
    const end = dbQueryDuration.startTimer({ model: 'coupons', operation: 'list' });
    const where: Record<string, unknown> = { ecommerceId };
    if (filter?.targetType) {
      where.targetType = filter.targetType;
    }
    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    if (filter?.search) {
      const s = `%${filter.search.trim()}%`;
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: s } },
        { code: { [Op.iLike]: s } },
      ];
    }
    const coupons = await CouponModelDef.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    end();
    return coupons;
  }

  async getDescendantCategoryIds(ecommerceId: string, categoryId: string): Promise<string[]> {
    const targetCategory = await CategoryModelDef.findOne({
      where: { id: categoryId, ecommerceId },
    });
    if (!targetCategory) return [categoryId];
    const descendants = await getSequelize().query<{ id: string }>(
      `SELECT id FROM catalog_module.categories WHERE path <@ CAST(:path AS ltree) AND ecommerce_id = :ecommerceId`,
      {
        replacements: { path: targetCategory.path, ecommerceId },
        type: QueryTypes.SELECT,
      },
    );
    return descendants.map((c) => c.id);
  }

  async getCustomerOrderCount(ecommerceId: string, customerEmail: string): Promise<number> {
    const sequelize = getSequelize();
    const records = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM catalog_module.orders 
       WHERE ecommerce_id = :ecommerceId AND LOWER(customer_email) = LOWER(:customerEmail) AND status != 'CANCELLED'`,
      {
        replacements: { ecommerceId, customerEmail: customerEmail.trim() },
        type: QueryTypes.SELECT,
      },
    );
    return records.length > 0 && records[0] ? parseInt(records[0].count, 10) : 0;
  }

  async getCustomerCouponUsageCount(
    ecommerceId: string,
    couponId: string,
    customerEmail: string,
    transaction?: Transaction,
  ): Promise<number> {
    const count = await CouponUsageModelDef.count({
      where: {
        ecommerceId,
        couponId,
        customerEmail: customerEmail.trim().toLowerCase(),
      },
      transaction,
    });
    return count;
  }

  async recordCouponUsage(
    ecommerceId: string,
    data: {
      couponId: string;
      orderId: string;
      customerEmail: string;
      discountAmount: number;
    },
    transaction?: Transaction,
  ): Promise<CouponUsageModel> {
    const end = dbQueryDuration.startTimer({ model: 'coupon_usages', operation: 'create' });
    const sequelize = getSequelize();
    await sequelize.query(
      `UPDATE catalog_module.coupons
       SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = :couponId AND ecommerce_id = :ecommerceId
         AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      {
        replacements: { couponId: data.couponId, ecommerceId },
        transaction,
      },
    );

    const usage = await CouponUsageModelDef.create(
      {
        ecommerceId,
        couponId: data.couponId,
        orderId: data.orderId,
        customerEmail: data.customerEmail.trim().toLowerCase(),
        discountAmount: data.discountAmount,
      },
      { transaction },
    );
    end();
    return usage;
  }

  // ========================= Real Customers =========================

  async listCustomers(ecommerceId: string): Promise<CustomerSummary[]> {
    const end = dbQueryDuration.startTimer({ model: 'orders', operation: 'listCustomers' });
    const sequelize = getSequelize();
    const records = await sequelize.query<{
      customerName: string;
      customerEmail: string;
      customerPhone: string | null;
      totalOrders: string;
      totalSpent: string;
      firstOrderDate: string;
      lastOrderDate: string;
    }>(
      `SELECT 
        customer_name AS "customerName",
        customer_email AS "customerEmail",
        MAX(customer_phone) AS "customerPhone",
        COUNT(id)::text AS "totalOrders",
        COALESCE(SUM(total), 0)::text AS "totalSpent",
        MIN(created_at)::text AS "firstOrderDate",
        MAX(created_at)::text AS "lastOrderDate"
       FROM catalog_module.orders
       WHERE ecommerce_id = :ecommerceId
       GROUP BY customer_email, customer_name
       ORDER BY MAX(created_at) DESC`,
      {
        replacements: { ecommerceId },
        type: QueryTypes.SELECT,
      },
    );
    end();

    return records.map((r, idx) => {
      const orders = parseInt(r.totalOrders, 10) || 0;
      const spent = parseFloat(r.totalSpent) || 0;
      return {
        id: `cust-${idx + 1}-${r.customerEmail}`,
        name: r.customerName || 'Store Customer',
        email: r.customerEmail,
        phone: r.customerPhone,
        totalOrders: orders,
        totalSpent: spent,
        joinedDate: r.firstOrderDate
          ? new Date(r.firstOrderDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
          : 'Recently',
        lastOrderDate: r.lastOrderDate,
        status: orders >= 5 || spent >= 5000 ? 'VIP' : 'ACTIVE',
      };
    });
  }
}
