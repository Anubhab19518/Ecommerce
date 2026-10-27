# Categories API (`/api/v1/catalog/categories`)

## Overview
The Categories API manages multi-level product hierarchies. Built using PostgreSQL's native **LTREE extension**, every category maintains a materialized path (`path`) allowing high-performance subtree lookups and hierarchical tree queries.

- **Base Route Prefix:** `/api/v1/catalog/categories`
- **Module Directory:** `src/modules/catalog/`
- **Database Schema:** `catalog_module.categories`
- **Primary Files:**
  - Route: [`catalog.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.routes.ts)
  - Controller: [`catalog.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.controller.ts)
  - Service: [`catalog.service.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.service.ts)
  - Repository: [`catalog.repository.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.repository.ts)
  - Model: [`category.model.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/category.model.ts)
  - Validator: [`catalog.validator.ts`](file:///d:/Projects/Ecommerce/src/modules/catalog/catalog.validator.ts)

---

## Required Request Headers
All category endpoints require:
| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` |
| `X-Ecommerce-Id` | Target tenant store UUID |

---

## Endpoint Specifications

### 1. List Categories
- **Endpoint:** `GET /api/v1/catalog/categories`
- **Purpose:** Retrieve categories for the active store tenant. Supports subtree filtering and full hierarchical tree building.
- **Query Parameters:**
  - `rootOnly` (`boolean`, default: `false`): Filter only top-level categories.
  - `parentId` (`UUIDv4` string): Retrieve immediate subcategories under a parent.
  - `tree` (`boolean`, default: `false`): If true, returns nested category hierarchy.
  - `search` (`string`): Case-insensitive match on category name or slug.
  - `active` (`boolean`): Filter by active status.

#### Example Request: Nested Hierarchy
`GET /api/v1/catalog/categories?tree=true`

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "787fbc5a-e722-487b-87b8-80f074d284f1",
      "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
      "name": "Men",
      "slug": "men",
      "description": "Men apparel and footwear",
      "parentId": null,
      "path": "men",
      "displayOrder": 0,
      "children": [
        {
          "id": "83fb8b01-f925-4fc1-a960-9e66580f49f3",
          "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
          "name": "Hoodies",
          "slug": "hoodies",
          "description": "Streetwear hoodies and sweatshirts",
          "parentId": "787fbc5a-e722-487b-87b8-80f074d284f1",
          "path": "men.hoodies",
          "displayOrder": 1,
          "children": []
        }
      ]
    }
  ]
}
```

---

### 2. Create Category
- **Endpoint:** `POST /api/v1/catalog/categories`
- **Purpose:** Create a new root category or child subcategory. Automatically computes the LTREE path from parent.

#### Request Body Schema (`createCategorySchema`)
```json
{
  "name": "Organic Spices",
  "slug": "organic-spices",
  "description": "Certified organic whole and ground spices",
  "parentId": "787fbc5a-e722-487b-87b8-80f074d284f1",
  "displayOrder": 2
}
```
- `name`: string, 1–100 chars, required.
- `slug`: string (letters, numbers, hyphens), unique per tenant, required.
- `description`: string, max 500 chars, optional.
- `parentId`: UUIDv4 string or null, optional.
- `displayOrder`: integer, default: 0.

#### Success Response
- **Status Code:** `201 Created`
- **Body:**
```json
{
  "status": "success",
  "data": {
    "id": "a1f9e200-e722-487b-87b8-80f074d284f1",
    "ecommerceId": "f18fae49-8086-4fc2-a892-e4215904fc43",
    "name": "Organic Spices",
    "slug": "organic-spices",
    "description": "Certified organic whole and ground spices",
    "parentId": "787fbc5a-e722-487b-87b8-80f074d284f1",
    "path": "men.organic_spices",
    "displayOrder": 2,
    "createdAt": "2026-10-26T17:35:00.000Z",
    "updatedAt": "2026-10-26T17:35:00.000Z"
  }
}
```

---

### 3. Get Category By ID
- **Endpoint:** `GET /api/v1/catalog/categories/:id`
- **Success Response:** `200 OK`

---

### 4. Update Category
- **Endpoint:** `PATCH /api/v1/catalog/categories/:id`
- **Purpose:** Update category name, slug, description, or reparent. If reparented, automatically recalculates LTREE paths for all descendant categories.
- **Success Response:** `200 OK`

---

### 5. Delete Category
- **Endpoint:** `DELETE /api/v1/catalog/categories/:id`
- **Purpose:** Deletes category. Rejects deletion if subcategories or products are attached.
- **Success Response:** `204 No Content`
