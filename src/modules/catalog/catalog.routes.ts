import { Router } from 'express';
import { authenticate } from '@shared/middleware';
import {
  createCategory,
  createEcommerce,
  createProduct,
  createProductOption,
  createProductOptionValue,
  createVariant,
  deleteCategory,
  deleteProduct,
  deleteProductOption,
  deleteProductOptionValue,
  deleteVariant,
  getCategoryById,
  getEcommerceById,
  getProductById,
  getUnit,
  getVariantById,
  listCategories,
  listEcommerce,
  listProductOptions,
  listProducts,
  listUnits,
  listVariants,
  updateCategory,
  updateEcommerce,
  updateProduct,
  updateProductOption,
  updateProductOptionValue,
  updateVariant,
} from './catalog.controller';
import { catalogTenantGuard } from './catalog.tenant-guard';

export const catalogRoutes = Router();

// Protect all catalog endpoints with JWT authentication and tenant resolution guard
catalogRoutes.use(authenticate);
catalogRoutes.use(catalogTenantGuard);

// ========================= Ecommerce =========================
catalogRoutes.get('/ecommerce', listEcommerce);
catalogRoutes.post('/ecommerce', createEcommerce);
catalogRoutes.get('/ecommerce/:id', getEcommerceById);
catalogRoutes.patch('/ecommerce/:id', updateEcommerce);

// ========================= Categories =========================
catalogRoutes.get('/categories', listCategories);
catalogRoutes.post('/categories', createCategory);
catalogRoutes.get('/categories/:id', getCategoryById);
catalogRoutes.patch('/categories/:id', updateCategory);
catalogRoutes.delete('/categories/:id', deleteCategory);

// ========================= Products =========================
catalogRoutes.get('/products', listProducts);
catalogRoutes.post('/products', createProduct);
catalogRoutes.get('/products/:id', getProductById);
catalogRoutes.patch('/products/:id', updateProduct);
catalogRoutes.delete('/products/:id', deleteProduct);

// ========================= Product Options =========================
catalogRoutes.get('/products/:productId/options', listProductOptions);
catalogRoutes.post('/products/:productId/options', createProductOption);
catalogRoutes.patch('/products/:productId/options/:optionId', updateProductOption);
catalogRoutes.delete('/products/:productId/options/:optionId', deleteProductOption);

// ========================= Option Values =========================
catalogRoutes.post('/products/:productId/options/:optionId/values', createProductOptionValue);
catalogRoutes.patch(
  '/products/:productId/options/:optionId/values/:valueId',
  updateProductOptionValue,
);
catalogRoutes.delete(
  '/products/:productId/options/:optionId/values/:valueId',
  deleteProductOptionValue,
);

// ========================= Product Variants =========================
catalogRoutes.get('/products/:productId/variants', listVariants);
catalogRoutes.post('/products/:productId/variants', createVariant);
catalogRoutes.get('/products/:productId/variants/:variantId', getVariantById);
catalogRoutes.patch('/products/:productId/variants/:variantId', updateVariant);
catalogRoutes.delete('/products/:productId/variants/:variantId', deleteVariant);

// ========================= Units (Shared Reference Data) =========================
catalogRoutes.get('/units', listUnits);
catalogRoutes.get('/units/:id', getUnit);
