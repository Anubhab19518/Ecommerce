# Catalog: Shared Units API Specification

Provides read-only access to standard system-managed reference units for volume, weight, length, count, and packaging.

**Base Path**: `/api/v1/catalog/units`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)  
**Tenant Scoping**: Shared across all stores (system reference data).

---

## Endpoints

### 1. List Shared Units
Retrieves all reference units, optionally filtered by category.

- **Method**: `GET`
- **Path**: `/api/v1/catalog/units`
- **Query Parameters**:
  - `category` (optional, string, max: 50 chars): Filter by unit category (e.g. `Volume`, `Weight`, `Count`, `Length`, `Packaging`).
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Liter",
      "symbol": "L",
      "category": "Volume",
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "name": "Kilogram",
      "symbol": "kg",
      "category": "Weight",
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Unit by ID
Retrieves details for a single reference unit.

- **Method**: `GET`
- **Path**: `/api/v1/catalog/units/:id`
- **Path Parameters**:
  - `id` (UUID, required): Unit ID.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Liter",
    "symbol": "L",
    "category": "Volume",
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T10:00:00.000Z"
  }
}
```

---

## Seeded Standard Units

| Category | Name | Symbol |
| :--- | :--- | :--- |
| **Volume** | Liter | `L` |
| **Volume** | Milliliter | `ml` |
| **Weight** | Kilogram | `kg` |
| **Weight** | Gram | `g` |
| **Count** | Piece | `pcs` |
| **Length** | Meter | `m` |
| **Length** | Centimeter | `cm` |
| **Packaging** | Pack | `pack` |
| **Packaging** | Bottle | `bottle` |

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID format in `:id` path parameter. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Empty or oversized `category` query parameter string. | ```json { "status": "error", "message": "String must contain at most 50 character(s)", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer token. | ```json { "status": "error", "message": "User authentication required", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Caller has no valid role or store assignments in the system. | ```json { "status": "error", "message": "No roles or tenant access assigned to user", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Unit with `:id` does not exist. | ```json { "status": "error", "message": "Unit not found", "code": "NOT_FOUND" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database connection or execution failure. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
