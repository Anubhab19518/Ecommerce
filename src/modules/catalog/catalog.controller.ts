import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors';
import { CatalogService } from './catalog.service';
import type { CatalogRequest } from './catalog.tenant-guard';
import {
  createCategorySchema,
  createEcommerceSchema,
  createProductOptionSchema,
  createProductOptionValueSchema,
  createProductSchema,
  createProductVariantSchema,
  idParamSchema,
  productOptionParamSchema,
  productParamSchema,
  updateCategorySchema,
  updateEcommerceSchema,
  updateProductOptionSchema,
  updateProductOptionValueSchema,
  updateProductSchema,
  updateProductVariantSchema,
  unitQuerySchema,
  valueParamSchema,
  variantParamSchema,
} from './catalog.validator';

const catalogService = new CatalogService();

function requireEcommerceId(req: Request): string {
  const ecommerceId = (req as CatalogRequest).ecommerceId;
  if (!ecommerceId) {
    throw new ValidationError('Tenant context (ecommerceId) is required for this operation');
  }
  return ecommerceId;
}

// ========================= Ecommerce Controller =========================

export async function listEcommerce(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const records = await catalogService.listEcommerce();
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getEcommerceById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const record = await catalogService.getEcommerce(id);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function createEcommerce(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createEcommerceSchema.parse(req.body);
    const record = await catalogService.createEcommerce(input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateEcommerce(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateEcommerceSchema.parse(req.body);
    const record = await catalogService.updateEcommerce(id, input);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

// ========================= Categories Controller =========================

export async function listCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const includeInactive = req.query.includeInactive === 'true';
    const records = await catalogService.listCategories(ecommerceId, includeInactive);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const record = await catalogService.getCategory(ecommerceId, id);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = createCategorySchema.parse(req.body);
    const record = await catalogService.createCategory(ecommerceId, input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    const record = await catalogService.updateCategory(ecommerceId, id, input);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    await catalogService.deleteCategory(ecommerceId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Products Controller =========================

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const filter = {
      categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    };
    const records = await catalogService.listProducts(ecommerceId, filter);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const record = await catalogService.getProduct(ecommerceId, id, true);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = createProductSchema.parse(req.body);
    const record = await catalogService.createProduct(ecommerceId, input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    const record = await catalogService.updateProduct(ecommerceId, id, input);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    await catalogService.deleteProduct(ecommerceId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Options Controller =========================

export async function listProductOptions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId } = productParamSchema.parse(req.params);
    const records = await catalogService.listProductOptions(ecommerceId, productId);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function createProductOption(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId } = productParamSchema.parse(req.params);
    const input = createProductOptionSchema.parse(req.body);
    const record = await catalogService.createProductOption(ecommerceId, productId, input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateProductOption(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId, optionId } = productOptionParamSchema.parse(req.params);
    const input = updateProductOptionSchema.parse(req.body);
    const record = await catalogService.updateProductOption(
      ecommerceId,
      productId,
      optionId,
      input,
    );
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductOption(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId, optionId } = productOptionParamSchema.parse(req.params);
    await catalogService.deleteProductOption(ecommerceId, productId, optionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Option Values Controller =========================

export async function createProductOptionValue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId, optionId } = productOptionParamSchema.parse(req.params);
    const input = createProductOptionValueSchema.parse(req.body);
    const record = await catalogService.createProductOptionValue(
      ecommerceId,
      productId,
      optionId,
      input,
    );
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

function parseProductOptionValueParams(req: Request): {
  ecommerceId: string;
  productId: string;
  optionId: string;
  valueId: string;
} {
  const ecommerceId = requireEcommerceId(req);
  const { productId, optionId } = productOptionParamSchema.parse(req.params);
  const { valueId } = valueParamSchema.parse(req.params);
  return { ecommerceId, productId, optionId, valueId };
}

function parseProductVariantParams(req: Request): {
  ecommerceId: string;
  productId: string;
  variantId: string;
} {
  const ecommerceId = requireEcommerceId(req);
  const { productId } = productParamSchema.parse(req.params);
  const { variantId } = variantParamSchema.parse(req.params);
  return { ecommerceId, productId, variantId };
}

export async function updateProductOptionValue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, optionId, valueId } = parseProductOptionValueParams(req);
    const input = updateProductOptionValueSchema.parse(req.body);
    const record = await catalogService.updateProductOptionValue(
      ecommerceId,
      productId,
      optionId,
      valueId,
      input,
    );
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductOptionValue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, optionId, valueId } = parseProductOptionValueParams(req);
    await catalogService.deleteProductOptionValue(ecommerceId, productId, optionId, valueId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Variants Controller =========================

export async function listVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId } = productParamSchema.parse(req.params);
    const records = await catalogService.listVariants(ecommerceId, productId);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getVariantById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, variantId } = parseProductVariantParams(req);
    const record = await catalogService.getVariant(ecommerceId, productId, variantId);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function createVariant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId } = productParamSchema.parse(req.params);
    const input = createProductVariantSchema.parse(req.body);
    const record = await catalogService.createVariant(ecommerceId, productId, input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateVariant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, variantId } = parseProductVariantParams(req);
    const input = updateProductVariantSchema.parse(req.body);
    const record = await catalogService.updateVariant(ecommerceId, productId, variantId, input);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteVariant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, variantId } = parseProductVariantParams(req);
    await catalogService.deleteVariant(ecommerceId, productId, variantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ========================= Units (Shared Reference Data) =========================

export async function listUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = unitQuerySchema.parse(req.query);
    const records = await catalogService.listUnits(query.category);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const record = await catalogService.getUnit(id);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}
