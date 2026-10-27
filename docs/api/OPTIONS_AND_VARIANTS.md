# Options & Variants API (`/api/v1/catalog/products/:productId/...`)

## Overview
The Options & Variants API manages multi-dimensional product variations (e.g., Size, Color, Weight, Material). A product with `hasVariants = true` has defined options and option values. Combinations of option values form distinct sellable **Product Variants** with individual SKUs, barcodes, pricing, offer pricing, stock quantities, and variant gallery images.

- **Module Directory:** `src/modules/catalog/`
- **Database Schema:**
  - `catalog_module.product_options`: Option dimension (e.g. "Weight", "Size").
  - `catalog_module.product_option_values`: Option value (e.g. "250", "US 10") linked to `unit_id`.
  - `catalog_module.product_variants`: Concrete SKU, stock, price, status.
  - `catalog_module.product_variant_option_values`: Junction table mapping variants to option values.
  - `catalog_module.product_variant_images`: Variant-specific Cloudinary image gallery.
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## 1. Product Options Endpoints

### List Product Options
- **Endpoint:** `GET /api/v1/catalog/products/:productId/options`
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "opt-1",
      "productId": "prod-1",
      "name": "Weight",
      "displayOrder": 0,
      "values": [
        {
          "id": "val-1",
          "value": "250",
          "unitId": "unit-gram-id",
          "unit": { "id": "unit-gram-id", "name": "gram", "symbol": "g" }
        }
      ]
    }
  ]
}
```

### Create Product Option
- **Endpoint:** `POST /api/v1/catalog/products/:productId/options`
- **Request Body Schema (`createProductOptionSchema`)**
```json
{
  "name": "Size",
  "displayOrder": 0
}
```
- **Success Response:** `201 Created`

### Update / Delete Option
- `PATCH /api/v1/catalog/products/:productId/options/:optionId` (`200 OK`)
- `DELETE /api/v1/catalog/products/:productId/options/:optionId` (`204 No Content`)

---

## 2. Option Values Endpoints

### Create Option Value
- **Endpoint:** `POST /api/v1/catalog/products/:productId/options/:optionId/values`
- **Request Body Schema (`createProductOptionValueSchema`)**
```json
{
  "value": "500",
  "unitId": "a931dc12-4091-4cf1-8c44-b236109af192",
  "displayOrder": 1
}
```
- `value`: string, 1–100 chars, required.
- `unitId`: UUIDv4 pointing to `catalog_module.units`, nullable/optional.
- **Success Response:** `201 Created`

### Update / Delete Option Value
- `PATCH /api/v1/catalog/products/:productId/options/:optionId/values/:valueId` (`200 OK`)
- `DELETE /api/v1/catalog/products/:productId/options/:optionId/values/:valueId` (`204 No Content`)

---

## 3. Product Variants Endpoints

### List Product Variants
- **Endpoint:** `GET /api/v1/catalog/products/:productId/variants`
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "var-001",
      "productId": "prod-1",
      "sku": "NIKE-AIR-US10-RED",
      "price": 150.00,
      "offerPrice": 135.00,
      "quantity": 25,
      "status": "ACTIVE",
      "optionValues": [
        { "id": "val-us10", "value": "US 10", "option": { "name": "Size" } },
        { "id": "val-red", "value": "Red", "option": { "name": "Color" } }
      ],
      "images": []
    }
  ]
}
```

### Create Product Variant
- **Endpoint:** `POST /api/v1/catalog/products/:productId/variants`
- **Request Body Schema (`createProductVariantSchema`)**
```json
{
  "sku": "GMASALA-500G",
  "price": 24.99,
  "offerPrice": 21.99,
  "quantity": 50,
  "status": "ACTIVE",
  "optionValueIds": ["val-500g-uuid"]
}
```
- Validation rule: `offerPrice <= price` when both are defined.
- `optionValueIds`: Array of at least one valid option value UUID.
- **Success Response:** `201 Created`

### Get Variant By ID
- **Endpoint:** `GET /api/v1/catalog/products/:productId/variants/:variantId`
- **Success Response:** `200 OK`

### Update Variant
- **Endpoint:** `PATCH /api/v1/catalog/products/:productId/variants/:variantId`
- **Request Body:** Partial schema of `updateProductVariantSchema`.
- **Success Response:** `200 OK`

### Delete Variant
- **Endpoint:** `DELETE /api/v1/catalog/products/:productId/variants/:variantId`
- **Success Response:** `204 No Content`

---

## 4. Variant Images Endpoints

### Upload Variant Images
- **Endpoint:** `POST /api/v1/catalog/products/:productId/variants/:variantId/images`
- **Content-Type:** `multipart/form-data`
- **Form Field:** `images` (Multer max 10 files)
- **Storage:** Cloudinary folder `variants`.
- **Success Response:** `201 Created`

### Delete Variant Image
- **Endpoint:** `DELETE /api/v1/catalog/products/:productId/variants/:variantId/images/:imageId`
- **Success Response:** `204 No Content`
