# Catalog: Products API Specification

Manages product catalog definitions, pricing, category assignments, and inventory stock invariants.

**Base Path**: `/api/v1/catalog/products`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)  
**Tenant Scoping**: All operations are strictly scoped to the authenticated user's store.

---

## Endpoints

### 1. List Products
- **Method**: `GET`
- **Path**: `/api/v1/catalog/products`
- **Query Parameters**:
  - `categoryId` (optional, UUID): Filter by category.
  - `status` (optional, enum: `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`): Filter by product status.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "prod-11111111-1111-4111-8111-111111111111",
      "ecommerceId": "ecom-11111111-1111-4111-8111-111111111111",
      "categoryId": "cat-33333333-3333-4333-8333-333333333333",
      "name": "Gaming Laptop X",
      "slug": "gaming-laptop-x",
      "description": "High performance laptop",
      "price": 1499.99,
      "quantity": 0,
      "computedQuantity": 25,
      "status": "ACTIVE",
      "hasVariants": true,
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Product by ID
Retrieves product details including its Category, Product Options (with Units and Option Values), and Product Variants.

- **Method**: `GET`
- **Path**: `/api/v1/catalog/products/:id`
- **Path Parameters**:
  - `id` (UUID, required): Product ID.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "id": "prod-11111111-1111-4111-8111-111111111111",
    "ecommerceId": "ecom-11111111-1111-4111-8111-111111111111",
    "categoryId": "cat-33333333-3333-4333-8333-333333333333",
    "name": "Gaming Laptop X",
    "slug": "gaming-laptop-x",
    "description": "High performance laptop",
    "price": 1499.99,
    "quantity": 0,
    "computedQuantity": 25,
    "status": "ACTIVE",
    "hasVariants": true,
    "options": [
      {
        "id": "opt-1",
        "name": "RAM",
        "unitId": "unit-gb-uuid",
        "displayOrder": 0,
        "unit": {
          "id": "unit-gb-uuid",
          "name": "Gigabyte",
          "symbol": "GB",
          "category": "Data"
        },
        "values": [
          { "id": "val-16gb", "value": "16", "displayOrder": 0 },
          { "id": "val-32gb", "value": "32", "displayOrder": 1 }
        ]
      }
    ],
    "variants": [
      {
        "id": "var-1",
        "sku": "GLAP-16GB",
        "price": 1499.99,
        "quantity": 15,
        "status": "ACTIVE",
        "optionValues": [{ "id": "val-16gb", "value": "16" }]
      },
      {
        "id": "var-2",
        "sku": "GLAP-32GB",
        "price": 1799.99,
        "quantity": 10,
        "status": "ACTIVE",
        "optionValues": [{ "id": "val-32gb", "value": "32" }]
      }
    ]
  }
}
```

---

### 3. Create Product
- **Method**: `POST`
- **Path**: `/api/v1/catalog/products`
- **Request Body**:
```json
{
  "name": "Classic T-Shirt",
  "slug": "classic-t-shirt",
  "description": "100% Organic Cotton everyday t-shirt",
  "categoryId": "cat-apparel-uuid",
  "price": 24.99,
  "quantity": 50,
  "status": "ACTIVE",
  "hasVariants": false
}
```
- **Fields**:
  - `name` (string, 1-255 chars, required)
  - `slug` (string, lowercase alphanumeric with hyphens, required, unique per store)
  - `description` (string or null, optional)
  - `categoryId` (UUID or null, optional)
  - `price` (number, min: 0, default: 0)
  - `quantity` (integer, min: 0, default: 0, forced to 0 if `hasVariants: true`)
  - `status` (enum: `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`, default: `DRAFT`)
  - `hasVariants` (boolean, default: `false`)
- **Success Response**: `201 Created`

---

### 4. Update Product
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/products/:id`
- **Path Parameters**:
  - `id` (UUID, required): Product ID.
- **Request Body**:
```json
{
  "price": 29.99,
  "status": "ACTIVE"
}
```
- **Success Response**: `200 OK`

---

### 5. Delete Product
- **Method**: `DELETE`
- **Path**: `/api/v1/catalog/products/:id`
- **Path Parameters**:
  - `id` (UUID, required): Product ID.
- **Success Response**: `204 No Content`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID in `:id` or `categoryId`. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Negative number provided for `price` or `quantity`. | ```json { "status": "error", "message": "Price cannot be negative", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | **Inventory Invariant Violation**: Attempting to update `quantity` directly on a product where `hasVariants: true`. | ```json { "status": "error", "message": "Cannot directly set product quantity for products with variants. Manage variant quantities instead.", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Invalid status enum value. | ```json { "status": "error", "message": "Invalid enum value", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer token. | ```json { "status": "error", "message": "User authentication required", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Store admin attempting to modify a product belonging to another store. | ```json { "status": "error", "message": "Access denied: Client cannot target a different ecommerce tenant", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Product with `:id` not found in current store. | ```json { "status": "error", "message": "Product not found", "code": "NOT_FOUND" } ``` |
| `404 Not Found` | `NOT_FOUND` | Referenced `categoryId` does not exist in current store. | ```json { "status": "error", "message": "Category not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Product with the given `slug` already exists in this store. | ```json { "status": "error", "message": "Product with slug \"classic-t-shirt\" already exists in this ecommerce", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database execution or transaction rollback failure. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
