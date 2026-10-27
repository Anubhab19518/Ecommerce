# Authorization (RBAC / ABAC) API Specification

Manages roles, permission rules, user role assignments with multi-tenant scopes, condition evaluation, and Redis cache invalidation.

**Base Path**: `/api/v1/authorization`  
**Authentication**: Required (`Authorization: Bearer <jwt_token>`)

---

## Endpoints

### 1. Roles Management

#### List Roles
- **Method**: `GET`
- **Path**: `/api/v1/authorization/roles`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "ecommerce_admin",
      "description": "Administrator of an ecommerce store",
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

#### Create Role
- **Method**: `POST`
- **Path**: `/api/v1/authorization/roles`
- **Request Body**:
```json
{
  "name": "order_manager",
  "description": "Manages store orders"
}
```
- **Success Response**: `201 Created`

#### Get Role by ID
- **Method**: `GET`
- **Path**: `/api/v1/authorization/roles/:id`
- **Success Response**: `200 OK`

#### Update Role
- **Method**: `PATCH`
- **Path**: `/api/v1/authorization/roles/:id`
- **Request Body**:
```json
{
  "description": "Updated description"
}
```
- **Success Response**: `200 OK`

#### Delete Role
- **Method**: `DELETE`
- **Path**: `/api/v1/authorization/roles/:id`
- **Success Response**: `204 No Content`

---

### 2. Role ↔ Permission Associations

#### Attach Permission to Role
- **Method**: `POST`
- **Path**: `/api/v1/authorization/roles/:id/permissions`
- **Request Body**:
```json
{
  "permissionId": "33333333-3333-4333-8333-333333333333"
}
```
- **Success Response**: `201 Created`

#### Detach Permission from Role
- **Method**: `DELETE`
- **Path**: `/api/v1/authorization/roles/:id/permissions/:permissionId`
- **Success Response**: `204 No Content`

---

### 3. Permissions Management

#### List Permissions
- **Method**: `GET`
- **Path**: `/api/v1/authorization/permissions`
- **Success Response**: `200 OK`

#### Create Permission
- **Method**: `POST`
- **Path**: `/api/v1/authorization/permissions`
- **Request Body**:
```json
{
  "action": "create",
  "subject": "Product",
  "conditions": { "status": "DRAFT" }
}
```
- **Success Response**: `201 Created`

#### Update Permission
- **Method**: `PATCH`
- **Path**: `/api/v1/authorization/permissions/:id`
- **Success Response**: `200 OK`

#### Delete Permission
- **Method**: `DELETE`
- **Path**: `/api/v1/authorization/permissions/:id`
- **Success Response**: `204 No Content`

---

### 4. User Role Assignments

#### Assign Role to User
- **Method**: `POST`
- **Path**: `/api/v1/authorization/users/:userId/roles`
- **Request Body**:
```json
{
  "roleId": "11111111-1111-4111-8111-111111111111",
  "scope": "ecom-store-uuid-1234",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```
- **Fields**:
  - `roleId` (UUID, required)
  - `scope` (string or null, optional): Store tenant ID (`ecommerce_id`), wildcard (`*`), or `null` for global.
  - `expiresAt` (ISO date string or null, optional)
- **Success Response**: `201 Created`

#### Revoke Role from User
- **Method**: `DELETE`
- **Path**: `/api/v1/authorization/users/:userId/roles/:roleId`
- **Success Response**: `204 No Content`

#### Get User Effective Permissions
- **Method**: `GET`
- **Path**: `/api/v1/authorization/users/:userId/permissions`
- **Success Response**: `200 OK`

---

### 5. Runtime Permission Check (Evaluation)

- **Method**: `POST`
- **Path**: `/api/v1/authorization/check`
- **Request Body**:
```json
{
  "userId": "22222222-2222-4222-8222-222222222222",
  "action": "update",
  "subject": "Product",
  "context": {
    "ecommerceId": "ecom-store-uuid-1234"
  }
}
```
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "allowed": true
  }
}
```

---

### 6. Cache Invalidation

- **Method**: `POST`
- **Path**: `/api/v1/authorization/cache/invalidate`
- **Request Body**:
```json
{
  "userId": "22222222-2222-4222-8222-222222222222"
}
```
- **Success Response**: `200 OK`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Non-UUID parameter passed for `roleId`, `permissionId`, or `userId`. | ```json { "status": "error", "message": "Invalid UUID format", "code": "VALIDATION_ERROR" } ``` |
| `400 Bad Request` | `VALIDATION_ERROR` | Missing required fields in role or permission payload. | ```json { "status": "error", "message": "Role name is required", "code": "VALIDATION_ERROR" } ``` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or invalid Bearer access token. | ```json { "status": "error", "message": "Missing or invalid authorization token", "code": "UNAUTHORIZED" } ``` |
| `403 Forbidden` | `FORBIDDEN` | Caller lacks administrative privileges to modify authorization mappings. | ```json { "status": "error", "message": "Forbidden: Requires super admin authorization", "code": "FORBIDDEN" } ``` |
| `404 Not Found` | `NOT_FOUND` | Referenced Role, Permission, or User does not exist. | ```json { "status": "error", "message": "Role not found", "code": "NOT_FOUND" } ``` |
| `409 Conflict` | `CONFLICT` | Creating a role with a duplicate `name`. | ```json { "status": "error", "message": "Role with name \"ecommerce_admin\" already exists", "code": "CONFLICT" } ``` |
| `409 Conflict` | `CONFLICT` | Assigning a role to a user that is already assigned within the same scope. | ```json { "status": "error", "message": "Role is already assigned to this user in this scope", "code": "CONFLICT" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Database or Redis execution failure. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
