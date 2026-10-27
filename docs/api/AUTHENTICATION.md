# Authentication API (`/api/v1/auth`)

## Overview
The Authentication module manages user session issuance, JWT lifecycle (access and refresh token rotation), logout invalidation, and current session inspection.

- **Base Route Prefix:** `/api/v1/auth`
- **Module Directory:** `src/modules/auth/`
- **Primary Files:**
  - Route: [`auth.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/auth/auth.routes.ts)
  - Controller: [`auth.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/auth/auth.controller.ts)
  - Service: [`auth.service.ts`](file:///d:/Projects/Ecommerce/src/modules/auth/auth.service.ts)
  - Repository: [`auth.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/auth/auth.repository.ts)
  - Validator: [`auth.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/auth/auth.validator.ts)

---

## Token Lifecycle & Security Design
- **Access Token:** Short-lived JWT (`JWT_ACCESS_EXPIRES_IN`, default 15 minutes) signed with `JWT_ACCESS_SECRET`. Sent in `Authorization: Bearer <token>` header. Contains payload `{ id, email }`.
- **Refresh Token:** Long-lived JWT (`JWT_REFRESH_EXPIRES_IN`, default 30 days) signed with `JWT_REFRESH_SECRET`. Stored in HTTP-only cookie `refreshToken` and tracked in Redis whitelist/blacklist (`auth:refresh:<userId>:<tokenId>`).
- **Token Invalidation:** Logout deletes the Redis refresh record, rendering the refresh token immediately invalid.

---

## Endpoint Specifications

### 1. User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Purpose:** Authenticate user with email and password, issuing access and refresh tokens.
- **Authentication:** None (Public)
- **Authorization:** None

#### Request Headers
| Header | Type | Required | Description |
|---|---|---|---|
| `Content-Type` | `string` | Yes | Must be `application/json` |
| `X-Request-Id` | `string` | No | Optional client correlation ID |

#### Request Body Schema (`loginSchema`)
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- `email`: string, valid email address, required.
- `password`: string, min 8 characters, required.

#### Success Response
- **Status Code:** `200 OK`
- **Set-Cookie:** `refreshToken=<token>; HttpOnly; Path=/api/v1/auth; SameSite=Strict; Max-Age=2592000`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c1f7a28e-5b1b-4f9e-990a-669b779a1122",
      "email": "user@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  }
}
```

#### Error Responses
- `400 Bad Request`: Validation failure on email/password.
```json
{
  "status": "error",
  "message": "Validation error",
  "details": [{ "field": "email", "message": "Invalid email format" }]
}
```
- `401 Unauthorized`: Invalid credentials.
```json
{
  "status": "error",
  "message": "Invalid email or password"
}
```

#### Default Seeded Test Credentials
These accounts are automatically provisioned by running `npm run seed:tenants`:

| Role / Brand | Email | Password | Scope |
|---|---|---|---|
| **Super Admin** | `superadmin@bazar.com` | `Password123!` | Global (`*`) |
| **Alpha Enterprise** | `urbanvogue_admin@bazar.com` | `Password123!` | Store UUID |
| **Kleanja** | `pureclean_admin@bazar.com` | `Password123!` | Store UUID |
| **Rasoi Ansh** | `freshharvest_admin@bazar.com` | `Password123!` | Store UUID |
| **Kratkon** | `volttech_admin@bazar.com` | `Password123!` | Store UUID |
| **Shree Shyam Impex** | `fitpulse_admin@bazar.com` | `Password123!` | Store UUID |

---

### 2. Token Refresh
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Purpose:** Issue a new access token and rotate the refresh token.
- **Authentication:** Refresh Token (via HTTP-Only Cookie or Request Body)
- **Authorization:** None

#### Request Headers
| Header | Type | Required | Description |
|---|---|---|---|
| `Content-Type` | `string` | No | `application/json` if passing in body |
| `Cookie` | `string` | Conditional | `refreshToken=<token>` if not in body |

#### Request Body (Optional if provided via cookie)
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response
- **Status Code:** `200 OK`
- **Set-Cookie:** Rotated `refreshToken` cookie.
- **Body:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
- `401 Unauthorized`: Refresh token expired, malformed, or revoked in Redis.
```json
{
  "status": "error",
  "message": "Invalid or expired refresh token"
}
```

---

### 3. User Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Purpose:** Revoke active refresh token in Redis and clear refresh cookie.
- **Authentication:** Refresh Token (via cookie or request body)
- **Authorization:** None

#### Success Response
- **Status Code:** `200 OK`
- **Set-Cookie:** Clears `refreshToken` cookie (`Max-Age=0`).
- **Body:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### 4. Get Current Authenticated Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Purpose:** Retrieve the profile and basic permissions of the currently authenticated user.
- **Authentication:** Bearer Access Token required
- **Authorization:** Authenticated user

#### Request Headers
| Header | Type | Required | Description |
|---|---|---|---|
| `Authorization` | `string` | Yes | `Bearer <accessToken>` |

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "c1f7a28e-5b1b-4f9e-990a-669b779a1122",
    "email": "user@example.com",
    "name": "Jane Doe",
    "roles": ["ecommerce_admin"],
    "createdAt": "2026-08-20T10:00:00.000Z"
  }
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid Bearer token.
```json
{
  "status": "error",
  "message": "Authentication required"
}
```
