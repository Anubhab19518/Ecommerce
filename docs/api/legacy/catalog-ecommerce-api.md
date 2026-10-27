# Catalog: Ecommerce Stores API Specification

Manages multi-tenant ecommerce store definitions.

**Base Path**: `/api/v1/catalog/ecommerce`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)  
**Authorization**: Global Super Admin or scoped tenant admin.

---

## Endpoints

### 1. List Ecommerce Stores
- **Method**: `GET`
- **Path**: `/api/v1/catalog/ecommerce`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "ecom-11111111-1111-4111-8111-111111111111",
      "name": "Acme Electronics",
      "slug": "acme-electronics",
      "status": "ACTIVE",
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Store by ID
- **Method**: `GET`
- **Path**: `/api/v1/catalog/ecommerce/:id`
- **Path Parameters**:
  - `id` (UUID, required): Store ID.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "id": "ecom-11111111-1111-4111-8111-111111111111",
    "name": "Acme Electronics",
    "slug": "acme-electronics",
    "status": "ACTIVE",
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 3. Create Ecommerce Store
- **Method**: `POST`
- **Path**: `/api/v1/catalog/ecommerce`
- **Request Body**:
```json
{
  "name": "Acme Fashion",
  "slug": "acme-fashion",
  "status": "ACTIVE"
}
```
- **Fields**:
  - `name` (string, 1-255 chars, required)
  - `slug` (string, lowercase alphanumeric with hyphens, required, unique)
  - `status` (enum: `ACTIVE`, `INACTIVE`, `SUSPENDED`, optional, default: `ACTIVE`)
- **Success Response**: `201 Created`
```json
{
  "status": "ok",
  "data": {
    "id": "ecom-22222222-2222-4222-8222-222222222222",
    "name": "Acme Fashion",
    "slug": "acme-fashion",
    "status": "ACTIVE",
    "createdAt": "2026-08-20T10:05:00.000Z",
    "updatedAt": "2026-08-20T10:05:00.000Z"
  }
}
```

---

### 4. Update Ecommerce Store
- **Method**: `PATCH`
- **Path**: `/api/v1/catalog/ecommerce/:id`
- **Path Parameters**:
  - `id` (UUID, required): Store ID.
- **Request Body**:
```json
{
  "name": "Acme Global Fashion",
  "status": "ACTIVE"
}
```
- **Success Response**: `200 OK`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID format in `:id` path parameter. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed slug syntax (must be lowercase alphanumeric separated by hyphens). | ```json { "status": "error", "message": "Slug must be lowercase alphanumeric with hyphens", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Invalid status enum value (must be `ACTIVE`, `INACTIVE`, or `SUSPENDED`). | ```json { "status": "error", "message": "Invalid enum value", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer token. | ```json { "status": "error", "message": "User authentication required", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Store admin attempting to manage/access another store tenant without global super admin privileges. | ```json { "status": "error", "message": "Access denied: Client cannot target a different ecommerce tenant", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Store with the specified `:id` does not exist. | ```json { "status": "error", "message": "Ecommerce not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Creating or updating a store with a `slug` that is already in use by another store. | ```json { "status": "error", "message": "Ecommerce with slug \"acme-fashion\" already exists", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database execution or query timeout failure. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
