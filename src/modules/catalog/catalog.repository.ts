import { Op, type Transaction } from 'sequelize';
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
} from './catalog.validator';
import {
  EcommerceModelDef,
  CategoryModelDef,
  ProductModelDef,
  ProductOptionModelDef,
  ProductOptionValueModelDef,
  ProductVariantModelDef,
  VariantOptionValueModelDef,
  UnitModelDef,
  type EcommerceModel,
  type CategoryModel,
  type ProductModel,
  type ProductOptionModel,
  type ProductOptionValueModel,
  type ProductVariantModel,
  type UnitModel,
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
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
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
          {
            model: ProductOptionModelDef,
            as: 'options',
            include: [
              { model: ProductOptionValueModelDef, as: 'values' },
              { model: UnitModelDef, as: 'unit' },
            ],
          },
          {
            model: ProductVariantModelDef,
            as: 'variants',
            include: [{ model: ProductOptionValueModelDef, as: 'optionValues' }],
          },
        ]
      : [{ model: CategoryModelDef, as: 'category' }];

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

  async findProductsByEcommerce(
    ecommerceId: string,
    filter?: { categoryId?: string; status?: string },
  ): Promise<ProductModel[]> {
    const end = dbQueryDuration.startTimer({
      operation: 'findProductsByEcommerce',
      model: 'Product',
    });
    const where: Record<string, unknown> = { ecommerceId };
    if (filter?.categoryId) where.categoryId = filter.categoryId;
    if (filter?.status) where.status = filter.status;

    const records = await ProductModelDef.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: CategoryModelDef, as: 'category' },
        {
          model: ProductVariantModelDef,
          as: 'variants',
          include: [{ model: ProductOptionValueModelDef, as: 'optionValues' }],
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
        price: input.price ?? 0,
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
        unitId: input.unitId ?? null,
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
        { model: ProductOptionValueModelDef, as: 'values' },
        { model: UnitModelDef, as: 'unit' },
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
        { model: ProductOptionValueModelDef, as: 'values' },
        { model: UnitModelDef, as: 'unit' },
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
      include: [{ model: ProductOptionValueModelDef, as: 'optionValues' }],
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
      include: [{ model: ProductOptionValueModelDef, as: 'optionValues' }],
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
}
