# Units API (`/api/v1/catalog/units`)

## Overview
The Units API provides shared reference measurement data (e.g., Weight, Volume, Length, Count) utilized across option values to ensure consistent metric formatting across tenants.

- **Base Route Prefix:** `/api/v1/catalog/units`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.units`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`unit.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/unit.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Endpoint Specifications

### 1. List Reference Units
- **Endpoint:** `GET /api/v1/catalog/units`
- **Purpose:** Retrieve standard measurement units.
- **Query Parameters:**
  - `category` (`string`, optional): e.g., `weight`, `volume`, `length`, `piece`.

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "787fbc5a-e722-487b-87b8-80f074d284f1",
      "name": "gram",
      "symbol": "g",
      "category": "weight",
      "createdAt": "2026-08-20T10:00:00.000Z"
    },
    {
      "id": "83fb8b01-f925-4fc1-a960-9e66580f49f3",
      "name": "kilogram",
      "symbol": "kg",
      "category": "weight",
      "createdAt": "2026-08-20T10:00:00.000Z"
    },
    {
      "id": "99ea78f2-1200-4822-b541-11d87e5d26f7",
      "name": "millilitre",
      "symbol": "ml",
      "category": "volume",
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Unit By ID
- **Endpoint:** `GET /api/v1/catalog/units/:id`
- **Path Parameters:** `id` (UUIDv4 string)
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "id": "787fbc5a-e722-487b-87b8-80f074d284f1",
    "name": "gram",
    "symbol": "g",
    "category": "weight"
  }
}
```
