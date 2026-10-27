# Banners API (`/api/v1/catalog/banners`)

## Overview
The Banners API manages storefront homepage carousels, hero banners, promotional graphic links, and standalone banner asset uploads to Cloudinary.

- **Base Route Prefix:** `/api/v1/catalog/banners`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.banners`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`banner.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/banner.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Endpoint Specifications

### 1. List Banners
- **Endpoint:** `GET /api/v1/catalog/banners`
- **Purpose:** Retrieve promotional banners for the tenant.
- **Query Parameters:**
  - `active` (`boolean`, default: `false`): If true, returns only active banners ordered by `displayOrder ASC`.
- **Success Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "ban-01",
      "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
      "title": "Summer Streetwear Drop",
      "subtitle": "Get up to 40% off across premium fleece hoodies",
      "imageUrl": "https://res.cloudinary.com/dm20oudtl/image/upload/v1/banners/summer.jpg",
      "publicId": "banners/summer",
      "redirectUrl": "/categories/hoodies",
      "displayOrder": 0,
      "isActive": true,
      "createdAt": "2026-08-24T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Upload Banner Image
- **Endpoint:** `POST /api/v1/catalog/banners/upload`
- **Purpose:** Direct multipart file upload to Cloudinary folder `banners`.
- **Content-Type:** `multipart/form-data`
- **Form Field:** `image` (single file)
- **Success Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "url": "https://res.cloudinary.com/dm20oudtl/image/upload/v1/banners/hero_banner.jpg",
    "publicId": "banners/hero_banner"
  }
}
```

---

### 3. Create Banner
- **Endpoint:** `POST /api/v1/catalog/banners`
- **Request Body Schema (`createBannerSchema`)**
```json
{
  "title": "Diwali Grand Spice Sale",
  "subtitle": "Flat 25% off on all Kashmiri and blended spices",
  "imageUrl": "https://res.cloudinary.com/dm20oudtl/image/upload/v1/banners/hero_banner.jpg",
  "publicId": "banners/hero_banner",
  "redirectUrl": "/categories/spices-masalas",
  "displayOrder": 1,
  "isActive": true
}
```
- **Success Response:** `201 Created`

---

### 4. Get Banner By ID
- **Endpoint:** `GET /api/v1/catalog/banners/:id`
- **Success Response:** `200 OK`

---

### 5. Update Banner
- **Endpoint:** `PATCH /api/v1/catalog/banners/:id`
- **Request Body:** Partial schema of `updateBannerSchema`.
- **Success Response:** `200 OK`

---

### 6. Delete Banner
- **Endpoint:** `DELETE /api/v1/catalog/banners/:id`
- **Purpose:** Deletes banner and triggers safe cleanup of Cloudinary asset.
- **Success Response:** `204 No Content`
