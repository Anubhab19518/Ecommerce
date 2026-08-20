# Catalog: Product Options & Variants API Specification

Provides dynamic multi-option product matrix definitions (e.g. Color, Size, Storage, Volume), option values, and product variant SKUs with independent pricing, stock, and status.

**Base Path**: `/api/v1/catalog/products/:productId`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)  
**Tenant Scoping**: Strictly scoped to the authenticated user's store.

---

## Endpoints

### 1. Product Options

#### List Options for Product
- **Method**: `GET`
- **Path**: `/api/v1/catalog/products/:productId/options`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "opt-11111111-1111-4111-8111-111111111111",
      "productId": "prod-11111111-1111-4111-8111-111111111111",
      "name": "Volume",
      "unitId": "unit-liter-uuid",
      "displayOrder": 0,
      "unit": {
        "id": "unit-liter-uuid",
        "name": "Liter",
        "symbol": "L",
        "category": "Volume"
      },
      "values": [
        { "id": "val-1", "value": "0.5", "displayOrder": 0 },
        { "id": "val-2", "value": "1", "displayOrder": 1 }
      ]
    }
  ]
}
```

#### Create Product Option
- **Method**: `POST`
- **Path**: `/api/v1/catalog/products/:productId/options`
- **Request Body**:
```json
{
  "name": "Volume",
  "unitId": "11111111-1111-4111-8111-111111111111",
  "displayOrder": 0
}
```
- **Fields**:
  - `name` (string, 1-100 chars, required, unique per product)
  - `unitId` (UUID or null, optional): Reference to `catalog_module.units(id)`
  - `displayOrder` (integer, optional, default: 0)
- **Success Response**: `201 Created`

#### Update Product Option
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/products/:productId/options/:optionId`
- **Request Body**:
```json
{
  "name": "Container Volume",
  "unitId": "11111111-1111-4111-8111-111111111111"
}
```
- **Success Response**: `200 OK`

#### Delete Product Option
- **Method**: `DELETE`
- **Path**: `/api/v1/catalog/products/:productId/options/:optionId`
- **Success Response**: `204 No Content`

---

### 2. Product Option Values

#### Create Option Value
- **Method**: `POST`
- **Path**: `/api/v1/catalog/products/:productId/options/:optionId/values`
- **Request Body**:
```json
{
  "value": "2.5",
  "displayOrder": 2
}
```
- **Success Response**: `201 Created`

#### Update Option Value
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/products/:productId/options/:optionId/values/:valueId`
- **Request Body**:
```json
{
  "value": "3.0"
}
```
- **Success Response**: `200 OK`

#### Delete Option Value
- **Method**: `DELETE`
- **Path**: `/api/v1/catalog/products/:productId/options/:optionId/values/:valueId`
- **Success Response**: `204 No Content`

---

### 3. Product Variants

#### List Variants
- **Method**: `GET`
- **Path**: `/api/v1/catalog/products/:productId/variants`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "var-11111111-1111-4111-8111-111111111111",
      "productId": "prod-11111111-1111-4111-8111-111111111111",
      "sku": "CLEAN-VOL-1L",
      "price": 9.99,
      "quantity": 50,
      "status": "ACTIVE",
      "optionValues": [
        {
          "id": "val-1",
          "productOptionId": "opt-1",
          "value": "1"
        }
      ]
    }
  ]
}
```

#### Create Product Variant
- **Method**: `POST`
- **Path**: `/api/v1/catalog/products/:productId/variants`
- **Request Body**:
```json
{
  "sku": "TSH-BLK-M",
  "price": 24.99,
  "quantity": 30,
  "status": "ACTIVE",
  "optionValueIds": [
    "val-black-uuid",
    "val-medium-uuid"
  ]
}
```
- **Fields**:
  - `sku` (string, 1-100 chars, required, unique per product)
  - `price` (number, min: 0, default: 0)
  - `quantity` (integer, min: 0, default: 0)
  - `status` (enum: `ACTIVE`, `INACTIVE`, `DISCONTINUED`, default: `ACTIVE`)
  - `optionValueIds` (array of UUIDs, min 1 item, required)
- **Success Response**: `201 Created`

#### Get Variant by ID
- **Method**: `GET`
- **Path**: `/api/v1/catalog/products/:productId/variants/:variantId`
- **Success Response**: `200 OK`

#### Update Variant
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/products/:productId/variants/:variantId`
- **Request Body**:
```json
{
  "price": 27.99,
  "quantity": 40
}
```
- **Success Response**: `200 OK`

#### Delete Variant
- **Method**: `DELETE`
- **Path**: `/api/v1/catalog/products/:productId/variants/:variantId`
- **Success Response**: `204 No Content`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID passed in `:productId`, `:optionId`, `:valueId`, or `:variantId`. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Option value IDs array is empty in create variant payload. | ```json { "status": "error", "message": "At least one option value ID is required", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Variant contains multiple option values from the **same** option (e.g. selecting both `Black` and `White` for Option `Color`). | ```json { "status": "error", "message": "A variant cannot contain multiple values for the same option", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Option value does not belong to the target product. | ```json { "status": "error", "message": "Option value does not belong to this product", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer token. | ```json { "status": "error", "message": "User authentication required", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Store admin attempting to modify options or variants for another store tenant. | ```json { "status": "error", "message": "Access denied: Client cannot target a different ecommerce tenant", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Product, Option, Option Value, or Variant with the specified ID does not exist. | ```json { "status": "error", "message": "Product option not found", "code": "NOT_FOUND" } ``` |
| `404 Not Found` | `NOT_FOUND` | Referenced `unitId` does not exist in the system. | ```json { "status": "error", "message": "Unit not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Option with the same `name` already exists for this product. | ```json { "status": "error", "message": "Option \"Volume\" already exists for this product", "code": "CONFLICT" } ``` |
| `409 Conflict` | `CONFLICT` | Option value with the same `value` already exists for this option. | ```json { "status": "error", "message": "Option value \"0.5\" already exists for option \"Volume\"", "code": "CONFLICT" } ``` |
| `409 Conflict` | `CONFLICT` | Variant with the exact same combination of option values already exists for this product (e.g. creating `[M, Black]` when `[Black, M]` exists). | ```json { "status": "error", "message": "A variant with this exact combination of option values already exists", "code": "CONFLICT" } ``` |
| `409 Conflict` | `CONFLICT` | Variant with the given `sku` already exists for this product. | ```json { "status": "error", "message": "Variant SKU \"TSH-BLK-M\" already exists for this product", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database execution or transaction rollback failure. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
