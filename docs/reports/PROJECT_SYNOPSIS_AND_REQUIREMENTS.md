# 5 Ecommerce — Project Synopsis & Requirements Specification

**Document Title:** 5 Ecommerce Platform Engineering Specification & Synopsis  
**Document Identifier:** DOC-REQ-2026-v1.0  
**Status:** Approved Technical Baseline  
**Classification:** Internal Technical Handover  
**Target System:** 5 Ecommerce Multi-Tenant Modular Monolith  

---

## 1. Document Control & Metadata

| Field | Detail |
|---|---|
| **Project Name** | 5 Ecommerce Multi-Tenant Platform |
| **Document Version** | 1.0.0 |
| **Author** | Senior Software Architecture & Engineering Review Board |
| **Review Date** | October 26, 2026 |
| **Target Audience** | Backend Engineers, Frontend Storefront Developers, DevOps, QA, Product Stakeholders |
| **Baseline Architecture** | Node.js / TypeScript Modular Monolith |
| **Primary Repository** | `nodejs-production-template` (`5 Ecommerce`) |

---

## 2. Executive Summary

The **5 Ecommerce** platform is a high-performance, multi-tenant digital commerce backend designed to power multiple branded online storefronts from a single, unified codebase. The architecture adheres strictly to the **Modular Monolith** paradigm, maintaining strict database schema isolation, CASL-driven role and scope authorization, transactional inventory and promotions logic, Cloudinary media processing, and an 8-service Docker Compose topology with integrated Prometheus, Loki, Alloy, and Grafana telemetry.

This document formalizes the verified capabilities of the platform, specifies business functional requirements (`FR-xxx`), non-functional standards (`NFR-xxx`), and verifiable acceptance criteria (`AC-xxx`) to guide future roadmap engineering and frontend storefront integrations.

---

## 3. Business Context & Problem Statement

Modern enterprise ecommerce demands rapid onboarding of distinct merchant storefronts (tenants) without the operational overhead, network latency, and deployment complexity of distributed microservices. Previous architectures suffered from code duplication, data leakage across brands, and untracked database mutations.

**5 Ecommerce** solves these challenges by providing:
- Strict logical and relational separation per tenant via PostgreSQL schemas and `X-Ecommerce-Id` tenant routing.
- Granular, multi-tenant access control preventing store administrators from inspecting or mutating competitor catalogs.
- High-performance hierarchical catalog queries using PostgreSQL `ltree`.
- Centralized promotions evaluation supporting cart subtotal, item targeting, and customer behavior incentives.

---

## 4. Project Objectives

1. **Multi-Store Enablement:** Provide independent catalog, category, pricing, promotional, and fulfillment isolation for multiple merchant brands (e.g. *Alpha Enterprise*, *Kleanja*, *Rasoi Ansh*, *Kratkon*).
2. **Architectural Purity:** Prevent cross-module circular dependencies, cross-schema SQL queries, and bypassed barrel exports using automated ESLint rule enforcement.
3. **Data Integrity:** Guarantee transactional atomicity during order placement, coupon usage recording, and stock validation.
4. **Developer Efficiency:** Maintain a zero-warning quality gate SOP and sub-minute development startup via Docker Compose.

---

## 5. Project Scope

### In-Scope (Verified Implemented):
- Multi-tenant merchant store registration and management.
- User management with bcrypt credential security.
- Role-based and attribute-based access control with multi-tenant scopes (`*` vs store UUID).
- Hierarchical category management with PostgreSQL `ltree`.
- Product catalog with detail sections, base pricing, offer pricing, tax classes, and status transitions.
- Multi-dimensional options, shared measurement units, and variant SKU generation.
- Cloudinary media gallery upload and deletion for products, variants, and banners.
- Homepage and category promotional banners.
- Centralized coupon evaluation and redemption engine.
- Transactional order creation and fulfillment status tracking.
- Customer analytics and lifetime value aggregation.
- Prometheus metrics, structured Winston logging with CLS request IDs, and health checks.

### Out-of-Scope / Backlog (Planned Future Enhancements):
- Native online payment gateway integrations (Stripe, Razorpay, UPI).
- Automated inventory quantity decrements on order placement.
- Persistent server-side shopping cart sessions.
- Standalone customer address book management.

---

## 6. Stakeholders & User Roles

| Role Name | Scope | Repository Support | Responsibilities & Capabilities |
|---|---|---|---|
| **Super Administrator** | Global (`*`) | `admin` role in `rbac-seeder.ts` | Complete system access; creates tenants, assigns global permissions, provisions store admins. |
| **Store Administrator** | Tenant (`<storeId>`) | `ecommerce_admin` role | Manages catalog, categories, products, variants, images, banners, coupons, and orders within their assigned store. |
| **Store Customer** | Tenant Scope | Public / Storefront API | Browses active products/categories, applies coupons, places orders, and inspects storefront banners. |
| **System Auditor / SRE** | Global (`*`) | Health & Observability | Monitors Kubernetes probes, reviews Prometheus metrics, and inspects Loki log streams. |

### Verified Seeded Credentials Baseline

| Account Designation | Admin Name | Login Email | Password | Assigned Tenant Store | Scope |
|---|---|---|---|---|---|
| **Platform Super Admin** | Platform Super Admin | `superadmin@bazar.com` | `Password123!` | Global Platform Administrator | `*` (Global) |
| **Store Admin 1** | Alex Rivera | `urbanvogue_admin@bazar.com` | `Password123!` | **Alpha Enterprise** (`alpha-enterprise`) | Tenant Store UUID |
| **Store Admin 2** | Sarah Jenkins | `pureclean_admin@bazar.com` | `Password123!` | **Kleanja** (`kleanja`) | Tenant Store UUID |
| **Store Admin 3** | David Chen | `freshharvest_admin@bazar.com` | `Password123!` | **Rasoi Ansh** (`rasoi-ansh`) | Tenant Store UUID |
| **Store Admin 4** | Elena Rostova | `volttech_admin@bazar.com` | `Password123!` | **Kratkon** (`kratkon`) | Tenant Store UUID |
| **Store Admin 5** | Marcus Vance | `fitpulse_admin@bazar.com` | `Password123!` | **Shree Shyam Impex** (`shree-shyam-impex`) | Tenant Store UUID |

---

## 7. Functional Requirements Specification

### Multi-Tenancy & Store Management
- **FR-001 (Store Provisioning):** The system shall allow Super Administrators to create ecommerce store tenants with a unique slug and configuration settings.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/ecommerce`
- **FR-002 (Tenant Resolution):** The system shall enforce tenant isolation across all catalog requests using the `X-Ecommerce-Id` header and user role scope.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `src/modules/catalog/catalog.tenant-guard.ts`

### Authentication & Authorization
- **FR-003 (JWT Session Lifecycle):** The system shall authenticate users via email and password, issuing a short-lived access token (15m) and a rotating refresh token (30d) in an HTTP-only cookie.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- **FR-004 (Dynamic CASL RBAC):** The system shall evaluate permissions using CASL abilities, supporting JSON conditions and store-scoped roles.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `src/modules/authorization/authorization.ability-factory.ts`
- **FR-005 (Permission Caching):** User abilities shall be cached in Redis with automatic cache eviction upon role or permission changes.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `src/modules/authorization/authorization.cache.ts`

### Product Catalog & Categories
- **FR-006 (Hierarchical Categories):** Categories shall support unlimited nesting using PostgreSQL `ltree` materialized paths and provide tree-structured JSON queries (`?tree=true`).
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `GET /api/v1/catalog/categories`
- **FR-007 (Product Lifecycle):** The system shall manage products with support for `DRAFT`, `ACTIVE`, and `ARCHIVED` statuses, pricing, offer pricing, tax classes, and custom detail sections.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/products`
- **FR-008 (Pricing Constraint Validation):** The system shall enforce that `offerPrice` cannot exceed `price`.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `src/modules/catalog/catalog.validator.ts`
- **FR-009 (Multi-Dimensional Variants):** Products shall support options (e.g. Size, Color), option values with shared units (e.g. gram, kg), and concrete variant SKUs with distinct pricing and stock.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/products/:id/variants`
- **FR-010 (Media Gallery Processing):** Up to 10 product and variant images shall be uploaded concurrently via Multer streams to Cloudinary.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/products/:id/images`

### Promotions & Coupons
- **FR-011 (Promotional Targeting):** Coupons shall support targeting scopes: `ALL_PRODUCTS`, specific `PRODUCT` IDs, `CATEGORY` subtrees (via LTREE inheritance), and `USER_BEHAVIOR` (`FIRST_ORDER`, `MIN_ORDER_VALUE`, `ORDER_NUMBER`).
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `src/modules/catalog/catalog.service.ts:evaluateCoupon`
- **FR-012 (Cart Evaluation):** The system shall provide an endpoint to evaluate coupon codes against cart items, calculating exact discount amounts and identifying eligible products.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/coupons/validate`
- **FR-013 (Usage Limiting):** The system shall enforce maximum global coupon usage limits and per-customer redemption limits.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `catalog_module.coupon_usages`

### Orders & Fulfillment
- **FR-014 (Transactional Order Creation):** Order creation shall execute in an explicit database transaction, atomically recording coupon redemption, validating discount amounts, and snapshotting items and shipping addresses.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `POST /api/v1/catalog/orders`
- **FR-015 (Order Status Lifecycle):** Orders shall transition through `PROCESSING`, `SHIPPED`, `DELIVERED`, and `CANCELLED`.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `PATCH /api/v1/catalog/orders/:id`
- **FR-016 (Customer Intelligence Aggregation):** The system shall provide aggregated customer metrics (total orders, total spend, acquisition date, and VIP tiering) derived directly from order history.
  - *Status:* **Verified Existing Functionality**
  - *Reference:* `GET /api/v1/catalog/customers`

### Future / Incomplete Functional Requirements
- **FR-017 (Automated Inventory Decrement):** Placing an order shall atomically decrement variant stock and abort if stock is insufficient.
  - *Status:* **Required Behavior — Incomplete (Backlog P1)**
- **FR-018 (Payment Gateway Integration):** The platform shall integrate with Razorpay and Stripe to handle online checkout transactions and webhooks.
  - *Status:* **Planned Future Enhancement (Backlog P1)**
- **FR-019 (Server-Side Persistent Cart):** Shopping carts shall persist in Redis/Postgres across user sessions.
  - *Status:* **Planned Future Enhancement (Backlog P3)**

---

## 8. Non-Functional Requirements Specification

- **NFR-001 (Architecture Modularity):** Code must reside in isolated modules under `src/modules/<name>/` and communicate only through public barrel exports (`index.ts`) or the event bus. Direct cross-module model/repository imports are strictly forbidden.
- **NFR-002 (Type Safety):** The codebase must compile with TypeScript strict mode enabled and zero `any` leaks.
- **NFR-003 (Code Quality):** ESLint must pass with zero errors and zero warnings (`--max-warnings=0`).
- **NFR-004 (Code Maintainability):** The codebase maintainability index (Fallow MI) must remain `>= 90` with zero dead files, zero dead exports, and zero duplicate code blocks.
- **NFR-005 (Test Coverage):** Global test coverage must exceed `60%` across lines, functions, branches, and statements (current actual: `>90%` across core modules).
- **NFR-006 (Observability & Tracing):** Every HTTP request must be traced with a unique `X-Request-Id` injected into thread-local CLS and included in all structured Winston logs.
- **NFR-007 (Security & Non-Root Execution):** Docker production images must execute under an unprivileged user (`appuser`, UID 1001). Passwords must be hashed with bcrypt (10 rounds).

---

## 9. Traceable Acceptance Criteria

| Requirement | Acceptance Criteria ID | Verification Method | Pass Criteria |
|---|---|---|---|
| **FR-001** | `AC-001` | Integration Test | `POST /api/v1/catalog/ecommerce` creates record in `catalog_module.ecommerce` with status 201. |
| **FR-002** | `AC-002` | Unit & E2E Test | Request without valid `X-Ecommerce-Id` header is rejected with 400 Bad Request. |
| **FR-003** | `AC-003` | Integration Test | Valid login returns JWT access token and sets HTTP-only `refreshToken` cookie. |
| **FR-004** | `AC-004` | Unit Test | User with store-scoped role cannot mutate records belonging to a different `ecommerceId`. |
| **FR-006** | `AC-005` | E2E Test | `GET /api/v1/catalog/categories?tree=true` returns nested children matching LTREE paths. |
| **FR-008** | `AC-006` | Unit Test | Creating product where `offerPrice > price` fails Zod validation with 400 Bad Request. |
| **FR-011** | `AC-007` | Service Test | Evaluating first-order coupon for a customer with existing orders returns `valid: false`. |
| **FR-014** | `AC-008` | Integration Test | Creating order increments coupon `usage_count` and records entry in `coupon_usages`. |
| **NFR-001**| `AC-009` | ESLint Runner | `npm run lint` passes with 0 warnings using `eslint-plugin-modular-monolith`. |
| **NFR-004**| `AC-010` | Fallow Runner | `npm run test:fallow` reports Maintainability Index `>= 90` and 0 dead code issues. |
| **NFR-005**| `AC-011` | Jest Coverage | `npm run test:coverage` completes with 100% test suites passing and coverage `>= 60%`. |

---

## 10. References to Detailed Technical Documentation

1. [Architecture & Mermaid Diagrams](../architecture/ARCHITECTURE.md)
2. [Complete Database Schema & ER Diagram](../architecture/DATABASE_SCHEMA.md)
3. [Developer Setup & Environment Reference](../operations/ENVIRONMENT_SETUP.md)
4. [Backend Commands & Quality-Gate SOP](../operations/BACKEND_COMMANDS.md)
5. [Feature-Wise API Documentation Index](../api/README.md)
6. [Comprehensive Project Audit Report](PROJECT_AUDIT_REPORT.md)

---

