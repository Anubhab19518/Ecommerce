import type { Request, Response, NextFunction } from 'express';
import {
  listEcommerce,
  getEcommerceById,
  createEcommerce,
  updateEcommerce,
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductOptions,
  createProductOption,
  updateProductOption,
  deleteProductOption,
  createProductOptionValue,
  updateProductOptionValue,
  deleteProductOptionValue,
  listVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  listUnits,
  getUnit,
  createBanner,
  getBannerById,
  listBanners,
  updateBanner,
  deleteBanner,
  createOrder,
  listOrders,
  updateOrderStatus,
  createCoupon,
  getCouponById,
  listCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  listCustomers,
} from '../catalog.controller';
import { CatalogService } from '../catalog.service';

jest.mock('../catalog.service');

const mockService = CatalogService.prototype as jest.Mocked<CatalogService>;

describe('CatalogController', () => {
  let req: Partial<Request> & { ecommerceId?: string };
  let res: Partial<Response>;
  let next: NextFunction;

  const validUuid1 = '11111111-1111-4111-8111-111111111111';
  const validUuid2 = '22222222-2222-4222-8222-222222222222';
  const validUuid3 = '33333333-3333-4333-8333-333333333333';
  const dummyError = new Error('Service error');

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      ecommerceId: validUuid1,
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Ecommerce Handlers', () => {
    it('listEcommerce returns all stores', async () => {
      (mockService.listEcommerce as jest.Mock).mockResolvedValue([{ id: validUuid1 }]);
      await listEcommerce(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('getEcommerceById returns a store', async () => {
      req.params = { id: validUuid1 };
      (mockService.getEcommerce as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await getEcommerceById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('createEcommerce returns 201', async () => {
      req.body = { name: 'Store', slug: 'store', status: 'ACTIVE' };
      (mockService.createEcommerce as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await createEcommerce(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateEcommerce returns updated', async () => {
      req.params = { id: validUuid1 };
      req.body = { name: 'Updated Store' };
      (mockService.updateEcommerce as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await updateEcommerce(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Category Handlers', () => {
    it('handles category CRUD operations', async () => {
      (mockService.listCategories as jest.Mock).mockResolvedValue([]);
      await listCategories(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.params = { id: validUuid2 };
      (mockService.getCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getCategoryById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.body = { name: 'Cat', slug: 'cat' };
      (mockService.createCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await createCategory(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      (mockService.updateCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateCategory(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      (mockService.deleteCategory as jest.Mock).mockResolvedValue(undefined);
      await deleteCategory(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Product Handlers', () => {
    it('handles product CRUD operations', async () => {
      (mockService.listProducts as jest.Mock).mockResolvedValue([]);
      await listProducts(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.params = { id: validUuid2 };
      (mockService.getProduct as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getProductById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.body = { categoryId: validUuid3, name: 'Prod', slug: 'prod', price: 10, quantity: 5 };
      (mockService.createProduct as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await createProduct(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      (mockService.updateProduct as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateProduct(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      (mockService.deleteProduct as jest.Mock).mockResolvedValue(undefined);
      await deleteProduct(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Product Option & Value Handlers', () => {
    it('handles option and value CRUD operations', async () => {
      req.params = { productId: validUuid2 };
      (mockService.listProductOptions as jest.Mock).mockResolvedValue([]);
      await listProductOptions(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.body = { name: 'Size' };
      (mockService.createProductOption as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await createProductOption(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.params = { productId: validUuid2, optionId: validUuid3 };
      (mockService.updateProductOption as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await updateProductOption(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      (mockService.deleteProductOption as jest.Mock).mockResolvedValue(undefined);
      await deleteProductOption(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);

      req.body = { value: 'XL' };
      (mockService.createProductOptionValue as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await createProductOptionValue(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.params = { productId: validUuid2, optionId: validUuid3, valueId: validUuid1 };
      (mockService.updateProductOptionValue as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await updateProductOptionValue(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      (mockService.deleteProductOptionValue as jest.Mock).mockResolvedValue(undefined);
      await deleteProductOptionValue(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Product Variant Handlers', () => {
    it('listVariants returns variants', async () => {
      req.params = { productId: validUuid2 };
      (mockService.listVariants as jest.Mock).mockResolvedValue([]);
      await listVariants(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('getVariantById returns a variant', async () => {
      req.params = { productId: validUuid2, variantId: validUuid3 };
      (mockService.getVariant as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await getVariantById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('createVariant creates a variant', async () => {
      req.params = { productId: validUuid2 };
      req.body = { sku: 'SKU1', price: 100, optionValueIds: [validUuid3] };
      (mockService.createVariant as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await createVariant(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateVariant updates a variant', async () => {
      req.params = { productId: validUuid2, variantId: validUuid3 };
      req.body = { price: 120 };
      (mockService.updateVariant as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await updateVariant(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('deleteVariant deletes a variant', async () => {
      req.params = { productId: validUuid2, variantId: validUuid3 };
      (mockService.deleteVariant as jest.Mock).mockResolvedValue(undefined);
      await deleteVariant(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Unit Reference Handlers', () => {
    it('listUnits and getUnit work properly', async () => {
      (mockService.listUnits as jest.Mock).mockResolvedValue([]);
      await listUnits(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.params = { id: validUuid1 };
      (mockService.getUnit as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await getUnit(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Banner Handlers', () => {
    it('createBanner returns 201', async () => {
      req.body = { title: 'Sale', imageUrl: 'http://img.jpg' };
      (mockService.createBanner as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await createBanner(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('getBannerById returns a banner', async () => {
      req.params = { id: validUuid2 };
      (mockService.getBanner as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getBannerById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('listBanners returns banner list', async () => {
      (mockService.listBanners as jest.Mock).mockResolvedValue([]);
      await listBanners(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('updateBanner updates banner', async () => {
      req.params = { id: validUuid2 };
      req.body = { title: 'New Sale' };
      (mockService.updateBanner as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateBanner(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('deleteBanner returns success message', async () => {
      req.params = { id: validUuid2 };
      (mockService.deleteBanner as jest.Mock).mockResolvedValue(undefined);
      await deleteBanner(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Order Handlers', () => {
    it('handles order CRUD and status updates', async () => {
      req.body = { customerName: 'Alice', total: 100 };
      (mockService.createOrder as jest.Mock).mockResolvedValue({ id: 'ORD-1' });
      await createOrder(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      (mockService.listOrders as jest.Mock).mockResolvedValue([]);
      await listOrders(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();

      req.params = { id: 'ORD-1' };
      req.body = { status: 'DELIVERED' };
      (mockService.updateOrderStatus as jest.Mock).mockResolvedValue({
        id: 'ORD-1',
        status: 'DELIVERED',
      });
      await updateOrderStatus(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Coupon Handlers', () => {
    it('createCoupon returns 201', async () => {
      req.body = {
        name: 'Save 10',
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        targetType: 'ALL_PRODUCTS',
      };
      (mockService.createCoupon as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await createCoupon(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('getCouponById returns coupon', async () => {
      req.params = { id: validUuid2 };
      (mockService.getCouponById as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getCouponById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('listCoupons returns coupons', async () => {
      (mockService.listCoupons as jest.Mock).mockResolvedValue([]);
      await listCoupons(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('updateCoupon returns updated', async () => {
      req.params = { id: validUuid2 };
      req.body = { name: 'Save 15' };
      (mockService.updateCoupon as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateCoupon(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('deleteCoupon returns 204', async () => {
      req.params = { id: validUuid2 };
      (mockService.deleteCoupon as jest.Mock).mockResolvedValue(undefined);
      await deleteCoupon(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('validateCoupon returns evaluation result', async () => {
      req.body = { code: 'SAVE10' };
      (mockService.evaluateCoupon as jest.Mock).mockResolvedValue({
        valid: true,
        discountAmount: 10,
      });
      await validateCoupon(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Customer Directory Handler', () => {
    it('lists customers', async () => {
      (mockService.listCustomers as jest.Mock).mockResolvedValue([]);
      await listCustomers(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Error Forwarding', () => {
    it('forwards error when listEcommerce fails', async () => {
      (mockService.listEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await listEcommerce(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createCoupon fails', async () => {
      req.body = {
        name: 'C',
        code: 'C',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        targetType: 'ALL_PRODUCTS',
      };
      (mockService.createCoupon as jest.Mock).mockRejectedValue(dummyError);
      await createCoupon(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when validateCoupon fails', async () => {
      req.body = { code: 'C' };
      (mockService.evaluateCoupon as jest.Mock).mockRejectedValue(dummyError);
      await validateCoupon(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createOrder fails', async () => {
      req.body = { customerName: 'A', total: 10 };
      (mockService.createOrder as jest.Mock).mockRejectedValue(dummyError);
      await createOrder(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });
  });
});
