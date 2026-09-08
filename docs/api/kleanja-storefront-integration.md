# Kleanja Storefront API Integration Guide

This guide provides full endpoint specifications, request/response payloads, authentication flow, and data mapping models for connecting the **Kleanja Storefront** (`D/Projects/Kleanja/kleanja-web`) with the Multi-Tenant Ecommerce Backend.

---

## 1. Tenant & Environment Configuration

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Store Name** | `Kleanja` | Second tenant in the multi-tenant platform |
| **Tenant ID / Ecommerce ID** | `fd93976f-3bed-4084-b57d-efe2f43f0a1d` | Pass in `x-ecommerce-id` header |
| **Tenant Slug** | `kleanja` | Unique tenant slug identifier |
| **Backend Base URL (Local)** | `http://localhost:3000/api/v1` | Express API Server |
| **Admin Login Email** | `pureclean_admin@bazar.com` | Store Admin credentials |
| **Admin Login Password** | `Password123!` | Store Admin password |

---

## 2. Authentication & Headers

All catalog endpoints are protected by JWT authentication and tenant scope validation.

### Request Headers Required
```http
Authorization: Bearer <accessToken>
x-ecommerce-id: fd93976f-3bed-4084-b57d-efe2f43f0a1d
Content-Type: application/json
```

### 2.1 Admin / Storefront Login
`POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "pureclean_admin@bazar.com",
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
      "id": "688d623f-3ac0-4712-92a1-2084286bad53",
      "email": "pureclean_admin@bazar.com",
      "name": "Sarah Jenkins (Kleanja)"
    },
    "organisation": {
      "id": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Kleanja",
      "slug": "kleanja"
    }
  }
}
```

### 2.2 Get Current Session / Me
`GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer <accessToken>`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "688d623f-3ac0-4712-92a1-2084286bad53",
      "email": "pureclean_admin@bazar.com",
      "name": "Sarah Jenkins (Kleanja)"
    },
    "organisation": {
      "id": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Kleanja",
      "slug": "kleanja"
    },
    "isSuperAdmin": false,
    "roles": ["ecommerce_admin"],
    "permissions": ["manage:all"]
  }
}
```

---

## 3. Categories API

Used for rendering navigation bars, category filter menus, and product grouping.

### 3.1 List All Categories
`GET /api/v1/catalog/categories`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "2735c94f-e060-407d-9fc1-836d8c8f2ce7",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Dishwashing",
      "slug": "dishwashing",
      "path": "dishwashing",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "06f1350a-8ef9-4826-9850-cb4258008343",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Floor Cleaning",
      "slug": "floor-cleaning",
      "path": "floor_cleaning",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "d6a30871-5abe-445a-8193-9a609613fb50",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Glass and Surface Cleaners",
      "slug": "glass-and-surface-cleaners",
      "path": "glass_and_surface_cleaners",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "645fb677-005b-4d84-9e9f-780bb5df8cc6",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Hand Hygiene",
      "slug": "hand-hygiene",
      "path": "hand_hygiene",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "6fa33c4f-9829-4c0b-976e-abcafe53e411",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Laundry Care",
      "slug": "laundry-care",
      "path": "laundry_care",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "af0075cc-f8d1-4ff4-ad61-e39b725f2913",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Phenyl and Disinfectants",
      "slug": "phenyl-and-disinfectants",
      "path": "phenyl_and_disinfectants",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "26246ea2-dd9f-4492-9d47-91a96f033e1f",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Surface Cleaners",
      "slug": "surface-cleaners",
      "path": "surface_cleaners",
      "parentId": null,
      "displayOrder": 0
    },
    {
      "id": "39fc079c-6116-4892-b478-ef39561e9517",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "name": "Toilet and Bathroom",
      "slug": "toilet-and-bathroom",
      "path": "toilet_and_bathroom",
      "parentId": null,
      "displayOrder": 0
    }
  ]
}
```

### 3.2 Get Category by ID
`GET /api/v1/catalog/categories/:id`

---

## 4. Products API

### 4.1 List Products (Catalog / Listing Page)
`GET /api/v1/catalog/products`

**Query Parameters:**
- `categoryId` *(optional)*: Filter products by category UUID
- `status` *(optional)*: Filter by status (`ACTIVE`, `DRAFT`, `ARCHIVED`)

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "14e5a42f-76f2-4b93-b609-28bdc20d1a90",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "categoryId": "26246ea2-dd9f-4492-9d47-91a96f033e1f",
      "name": "Eco-Friendly Multi-Surface Cleaner Spray",
      "slug": "eco-multi-surface-cleaner",
      "description": "Plant-based streak-free formula",
      "details": [],
      "price": 14.99,
      "offerPrice": null,
      "taxRate": 0,
      "taxClass": "GST 18%",
      "quantity": 0,
      "computedQuantity": 600,
      "status": "ACTIVE",
      "hasVariants": true,
      "category": {
        "id": "26246ea2-dd9f-4492-9d47-91a96f033e1f",
        "name": "Surface Cleaners",
        "slug": "surface-cleaners"
      },
      "images": [
        {
          "id": "img-uuid-1",
          "imageUrl": "https://res.cloudinary.com/...",
          "displayOrder": 0,
          "isPrimary": true
        }
      ]
    },
    {
      "id": "51a0714f-082d-4113-bd1a-7859817b76c3",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "categoryId": "6fa33c4f-9829-4c0b-976e-abcafe53e411",
      "name": "Ultra Concentrate Laundry Detergent",
      "slug": "ultra-concentrate-laundry-detergent",
      "description": "High efficiency stain removing formula",
      "details": [],
      "price": 24.5,
      "offerPrice": null,
      "quantity": 90,
      "computedQuantity": 90,
      "status": "ACTIVE",
      "hasVariants": false,
      "category": {
        "id": "6fa33c4f-9829-4c0b-976e-abcafe53e411",
        "name": "Laundry Care",
        "slug": "laundry-care"
      },
      "images": []
    }
  ]
}
```

### 4.2 Get Full Product Details (PDP Page)
`GET /api/v1/catalog/products/:id`

**Response (`200 OK`):**
Includes product info, categories, options (e.g., Volume, Fragrance), option values, units, variants with SKU, prices, and variant-specific images:
```json
{
  "success": true,
  "data": {
    "id": "14e5a42f-76f2-4b93-b609-28bdc20d1a90",
    "name": "Eco-Friendly Multi-Surface Cleaner Spray",
    "slug": "eco-multi-surface-cleaner",
    "description": "Plant-based streak-free formula",
    "price": 14.99,
    "offerPrice": null,
    "hasVariants": true,
    "computedQuantity": 600,
    "category": {
      "id": "26246ea2-dd9f-4492-9d47-91a96f033e1f",
      "name": "Surface Cleaners",
      "slug": "surface-cleaners"
    },
    "options": [
      {
        "id": "0e4ad70e-250b-4bd9-b704-bd9031b88349",
        "name": "Volume",
        "displayOrder": 0,
        "values": [
          {
            "id": "54de7a52-60b7-435d-a7a5-5a81ea0c6aa0",
            "value": "0.5",
            "unit": {
              "id": "unit-l",
              "name": "Liter",
              "symbol": "L",
              "category": "Volume"
            }
          },
          {
            "id": "39bd8c06-7049-4597-aff5-37f10a21ded3",
            "value": "1",
            "unit": {
              "id": "unit-l",
              "name": "Liter",
              "symbol": "L",
              "category": "Volume"
            }
          },
          {
            "id": "bde955a1-691b-4db2-93ee-6d12d017aaf6",
            "value": "2",
            "unit": {
              "id": "unit-l",
              "name": "Liter",
              "symbol": "L",
              "category": "Volume"
            }
          }
        ]
      },
      {
        "id": "c3d42ba5-50ae-4193-bbbd-59ccb803eb6c",
        "name": "Fragrance",
        "displayOrder": 1,
        "values": [
          { "id": "ad4431f5-127c-4c42-8df7-9974598110c4", "value": "Citrus", "unit": null },
          { "id": "f0db51ec-5036-48de-8e45-3a4759209d62", "value": "Lavender", "unit": null }
        ]
      }
    ],
    "variants": [
      {
        "id": "0a1e2f99-8522-420c-a71f-41d9a33726a1",
        "sku": "ECOFRIEN-05-CITRUS",
        "price": 14.99,
        "offerPrice": null,
        "quantity": 100,
        "status": "ACTIVE",
        "optionValues": [
          { "id": "54de7a52-60b7-435d-a7a5-5a81ea0c6aa0", "value": "0.5" },
          { "id": "ad4431f5-127c-4c42-8df7-9974598110c4", "value": "Citrus" }
        ],
        "images": []
      }
    ],
    "images": []
  }
}
```

---

## 5. Promotional Banners API

Used for hero carousels and promo cards on the storefront homepage.

### 5.1 List Active Banners
`GET /api/v1/catalog/banners`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "banner-uuid-1",
      "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
      "title": "Spring Cleaning Sale",
      "subtitle": "Get up to 30% off all surface cleaners",
      "imageUrl": "https://res.cloudinary.com/...",
      "redirectUrl": "/category/surface-cleaners",
      "displayOrder": 0,
      "isActive": true
    }
  ]
}
```

---

## 6. Coupons & Discount Validation API

Used in cart and checkout for instant discount calculation.

### 6.1 Validate Coupon in Cart
`POST /api/v1/catalog/coupons/validate`

**Request Body:**
```json
{
  "code": "KLEANJA20",
  "customerEmail": "customer@example.com",
  "subtotal": 45.00,
  "cartItems": [
    {
      "productId": "14e5a42f-76f2-4b93-b609-28bdc20d1a90",
      "quantity": 2,
      "pricing": {
        "effectivePrice": 14.99
      },
      "product": {
        "id": "14e5a42f-76f2-4b93-b609-28bdc20d1a90",
        "categoryId": "26246ea2-dd9f-4492-9d47-91a96f033e1f",
        "price": 14.99
      }
    }
  ]
}
```

**Response (`200 OK` - Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "couponId": "coupon-uuid-1",
    "code": "KLEANJA20",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "discountAmount": 9.00,
    "eligibleSubtotal": 45.00,
    "message": "Coupon applied successfully"
  }
}
```

**Response (`200 OK` - Invalid / Criteria Not Met):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "discountAmount": 0,
    "eligibleSubtotal": 0,
    "message": "Minimum order value of $50 required"
  }
}
```

---

## 7. Orders & Checkout API

Used to place orders from the customer storefront and view order status.

### 7.1 Place an Order
`POST /api/v1/catalog/orders`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "johndoe@example.com",
  "customerPhone": "+1234567890",
  "itemsCount": 2,
  "total": 36.00,
  "status": "PROCESSING",
  "couponId": "coupon-uuid-1",
  "couponCode": "KLEANJA20",
  "couponDiscount": 9.00,
  "shippingAddress": {
    "street": "123 Green Ave",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94107",
    "country": "USA"
  },
  "items": [
    {
      "productId": "14e5a42f-76f2-4b93-b609-28bdc20d1a90",
      "productName": "Eco-Friendly Multi-Surface Cleaner Spray",
      "sku": "ECOFRIEN-05-CITRUS",
      "variantId": "0a1e2f99-8522-420c-a71f-41d9a33726a1",
      "quantity": 2,
      "price": 14.99,
      "total": 29.98,
      "options": {
        "Volume": "0.5 L",
        "Fragrance": "Citrus"
      }
    }
  ]
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid-99",
    "ecommerceId": "fd93976f-3bed-4084-b57d-efe2f43f0a1d",
    "customerName": "John Doe",
    "customerEmail": "johndoe@example.com",
    "customerPhone": "+1234567890",
    "itemsCount": 2,
    "total": 36.00,
    "status": "PROCESSING",
    "couponCode": "KLEANJA20",
    "couponDiscount": 9.00,
    "createdAt": "2026-09-01T08:25:00.000Z"
  }
}
```

---

## 8. Frontend Integration Blueprint for Kleanja (`kleanja-web`)

### Recommended API Client Setup (`src/lib/api.ts`)

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000/api/v1';
const ECOMMERCE_ID = process.env.NEXT_PUBLIC_ECOMMERCE_ID || 'fd93976f-3bed-4084-b57d-efe2f43f0a1d';

export async function fetchStorefront(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kleanja_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-ecommerce-id': ECOMMERCE_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'API request failed');
  }
  return json.data;
}

// Storefront convenience functions
export const getCategories = () => fetchStorefront('/catalog/categories');
export const getProducts = (categoryId?: string) => 
  fetchStorefront(`/catalog/products${categoryId ? `?categoryId=${categoryId}` : ''}`);
export const getProductDetails = (id: string) => fetchStorefront(`/catalog/products/${id}`);
export const getBanners = () => fetchStorefront('/catalog/banners');
export const validateCoupon = (payload: any) => 
  fetchStorefront('/catalog/coupons/validate', { method: 'POST', body: JSON.stringify(payload) });
export const placeOrder = (orderData: any) => 
  fetchStorefront('/catalog/orders', { method: 'POST', body: JSON.stringify(orderData) });
```
