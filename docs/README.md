# 5 Ecommerce — Documentation Portal & Developer Guide

Welcome to the **5 Ecommerce** technical documentation hub. The documentation has been organized into clear, dedicated folders so any new developer can quickly locate architectural concepts, operational SOPs, API contracts, or business requirements without confusion.

---

## 🗂️ Folder Structure at a Glance

```
DOCS/
├── README.md               # 👈 You are here: Master portal and orientation guide
│
├── architecture/           # 🏛️ Core System Architecture & Schemas
│   ├── ARCHITECTURE.md     # High-level architecture, module boundaries, sequence flows
│   ├── DATABASE_SCHEMA.md  # Complete ER diagram, schemas (user, authz, catalog), dictionary
│   ├── AUTHENTICATION_AND_AUTHORIZATION.md # JWT tokens, CASL RBAC, tenant scopes, caching
│   └── authorization.md    # Deep dive into authorization rules and CASL capabilities
│
├── operations/             # ⚙️ Developer Onboarding, SOPs & Runtime Guides
│   ├── ENVIRONMENT_SETUP.md# Local setup, prerequisites, .env guide, seeders
│   ├── BACKEND_COMMANDS.md # Company 6-step Quality-Gate SOP & Docker commands
│   ├── DEPLOYMENT.md       # Production deployment, Docker Compose topology, observability
│   ├── TESTING_GUIDE.md    # Jest runner, coverage thresholds, mocking strategy
│   ├── ERROR_HANDLING.md   # AppError hierarchy, status codes, CLS tracing, Winston
│   └── SOP_INITIAL_SETUP.md# Initial setup procedures and telemetry reference
│
├── reports/                # 📊 Business Synopsis & Technical Audit Reports
│   ├── PROJECT_AUDIT_REPORT.md # Technical audit, verified metrics, P0-P3 backlog
│   └── PROJECT_SYNOPSIS_AND_REQUIREMENTS.md # Business context, FR/NFR specs, acceptance criteria
│
└── api/                    # 🔌 Feature-Wise API Specifications (74 Endpoints, 100% Coverage)
    ├── README.md           # Master API inventory, security headers, route table
    ├── AUTHENTICATION.md   # Login, token refresh, logout, session profile
    ├── USERS.md            # User management CRUD, bcrypt password hashing
    ├── ADMINISTRATION.md   # Roles, permissions, CASL conditions, cache flush
    ├── TENANTS.md          # Multi-tenant stores, slug routing, store settings
    ├── CATEGORIES.md       # Hierarchical categories with PostgreSQL LTREE
    ├── PRODUCTS.md         # Product catalog, pricing, offer pricing, tax, Cloudinary
    ├── OPTIONS_AND_VARIANTS.md # Multi-dimensional options, units, variant SKUs
    ├── UNITS.md            # Shared reference measurement units (weight, volume, count)
    ├── BANNERS.md          # Homepage carousels, hero graphics, image upload
    ├── COUPONS.md          # Rules-based promotions engine, targeting, cart validation
    ├── ORDERS.md           # Order placement, transactional coupon usage, status
    ├── CUSTOMERS.md        # Customer intelligence, order analytics, VIP tiering
    ├── HEALTH.md           # Kubernetes liveness/readiness probes, Prometheus metrics
    ├── COMMERCE_STATUS_MATRIX.md # Status of Cart, Checkout, Inventory, Payments
    ├── storefronts/        # Storefront client integration guides (Rasoi Ansh, Kratkon, Kleanja)
    └── legacy/             # Legacy endpoint specifications archive
```

---

## 🧭 Orientation Guide for New Developers

### 1. Where do I start?
1. Follow the [**Environment Setup Guide**](operations/ENVIRONMENT_SETUP.md) to install dependencies, boot PostgreSQL and Redis via Docker, run migrations, and seed demo multi-tenant data.
2. Review the [**Modular Monolith Architecture**](architecture/ARCHITECTURE.md) to understand module encapsulation rules and the event bus.

### 2. How do I validate my code before pushing?
Follow the mandatory [**Company Backend Quality-Gate SOP**](operations/BACKEND_COMMANDS.md):
```bash
# Must pass in this exact order:
npm run type-check    # Step 1: TypeScript compilation
npm run lint          # Step 2: ESLint modular monolith check
npm run test          # Step 3: Automated test suite (506 tests)
npm run test:coverage # Step 4: Coverage verification (>60% threshold)
npm run test:fallow   # Step 5: Fallow maintainability analysis
npm run build         # Step 6: Production backend build
```

### 3. How do I find API endpoints?
Open the [**API Documentation Index**](api/README.md) to inspect the 74 documented endpoints with request schemas, sample JSON payloads, and error codes.

### 4. What are the known limitations and future work?
Read the [**Project Audit Report**](reports/PROJECT_AUDIT_REPORT.md) and [**Project Synopsis**](reports/PROJECT_SYNOPSIS_AND_REQUIREMENTS.md) for the prioritized P0–P3 roadmap (Payment gateways, automated stock deductions).

---

## ⚡ 3-Minute Development Quick-Start

```bash
# 1. Install packages
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Boot backing services
docker compose up -d postgres redis

# 4. Migrate and seed data
npm run migration:run
npm run seed:rbac
npm run seed:tenants

# 5. Start dev server
npm run dev
```

Test application liveness:
```bash
curl http://localhost:3000/api/v1/health/live
```

### 🔑 Default Seeded Accounts & Credentials

| Role / Store | Email | Password | Scope |
|---|---|---|---|
| **Platform Super Admin** | `superadmin@bazar.com` | `Password123!` | Global (`*`) |
| **Alpha Enterprise** | `urbanvogue_admin@bazar.com` | `Password123!` | Store UUID |
| **Kleanja** | `pureclean_admin@bazar.com` | `Password123!` | Store UUID |
| **Rasoi Ansh** | `freshharvest_admin@bazar.com` | `Password123!` | Store UUID |
| **Kratkon** | `volttech_admin@bazar.com` | `Password123!` | Store UUID |
| **Shree Shyam Impex** | `fitpulse_admin@bazar.com` | `Password123!` | Store UUID |
