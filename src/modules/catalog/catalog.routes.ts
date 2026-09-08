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

// ========================= Product Images =========================
catalogRoutes.post(
  '/products/:productId/images',
  uploadMiddleware.array('images', 10),
  uploadProductImages,
);
catalogRoutes.delete('/products/:productId/images/:imageId', deleteProductImage);

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

// ========================= Product Variant Images =========================
catalogRoutes.post(
  '/products/:productId/variants/:variantId/images',
  uploadMiddleware.array('images', 10),
  uploadVariantImages,
);
catalogRoutes.delete(
  '/products/:productId/variants/:variantId/images/:imageId',
  deleteVariantImage,
);

// ========================= Units (Shared Reference Data) =========================
catalogRoutes.get('/units', listUnits);
catalogRoutes.get('/units/:id', getUnit);

// ========================= Banners =========================
catalogRoutes.get('/banners', listBanners);
catalogRoutes.post('/banners', createBanner);
catalogRoutes.post('/banners/upload', uploadMiddleware.single('image'), uploadBannerImage);
catalogRoutes.get('/banners/:id', getBannerById);
catalogRoutes.patch('/banners/:id', updateBanner);
catalogRoutes.delete('/banners/:id', deleteBanner);

// ========================= Orders =========================
catalogRoutes.get('/orders', listOrders);
catalogRoutes.post('/orders', createOrder);
catalogRoutes.patch('/orders/:id', updateOrderStatus);

// ========================= Coupons =========================
catalogRoutes.post('/coupons/validate', validateCoupon);
catalogRoutes.get('/coupons', listCoupons);
catalogRoutes.post('/coupons', createCoupon);
catalogRoutes.get('/coupons/:id', getCouponById);
catalogRoutes.patch('/coupons/:id', updateCoupon);
catalogRoutes.delete('/coupons/:id', deleteCoupon);

// ========================= Customers =========================
catalogRoutes.get('/customers', listCustomers);
