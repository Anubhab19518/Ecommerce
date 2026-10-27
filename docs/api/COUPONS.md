# Coupons & Promotions API (`/api/v1/catalog/coupons`)

## Overview
The Coupons API provides an advanced rules and promotions engine. It evaluates discounts (`PERCENTAGE` vs `FIXED`), targeting scopes (`ALL_PRODUCTS`, `PRODUCT`, `CATEGORY` via LTREE inheritance, and `USER_BEHAVIOR`), and enforces date constraints, global usage limits, and per-user order frequency rules.

- **Base Route Prefix:** `/api/v1/catalog/coupons`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.coupons`, `catalog_module.coupon_usages`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`coupon.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/coupon.model.ts)
  - Usage Model: [`coupon-usage.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/coupon-usage.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Endpoint Specifications

### 1. Validate & Evaluate Coupon Against Cart
- **Endpoint:** `POST /api/v1/catalog/coupons/validate`
- **Purpose:** Centralized evaluation endpoint invoked during checkout or cart review. Evaluates whether a coupon code is applicable to the user's cart items, checks user past order history, calculates exact discounts, and lists affected item IDs.

#### Request Body Schema (`validateCouponSchema`)
```json
{
  "code": "FIRSTBUY20",
  "customerEmail": "customer@example.com",
  "subtotal": 120.00,
  "cartItems": [
    {
      "id": "cart-item-1",
      "productId": "c6218d60-4966-41cb-b39f-2c7aa3bb7191",
      "product": {
        "id": "c6218d60-4966-41cb-b39f-2c7aa3bb7191",
        "name": "Nike AIR",
        "categoryId": "787fbc5a-e722-487b-87b8-80f074d284f1",
        "price": 150.00,
        "offerPrice": 120.00
      },
      "quantity": 1,
      "pricing": {
        "effectivePrice": 120.00
      }
    }
  ]
}
```

#### Success Response (Valid Coupon)
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "ok",
  "data": {
    "valid": true,
    "couponId": "c479e0a8-b648-433b-85fa-71a260815eb0",
    "code": "FIRSTBUY20",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "discountAmount": 24.00,
    "eligibleSubtotal": 120.00,
    "affectedItemIds": ["c6218d60-4966-41cb-b39f-2c7aa3bb7191"],
    "message": "Coupon applied successfully"
  }
}
```

#### Success Response (Invalid / Inapplicable Coupon)
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "ok",
  "data": {
    "valid": false,
    "couponId": "c479e0a8-b648-433b-85fa-71a260815eb0",
    "code": "FIRSTBUY20",
    "discountAmount": 0,
    "eligibleSubtotal": 0,
    "message": "This coupon is valid only for your first order"
  }
}
```

---

### 2. List Coupons
- **Endpoint:** `GET /api/v1/catalog/coupons`
- **Query Parameters:**
  - `targetType`: `ALL_PRODUCTS` | `PRODUCT` | `CATEGORY` | `USER_BEHAVIOR`
  - `isActive`: `true` | `false`
  - `search`: string
- **Success Response:** `200 OK`
```json
{
  "status": "ok",
  "data": [
    {
      "id": "c479e0a8-b648-433b-85fa-71a260815eb0",
      "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
      "name": "First Order Discount",
      "code": "FIRSTBUY20",
      "description": "20% off on your inaugural order",
      "discountType": "PERCENTAGE",
      "discountValue": 20,
      "targetType": "USER_BEHAVIOR",
      "rules": {
        "behaviorType": "FIRST_ORDER"
      },
      "startDate": null,
      "expiryDate": null,
      "isActive": true,
      "usageLimit": null,
      "usageLimitPerUser": 1,
      "usageCount": 14,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Create Coupon
- **Endpoint:** `POST /api/v1/catalog/coupons`
- **Request Body Schema (`createCouponSchema`)**
```json
{
  "name": "Flat 100 Off on Spices",
  "code": "SPICE100",
  "description": "Save 100 on orders above 500 in Spices category",
  "discountType": "FIXED",
  "discountValue": 100,
  "targetType": "CATEGORY",
  "rules": {
    "categoryId": "787fbc5a-e722-487b-87b8-80f074d284f1"
  },
  "startDate": "2026-10-01T00:00:00.000Z",
  "expiryDate": "2026-11-30T23:59:59.000Z",
  "isActive": true,
  "usageLimit": 500,
  "usageLimitPerUser": 2
}
```

#### Validation Rules:
- If `discountType` is `PERCENTAGE`, `discountValue` cannot exceed 100.
- If `targetType` is `CATEGORY`, `rules.categoryId` is required.
- If `targetType` is `PRODUCT`, `rules.productIds` array is required.
- If `targetType` is `USER_BEHAVIOR`, valid `behaviorType` (`FIRST_ORDER`, `MIN_ORDER_VALUE`, `ORDER_NUMBER`) and respective numeric thresholds are required.
- **Success Response:** `201 Created`

---

### 4. Get Coupon By ID
- **Endpoint:** `GET /api/v1/catalog/coupons/:id`
- **Success Response:** `200 OK`

---

### 5. Update Coupon
- **Endpoint:** `PATCH /api/v1/catalog/coupons/:id`
- **Success Response:** `200 OK`

---

### 6. Delete Coupon
- **Endpoint:** `DELETE /api/v1/catalog/coupons/:id`
- **Success Response:** `204 No Content`
