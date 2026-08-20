# User Management API Specification

Provides user profile and account lifecycle endpoints.

**Base Path**: `/api/v1/users`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)

---

## Endpoints

### 1. List Users
- **Method**: `GET`
- **Path**: `/api/v1/users`
- **Query Parameters**:
  - `page` (optional, integer $\ge 1$, default: `1`): Page number.
  - `limit` (optional, integer between `1` and `100`, default: `20`): Page size.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "user@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 2. Get User by ID
- **Method**: `GET`
- **Path**: `/api/v1/users/:id`
- **Path Parameters**:
  - `id` (UUID, required): Target user ID.
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "user@example.com",
    "name": "Jane Doe",
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 3. Create User
- **Method**: `POST`
- **Path**: `/api/v1/users`
- **Request Body**:
```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "StrongPassword123!"
}
```
- **Fields**:
  - `email` (string, valid email, required)
  - `name` (string, 1-255 chars, required)
  - `password` (string, min 8 chars, optional/required depending on setup)
- **Success Response**: `201 Created`

---

### 4. Update User
- **Method**: `PATCH`
- **Path**: `/api/v1/users/:id`
- **Path Parameters**:
  - `id` (UUID, required): Target user ID.
- **Request Body**:
```json
{
  "name": "Johnathan Doe"
}
```
- **Success Response**: `200 OK`

---

### 5. Delete User
- **Method**: `DELETE`
- **Path**: `/api/v1/users/:id`
- **Path Parameters**:
  - `id` (UUID, required): Target user ID.
- **Success Response**: `204 No Content`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed UUID in `:id` path parameter. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Invalid or missing required body fields (e.g. malformed email address). | ```json { "status": "error", "message": "Invalid email format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Invalid pagination query parameters (`page < 1` or `limit > 100`). | ```json { "status": "error", "message": "Page must be greater than or equal to 1", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing `Authorization` header or invalid JWT token. | ```json { "status": "error", "message": "Missing or invalid authorization token", "code": "UNAUTHORIZED" } ``` |
| `404 Not Found` | `NOT_FOUND` | User with the specified ID does not exist. | ```json { "status": "error", "message": "User not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Creating a user with an email address that already exists in the system. | ```json { "status": "error", "message": "User with email \"user@example.com\" already exists", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database connectivity failure or unexpected error. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
