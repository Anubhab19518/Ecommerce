# Kratkon D2C Bags Storefront & Admin API Integration Guide

This guide provides end-to-end endpoint specifications, request/response structures, authentication flows, and data mapping models for connecting both the **Kratkon Customer-Facing Storefront** and the **Kratkon Store Admin Panel** with the backend API.

---

## 1. Tenant & Environment Setup

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Brand Name** | `Kratkon` | D2C E-Commerce Platform for Bags |
| **Tenant ID (`ecommerce_id`)** | `7e3a8a90-32e6-4039-8d93-b98f75e2cee7` | Send in `x-ecommerce-id` header |
| **Tenant Slug** | `kratkon` | Store routing identifier |
| **Backend Base URL** | `http://localhost:3000/api/v1` | Express API Server |
| **Admin Login Email** | `volttech_admin@bazar.com` | Store Admin credentials |
| **Admin Login Password** | `Password123!` | Store Admin password |
| **Role** | `ecommerce_admin` | Scoped to Kratkon Store ID |

---

## 2. Authentication & Common Headers

### Required Request Headers

```http
Authorization: Bearer <accessToken>
x-ecommerce-id: 7e3a8a90-32e6-4039-8d93-b98f75e2cee7
Content-Type: application/json
```

> **Public Storefront Note:** For public read queries (e.g. browsing products, categories, active banners, validating cart coupons), the `x-ecommerce-id` header or `?storeId=7e3a8a90-32e6-4039-8d93-b98f75e2cee7` identifies the tenant. When authenticating as the store admin, include the JWT `Bearer` token.

---

## 3. Auth Endpoints

### 3.1 Admin & Store Login
`POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "volttech_admin@bazar.com",
  "password": "Password123!"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c62fa9c4-1188-444a-9ceb-78280f55cfcb",
      "email": "volttech_admin@bazar.com",
      "name": "Elena Rostova (Kratkon)"
    },
    "organisation": {
      "id": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
      "name": "Kratkon",
      "slug": "kratkon"
    }
  }
}
```

### 3.2 Current Session Profile (`Me`)
`GET /api/v1/auth/me`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c62fa9c4-1188-444a-9ceb-78280f55cfcb",
      "email": "volttech_admin@bazar.com",
      "name": "Elena Rostova (Kratkon)"
    },
    "organisation": {
      "id": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
      "name": "Kratkon",
      "slug": "kratkon"
    },
    "isSuperAdmin": false,
    "roles": ["ecommerce_admin"],
    "permissions": ["manage:all"]
  }
}
```

---

## 4. Categories Management (Navigation & Taxonomy)

### 4.1 List Categories (Storefront Navigation / Admin Table)
`GET /api/v1/catalog/categories`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "d0a1b2c3-4444-5555-6666-777788889999",
      "name": "Backpacks",
      "slug": "backpacks",
      "description": "Ergonomic urban and travel backpacks",
      "parentId": null,
      "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
      "createdAt": "2026-09-03T07:00:00.000Z",
      "updatedAt": "2026-09-03T07:00:00.000Z"
    },
    {
      "id": "e1f2a3b4-5555-6666-7777-888899990000",
      "name": "Travel & Duffel Bags",
      "slug": "travel-duffel-bags",
      "description": "Water-resistant travel duffels and weekender bags",
      "parentId": null,
      "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
      "createdAt": "2026-09-03T07:00:00.000Z",
      "updatedAt": "2026-09-03T07:00:00.000Z"
    }
  ]
}
```

### 4.2 Create Category (Admin Panel)
`POST /api/v1/catalog/categories`

**Request Body:**
```json
{
  "name": "Sling & Crossbody Bags",
  "slug": "sling-crossbody-bags",
  "description": "Compact everyday carry and sling bags",
  "parentId": null
}
```

### 4.3 Update Category
`PUT /api/v1/catalog/categories/:id`

### 4.4 Delete Category
`DELETE /api/v1/catalog/categories/:id`

---

## 5. Products & Catalog API

### 5.1 List Products (Catalog Page / Filter / Search / Pagination)
`GET /api/v1/catalog/products?page=1&limit=12&categoryId=<id>&search=laptop&status=ACTIVE`

**Query Parameters:**
- `page`: default `1`
- `limit`: default `20`
- `search`: search substring matching product title/description
- `categoryId`: filter by category ID
- `status`: `ACTIVE`, `DRAFT`, `ARCHIVED` (Customer storefront should filter `status=ACTIVE`)
- `minPrice` / `maxPrice`: price range filter
- `tags`: comma-separated tag filter
- `inStock`: `true` to filter products with inventory $> 0$

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "a9876543-210f-4321-ba98-76543210fedc",
        "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
        "categoryId": "d0a1b2c3-4444-5555-6666-777788889999",
        "name": "Urban Pro Laptop Backpack 25L",
        "slug": "urban-pro-laptop-backpack-25l",
        "sku": "KRT-BP-25L-001",
        "price": 89.99,
        "offerPrice": 74.99,
        "costPrice": 35.00,
        "taxRate": 18.0,
        "quantity": 60,
        "status": "ACTIVE",
        "description": "Water-resistant nylon backpack with 16-inch padded laptop compartment",
        "hasVariants": true,
        "tags": ["d2c", "waterproof", "laptop-bag", "bestseller"],
        "category": {
          "id": "d0a1b2c3-4444-5555-6666-777788889999",
          "name": "Backpacks",
          "slug": "backpacks"
        },
        "images": [
          {
            "id": "img-001",
            "url": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/backpack-front.jpg",
            "altText": "Urban Pro Backpack Front View",
            "displayOrder": 0,
            "isPrimary": true
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 5.2 Get Product by Slug (Customer Storefront Product Details Page)
`GET /api/v1/catalog/products/by-slug/:slug`

**Example:** `GET /api/v1/catalog/products/by-slug/urban-pro-laptop-backpack-25l`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "a9876543-210f-4321-ba98-76543210fedc",
    "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
    "name": "Urban Pro Laptop Backpack 25L",
    "slug": "urban-pro-laptop-backpack-25l",
    "sku": "KRT-BP-25L-001",
    "price": 89.99,
    "offerPrice": 74.99,
    "taxRate": 18.0,
    "quantity": 60,
    "status": "ACTIVE",
    "description": "Water-resistant nylon backpack with 16-inch padded laptop compartment",
    "hasVariants": true,
    "tags": ["d2c", "waterproof", "laptop-bag"],
    "category": {
      "id": "d0a1b2c3-4444-5555-6666-777788889999",
      "name": "Backpacks",
      "slug": "backpacks"
    },
    "options": [
      {
        "id": "opt-color",
        "name": "Color",
        "displayOrder": 0,
        "values": [
          { "id": "val-black", "value": "Midnight Black", "unitId": null, "displayOrder": 0 },
          { "id": "val-grey", "value": "Slate Grey", "unitId": null, "displayOrder": 1 }
        ]
      }
    ],
    "variants": [
      {
        "id": "var-black",
        "sku": "KRT-BP-25L-BLK",
        "price": 89.99,
        "offerPrice": 74.99,
        "quantity": 35,
        "status": "ACTIVE",
        "optionValues": [
          { "optionId": "opt-color", "optionName": "Color", "valueId": "val-black", "value": "Midnight Black" }
        ],
        "images": [
          { "id": "img-v-blk", "url": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/backpack-black.jpg", "isPrimary": true }
        ]
      },
      {
        "id": "var-grey",
        "sku": "KRT-BP-25L-GRY",
        "price": 89.99,
        "offerPrice": 74.99,
        "quantity": 25,
        "status": "ACTIVE",
        "optionValues": [
          { "optionId": "opt-color", "optionName": "Color", "valueId": "val-grey", "value": "Slate Grey" }
        ],
        "images": [
          { "id": "img-v-gry", "url": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/backpack-grey.jpg", "isPrimary": true }
        ]
      }
    ],
    "images": [
      { "id": "img-001", "url": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/backpack-front.jpg", "isPrimary": true }
    ]
  }
}
```

### 5.3 Create Product (Admin Panel)
`POST /api/v1/catalog/products`

**Request Body:**
```json
{
  "categoryId": "d0a1b2c3-4444-5555-6666-777788889999",
  "name": "Nomad Weekender Duffel 45L",
  "slug": "nomad-weekender-duffel-45l",
  "sku": "KRT-DF-45L-001",
  "price": 119.99,
  "offerPrice": 99.99,
  "costPrice": 48.00,
  "taxRate": 18.0,
  "quantity": 40,
  "status": "ACTIVE",
  "description": "Heavy-duty canvas and ballistic nylon travel duffel with shoe pocket",
  "hasVariants": true,
  "tags": ["travel", "duffel", "weekend"]
}
```

### 5.4 Update Product (Admin Panel)
`PUT /api/v1/catalog/products/:id`

### 5.5 Delete / Archive Product (Admin Panel)
`DELETE /api/v1/catalog/products/:id`

---

## 6. Options, Values & Variants (Kratkon Bag Configurator)

### 6.1 Create Product Option (e.g. `Color`, `Capacity`)
`POST /api/v1/catalog/products/:productId/options`

```json
{
  "name": "Color",
  "displayOrder": 0
}
```

### 6.2 Add Option Value
`POST /api/v1/catalog/products/:productId/options/:optionId/values`

```json
{
  "value": "Olive Green",
  "unitId": null,
  "displayOrder": 2
}
```

### 6.3 Create Product Variant
`POST /api/v1/catalog/products/:productId/variants`

```json
{
  "sku": "KRT-DF-45L-OLV",
  "price": 119.99,
  "offerPrice": 99.99,
  "costPrice": 48.00,
  "quantity": 20,
  "status": "ACTIVE",
  "optionValueIds": ["val-olive-id"]
}
```

---

## 7. Cloudinary Media & Product Images

### 7.1 Upload Product Image (Admin Panel)
`POST /api/v1/catalog/products/:productId/images`
*Content-Type: `multipart/form-data`*

- Form Field: `image` (binary file: JPG, PNG, WebP)
- Form Field: `altText`: string
- Form Field: `isPrimary`: boolean string (`"true"` / `"false"`)
- Form Field: `displayOrder`: number string

### 7.2 Delete Product Image
`DELETE /api/v1/catalog/products/:productId/images/:imageId`

---

## 8. Storefront Banners & Promotions (Hero Carousels)

### 8.1 List Active Banners (Storefront Hero / Admin Manager)
`GET /api/v1/catalog/banners?status=ACTIVE`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "bnr-krt-01",
      "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
      "title": "Built for the Journey: All-New Nomad Duffels",
      "subtitle": "Get 15% off with code KRATKON15",
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/hero-banner.webp",
      "linkUrl": "/categories/travel-duffel-bags",
      "position": "HERO",
      "displayOrder": 0,
      "status": "ACTIVE"
    }
  ]
}
```

### 8.2 Create Banner (Admin Panel)
`POST /api/v1/catalog/banners`

```json
{
  "title": "Ergonomic Urban Commuter Backpacks",
  "subtitle": "Engineered for Comfort & Tech Protection",
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/kratkon/backpacks-hero.webp",
  "linkUrl": "/categories/backpacks",
  "position": "HERO",
  "displayOrder": 0,
  "status": "ACTIVE"
}
```

---

## 9. Coupons & Discounts Engine

### 9.1 Validate Coupon at Checkout (Customer Storefront)
`POST /api/v1/catalog/coupons/validate`

**Request Body:**
```json
{
  "code": "KRATKON10",
  "customerEmail": "shopper@example.com",
  "cartItems": [
    {
      "productId": "a9876543-210f-4321-ba98-76543210fedc",
      "variantId": "var-black",
      "categoryId": "d0a1b2c3-4444-5555-6666-777788889999",
      "price": 74.99,
      "quantity": 1
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "code": "KRATKON10",
    "discountAmount": 7.50,
    "finalPrice": 67.49,
    "discountType": "PERCENTAGE",
    "message": "Coupon applied successfully! You saved $7.50"
  }
}
```

### 9.2 Create Coupon (Admin Panel)
`POST /api/v1/catalog/coupons`

```json
{
  "code": "KRATKON10",
  "description": "10% off on all D2C Backpack orders",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "targetType": "ALL_PRODUCTS",
  "minOrderAmount": 50.0,
  "maxDiscountAmount": 20.0,
  "usageLimit": 500,
  "perUserLimit": 1,
  "startDate": "2026-09-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "status": "ACTIVE"
}
```

---

## 10. Orders & Checkout Flow

### 10.1 Place Order (Storefront Checkout)
`POST /api/v1/catalog/orders`

**Request Body:**
```json
{
  "customerEmail": "customer@gmail.com",
  "customerName": "Rohan Mehta",
  "customerPhone": "+919876543210",
  "shippingAddress": "Flat 402, Skyline Residency, Bandra West, Mumbai, 400050",
  "billingAddress": "Flat 402, Skyline Residency, Bandra West, Mumbai, 400050",
  "paymentMethod": "PREPAID",
  "couponCode": "KRATKON10",
  "couponDiscount": 7.50,
  "totalAmount": 67.49,
  "items": [
    {
      "productId": "a9876543-210f-4321-ba98-76543210fedc",
      "variantId": "var-black",
      "name": "Urban Pro Laptop Backpack 25L (Midnight Black)",
      "sku": "KRT-BP-25L-BLK",
      "price": 74.99,
      "quantity": 1
    }
  ]
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "ord-8839-4411-9922",
    "ecommerceId": "7e3a8a90-32e6-4039-8d93-b98f75e2cee7",
    "customerEmail": "customer@gmail.com",
    "customerName": "Rohan Mehta",
    "totalAmount": 67.49,
    "couponCode": "KRATKON10",
    "status": "PENDING",
    "createdAt": "2026-09-03T08:15:00.000Z"
  }
}
```

### 10.2 List Orders (Admin Order Management Dashboard)
`GET /api/v1/catalog/orders`

### 10.3 Update Order Fulfillment Status (Admin Panel)
`PUT /api/v1/catalog/orders/:id/status`

```json
{
  "status": "SHIPPED"
}
```
*(Status enum: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`)*

### 10.4 Customer CRM Analytics (Admin Panel)
`GET /api/v1/catalog/customers`

Returns customer lifetime spending, aggregate order counts, and contact data.

---

## 11. Frontend State & Synchronization Matrix

| Admin Panel Action | Database Entity Affected | Storefront Effect |
| :--- | :--- | :--- |
| **Add / Edit Category** | `catalog_module.categories` | Header menu, category dropdowns, sidebar filters update in real time. |
| **Upload Product Image / Variant Image** | `catalog_module.product_images` / `product_variant_images` | Gallery carousel, thumbnail selector, variant swatch preview update. |
| **Adjust Price / Offer Price / Stock** | `catalog_module.products` & `product_variants` | PDP price badge, strikethrough discount, inventory badge (In Stock / Low Stock / Out of Stock). |
| **Publish Hero Banner** | `catalog_module.banners` | Homepage hero carousel & promo cards update dynamically. |
| **Create Coupon Campaign** | `catalog_module.coupons` | Cart discount validator applies coupon code and updates subtotal. |
| **Process / Ship Order** | `catalog_module.orders` | Order history status changes from `PENDING` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED`. |
