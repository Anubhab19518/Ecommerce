# Products API (`/api/v1/catalog/products`)

## Overview
The Products API provides full catalog lifecycle management, including product details, multi-image upload via Cloudinary, pricing, offer pricing, tax classes, inventory quantity, and variant association.

- **Base Route Prefix:** `/api/v1/catalog/products`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.products`, `catalog_module.product_images`
- **External Integration:** Cloudinary Media Storage (`src/infrastructure/upload/cloudinary.service.ts`)
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`product.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/product.model.ts)
  - Image Model: [`product-image.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/product-image.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target store tenant UUID |

---

## Endpoint Specifications

### 1. List Products
- **Endpoint:** `GET /api/v1/catalog/products`
- **Purpose:** Query products with filtering, search, pricing ranges, and pagination.
- **Query Parameters:**
  - `categoryId` (`UUIDv4` string): Filters by category.
  - `status` (`DRAFT` | `ACTIVE` | `ARCHIVED`): Status filter.
  - `search` (`string`): Full-text search on product name and description.
  - `minPrice` (`number`): Lower bound on price.
  - `maxPrice` (`number`): Upper bound on price.
  - `page` (`integer`, default: 1): Page index.
  - `limit` (`integer`, default: 10, max: 100): Page limit.
  - `sort` (`string`, default: `createdAt`): Sort field (`name`, `price`, `createdAt`).
  - `order` (`ASC` | `DESC`, default: `DESC`): Sort direction.

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "products": [
      {
        "id": "c6218d60-4966-41cb-b39f-2c7aa3bb7191",
        "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
        "categoryId": "787fbc5a-e722-487b-87b8-80f074d284f1",
        "name": "Nike AIR",
        "slug": "nike-air",
        "description": "Premium cushioning athletic sneakers",
        "details": [
          { "title": "Material", "content": "Breathable mesh upper with Zoom air unit" }
        ],
        "price": 150.00,
        "offerPrice": 129.99,
        "taxRate": 18.00,
        "taxClass": "GST 18%",
        "quantity": 100,
        "status": "ACTIVE",
        "hasVariants": true,
        "images": [
          {
            "id": "img-001",
            "url": "https://res.cloudinary.com/dm20oudtl/image/upload/v1/products/shoe-1.jpg",
            "publicId": "products/shoe-1",
            "displayOrder": 0
          }
        ],
        "createdAt": "2026-08-20T10:00:00.000Z",
        "updatedAt": "2026-08-20T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### 2. Create Product
- **Endpoint:** `POST /api/v1/catalog/products`
- **Purpose:** Register a new product in the store.

#### Request Body Schema (`createProductSchema`)
```json
{
  "name": "Royal Garam Masala Blend",
  "slug": "royal-garam-masala-blend",
  "description": "Signature artisanal blend of 16 roasted whole spices",
  "details": [
    { "title": "Ingredients", "content": "Cardamom, Cinnamon, Cloves, Star Anise, Black Pepper" },
    { "title": "Storage", "content": "Store in a cool dry airtight container" }
  ],
  "categoryId": "787fbc5a-e722-487b-87b8-80f074d284f1",
  "price": 14.99,
  "offerPrice": 12.49,
  "taxRate": 5.00,
  "taxClass": "GST 5%",
  "quantity": 200,
  "status": "ACTIVE",
  "hasVariants": true
}
```

#### Validation Constraints:
- `offerPrice` must be strictly less than or equal to `price`.
- `slug` must be unique per tenant.
- `taxRate` must be between 0 and 100.

#### Success Response
- **Status Code:** `201 Created`
- **Body:** `{ "status": "success", "data": { ...productRecord } }`

---

### 3. Get Product By ID
- **Endpoint:** `GET /api/v1/catalog/products/:id`
- **Purpose:** Returns comprehensive product view including images, options, option values, unit objects, and all generated variants.
- **Success Response:** `200 OK`

---

### 4. Update Product
- **Endpoint:** `PATCH /api/v1/catalog/products/:id`
- **Request Body:** Partial schema of `updateProductSchema`.
- **Success Response:** `200 OK`

---

### 5. Delete Product
- **Endpoint:** `DELETE /api/v1/catalog/products/:id`
- **Purpose:** Deletes product, associated images, options, and variants. Cloudinary assets are also scheduled for safe removal.
- **Success Response:** `204 No Content`

---

### 6. Upload Product Images
- **Endpoint:** `POST /api/v1/catalog/products/:productId/images`
- **Content-Type:** `multipart/form-data`
- **Form Field:** `images` (array of image files, maximum 10 images)
- **Supported Formats:** JPEG, PNG, WEBP (validated by Multer)
- **Storage:** Uploaded via buffer stream to Cloudinary folder `products`.
- **Success Response:** `201 Created`
```json
{
  "status": "success",
  "data": [
    {
      "id": "e44d320b-2df8-4b19-91f8-005bf5e2cb83",
      "productId": "c6218d60-4966-41cb-b39f-2c7aa3bb7191",
      "url": "https://res.cloudinary.com/dm20oudtl/image/upload/v1/products/abc.jpg",
      "publicId": "products/abc",
      "displayOrder": 0,
      "createdAt": "2026-10-26T17:40:00.000Z"
    }
  ]
}
```

---

### 7. Delete Product Image
- **Endpoint:** `DELETE /api/v1/catalog/products/:productId/images/:imageId`
- **Purpose:** Deletes image asset from Cloudinary storage and removes database row.
- **Success Response:** `204 No Content`
