# Orders API (`/api/v1/catalog/orders`)

## Overview
The Orders API handles store order ingestion, transactional coupon redemption recording, shipping address persistence, items snapshotting, and fulfillment status lifecycle management.

- **Base Route Prefix:** `/api/v1/catalog/orders`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.orders`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Transactional Integrity & Coupon Processing
When `POST /api/v1/catalog/orders` is executed:
1. An explicit Sequelize database transaction is initiated.
2. If `couponCode` is supplied, the coupon is evaluated inside the transaction via `evaluateCoupon()`.
3. If valid, coupon discount is calculated and a new record is added to `catalog_module.coupon_usages`.
4. Coupon `usage_count` in `catalog_module.coupons` is incremented atomically.
5. The order record is created with serialized items and shipping address.
6. The transaction commits. If any step fails, the entire order is rolled back.

---

## Endpoint Specifications

### 1. List Store Orders
- **Endpoint:** `GET /api/v1/catalog/orders`
- **Purpose:** Retrieve all historical and active orders for the tenant store.
- **Success Response:** `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "ord-9921",
      "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
      "customerName": "Jane Customer",
      "customerEmail": "jane@example.com",
      "customerPhone": "+91 9876543210",
      "itemsCount": 2,
      "total": 2499.00,
      "status": "PROCESSING",
      "shippingAddress": {
        "street": "123 MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postalCode": "560001",
        "country": "India"
      },
      "items": [
        {
          "productId": "prod-1",
          "name": "Oversized Streetwear Fleece Hoodie",
          "quantity": 1,
          "price": 1899.00
        }
      ],
      "couponId": "c479e0a8-b648-433b-85fa-71a260815eb0",
      "couponCode": "FIRSTBUY20",
      "couponDiscount": 379.80,
      "createdAt": "2026-10-26T14:20:00.000Z",
      "updatedAt": "2026-10-26T14:20:00.000Z"
    }
  ]
}
```

---

### 2. Create Order
- **Endpoint:** `POST /api/v1/catalog/orders`
- **Purpose:** Place an order, validate pricing, apply discounts, and record snapshot data.

#### Request Body Schema (`createOrderSchema`)
```json
{
  "id": "ord-optional-custom-uuid",
  "customerName": "Jane Customer",
  "customerEmail": "jane@example.com",
  "customerPhone": "+91 9876543210",
  "itemsCount": 2,
  "total": 2119.20,
  "status": "PROCESSING",
  "couponCode": "FIRSTBUY20",
  "couponDiscount": 379.80,
  "shippingAddress": {
    "street": "123 MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "India"
  },
  "items": [
    {
      "productId": "prod-1",
      "name": "Oversized Streetwear Fleece Hoodie",
      "quantity": 1,
      "price": 1899.00,
      "pricing": { "effectivePrice": 1899.00 }
    }
  ]
}
```

#### Success Response
- **Status Code:** `201 Created`
- **Body:** `{ "status": "ok", "data": { ...orderRecord } }`

---

### 3. Update Order Status
- **Endpoint:** `PATCH /api/v1/catalog/orders/:id`
- **Purpose:** Transition order fulfillment status.
- **Request Body Schema (`updateOrderStatusSchema`)**
```json
{
  "status": "SHIPPED"
}
```
- Supported Statuses: `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
- **Success Response:** `200 OK`
```json
{
  "status": "ok",
  "data": {
    "id": "ord-9921",
    "status": "SHIPPED",
    "updatedAt": "2026-10-26T17:45:00.000Z"
  }
}
```
