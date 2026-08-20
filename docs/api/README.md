# Modular Monolith E-Commerce API Documentation

Master reference and specifications for all REST endpoints provided by the platform.

## Base URL & Versioning

All API endpoints are prefixed with version `/api/v1`:

```
http://localhost:3000/api/v1
```

## Global Request Headers

| Header | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Bearer JWT access token: `Bearer <token>` | Yes (for protected endpoints) |
| `X-Request-Id` | UUID | Client request correlation ID. If omitted, the server automatically generates one. | Optional |
| `X-Ecommerce-Id` | UUID | Target store ID. Only permitted for global Super Admins to select a specific tenant store. | Optional |
| `Content-Type` | String | Must be `application/json` for requests with bodies (`POST`, `PATCH`, `PUT`). | Yes |

---

## Global Response & Error Conventions

### 1. Success Response Structure (`2xx`)
```json
{
  "status": "ok",
  "data": { ... }
}
```
For paginated list endpoints:
```json
{
  "status": "ok",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. Error Response Structure (`4xx`, `5xx`)
```json
{
  "status": "error",
  "message": "Human-readable explanation of the error",
  "code": "ERROR_CODE_ENUM",
  "requestId": "c4b31a89-4912-4c28-98e9-930438cf1032"
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description | Typical Scenarios |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload, query, or path parameter failed validation schema. | Malformed UUID, missing required fields, invalid slug syntax, direct quantity update on variant products. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid JWT token. | Missing `Authorization` header, invalid signature, expired token. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks permission or attempted cross-tenant access. | Accessing another store's tenant data, user without assigned roles. |
| `404 Not Found` | `NOT_FOUND` | The requested entity does not exist. | Non-existent Product ID, Category ID, Unit ID, User ID. |
| `409 Conflict` | `CONFLICT` | State conflict with existing data. | Duplicate email, duplicate slug within store, duplicate SKU, duplicate variant combination. |
| `500 Internal Error` | `INTERNAL_ERROR` | Unexpected unhandled server exception. | Database connectivity loss, unhandled exceptions. |
| `503 Unavailable` | `SERVICE_UNAVAILABLE` | Downstream service or infrastructure dependency degraded. | Redis ping failure or PostgreSQL connection failure during readiness checks. |

---

## Feature API Guides

| Feature Module | Base Path | API Document |
| :--- | :--- | :--- |
| **Authentication & Sessions** | `/api/v1/auth` | [docs/api/auth-api.md](file:///d:/Projects/Ecommerce/docs/api/auth-api.md) |
| **Health & Observability** | `/api/v1/health` | [docs/api/health-api.md](file:///d:/Projects/Ecommerce/docs/api/health-api.md) |
| **User Management** | `/api/v1/users` | [docs/api/user-api.md](file:///d:/Projects/Ecommerce/docs/api/user-api.md) |
| **Authorization (RBAC / ABAC)** | `/api/v1/authorization` | [docs/api/authorization-api.md](file:///d:/Projects/Ecommerce/docs/api/authorization-api.md) |
| **Catalog: Ecommerce Stores** | `/api/v1/catalog/ecommerce` | [docs/api/catalog-ecommerce-api.md](file:///d:/Projects/Ecommerce/docs/api/catalog-ecommerce-api.md) |
| **Catalog: Categories (LTREE)** | `/api/v1/catalog/categories` | [docs/api/catalog-categories-api.md](file:///d:/Projects/Ecommerce/docs/api/catalog-categories-api.md) |
| **Catalog: Products** | `/api/v1/catalog/products` | [docs/api/catalog-products-api.md](file:///d:/Projects/Ecommerce/docs/api/catalog-products-api.md) |
| **Catalog: Options & Variants** | `/api/v1/catalog/products/:productId/...` | [docs/api/catalog-options-variants-api.md](file:///d:/Projects/Ecommerce/docs/api/catalog-options-variants-api.md) |
| **Catalog: Shared Units** | `/api/v1/catalog/units` | [docs/api/catalog-units-api.md](file:///d:/Projects/Ecommerce/docs/api/catalog-units-api.md) |
