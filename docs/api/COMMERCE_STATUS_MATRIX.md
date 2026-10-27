# Commerce Features Implementation Matrix

## Overview
This document clarifies the exact implementation status of standard ecommerce domain features in the **5 Ecommerce** repository. As an enterprise backend, certain features are implemented within the unified `catalog` domain, while others are handled client-side or remain on the project roadmap.

| Feature Domain | Status | Current Repository Implementation | Target / Roadmap Architecture |
|---|---|---|---|
| **Multi-Tenancy** | **Implemented & Verified** | Database schemas, `catalog_module.ecommerce`, `X-Ecommerce-Id` header, and CASL role scoping (`scope = '<storeId>'`). | Mature. Fully enforced across all catalog, coupon, order, and customer operations. |
| **Authentication** | **Implemented & Verified** | JWT access/refresh token rotation, bcrypt password hashing, Redis refresh token tracking, cookie support. | Complete. Tested and active at `/api/v1/auth/*`. |
| **Authorization (RBAC)** | **Implemented & Verified** | CASL-based dynamic permissions, scoped roles (`ecommerce_admin`, `admin`, `user`), Redis caching, conditions. | Complete. Managed at `/api/v1/authorization/*`. |
| **Product Catalog** | **Implemented & Verified** | Products, descriptions, detail sections, base pricing, offer pricing, tax classes, status lifecycle. | Complete at `/api/v1/catalog/products`. |
| **Hierarchical Categories** | **Implemented & Verified** | PostgreSQL `ltree` materialized paths, tree queries (`?tree=true`), subcategory reparenting. | Complete at `/api/v1/catalog/categories`. |
| **Options & Variants** | **Implemented & Verified** | Multi-dimensional options, shared units, variant SKUs, variant gallery images, barcode/pricing overrides. | Complete at `/api/v1/catalog/products/:id/variants`. |
| **Media Storage** | **Implemented & Verified** | Cloudinary integration for product images, variant images, and promotional banners with Multer streaming. | Complete. Tested in `cloudinary.service.test.ts`. |
| **Banners & Marketing** | **Implemented & Verified** | Homepage carousels, hero banners, redirect links, display ordering, image asset upload endpoint. | Complete at `/api/v1/catalog/banners`. |
| **Coupons & Promotions** | **Implemented & Verified** | Rule evaluation engine: percentage/fixed discounts, product/category/user-behavior targeting, usage limits. | Complete at `/api/v1/catalog/coupons`. |
| **Cart** | **Partially Implemented** | Cart state is maintained by storefront clients (e.g. React/Vue state or LocalStorage) and sent to `/api/v1/catalog/coupons/validate`. | Persistent server-side Redis/Postgres cart sessions are planned for a future release. |
| **Checkout & Orders** | **Implemented & Verified** | Handled directly via `POST /api/v1/catalog/orders`. Atomic transaction applies coupons, records usage, and snapshots items. | Functional. Dedicated multi-step checkout state machine (shipping selection, tax calculation) is planned. |
| **Customer Intelligence** | **Implemented & Verified** | Real-time SQL aggregation over `catalog_module.orders` calculating total orders, spend, and VIP status. | Complete at `/api/v1/catalog/customers`. |
| **Inventory Tracking** | **Partially Implemented** | `quantity` tracked on `products` and `product_variants`. Admin can update stock. | Inventory reservation and automatic deduction upon order creation are not yet automated. |
| **Addresses** | **Partially Implemented** | Stored as structured JSON (`shippingAddress`) on each order in `catalog_module.orders`. | A dedicated user address book table (`user_module.addresses`) is planned. |
| **Payment Gateways** | **Not Implemented** | No external payment gateway SDKs (Stripe, Razorpay, PayPal) or webhook handlers are currently present. | Backlog P1 item. Currently orders default to `PROCESSING` status upon receipt. |
