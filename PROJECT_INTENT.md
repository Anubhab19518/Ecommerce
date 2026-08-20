# Project Intent & Architecture Specification

## 1. Executive Summary

This project is a **Production-Grade E-Commerce Backend Platform** architected as a **Node.js / TypeScript Modular Monolith**.

The primary intention of this project is to combine the **operational simplicity and rapid development velocity of a monolith** with the **strict domain isolation, scalability, and maintainability of microservices**, without incurring the distributed system overhead (network latency, distributed transaction complexities, deployment orchestration overhead).

---

## 2. Core Architectural Philosophy

### 2.1 The Modular Monolith Paradigm
Rather than building an unstructured monolithic codebase or prematurely splitting into microservices, the system is organized into **autonomous, bounded domain modules** under `src/modules/`.

```
                    ┌─────────────────────────────────────────┐
                    │               API Gateway               │
                    │   Express App (src/server.ts)           │
                    └───────┬──────────────┬─────────────┬────┘
                            │              │             │
              ┌─────────────▼──┐    ┌──────▼──────┐   ┌──▼─────────────┐
              │  User Module   │    │  Auth Module│   │ Future Modules │
              │  (user_module) │    │ (auth_module│   │(Catalog, Order)│
              └───────┬────────┘    └──────┬──────┘   └──┬─────────────┘
                      │                    │             │
                      └─────────────┬──────┴─────────────┘
                                    │ Event Bus
                                    ▼
                      ┌───────────────────────────┐
                      │    Notification Module    │
                      │  (Decoupled Event Bus)    │
                      └───────────────────────────┘
```

### 2.2 Strict Invariants & Boundaries (ESLint-Enforced)

The codebase enforces five strict architectural boundary rules via custom ESLint plugins (`eslint-plugin-modular-monolith`):

1. **No Cross-Module Data Layer Access:** Modules cannot import models (`.model.ts`) or repositories (`.repository.ts`) of other modules.
2. **Barrel Export Enforcement:** External interactions with any module MUST go exclusively through its public `index.ts` barrel export (exposing only public services, controllers, or route definitions).
3. **Database Schema Isolation:** Raw SQL or ORM queries cannot access another module's database schema. Each module owns an isolated PostgreSQL schema (e.g., `user_module`, `authorization_module`).
4. **Asynchronous Decoupled Communication:** Cross-module side-effects MUST communicate asynchronously through the event bus (`notificationService.publish()`), preventing floating promises and tight runtime coupling.
5. **Idempotent, Transactional Migrations:** Every database change is managed via Umzug migrations with retry mechanisms and deterministic rollback capabilities.

---

## 3. Technology Stack & Infrastructure

| Component | Technology | Purpose & Strategy |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js 24 + TypeScript (Strict) | High-throughput async I/O with complete compile-time type safety. |
| **HTTP Framework** | Express 4.x | Fast, minimalistic web routing using controller/service patterns. |
| **Primary Database** | PostgreSQL 17 | Relational persistence partitioned into per-module schemas. |
| **ORM & Migrations** | Sequelize 6 + Umzug 3 | Strongly typed model definitions, connection pooling, and automated schema migrations. |
| **Cache & Pub/Sub** | Redis 7.4 (ioredis) | Multi-tier caching (authorization policies, sessions) and pub/sub events. |
| **Access Control (RBAC/ABAC)** | CASL (`@casl/ability`) | Dynamic, condition-based authorization engine with hierarchical roles and Redis caching. |
| **Authentication** | JWT (`jsonwebtoken`) | Stateless token verification with Bearer authorization middleware. |
| **Validation** | Zod | Runtime schema validation for requests and data transfer objects. |
| **Observability** | Winston + Prometheus (`prom-client`) | Structured JSON logging with CLS Request ID propagation and Prometheus scrape endpoints. |
| **Containerization** | Docker & Docker Compose | Multi-stage production containerization with non-root security. |

---

## 4. Current State & Existing Modules

### 4.1 `health` Module (`src/modules/health/`)
- Exposes liveness probe (`/api/v1/health/live`), readiness probe (`/api/v1/health/ready`), and Prometheus metrics (`/api/v1/health/metrics`).
- Evaluates database and Redis connectivity before signaling readiness.

### 4.2 `authorization` Module (`src/modules/authorization/`)
- Advanced RBAC + ABAC policy engine powered by CASL.
- Supports role inheritance, condition compilation (e.g., `id: "${user.id}"`), and route-level middleware factories (`authorize()`, `authorizeAny()`).
- High-performance Redis caching layer with targeted cache invalidation on policy mutations.

### 4.3 `user` Module (`src/modules/user/`)
- Manages user profiles, registration metadata, and password hashes within the `user_module` schema.
- Follows the strict Controller $\rightarrow$ Service $\rightarrow$ Repository pattern.

### 4.4 `notification` Module (`src/modules/notification/`)
- Centralized event publisher/subscriber mechanism (`notificationService.publish` / `notificationService.subscribe`).
- Enables cross-module event dispatching without direct service-to-service coupling.

### 4.5 Shared Infrastructure (`src/shared/` & `src/infrastructure/`)
- **JWT Authentication Middleware:** Intercepts Authorization headers, validates access tokens, and injects user identity into `req.user`.
- **Request Tracing:** Automatic `X-Request-Id` generation and AsyncLocalStorage / CLS context propagation for end-to-end request tracing.
- **Global Error Handling:** Unified domain error classes (`AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `ValidationError`).

---

## 5. E-Commerce Target Roadmap

The foundational template is built to support the following upcoming domain modules:

```
src/modules/
├── catalog/          # Products, categories, variants, pricing, and stock status
├── cart/             # Shopping cart sessions, guest/user cart merging, price calculation
├── order/            # Order placement, status state machine, cancellation, history
├── payment/          # Payment gateway integrations (Stripe, etc.), webhooks, refunds
├── inventory/        # Stock reservations, concurrency control, warehouse tracking
└── promotion/        # Coupons, discounts, promotional campaign engine
```

### Key Functional Requirements for E-Commerce:
1. **Catalog & Inventory Consistency:** Optimistic locking and transactional reservation patterns to prevent race conditions during high-volume checkout.
2. **Order Lifecycle State Machine:** Strict transitions (`PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PROCESSING` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED` / `CANCELLED`).
3. **Idempotent Payment Processing:** Webhook handlers with deduplication checks via Redis to ensure single-charge guarantees.
4. **Audit Trail & Observability:** Real-time metrics for checkout latency, order creation throughput, and error rates.

---

## 6. Verification and Quality Benchmarks

Every modification in the repository must meet these automated quality gates:
- **Type Checking:** `npm run type-check` (TypeScript strict mode, 0 errors).
- **Linter & Architecture Rules:** `npm run lint` (ESLint with zero warnings allowed).
- **Code Formatting:** `npm run format` (Prettier).
- **Test Suite:** `npm test` (Unit and integration tests with Jest).
- **Container Build:** Production multi-stage Docker build passes with non-root runtime permissions.
