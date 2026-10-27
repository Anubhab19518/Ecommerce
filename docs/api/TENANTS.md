# Tenants & Stores API (`/api/v1/catalog/ecommerce`)

## Overview
The Ecommerce / Tenants API manages independent merchant storefronts, branding instances, and isolated catalog partitions. Every product, category, banner, coupon, order, and customer belongs to an `ecommerce_id`.

- **Base Route Prefix:** `/api/v1/catalog/ecommerce`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.ecommerce`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`ecommerce.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/ecommerce.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)
  - Tenant Guard: [`catalog.tenant-guard.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.tenant-guard.ts)

---

## Multi-Tenancy Resolution Architecture
For all downstream catalog requests, tenant identity is resolved via:
1. `X-Ecommerce-Id` HTTP Header.
2. User's CASL authorization role scope (`scope = '<storeId>'`).
3. If user is Super Admin (`scope = '*'`), `X-Ecommerce-Id` header is required to target a store.

---

## Endpoint Specifications

### 1. List Ecommerce Stores
- **Endpoint:** `GET /api/v1/catalog/ecommerce`
- **Purpose:** Retrieve all registered ecommerce tenants.
- **Authentication:** Bearer JWT required.
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "f18fae49-8086-4fc2-a892-e4215904fc43",
      "name": "Alpha Enterprise",
      "slug": "alpha-enterprise",
      "status": "ACTIVE",
      "settings": {},
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    },
    {
      "id": "a931dc12-4091-4cf1-8c44-b236109af192",
      "name": "Rasoi Ansh",
      "slug": "rasoi-ansh",
      "status": "ACTIVE",
      "settings": {},
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Ecommerce Store
- **Endpoint:** `POST /api/v1/catalog/ecommerce`
- **Purpose:** Provision a new ecommerce storefront tenant.
- **Authentication:** Super Admin required.

#### Request Body Schema (`createEcommerceSchema`)
```json
{
  "name": "Kratkon Modern Gear",
  "slug": "kratkon",
  "status": "ACTIVE",
  "settings": {
    "currency": "INR",
    "supportEmail": "support@kratkon.com"
  }
}
```
- `name`: string, 1–100 chars, required.
- `slug`: string (lowercase alphanumeric and hyphens), unique, required.
- `status`: enum (`ACTIVE`, `INACTIVE`), default `ACTIVE`.
- `settings`: JSON object, optional.

#### Success Response
- **Status Code:** `201 Created`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "e44d320b-2df8-4b19-91f8-005bf5e2cb83",
    "name": "Kratkon Modern Gear",
    "slug": "kratkon",
    "status": "ACTIVE",
    "settings": {
      "currency": "INR",
      "supportEmail": "support@kratkon.com"
    },
    "createdAt": "2026-10-26T17:30:00.000Z",
    "updatedAt": "2026-10-26T17:30:00.000Z"
  }
}
```

---

### 3. Get Store By ID
- **Endpoint:** `GET /api/v1/catalog/ecommerce/:id`
- **Path Parameters:** `id` (UUIDv4 string)
- **Success Response:** `200 OK`

---

### 4. Update Store
- **Endpoint:** `PATCH /api/v1/catalog/ecommerce/:id`
- **Path Parameters:** `id` (UUIDv4 string)
- **Request Body Schema (`updateEcommerceSchema`)**
```json
{
  "status": "INACTIVE",
  "settings": {
    "maintenanceNotice": "Store undergoes scheduled maintenance"
  }
}
```
- **Success Response:** `200 OK`
