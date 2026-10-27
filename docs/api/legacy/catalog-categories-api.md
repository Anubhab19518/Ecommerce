# Catalog: Categories API (Hierarchical LTREE) Specification

Provides category tree management using PostgreSQL's native `ltree` extension for hierarchical path calculations, ancestry queries, and atomic subtree movements.

**Base Path**: `/api/v1/catalog/categories`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)  
**Tenant Scoping**: All operations are strictly scoped to the authenticated user's store.

---

## Endpoints

### 1. List Categories
- **Method**: `GET`
- **Path**: `/api/v1/catalog/categories`
- **Query Parameters**:
  - `includeInactive` (optional, boolean, default: `false`): Include inactive categories.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "cat-11111111-1111-4111-8111-111111111111",
      "ecommerceId": "ecom-11111111-1111-4111-8111-111111111111",
      "parentId": null,
      "name": "Electronics",
      "slug": "electronics",
      "path": "electronics",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z"
    },
    {
      "id": "cat-22222222-2222-4222-8222-222222222222",
      "ecommerceId": "ecom-11111111-1111-4111-8111-111111111111",
      "parentId": "cat-11111111-1111-4111-8111-111111111111",
      "name": "Computers",
      "slug": "computers",
      "path": "electronics.computers",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2026-08-20T10:05:00.000Z"
    }
  ]
}
```

---

### 2. Get Category by ID
- **Method**: `GET`
- **Path**: `/api/v1/catalog/categories/:id`
- **Path Parameters**:
  - `id` (UUID, required): Category ID.
- **Success Response**: `200 OK`

---

### 3. Create Category
- **Method**: `POST`
- **Path**: `/api/v1/catalog/categories`
- **Request Body**:
```json
{
  "name": "Laptops",
  "slug": "laptops",
  "parentId": "cat-22222222-2222-4222-8222-222222222222",
  "sortOrder": 1,
  "isActive": true
}
```
- **Fields**:
  - `name` (string, 1-255 chars, required)
  - `slug` (string, lowercase alphanumeric with hyphens, required, unique within store)
  - `parentId` (UUID or null, optional): Parent category ID. Omit or `null` for root categories.
  - `sortOrder` (integer, optional, default: 0)
  - `isActive` (boolean, optional, default: true)
- **Success Response**: `201 Created`
```json
{
  "status": "ok",
  "data": {
    "id": "cat-33333333-3333-4333-8333-333333333333",
    "ecommerceId": "ecom-11111111-1111-4111-8111-111111111111",
    "parentId": "cat-22222222-2222-4222-8222-222222222222",
    "name": "Laptops",
    "slug": "laptops",
    "path": "electronics.computers.laptops",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-08-20T10:10:00.000Z"
  }
}
```

---

### 4. Update Category (Safe Subtree Movement)
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/categories/:id`
- **Path Parameters**:
  - `id` (UUID, required): Category ID.
- **Request Body**:
```json
{
  "name": "Notebooks & Laptops",
  "parentId": "cat-44444444-4444-4444-8444-444444444444"
}
```
- **Success Response**: `200 OK`

---

### 5. Delete Category
- **Method**: `DELETE`
- **Path**: `/api/v1/catalog/categories/:id`
- **Path Parameters**:
  - `id` (UUID, required): Category ID.
- **Success Response**: `204 No Content`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID format in `:id` or `parentId`. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | **Self-parenting violation**: Setting `parentId` equal to the category's own `:id`. | ```json { "status": "error", "message": "A category cannot be its own parent", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | **Tree cycle violation**: Attempting to move a category underneath one of its own descendants. | ```json { "status": "error", "message": "Cannot move a category under one of its own descendants", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed category `slug`. | ```json { "status": "error", "message": "Slug must be lowercase alphanumeric with hyphens", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer token. | ```json { "status": "error", "message": "User authentication required", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Store admin attempting to access categories in another store tenant. | ```json { "status": "error", "message": "Access denied: Client cannot target a different ecommerce tenant", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Category with `:id` not found in the current store. | ```json { "status": "error", "message": "Category not found", "code": "NOT_FOUND" } ``` |
| `404 Not Found` | `NOT_FOUND` | Target parent category specified in `parentId` does not exist in the current store. | ```json { "status": "error", "message": "Target parent category not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Category with the same `slug` already exists in this store. | ```json { "status": "error", "message": "Category with slug \"laptops\" already exists in this ecommerce", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database transaction rollback or unexpected failure during subtree rewrite. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
