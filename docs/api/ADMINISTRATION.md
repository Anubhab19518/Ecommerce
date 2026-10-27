# Administration & RBAC API (`/api/v1/authorization`)

## Overview
The Authorization module provides fine-grained, policy-based Role-Based Access Control (RBAC) powered by **@casl/ability**. It supports multi-tenant resource scoping (`scope = '*' | '<ecommerceId>' | null`), JSON condition compilation, and Redis permission caching with event-driven invalidation.

- **Base Route Prefix:** `/api/v1/authorization`
- **Module Directory:** `src/modules/authorization/`
- **Database Schema:** `authorization_module`
  - `roles`: Defined roles (`admin`, `ecommerce_admin`, `user`).
  - `permissions`: Atomic actions and subjects (`manage:all`, `read:catalog`, `write:catalog`, `manage:users`).
  - `role_permissions`: Association with optional JSON conditions.
  - `user_roles`: User assignment with tenant/resource `scope`.
- **Primary Files:**
  - Route: [`authorization.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/authorization/authorization.routes.ts)
  - Controller: [`authorization.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/authorization/authorization.controller.ts)
  - Service: [`authorization.service.ts`](file:///d:/Projects/Ecommerce/src/modules/authorization/authorization.service.ts)
  - Cache: [`authorization.cache.ts`](file:///d:/Projects/Ecommerce/src/modules/authorization/authorization.cache.ts)
  - CASL Ability Factory: [`authorization.ability-factory.ts`](file:///d:/Projects/Ecommerce/src/modules/authorization/authorization.ability-factory.ts)

---

## Role Management Endpoints

### 1. List Roles
- **Endpoint:** `GET /api/v1/authorization/roles`
- **Query Parameters:** `includePermissions` (boolean: `true` | `false`)
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "e8104692-42fe-4e50-9bb7-6e9d7e5d26f7",
      "name": "ecommerce_admin",
      "description": "Store administrator scoped to a single ecommerce organisation",
      "permissions": [
        { "id": "p-1", "action": "manage", "subject": "catalog", "conditions": null }
      ]
    }
  ]
}
```

### 2. Create Role
- **Endpoint:** `POST /api/v1/authorization/roles`
- **Request Body:**
```json
{
  "name": "catalog_editor",
  "description": "Can edit catalog items but cannot delete"
}
```
- **Success Response:** `201 Created`

### 3. Get Role By ID
- **Endpoint:** `GET /api/v1/authorization/roles/:id`
- **Success Response:** `200 OK`

### 4. Update Role
- **Endpoint:** `PATCH /api/v1/authorization/roles/:id`
- **Request Body:** `{ "description": "Updated description" }`
- **Success Response:** `200 OK`

### 5. Delete Role
- **Endpoint:** `DELETE /api/v1/authorization/roles/:id`
- **Success Response:** `204 No Content`

---

## Permission Management Endpoints

### 6. Attach Permission to Role
- **Endpoint:** `POST /api/v1/authorization/roles/:id/permissions`
- **Request Body:**
```json
{
  "permissionId": "488f2195-2a54-4740-97c7-bd661a35a64d",
  "conditions": { "status": { "$in": ["ACTIVE", "DRAFT"] } }
}
```
- **Success Response:** `200 OK`

### 7. Detach Permission from Role
- **Endpoint:** `DELETE /api/v1/authorization/roles/:id/permissions/:permissionId`
- **Success Response:** `204 No Content`

### 8. List Permissions
- **Endpoint:** `GET /api/v1/authorization/permissions`
- **Success Response:** `200 OK`

### 9. Create Permission
- **Endpoint:** `POST /api/v1/authorization/permissions`
- **Request Body:**
```json
{
  "action": "export",
  "subject": "orders",
  "description": "Ability to export order reports"
}
```
- **Success Response:** `201 Created`

### 10. Update / Delete Permission
- `PATCH /api/v1/authorization/permissions/:id` (`200 OK`)
- `DELETE /api/v1/authorization/permissions/:id` (`204 No Content`)

---

## User Role Assignment & Diagnostics

### 11. Assign Role to User
- **Endpoint:** `POST /api/v1/authorization/users/:userId/roles`
- **Purpose:** Grants a role to a user, optionally scoped to a specific ecommerce store UUID.
- **Request Body:**
```json
{
  "roleId": "e8104692-42fe-4e50-9bb7-6e9d7e5d26f7",
  "scope": "f18fae49-8086-4fc2-a892-e4215904fc43"
}
```
- `scope`: `"*"` for global, UUID for single tenant, `null` for unconstrained.
- **Side Effect:** Automatically invalidates user's cached CASL permissions in Redis (`authz:user:<userId>`).
- **Success Response:** `200 OK`

### 12. Revoke Role from User
- **Endpoint:** `DELETE /api/v1/authorization/users/:userId/roles/:roleId`
- **Success Response:** `204 No Content`

### 13. Get Effective User Permissions
- **Endpoint:** `GET /api/v1/authorization/users/:userId/permissions`
- **Purpose:** Resolves flattened CASL rules considering all assigned roles and scopes.
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "userId": "27b72382-7476-47e0-98b1-dafb733157e1",
    "rules": [
      {
        "action": "manage",
        "subject": "catalog",
        "conditions": { "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43" }
      }
    ]
  }
}
```

### 14. Check Permission Diagnostic
- **Endpoint:** `POST /api/v1/authorization/check`
- **Purpose:** Debug tool for testing whether a user can perform an action on a specific subject and resource.
- **Request Body:**
```json
{
  "userId": "27b72382-7476-47e0-98b1-dafb733157e1",
  "action": "update",
  "subject": "catalog",
  "resource": {
    "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43"
  }
}
```
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "allowed": true,
    "userId": "27b72382-7476-47e0-98b1-dafb733157e1",
    "action": "update",
    "subject": "catalog"
  }
}
```

### 15. Invalidate Permission Cache
- **Endpoint:** `POST /api/v1/authorization/cache/invalidate`
- **Request Body:** `{ "userId": "27b72382-7476-47e0-98b1-dafb733157e1" }` (or empty to flush all)
- **Success Response:** `200 OK`
