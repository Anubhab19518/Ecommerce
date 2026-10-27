# Authentication & Session API Specification

Provides authentication, JWT access token issuance, Redis-backed refresh token and session rotation, logout, and authenticated user/tenant context endpoints for the platform.

**Base Path**: `/api/v1/auth`  
**Authentication**: Public for `login`, `refresh`, and `logout`; Required (`Authorization: Bearer <jwt_token>`) for `/me`.

---

## Architecture & Lifecycle Overview

1. **Access Token (`JWT`)**:
   - Short-lived JWT (default: 15 minutes) signed with `JWT_ACCESS_SECRET`.
   - Transmitted in the HTTP header: `Authorization: Bearer <access_token>`.
   - Validated server-side across all protected endpoints using the shared `authenticate` middleware.
2. **Refresh Token & Server-Side Session (`Redis`)**:
   - Long-lived opaque token (`<sessionId>.<tokenSecret>`) stored in Redis at `auth:session:<sessionId>` (default TTL: 30 days).
   - Only the SHA-256 hash of `tokenSecret` is stored in Redis.
   - Delivered in both the JSON response payload and via a secure `HttpOnly`, `SameSite=Strict`, `Path=/` cookie.
   - **Token Rotation**: Every `/refresh` request invalidates the old `tokenSecret`, rotates the session secret, and returns a newly generated refresh token.
   - **Reuse Detection**: Presenting a revoked, replayed, or mismatched refresh token triggers immediate server-side session termination.
3. **Tenant & Organization Context**:
   - For an **Ecommerce Admin**: Tenant scope is determined exclusively by the authenticated user's role assignment in `authorization_module`.
   - For a **Super Admin**: The user holds global (`*` or `null`) scope and can explicitly target a store via the `X-Ecommerce-Id: <uuid>` request header. Any unauthorized store access is rejected with `403 Forbidden`.

---

## Endpoints

### 1. Login (Authenticate & Issue Session)

Authenticates user credentials against `user_module.users`, creates a server-side session in Redis, and returns an access token, refresh token, user identity, and tenant organization context.

- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Authentication**: None
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "admin@bazar.com",
  "password": "SecurePassword123!"
}
```
- **Fields**:
  - `email` (string, valid email format, required)
  - `password` (string, min 1 char, required)

- **Response**: `200 OK`
- **Set-Cookie Header**:
  `refreshToken=<sessionId>.<tokenSecret>; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`
- **Response Body**:
```json
{
  "status": "ok",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "7c8e0638-4e3f-4e09-8086-63e8df3e659b.a9f4c3b2e1d087654321098765432109...",
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "admin@bazar.com",
      "name": "Khandaker Rasel"
    },
    "organisation": {
      "id": "22222222-2222-4222-8222-222222222222",
      "name": "Bazar",
      "slug": "bazar",
      "logo": "https://assets.bazar.com/logo.png",
      "branding": {
        "primaryColor": "#1E60F6",
        "accentColor": "#06B6D4"
      }
    },
    "isSuperAdmin": false,
    "roles": ["ecommerce_admin"],
    "permissions": [
      "manage:Product",
      "manage:Category",
      "read:Unit"
    ]
  }
}
```

---

### 2. Refresh Token (Rotate Session & Issue New Access Token)

Rotates the server-side refresh token secret in Redis and issues a fresh short-lived access token.

- **Method**: `POST`
- **Path**: `/api/v1/auth/refresh`
- **Authentication**: None (authenticated via refresh token)
- **Headers**:
  - `Content-Type: application/json`
  - *Optional Cookie*: `refreshToken=<sessionId>.<tokenSecret>`
- **Request Body** (optional if `refreshToken` cookie is present):
```json
{
  "refreshToken": "7c8e0638-4e3f-4e09-8086-63e8df3e659b.a9f4c3b2e1d087654321098765432109..."
}
```
- **Response**: `200 OK`
- **Set-Cookie Header**:
  `refreshToken=<sessionId>.<newSecret>; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`
- **Response Body**:
```json
{
  "status": "ok",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "7c8e0638-4e3f-4e09-8086-63e8df3e659b.f5e4d3c2b1a098765432109876543210..."
  }
}
```

---

### 3. Logout (Invalidate Server-Side Session)

Revokes and deletes the server-side session from Redis and clears the client refresh cookie.

- **Method**: `POST`
- **Path**: `/api/v1/auth/logout`
- **Authentication**: Optional Bearer token or Refresh Token
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <access_token>` (optional)
  - *Optional Cookie*: `refreshToken=<sessionId>.<tokenSecret>`
- **Request Body** (optional):
```json
{
  "refreshToken": "7c8e0638-4e3f-4e09-8086-63e8df3e659b.f5e4d3c2b1a098765432109876543210..."
}
```
- **Response**: `200 OK`
- **Set-Cookie Header**:
  `refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Response Body**:
```json
{
  "status": "ok",
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 4. Get Current User Context (`/me`)

Retrieves the authenticated user's current profile, assigned roles, permissions, and authorized organization branding.

- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Authentication**: Required (`Authorization: Bearer <access_token>`)
- **Headers**:
  - `Authorization: Bearer <jwt_access_token>`
  - `X-Ecommerce-Id: <uuid>` (*optional*, permitted for Super Admins or authorized tenant admins to target a specific store)
- **Response**: `200 OK`
- **Response Body**:
```json
{
  "status": "ok",
  "data": {
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "admin@bazar.com",
      "name": "Khandaker Rasel"
    },
    "organisation": {
      "id": "22222222-2222-4222-8222-222222222222",
      "name": "Bazar",
      "slug": "bazar",
      "logo": "https://assets.bazar.com/logo.png",
      "branding": {
        "primaryColor": "#1E60F6",
        "accentColor": "#06B6D4"
      }
    },
    "isSuperAdmin": false,
    "roles": ["ecommerce_admin"],
    "permissions": [
      "manage:Product",
      "manage:Category",
      "read:Unit"
    ]
  }
}
```

---

## Error Responses

| HTTP Status | Error Code | Trigger Scenario | Response Example |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed email or empty password in login request. | `{"status":"error","message":"Invalid email address format","code":"VALIDATION_ERROR"}` |
| `401 Unauthorized` | `UNAUTHORIZED` | Invalid email/password during login. | `{"status":"error","message":"Invalid email or password","code":"UNAUTHORIZED"}` |
| `401 Unauthorized` | `UNAUTHORIZED` | Expired or missing Access Token on `/me`. | `{"status":"error","message":"Authentication token required","code":"UNAUTHORIZED"}` |
| `401 Unauthorized` | `UNAUTHORIZED` | Invalid, expired, or reused Refresh Token on `/refresh`. | `{"status":"error","message":"Invalid or expired refresh token","code":"UNAUTHORIZED"}` |
| `403 Forbidden` | `FORBIDDEN` | Non-super admin supplies an unauthorized `X-Ecommerce-Id` header on `/me`. | `{"status":"error","message":"Access to requested ecommerce organisation is not authorized","code":"FORBIDDEN"}` |
| `500 Internal Error` | `INTERNAL_ERROR` | Redis failure or server-side exception. | `{"status":"error","message":"Internal server error","code":"INTERNAL_ERROR"}` |
