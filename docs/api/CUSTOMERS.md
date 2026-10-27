# Customers API (`/api/v1/catalog/customers`)

## Overview
The Customers API aggregates store order transactions to provide real-time customer intelligence, total lifetime order count, cumulative spend metrics, acquisition date, and loyalty segmentation (`VIP` vs `ACTIVE`).

- **Base Route Prefix:** `/api/v1/catalog/customers`
- **Module Directory:** `src/modules/catalog/`
- **Underlying Data Source:** Aggregated view over `catalog_module.orders`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Endpoint Specifications

### 1. List Store Customers
- **Endpoint:** `GET /api/v1/catalog/customers`
- **Purpose:** Retrieve aggregated customer profiles for the store tenant. Automatically assigns loyalty classification (`VIP` if `totalOrders >= 5` or `totalSpent >= 5000`, otherwise `ACTIVE`).

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "cust-1-jane@example.com",
      "name": "Jane Customer",
      "email": "jane@example.com",
      "phone": "+91 9876543210",
      "totalOrders": 6,
      "totalSpent": 12850.50,
      "joinedDate": "Aug 2026",
      "lastOrderDate": "2026-10-26T14:20:00.000Z",
      "status": "VIP"
    },
    {
      "id": "cust-2-alex@example.com",
      "name": "Alex Kumar",
      "email": "alex@example.com",
      "phone": "+91 9123456789",
      "totalOrders": 1,
      "totalSpent": 1899.00,
      "joinedDate": "Oct 2026",
      "lastOrderDate": "2026-10-25T11:00:00.000Z",
      "status": "ACTIVE"
    }
  ]
}
```
