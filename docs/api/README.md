# 5 Ecommerce — Feature-Wise API Documentation Index

## Overview
This directory contains the feature-wise API documentation for the **5 Ecommerce** modular monolith backend. Every registered endpoint in Express (`src/server.ts` and module route files) has been audited, categorized by business domain, and verified against tests.

---

## Documentation Directory
- [**Authentication API**](AUTHENTICATION.md): User login, refresh token rotation, logout, session inspection.
- [**Users API**](USERS.md): User account CRUD, bcrypt hashing, profile updates.
- [**Administration & RBAC API**](ADMINISTRATION.md): CASL abilities, roles, permissions, user role assignment, cache invalidation, diagnostic checks.
- [**Tenants & Ecommerce Stores API**](TENANTS.md): Multi-tenant merchant provisioning, status, and store metadata.
- [**Categories API**](CATEGORIES.md): Hierarchical categories with PostgreSQL LTREE paths, tree nesting, reparenting.
- [**Products API**](PRODUCTS.md): Product catalog, detail sections, pricing, offer pricing, tax, Cloudinary gallery images.
- [**Options & Variants API**](OPTIONS_AND_VARIANTS.md): Multi-dimensional options, shared units, variant SKUs, variant pricing, variant images.
- [**Units API**](UNITS.md): Reference measurement units (weight, volume, count).
- [**Banners API**](BANNERS.md): Storefront promotional banners, hero graphics, image asset uploads.
- [**Coupons API**](COUPONS.md): Rules-based promotions engine, targeting rules, cart evaluation, usage limits.
- [**Orders API**](ORDERS.md): Order placement, transactional coupon usage recording, shipping addresses, fulfillment status.
- [**Customers API**](CUSTOMERS.md): Customer intelligence, lifetime order analytics, VIP tier calculation.
- [**Health & Observability API**](HEALTH.md): Kubernetes liveness/readiness probes, Prometheus metrics.
- [**Commerce Feature Matrix**](COMMERCE_STATUS_MATRIX.md): Detailed audit of Cart, Checkout, Inventory, Payments, and Addresses.

---

## Global Request Headers
| Header | Required | Applicable Modules | Description |
|---|---|---|---|
| `Content-Type` | Yes (for JSON bodies) | All `POST`, `PUT`, `PATCH` | Must be `application/json` (except file uploads which use `multipart/form-data`) |
| `Authorization` | Yes (for protected routes) | Auth, Catalog | Format: `Bearer <jwt_access_token>` |
| `X-Ecommerce-Id` | Yes (for multi-tenant routes) | Catalog | UUIDv4 identifying target store (e.g. `f18fae49-...`) |
| `X-Request-Id` | Optional | All | Unique UUID for distributed request tracing (echoed in response headers) |

---

## Complete API Endpoint Inventory

| Method | Full Path | Feature Domain | Auth Req | Authorization / Scope | Documentation | Implementation Status | Verification Status |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/health/live` | Health | None | Public | [HEALTH.md](HEALTH.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/health/ready` | Health | None | Public | [HEALTH.md](HEALTH.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/health/metrics` | Health | None | Public | [HEALTH.md](HEALTH.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/auth/login` | Authentication | None | Public | [AUTHENTICATION.md](AUTHENTICATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/auth/refresh` | Authentication | Refresh Token | Public | [AUTHENTICATION.md](AUTHENTICATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/auth/logout` | Authentication | Refresh Token | Public | [AUTHENTICATION.md](AUTHENTICATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/auth/me` | Authentication | Bearer JWT | Authenticated User | [AUTHENTICATION.md](AUTHENTICATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/users` | Users | Optional | Admin recommended | [USERS.md](USERS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/users/:id` | Users | Optional | Admin recommended | [USERS.md](USERS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/users` | Users | Optional | Public/Admin | [USERS.md](USERS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/users/:id` | Users | Optional | Admin / Self | [USERS.md](USERS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/users/:id` | Users | Optional | Admin | [USERS.md](USERS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/authorization/roles` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/roles` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/authorization/roles/:id` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/authorization/roles/:id` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/authorization/roles/:id` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/roles/:id/permissions` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/authorization/roles/:id/permissions/:permissionId` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/authorization/permissions` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/permissions` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/authorization/permissions/:id` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/authorization/permissions/:id` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/users/:userId/roles` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/authorization/users/:userId/roles/:roleId` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/authorization/users/:userId/permissions` | RBAC Admin | Bearer JWT | Admin / Self | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/check` | RBAC Admin | Bearer JWT | Diagnostic | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/authorization/cache/invalidate` | RBAC Admin | Bearer JWT | Platform Admin | [ADMINISTRATION.md](ADMINISTRATION.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/ecommerce` | Multi-Tenancy | Bearer JWT | Super Admin / Store Admin | [TENANTS.md](TENANTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/ecommerce` | Multi-Tenancy | Bearer JWT | Super Admin (`*`) | [TENANTS.md](TENANTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/ecommerce/:id` | Multi-Tenancy | Bearer JWT | Store Admin (`scope`) | [TENANTS.md](TENANTS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/ecommerce/:id` | Multi-Tenancy | Bearer JWT | Store Admin (`scope`) | [TENANTS.md](TENANTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/categories` | Categories | Bearer JWT | Store Scope | [CATEGORIES.md](CATEGORIES.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/categories` | Categories | Bearer JWT | Store Admin | [CATEGORIES.md](CATEGORIES.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/categories/:id` | Categories | Bearer JWT | Store Scope | [CATEGORIES.md](CATEGORIES.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/categories/:id` | Categories | Bearer JWT | Store Admin | [CATEGORIES.md](CATEGORIES.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/categories/:id` | Categories | Bearer JWT | Store Admin | [CATEGORIES.md](CATEGORIES.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/products` | Products | Bearer JWT | Store Scope | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products` | Products | Bearer JWT | Store Admin | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/products/:id` | Products | Bearer JWT | Store Scope | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/products/:id` | Products | Bearer JWT | Store Admin | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:id` | Products | Bearer JWT | Store Admin | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products/:productId/images` | Product Images | Bearer JWT | Store Admin | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:productId/images/:imageId` | Product Images | Bearer JWT | Store Admin | [PRODUCTS.md](PRODUCTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/products/:productId/options` | Options | Bearer JWT | Store Scope | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products/:productId/options` | Options | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/products/:productId/options/:optionId` | Options | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:productId/options/:optionId` | Options | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products/:productId/options/:optionId/values` | Option Values | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/products/:productId/options/:optionId/values/:valueId` | Option Values | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:productId/options/:optionId/values/:valueId` | Option Values | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/products/:productId/variants` | Variants | Bearer JWT | Store Scope | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products/:productId/variants` | Variants | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/products/:productId/variants/:variantId` | Variants | Bearer JWT | Store Scope | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/products/:productId/variants/:variantId` | Variants | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:productId/variants/:variantId` | Variants | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/products/:productId/variants/:variantId/images` | Variant Images | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/products/:productId/variants/:variantId/images/:imageId` | Variant Images | Bearer JWT | Store Admin | [OPTIONS_AND_VARIANTS.md](OPTIONS_AND_VARIANTS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/units` | Units | Bearer JWT | Store Scope | [UNITS.md](UNITS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/units/:id` | Units | Bearer JWT | Store Scope | [UNITS.md](UNITS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/banners` | Banners | Bearer JWT | Store Scope | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/banners` | Banners | Bearer JWT | Store Admin | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/banners/upload` | Banners | Bearer JWT | Store Admin | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/banners/:id` | Banners | Bearer JWT | Store Scope | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/banners/:id` | Banners | Bearer JWT | Store Admin | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/banners/:id` | Banners | Bearer JWT | Store Admin | [BANNERS.md](BANNERS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/orders` | Orders | Bearer JWT | Store Admin | [ORDERS.md](ORDERS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/orders` | Orders | Bearer JWT | Store Scope / Customer | [ORDERS.md](ORDERS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/orders/:id` | Orders | Bearer JWT | Store Admin | [ORDERS.md](ORDERS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/coupons/validate` | Coupons | Bearer JWT | Store Scope | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/coupons` | Coupons | Bearer JWT | Store Admin | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `POST` | `/api/v1/catalog/coupons` | Coupons | Bearer JWT | Store Admin | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/coupons/:id` | Coupons | Bearer JWT | Store Admin | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `PATCH` | `/api/v1/catalog/coupons/:id` | Coupons | Bearer JWT | Store Admin | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `DELETE` | `/api/v1/catalog/coupons/:id` | Coupons | Bearer JWT | Store Admin | [COUPONS.md](COUPONS.md) | Implemented | Verified (Unit + E2E) |
| `GET` | `/api/v1/catalog/customers` | Customers | Bearer JWT | Store Admin | [CUSTOMERS.md](CUSTOMERS.md) | Implemented | Verified (Unit + E2E) |

**Total Registered Endpoints Accounted For:** 74 endpoints across 13 business subdomains. 100% coverage.
