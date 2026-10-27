# 5 Ecommerce — Database Schema & Data Dictionary

## 1. Overview & Schema Partitioning
The database uses PostgreSQL 17 with strict schema isolation across business domains. No cross-schema foreign keys or queries are permitted by architecture rules.

Schemas initialized:
1. **`user_module`**: Persistent user authentication and account credentials.
2. **`authorization_module`**: Roles, atomic permissions, role-permission rules, and user-role scoped assignments.
3. **`catalog_module`**: Stores, hierarchical categories, products, options, units, variants, promotional banners, coupons, and orders.
4. **`notification_module`**: Reserved for persistent outbox / event persistence.
5. **`public`**: Shared Sequelize metadata (`SequelizeMeta`).

---

## 2. Complete Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    %% USER SCHEMA
    "user_module.users" {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        timestamp created_at
        timestamp updated_at
    }

    %% AUTHORIZATION SCHEMA
    "authorization_module.roles" {
        uuid id PK
        varchar name UK
        varchar description
        timestamp created_at
        timestamp updated_at
    }

    "authorization_module.permissions" {
        uuid id PK
        varchar action
        varchar subject
        varchar description
        timestamp created_at
        timestamp updated_at
    }

    "authorization_module.role_permissions" {
        uuid role_id PK,FK
        uuid permission_id PK,FK
        jsonb conditions
        timestamp created_at
    }

    "authorization_module.user_roles" {
        uuid user_id PK,FK
        uuid role_id PK,FK
        varchar scope PK
        timestamp created_at
    }

    %% CATALOG SCHEMA
    "catalog_module.ecommerce" {
        uuid id PK
        varchar name
        varchar slug UK
        varchar status
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.categories" {
        uuid id PK
        uuid ecommerce_id FK
        varchar name
        varchar slug
        text description
        uuid parent_id FK
        ltree path
        integer display_order
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.units" {
        uuid id PK
        varchar name
        varchar symbol
        varchar category
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.products" {
        uuid id PK
        uuid ecommerce_id FK
        uuid category_id FK
        varchar name
        varchar slug
        text description
        jsonb details
        numeric price
        numeric offer_price
        numeric tax_rate
        varchar tax_class
        integer quantity
        varchar status
        boolean has_variants
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.product_images" {
        uuid id PK
        uuid product_id FK
        varchar url
        varchar public_id
        integer display_order
        timestamp created_at
    }

    "catalog_module.product_options" {
        uuid id PK
        uuid product_id FK
        varchar name
        integer display_order
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.product_option_values" {
        uuid id PK
        uuid option_id FK
        varchar value
        uuid unit_id FK
        integer display_order
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.product_variants" {
        uuid id PK
        uuid product_id FK
        varchar sku UK
        numeric price
        numeric offer_price
        jsonb details
        integer quantity
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.product_variant_images" {
        uuid id PK
        uuid variant_id FK
        varchar url
        varchar public_id
        integer display_order
        timestamp created_at
    }

    "catalog_module.product_variant_option_values" {
        uuid variant_id PK,FK
        uuid option_value_id PK,FK
    }

    "catalog_module.banners" {
        uuid id PK
        uuid ecommerce_id FK
        varchar title
        varchar subtitle
        varchar image_url
        varchar public_id
        varchar redirect_url
        integer display_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.coupons" {
        uuid id PK
        uuid ecommerce_id FK
        varchar name
        varchar code UK
        text description
        varchar discount_type
        numeric discount_value
        varchar target_type
        jsonb rules
        timestamp start_date
        timestamp expiry_date
        boolean is_active
        integer usage_limit
        integer usage_limit_per_user
        integer usage_count
        timestamp created_at
        timestamp updated_at
    }

    "catalog_module.coupon_usages" {
        uuid id PK
        uuid ecommerce_id FK
        uuid coupon_id FK
        varchar order_id
        varchar customer_email
        numeric discount_amount
        timestamp created_at
    }

    "catalog_module.orders" {
        uuid id PK
        uuid ecommerce_id FK
        varchar customer_name
        varchar customer_email
        varchar customer_phone
        integer items_count
        numeric total
        varchar status
        jsonb shipping_address
        jsonb items
        uuid coupon_id
        varchar coupon_code
        numeric coupon_discount
        timestamp created_at
        timestamp updated_at
    }

    %% RELATIONSHIPS
    "authorization_module.roles" ||--o{ "authorization_module.role_permissions" : "contains"
    "authorization_module.permissions" ||--o{ "authorization_module.role_permissions" : "granted by"
    "authorization_module.roles" ||--o{ "authorization_module.user_roles" : "assigned in"

    "catalog_module.ecommerce" ||--o{ "catalog_module.categories" : "owns"
    "catalog_module.ecommerce" ||--o{ "catalog_module.products" : "owns"
    "catalog_module.ecommerce" ||--o{ "catalog_module.banners" : "owns"
    "catalog_module.ecommerce" ||--o{ "catalog_module.coupons" : "owns"
    "catalog_module.ecommerce" ||--o{ "catalog_module.orders" : "owns"

    "catalog_module.categories" ||--o{ "catalog_module.products" : "contains"
    "catalog_module.products" ||--o{ "catalog_module.product_images" : "has"
    "catalog_module.products" ||--o{ "catalog_module.product_options" : "has"
    "catalog_module.products" ||--o{ "catalog_module.product_variants" : "has"

    "catalog_module.product_options" ||--o{ "catalog_module.product_option_values" : "defines"
    "catalog_module.units" ||--o{ "catalog_module.product_option_values" : "units"
    "catalog_module.product_variants" ||--o{ "catalog_module.product_variant_images" : "has"
    "catalog_module.product_variants" ||--o{ "catalog_module.product_variant_option_values" : "maps"
    "catalog_module.product_option_values" ||--o{ "catalog_module.product_variant_option_values" : "mapped in"

    "catalog_module.coupons" ||--o{ "catalog_module.coupon_usages" : "audited in"
```

---

## 3. Data Dictionary by Schema

### Schema: `user_module`

#### Table: `user_module.users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, Default `uuid_generate_v4()` | Unique user identifier |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | User email address (login credential) |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Bcrypt salt and hash (10 rounds) |
| `name` | `VARCHAR(100)` | NOT NULL | User's full display name |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### Schema: `authorization_module`

#### Table: `authorization_module.roles`
- `id` (UUID, PK)
- `name` (VARCHAR(100), NOT NULL, UNIQUE): e.g. `admin`, `ecommerce_admin`, `user`.
- `description` (VARCHAR(255), NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### Table: `authorization_module.permissions`
- `id` (UUID, PK)
- `action` (VARCHAR(100), NOT NULL): e.g. `manage`, `read`, `write`, `delete`.
- `subject` (VARCHAR(100), NOT NULL): e.g. `all`, `catalog`, `user`, `order`.
- `description` (VARCHAR(255), NULL)
- Unique Index: `(action, subject)`

#### Table: `authorization_module.role_permissions`
- `role_id` (UUID, FK -> `roles.id` ON DELETE CASCADE)
- `permission_id` (UUID, FK -> `permissions.id` ON DELETE CASCADE)
- `conditions` (JSONB, NULL): CASL JSON conditions (e.g. `{ "status": { "$in": ["ACTIVE"] } }`).
- Primary Key: `(role_id, permission_id)`

#### Table: `authorization_module.user_roles`
- `user_id` (UUID, NOT NULL): Logical reference to `user_module.users.id`.
- `role_id` (UUID, FK -> `roles.id` ON DELETE CASCADE).
- `scope` (VARCHAR(255), NOT NULL, DEFAULT `*`): Multi-tenant scope (`*` for global, `<ecommerceId>` for specific store).
- Primary Key: `(user_id, role_id, scope)`

---

### Schema: `catalog_module`

#### Table: `catalog_module.ecommerce`
- `id` (UUID, PK)
- `name` (VARCHAR(100), NOT NULL)
- `slug` (VARCHAR(100), NOT NULL, UNIQUE)
- `status` (VARCHAR(20), NOT NULL, DEFAULT `'ACTIVE'`)
- `settings` (JSONB, NOT NULL, DEFAULT `'{}'`)

#### Table: `catalog_module.categories`
- `id` (UUID, PK)
- `ecommerce_id` (UUID, FK -> `ecommerce.id` ON DELETE CASCADE)
- `name` (VARCHAR(100), NOT NULL)
- `slug` (VARCHAR(100), NOT NULL)
- `description` (TEXT, NULL)
- `parent_id` (UUID, NULL, FK -> `categories.id` ON DELETE SET NULL)
- `path` (`ltree`, NOT NULL): Materialized path (e.g. `men.hoodies`).
- `display_order` (INTEGER, NOT NULL, DEFAULT 0)
- Indexes: `CREATE INDEX idx_categories_path_gist ON categories USING GIST (path);`
- Unique Constraint: `(ecommerce_id, slug)`

#### Table: `catalog_module.units`
- `id` (UUID, PK)
- `name` (VARCHAR(50), NOT NULL, UNIQUE): e.g. `gram`, `kilogram`, `millilitre`.
- `symbol` (VARCHAR(20), NOT NULL): e.g. `g`, `kg`, `ml`.
- `category` (VARCHAR(50), NOT NULL): e.g. `weight`, `volume`, `length`, `piece`.

#### Table: `catalog_module.products`
- `id` (UUID, PK)
- `ecommerce_id` (UUID, FK -> `ecommerce.id` ON DELETE CASCADE)
- `category_id` (UUID, NULL, FK -> `categories.id` ON DELETE SET NULL)
- `name` (VARCHAR(255), NOT NULL)
- `slug` (VARCHAR(255), NOT NULL)
- `description` (TEXT, NULL)
- `details` (JSONB, NOT NULL, DEFAULT `'[]'`): Array of `{ title, content }` sections.
- `price` (NUMERIC(10, 2), NOT NULL)
- `offer_price` (NUMERIC(10, 2), NULL)
- `tax_rate` (NUMERIC(5, 2), NOT NULL, DEFAULT 0.00)
- `tax_class` (VARCHAR(50), NULL, DEFAULT `'GST 18%'`)
- `quantity` (INTEGER, NOT NULL, DEFAULT 0)
- `status` (VARCHAR(20), NOT NULL, DEFAULT `'DRAFT'`)
- `has_variants` (BOOLEAN, NOT NULL, DEFAULT FALSE)
- Unique Constraint: `(ecommerce_id, slug)`

#### Table: `catalog_module.product_options` & `product_option_values`
- `product_options`: `id`, `product_id`, `name`, `display_order`. Unique on `(product_id, name)`.
- `product_option_values`: `id`, `option_id`, `value`, `unit_id` (FK -> `units.id` ON DELETE SET NULL), `display_order`. Unique on `(option_id, value)`.

#### Table: `catalog_module.product_variants`
- `id` (UUID, PK)
- `product_id` (UUID, FK -> `products.id` ON DELETE CASCADE)
- `sku` (VARCHAR(100), NOT NULL, UNIQUE)
- `price` (NUMERIC(10, 2), NULL)
- `offer_price` (NUMERIC(10, 2), NULL)
- `details` (JSONB, NULL)
- `quantity` (INTEGER, NOT NULL, DEFAULT 0)
- `status` (VARCHAR(20), NOT NULL, DEFAULT `'ACTIVE'`)

#### Table: `catalog_module.banners`
- `id` (UUID, PK)
- `ecommerce_id` (UUID, FK -> `ecommerce.id` ON DELETE CASCADE)
- `title` (VARCHAR(255), NOT NULL)
- `subtitle` (VARCHAR(255), NULL)
- `image_url` (VARCHAR(500), NOT NULL)
- `public_id` (VARCHAR(255), NULL)
- `redirect_url` (VARCHAR(500), NULL)
- `display_order` (INTEGER, NOT NULL, DEFAULT 0)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE)

#### Table: `catalog_module.coupons` & `coupon_usages`
- `coupons`: `id`, `ecommerce_id`, `name`, `code` (UPPERCASE), `discount_type` (`PERCENTAGE` | `FIXED`), `discount_value`, `target_type` (`ALL_PRODUCTS` | `PRODUCT` | `CATEGORY` | `USER_BEHAVIOR`), `rules` (JSONB), `start_date`, `expiry_date`, `is_active`, `usage_limit`, `usage_limit_per_user`, `usage_count`. Unique on `(ecommerce_id, code)`.
- `coupon_usages`: `id`, `ecommerce_id`, `coupon_id`, `order_id`, `customer_email`, `discount_amount`, `created_at`.

#### Table: `catalog_module.orders`
- `id` (VARCHAR(255), PK)
- `ecommerce_id` (UUID, NOT NULL)
- `customer_name` (VARCHAR(255), NOT NULL)
- `customer_email` (VARCHAR(255), NOT NULL)
- `customer_phone` (VARCHAR(50), NULL)
- `items_count` (INTEGER, NOT NULL, DEFAULT 1)
- `total` (NUMERIC(10, 2), NOT NULL)
- `status` (VARCHAR(50), NOT NULL, DEFAULT `'PROCESSING'`)
- `shipping_address` (JSONB, NOT NULL, DEFAULT `'{}'`)
- `items` (JSONB, NOT NULL, DEFAULT `'[]'`)
- `coupon_id` (UUID, NULL)
- `coupon_code` (VARCHAR(50), NULL)
- `coupon_discount` (NUMERIC(10, 2), NOT NULL, DEFAULT 0.00)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Index: `idx_orders_ecommerce_created ON orders (ecommerce_id, created_at DESC)`

---

## 4. Migration Execution & Order
All migrations are located in `src/infrastructure/database/migrations/` and executed sequentially via Umzug:
1. `20240101000001-create-users-table.js`
2. `20240101000002-create-authorization-tables.js`
3. `20260812160000-add-password-hash-to-users.js`
4. `20260820000001-create-catalog-tables.js`
5. `20260820000002-create-units-and-add-unit-to-options.js`
6. `20260821000001-move-unit-id-to-option-values.js`
7. `20260822000001-add-offer-price-and-images.js`
8. `20260824000001-add-banners-and-product-details.js`
9. `20260825000001-create-coupons-and-coupon-usages.js`
10. `20260831170000-add-tax-to-products.js`

To verify status: `npm run migration:status`  
To apply: `npm run migration:run`  
To dry-run: `npm run migration:dry-run`
