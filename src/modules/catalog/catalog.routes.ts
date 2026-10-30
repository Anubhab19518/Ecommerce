import { Router } from 'express';
import { authenticate } from '@shared/middleware';
import { uploadMiddleware } from '@shared/middleware/upload';
import {
  createBanner,
  createCategory,
  createEcommerce,
  createProduct,
  createProductOption,
  createProductOptionValue,
  createVariant,
  deleteBanner,
  deleteCategory,
  deleteProduct,
  deleteProductImage,
  deleteProductOption,
  deleteProductOptionValue,
  deleteVariant,
  deleteVariantImage,
  getBannerById,
  getCategoryById,
  getEcommerceById,
  getProductById,
  getUnit,
  getVariantById,
  listBanners,
  listOrders,
  createOrder,
  updateOrderStatus,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  listCustomers,
  listCategories,
  listEcommerce,
  listProductOptions,
  listProducts,
  listUnits,
  listVariants,
  updateBanner,
  updateCategory,
  updateEcommerce,
  updateProduct,
  updateProductOption,
  updateProductOptionValue,
  updateVariant,
  uploadBannerImage,
  uploadProductImages,
  uploadVariantImages,
} from './catalog.controller';
import { catalogTenantGuard } from './catalog.tenant-guard';

export const catalogRoutes = Router();

// Automatically authenticate if Authorization header is present (supports both public guest and authenticated access)
catalogRoutes.use((req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
});

// ========================= Ecommerce =========================
catalogRoutes.get('/ecommerce', authenticate, catalogTenantGuard, listEcommerce);
catalogRoutes.post('/ecommerce', authenticate, catalogTenantGuard, createEcommerce);
catalogRoutes.get('/ecommerce/:id', authenticate, catalogTenantGuard, getEcommerceById);
catalogRoutes.patch('/ecommerce/:id', authenticate, catalogTenantGuard, updateEcommerce);

// ========================= Categories (Public Read, Protected Write) =========================
catalogRoutes.get('/categories', catalogTenantGuard, listCategories);
catalogRoutes.get('/categories/:id', catalogTenantGuard, getCategoryById);
catalogRoutes.post('/categories', authenticate, catalogTenantGuard, createCategory);
catalogRoutes.patch('/categories/:id', authenticate, catalogTenantGuard, updateCategory);
catalogRoutes.delete('/categories/:id', authenticate, catalogTenantGuard, deleteCategory);

// ========================= Products (Public Read, Protected Write) =========================
catalogRoutes.get('/products', catalogTenantGuard, listProducts);
catalogRoutes.get('/products/:id', catalogTenantGuard, getProductById);
catalogRoutes.post('/products', authenticate, catalogTenantGuard, createProduct);
catalogRoutes.patch('/products/:id', authenticate, catalogTenantGuard, updateProduct);
catalogRoutes.delete('/products/:id', authenticate, catalogTenantGuard, deleteProduct);

// ========================= Product Images (Protected) =========================
catalogRoutes.post(
  '/products/:productId/images',
  authenticate,
  catalogTenantGuard,
  uploadMiddleware.array('images', 10),
  uploadProductImages,
);
catalogRoutes.delete(
  '/products/:productId/images/:imageId',
  authenticate,
  catalogTenantGuard,
  deleteProductImage,
);

// ========================= Product Options (Public Read, Protected Write) =========================
catalogRoutes.get('/products/:productId/options', catalogTenantGuard, listProductOptions);
catalogRoutes.post(
  '/products/:productId/options',
  authenticate,
  catalogTenantGuard,
  createProductOption,
);
catalogRoutes.patch(
  '/products/:productId/options/:optionId',
  authenticate,
  catalogTenantGuard,
  updateProductOption,
);
catalogRoutes.delete(
  '/products/:productId/options/:optionId',
  authenticate,
  catalogTenantGuard,
  deleteProductOption,
);

// ========================= Option Values (Protected Write) =========================
catalogRoutes.post(
  '/products/:productId/options/:optionId/values',
  authenticate,
  catalogTenantGuard,
  createProductOptionValue,
);
catalogRoutes.patch(
  '/products/:productId/options/:optionId/values/:valueId',
  authenticate,
  catalogTenantGuard,
  updateProductOptionValue,
);
catalogRoutes.delete(
  '/products/:productId/options/:optionId/values/:valueId',
  authenticate,
  catalogTenantGuard,
  deleteProductOptionValue,
);

// ========================= Product Variants (Public Read, Protected Write) =========================
catalogRoutes.get('/products/:productId/variants', catalogTenantGuard, listVariants);
catalogRoutes.get('/products/:productId/variants/:variantId', catalogTenantGuard, getVariantById);
catalogRoutes.post(
  '/products/:productId/variants',
  authenticate,
  catalogTenantGuard,
  createVariant,
);
catalogRoutes.patch(
  '/products/:productId/variants/:variantId',
  authenticate,
  catalogTenantGuard,
  updateVariant,
);
catalogRoutes.delete(
  '/products/:productId/variants/:variantId',
  authenticate,
  catalogTenantGuard,
  deleteVariant,
);

// ========================= Product Variant Images (Protected) =========================
catalogRoutes.post(
  '/products/:productId/variants/:variantId/images',
  authenticate,
  catalogTenantGuard,
  uploadMiddleware.array('images', 10),
  uploadVariantImages,
);
catalogRoutes.delete(
  '/products/:productId/variants/:variantId/images/:imageId',
  authenticate,
  catalogTenantGuard,
  deleteVariantImage,
);

// ========================= Units (Public Reference Data) =========================
catalogRoutes.get('/units', catalogTenantGuard, listUnits);
catalogRoutes.get('/units/:id', catalogTenantGuard, getUnit);

// ========================= Banners (Public Read, Protected Write) =========================
catalogRoutes.get('/banners', catalogTenantGuard, listBanners);
catalogRoutes.get('/banners/:id', catalogTenantGuard, getBannerById);
catalogRoutes.post('/banners', authenticate, catalogTenantGuard, createBanner);
catalogRoutes.post(
  '/banners/upload',
  authenticate,
  catalogTenantGuard,
  uploadMiddleware.single('image'),
  uploadBannerImage,
);
catalogRoutes.patch('/banners/:id', authenticate, catalogTenantGuard, updateBanner);
catalogRoutes.delete('/banners/:id', authenticate, catalogTenantGuard, deleteBanner);

// ========================= Orders =========================
catalogRoutes.get('/orders', authenticate, catalogTenantGuard, listOrders);
catalogRoutes.post('/orders', catalogTenantGuard, createOrder);
catalogRoutes.patch('/orders/:id', authenticate, catalogTenantGuard, updateOrderStatus);

// ========================= Coupons =========================
catalogRoutes.post('/coupons/validate', catalogTenantGuard, validateCoupon);
catalogRoutes.get('/coupons', authenticate, catalogTenantGuard, listCoupons);
catalogRoutes.post('/coupons', authenticate, catalogTenantGuard, createCoupon);
catalogRoutes.get('/coupons/:id', authenticate, catalogTenantGuard, getCouponById);
catalogRoutes.patch('/coupons/:id', authenticate, catalogTenantGuard, updateCoupon);
catalogRoutes.delete('/coupons/:id', authenticate, catalogTenantGuard, deleteCoupon);

// ========================= Customers =========================
catalogRoutes.get('/customers', authenticate, catalogTenantGuard, listCustomers);
