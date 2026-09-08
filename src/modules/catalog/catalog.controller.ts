import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors';
import type { CreateOrderInput } from './catalog.repository';
import { CatalogService } from './catalog.service';
import type { CatalogRequest } from './catalog.tenant-guard';
import {
  createBannerSchema,
  updateBannerSchema,
  createCategorySchema,
  createEcommerceSchema,
  createProductOptionSchema,
  createProductOptionValueSchema,
  createProductSchema,
  createProductVariantSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponQuerySchema,
  idParamSchema,
  imageParamSchema,
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
  variantImageParamSchema,
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
    const id = (req.params.id as string) || '';
    if (!id) throw new ValidationError('Order ID is required');
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

// ========================= Product & Variant Images Controller =========================

export async function uploadProductImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId } = productParamSchema.parse(req.params);
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new ValidationError('No image files provided for upload');
    }

    const images = await catalogService.uploadProductImages(ecommerceId, productId, files);
    res.status(201).json({ status: 'ok', data: images });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId, imageId } = imageParamSchema.parse(req.params);

    await catalogService.deleteProductImage(ecommerceId, productId, imageId);
    res.json({ status: 'ok', message: 'Product image deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function uploadVariantImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ecommerceId, productId, variantId } = parseProductVariantParams(req);
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new ValidationError('No image files provided for upload');
    }

    const images = await catalogService.uploadVariantImages(
      ecommerceId,
      productId,
      variantId,
      files,
    );
    res.status(201).json({ status: 'ok', data: images });
  } catch (error) {
    next(error);
  }
}

export async function deleteVariantImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { productId, variantId, imageId } = variantImageParamSchema.parse(req.params);

    await catalogService.deleteVariantImage(ecommerceId, productId, variantId, imageId);
    res.json({ status: 'ok', message: 'Variant image deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ========================= Banner Controller =========================

export async function listBanners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const onlyActive = req.query.active === 'true';
    const records = await catalogService.listBanners(ecommerceId, onlyActive);
    res.json({ status: 'ok', data: records });
  } catch (error) {
    next(error);
  }
}

export async function getBannerById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const record = await catalogService.getBanner(ecommerceId, id);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function createBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = createBannerSchema.parse(req.body);
    const record = await catalogService.createBanner(ecommerceId, input);
    res.status(201).json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function updateBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const input = updateBannerSchema.parse(req.body);
    const record = await catalogService.updateBanner(ecommerceId, id, input);
    res.json({ status: 'ok', data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    await catalogService.deleteBanner(ecommerceId, id);
    res.json({ status: 'ok', message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function uploadBannerImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireEcommerceId(req);
    const file = req.file;
    if (!file) {
      throw new ValidationError('No image file provided for banner upload');
    }
    const result = await catalogService.uploadBannerImage(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    res.status(201).json({ status: 'ok', data: result });
  } catch (error) {
    next(error);
  }
}

// ========================= Orders Controller =========================

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const orders = await catalogService.listOrders(ecommerceId);
    res.json({ status: 'ok', data: orders });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = req.body as CreateOrderInput;
    const order = await catalogService.createOrder(ecommerceId, input);
    res.status(201).json({ status: 'ok', data: order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const id = req.params.id as string;
    const status = ((req.body as Record<string, unknown>).status as string) ?? 'PROCESSING';
    const order = await catalogService.updateOrderStatus(ecommerceId, id, status);
    res.json({ status: 'ok', data: order });
  } catch (err) {
    next(err);
  }
}

// ========================= Coupon Controller =========================

export async function listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const filter = couponQuerySchema.parse(req.query);
    const coupons = await catalogService.listCoupons(ecommerceId, filter);
    res.json({ status: 'ok', data: coupons });
  } catch (err) {
    next(err);
  }
}

export async function getCouponById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const coupon = await catalogService.getCouponById(ecommerceId, id);
    res.json({ status: 'ok', data: coupon });
  } catch (err) {
    next(err);
  }
}

export async function createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = createCouponSchema.parse(req.body);
    const coupon = await catalogService.createCoupon(ecommerceId, input);
    res.status(201).json({ status: 'ok', data: coupon });
  } catch (err) {
    next(err);
  }
}

export async function updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    const input = updateCouponSchema.parse(req.body);
    const coupon = await catalogService.updateCoupon(ecommerceId, id, input);
    res.json({ status: 'ok', data: coupon });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const { id } = idParamSchema.parse(req.params);
    await catalogService.deleteCoupon(ecommerceId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function validateCoupon(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const input = validateCouponSchema.parse(req.body);
    const result = await catalogService.evaluateCoupon(ecommerceId, input);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    next(err);
  }
}

// ========================= Customer Controller =========================

export async function listCustomers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ecommerceId = requireEcommerceId(req);
    const customers = await catalogService.listCustomers(ecommerceId);
    res.json({ status: 'ok', data: customers });
  } catch (err) {
    next(err);
  }
}
