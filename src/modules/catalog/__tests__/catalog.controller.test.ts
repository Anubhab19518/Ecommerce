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
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ id: validUuid1 }] });
    });

    it('listEcommerce forwards error on failure', async () => {
      (mockService.listEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await listEcommerce(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('getEcommerceById returns store', async () => {
      req.params = { id: validUuid1 };
      (mockService.getEcommerce as jest.Mock).mockResolvedValue({ id: validUuid1 });
      await getEcommerceById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid1 } });
    });

    it('createEcommerce creates store with 201', async () => {
      req.body = { name: 'Acme', slug: 'acme' };
      (mockService.createEcommerce as jest.Mock).mockResolvedValue({
        id: validUuid1,
        name: 'Acme',
      });
      await createEcommerce(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { id: validUuid1, name: 'Acme' },
      });
    });

    it('updateEcommerce updates store', async () => {
      req.params = { id: validUuid1 };
      req.body = { name: 'Acme 2' };
      (mockService.updateEcommerce as jest.Mock).mockResolvedValue({
        id: validUuid1,
        name: 'Acme 2',
      });
      await updateEcommerce(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { id: validUuid1, name: 'Acme 2' },
      });
    });
  });

  describe('Category Handlers', () => {
    it('throws validation error when tenant context is missing', async () => {
      delete req.ecommerceId;
      await listCategories(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Tenant context') }),
      );
    });

    it('listCategories returns categories', async () => {
      req.query = { includeInactive: 'true' };
      (mockService.listCategories as jest.Mock).mockResolvedValue([{ id: validUuid2 }]);
      await listCategories(req as Request, res as Response, next);
      expect(mockService.listCategories).toHaveBeenCalledWith(validUuid1, true);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ id: validUuid2 }] });
    });

    it('getCategoryById returns category', async () => {
      req.params = { id: validUuid2 };
      (mockService.getCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getCategoryById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid2 } });
    });

    it('createCategory creates category', async () => {
      req.body = { name: 'Electronics', slug: 'electronics' };
      (mockService.createCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await createCategory(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid2 } });
    });

    it('updateCategory updates category', async () => {
      req.params = { id: validUuid2 };
      req.body = { name: 'Updated Electronics' };
      (mockService.updateCategory as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateCategory(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid2 } });
    });

    it('deleteCategory removes category with 204', async () => {
      req.params = { id: validUuid2 };
      (mockService.deleteCategory as jest.Mock).mockResolvedValue(undefined);
      await deleteCategory(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('Product Handlers', () => {
    it('listProducts filters products', async () => {
      req.query = { categoryId: validUuid2, status: 'ACTIVE' };
      (mockService.listProducts as jest.Mock).mockResolvedValue([{ id: validUuid3 }]);
      await listProducts(req as Request, res as Response, next);
      expect(mockService.listProducts).toHaveBeenCalledWith(validUuid1, {
        categoryId: validUuid2,
        status: 'ACTIVE',
      });
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ id: validUuid3 }] });
    });

    it('getProductById returns product', async () => {
      req.params = { id: validUuid3 };
      (mockService.getProduct as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await getProductById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid3 } });
    });

    it('createProduct creates product', async () => {
      req.body = { name: 'Phone', slug: 'phone' };
      (mockService.createProduct as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await createProduct(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid3 } });
    });

    it('updateProduct updates product', async () => {
      req.params = { id: validUuid3 };
      req.body = { price: 99.99 };
      (mockService.updateProduct as jest.Mock).mockResolvedValue({ id: validUuid3 });
      await updateProduct(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid3 } });
    });

    it('deleteProduct deletes product with 204', async () => {
      req.params = { id: validUuid3 };
      (mockService.deleteProduct as jest.Mock).mockResolvedValue(undefined);
      await deleteProduct(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('Product Options & Option Values Handlers', () => {
    it('listProductOptions and createProductOption', async () => {
      req.params = { productId: validUuid3 };
      (mockService.listProductOptions as jest.Mock).mockResolvedValue([{ id: 'opt1' }]);
      await listProductOptions(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ id: 'opt1' }] });

      req.body = { name: 'Size' };
      (mockService.createProductOption as jest.Mock).mockResolvedValue({
        id: 'opt1',
        name: 'Size',
      });
      await createProductOption(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateProductOption and deleteProductOption', async () => {
      req.params = { productId: validUuid3, optionId: validUuid2 };
      req.body = { name: 'Clothing Size' };
      (mockService.updateProductOption as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await updateProductOption(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid2 } });

      (mockService.deleteProductOption as jest.Mock).mockResolvedValue(undefined);
      await deleteProductOption(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('createProductOptionValue, updateProductOptionValue, deleteProductOptionValue', async () => {
      const validValueId = '33333333-3333-4333-8333-333333333333';
      req.params = { productId: validUuid3, optionId: validUuid2 };
      req.body = { value: 'M' };
      (mockService.createProductOptionValue as jest.Mock).mockResolvedValue({
        id: validValueId,
        value: 'M',
      });
      await createProductOptionValue(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.params = { productId: validUuid3, optionId: validUuid2, valueId: validValueId };
      req.body = { value: 'L' };
      (mockService.updateProductOptionValue as jest.Mock).mockResolvedValue({
        id: validValueId,
        value: 'L',
      });
      await updateProductOptionValue(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { id: validValueId, value: 'L' },
      });

      (mockService.deleteProductOptionValue as jest.Mock).mockResolvedValue(undefined);
      await deleteProductOptionValue(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Product Variants Handlers', () => {
    it('listVariants returns variants', async () => {
      req.params = { productId: validUuid3 };
      (mockService.listVariants as jest.Mock).mockResolvedValue([{ id: 'var1' }]);
      await listVariants(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ id: 'var1' }] });
    });

    it('getVariantById returns single variant', async () => {
      req.params = { productId: validUuid3, variantId: validUuid2 };
      (mockService.getVariant as jest.Mock).mockResolvedValue({ id: validUuid2 });
      await getVariantById(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: validUuid2 } });
    });

    it('createVariant creates variant with 201', async () => {
      req.params = { productId: validUuid3 };
      req.body = { sku: 'SKU1', optionValueIds: [validUuid2] };
      (mockService.createVariant as jest.Mock).mockResolvedValue({ id: 'var1', sku: 'SKU1' });
      await createVariant(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: { id: 'var1', sku: 'SKU1' } });
    });

    it('updateVariant updates variant', async () => {
      req.params = { productId: validUuid3, variantId: validUuid2 };
      req.body = { price: 49.99 };
      (mockService.updateVariant as jest.Mock).mockResolvedValue({ id: validUuid2, price: 49.99 });
      await updateVariant(req as Request, res as Response, next);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { id: validUuid2, price: 49.99 },
      });
    });

    it('deleteVariant deletes variant with 204', async () => {
      req.params = { productId: validUuid3, variantId: validUuid2 };
      (mockService.deleteVariant as jest.Mock).mockResolvedValue(undefined);
      await deleteVariant(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Unit Reference Handlers', () => {
    it('listUnits with query filter', async () => {
      req.query = { category: 'Volume' };
      (mockService.listUnits as jest.Mock).mockResolvedValue([{ id: validUuid1, name: 'Liter' }]);
      await listUnits(req as Request, res as Response, next);
      expect(mockService.listUnits).toHaveBeenCalledWith('Volume');
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: [{ id: validUuid1, name: 'Liter' }],
      });
    });

    it('getUnit returns unit by id', async () => {
      req.params = { id: validUuid1 };
      (mockService.getUnit as jest.Mock).mockResolvedValue({ id: validUuid1, name: 'Liter' });
      await getUnit(req as Request, res as Response, next);
      expect(mockService.getUnit).toHaveBeenCalledWith(validUuid1);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { id: validUuid1, name: 'Liter' },
      });
    });
  });

  describe('Error Forwarding across all Controller Handlers', () => {
    it('forwards error when listEcommerce fails', async () => {
      (mockService.listEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await listEcommerce(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when getEcommerceById fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.getEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await getEcommerceById(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createEcommerce fails', async () => {
      req.body = { name: 'Acme', slug: 'acme' };
      (mockService.createEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await createEcommerce(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateEcommerce fails', async () => {
      req.params = { id: validUuid1 };
      req.body = { name: 'Acme' };
      (mockService.updateEcommerce as jest.Mock).mockRejectedValue(dummyError);
      await updateEcommerce(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when listCategories fails', async () => {
      (mockService.listCategories as jest.Mock).mockRejectedValue(dummyError);
      await listCategories(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when getCategoryById fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.getCategory as jest.Mock).mockRejectedValue(dummyError);
      await getCategoryById(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createCategory fails', async () => {
      req.body = { name: 'Cat', slug: 'cat' };
      (mockService.createCategory as jest.Mock).mockRejectedValue(dummyError);
      await createCategory(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateCategory fails', async () => {
      req.params = { id: validUuid1 };
      req.body = { name: 'Cat 2' };
      (mockService.updateCategory as jest.Mock).mockRejectedValue(dummyError);
      await updateCategory(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when deleteCategory fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.deleteCategory as jest.Mock).mockRejectedValue(dummyError);
      await deleteCategory(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when listProducts fails', async () => {
      (mockService.listProducts as jest.Mock).mockRejectedValue(dummyError);
      await listProducts(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when getProductById fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.getProduct as jest.Mock).mockRejectedValue(dummyError);
      await getProductById(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createProduct fails', async () => {
      req.body = { name: 'P', slug: 'p' };
      (mockService.createProduct as jest.Mock).mockRejectedValue(dummyError);
      await createProduct(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateProduct fails', async () => {
      req.params = { id: validUuid1 };
      req.body = { price: 10 };
      (mockService.updateProduct as jest.Mock).mockRejectedValue(dummyError);
      await updateProduct(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when deleteProduct fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.deleteProduct as jest.Mock).mockRejectedValue(dummyError);
      await deleteProduct(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when listProductOptions fails', async () => {
      req.params = { productId: validUuid1 };
      (mockService.listProductOptions as jest.Mock).mockRejectedValue(dummyError);
      await listProductOptions(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createProductOption fails', async () => {
      req.params = { productId: validUuid1 };
      req.body = { name: 'Color' };
      (mockService.createProductOption as jest.Mock).mockRejectedValue(dummyError);
      await createProductOption(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateProductOption fails', async () => {
      req.params = { productId: validUuid1, optionId: validUuid2 };
      req.body = { name: 'Size' };
      (mockService.updateProductOption as jest.Mock).mockRejectedValue(dummyError);
      await updateProductOption(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when deleteProductOption fails', async () => {
      req.params = { productId: validUuid1, optionId: validUuid2 };
      (mockService.deleteProductOption as jest.Mock).mockRejectedValue(dummyError);
      await deleteProductOption(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createProductOptionValue fails', async () => {
      req.params = { productId: validUuid1, optionId: validUuid2 };
      req.body = { value: 'Red' };
      (mockService.createProductOptionValue as jest.Mock).mockRejectedValue(dummyError);
      await createProductOptionValue(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateProductOptionValue fails', async () => {
      req.params = { productId: validUuid1, optionId: validUuid2, valueId: validUuid3 };
      req.body = { value: 'Blue' };
      (mockService.updateProductOptionValue as jest.Mock).mockRejectedValue(dummyError);
      await updateProductOptionValue(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when deleteProductOptionValue fails', async () => {
      req.params = { productId: validUuid1, optionId: validUuid2, valueId: validUuid3 };
      (mockService.deleteProductOptionValue as jest.Mock).mockRejectedValue(dummyError);
      await deleteProductOptionValue(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when listVariants fails', async () => {
      req.params = { productId: validUuid1 };
      (mockService.listVariants as jest.Mock).mockRejectedValue(dummyError);
      await listVariants(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when getVariantById fails', async () => {
      req.params = { productId: validUuid1, variantId: validUuid2 };
      (mockService.getVariant as jest.Mock).mockRejectedValue(dummyError);
      await getVariantById(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when createVariant fails', async () => {
      req.params = { productId: validUuid1 };
      req.body = { sku: 'SKU1', optionValueIds: [validUuid2] };
      (mockService.createVariant as jest.Mock).mockRejectedValue(dummyError);
      await createVariant(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when updateVariant fails', async () => {
      req.params = { productId: validUuid1, variantId: validUuid2 };
      req.body = { price: 50 };
      (mockService.updateVariant as jest.Mock).mockRejectedValue(dummyError);
      await updateVariant(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when deleteVariant fails', async () => {
      req.params = { productId: validUuid1, variantId: validUuid2 };
      (mockService.deleteVariant as jest.Mock).mockRejectedValue(dummyError);
      await deleteVariant(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when listUnits fails', async () => {
      (mockService.listUnits as jest.Mock).mockRejectedValue(dummyError);
      await listUnits(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });

    it('forwards error when getUnit fails', async () => {
      req.params = { id: validUuid1 };
      (mockService.getUnit as jest.Mock).mockRejectedValue(dummyError);
      await getUnit(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(dummyError);
    });
  });
});
