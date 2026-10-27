# Users API (`/api/v1/users`)

## Overview
The Users module manages persistent user accounts, profiles, credentials hashing via `bcrypt`, and user identity records in the dedicated `user_module` database schema.

- **Base Route Prefix:** `/api/v1/users`
- **Module Directory:** `src/modules/user/`
- **Database Schema:** `user_module.users`
- **Primary Files:**
  - Route: [`user.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.routes.ts)
  - Controller: [`user.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.controller.ts)
  - Service: [`user.service.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.service.ts)
  - Repository: [`user.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.repository.ts)
  - Model: [`user.model.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.model.ts)
  - Validator: [`user.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/user/user.validator.ts)

---

## Endpoint Specifications

### 1. List Users
- **Endpoint:** `GET /api/v1/users`
- **Purpose:** Paginated listing of system users.
- **Authentication:** Recommended admin token (currently mounted open or controlled at gateway level).
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, max: 100)

#### Example Request
`GET /api/v1/users?page=1&limit=2`

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "18f886f4-c68e-4fbb-a15d-007f35bfa379",
        "email": "superadmin@bazar.com",
        "name": "Platform Super Admin",
        "createdAt": "2026-08-20T10:00:00.000Z",
        "updatedAt": "2026-08-20T10:00:00.000Z"
      },
      {
        "id": "27b72382-7476-47e0-98b1-dafb733157e1",
        "email": "urbanvogue_admin@bazar.com",
        "name": "Alex Rivera (Alpha Enterprise)",
        "createdAt": "2026-08-20T10:00:00.000Z",
        "updatedAt": "2026-08-20T10:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 2
  }
}
```

---

### 2. Get User By ID
- **Endpoint:** `GET /api/v1/users/:id`
- **Purpose:** Retrieve detailed user profile by UUID.
- **Path Parameters:**
  - `id` (UUIDv4 string, required)

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "18f886f4-c68e-4fbb-a15d-007f35bfa379",
    "email": "superadmin@bazar.com",
    "name": "Platform Super Admin",
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-20T10:00:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid UUID parameter.
- `404 Not Found`: User does not exist.
```json
{
  "status": "error",
  "message": "User not found"
}
```

---

### 3. Create User
- **Endpoint:** `POST /api/v1/users`
- **Purpose:** Register or provision a new user account. Hashes password using `bcrypt` (10 rounds).
- **Event Bus Side Effect:** Publishes `EventType.USER_CREATED` (`user.created`).

#### Request Body Schema (`createUserSchema`)
```json
{
  "email": "storeadmin@kleanja.com",
  "password": "Password123!",
  "name": "Sarah Jenkins"
}
```
- `email`: string, valid email format, unique, required.
- `password`: string, minimum 8 characters, required.
- `name`: string, 1–100 characters, required.

#### Success Response
- **Status Code:** `201 Created`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "7ca64ce7-3367-4e9e-b2d9-1065f57cc61f",
    "email": "storeadmin@kleanja.com",
    "name": "Sarah Jenkins",
    "createdAt": "2026-10-26T17:15:00.000Z",
    "updatedAt": "2026-10-26T17:15:00.000Z"
  }
}
```

#### Error Responses
- `409 Conflict`: User with email already exists.
```json
{
  "status": "error",
  "message": "User with email already exists"
}
```

---

### 4. Update User
- **Endpoint:** `PATCH /api/v1/users/:id`
- **Purpose:** Update user attributes (name, email).
- **Event Bus Side Effect:** Publishes `EventType.USER_UPDATED`.

#### Request Body Schema (`updateUserSchema`)
```json
{
  "name": "Sarah J. Stone"
}
```

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "7ca64ce7-3367-4e9e-b2d9-1065f57cc61f",
    "email": "storeadmin@kleanja.com",
    "name": "Sarah J. Stone",
    "updatedAt": "2026-10-26T17:20:00.000Z"
  }
}
```

---

### 5. Delete User
- **Endpoint:** `DELETE /api/v1/users/:id`
- **Purpose:** Permanently remove user record.
- **Event Bus Side Effect:** Publishes `EventType.USER_DELETED`.

#### Success Response
- **Status Code:** `204 No Content` (Empty body)
