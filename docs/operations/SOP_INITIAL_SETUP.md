# Standard Operating Procedure (SOP)
## Developer Onboarding & Template Setup Guide

- **Document Title**: SOP — Node.js Modular Monolith & SaaS Project Template Setup
- **Document Version**: 1.0.0
- **Target Audience**: Software Engineers, Full-Stack Developers, DevOps Engineers
- **Scope**: General Onboarding, Environment Setup, Architecture Rules & Operations for Any Project Built on This Template

---

## 1. Architectural Foundations & Intent

This project template implements a **Production-Grade Node.js Modular Monolith** designed for high scalability, maintainability, and clear separation of concerns:

- **Modular Monolith Core**: High cohesion inside module boundaries (`src/modules/<module-name>/`) with zero tight coupling.
- **Data Isolation**: Each module owns a dedicated PostgreSQL schema (e.g. `user_module`, `catalog_module`, `authorization_module`). Cross-schema SQL joins and direct cross-module database imports are strictly prohibited.
- **Event-Driven Communication**: Asynchronous cross-module side effects occur through a centralized Event Bus (`notificationService.publish`).
- **Full Observability Stack**: Built-in Docker orchestration for PostgreSQL, Redis, Prometheus (metrics), Loki (log aggregation), Alloy (log shipping), and Grafana (dashboards).

---

## 2. Workstation Prerequisites

Before setting up any application derived from this template, ensure your system has the following core tools installed:

| Component | Required Version | Verification Command | Description |
| :--- | :--- | :--- | :--- |
| **Docker Desktop** | `v24.x` or higher | `docker --version` | Container runtime for databases and telemetry. |
| **Docker Compose** | `v2.x` | `docker compose version` | Multi-container orchestration engine. |
| **Node.js** | `v20.x` or `v22.x` (LTS) | `node -v` | Server runtime environment. |
| **npm** | `v10.x` | `npm -v` | Package manager. |
| **Git** | `v2.40` or higher | `git --version` | Source control management. |

---

## 3. Step-by-Step Initial Project Setup Guide

### Phase 1: Infrastructure & Docker Container Setup (Docker First)

1. **Clone the Repository & Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Verify Key Settings in `.env`**:
   ```ini
   PORT=3000
   NODE_ENV=development

   # PostgreSQL Credentials
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=appuser
   DB_PASSWORD=apppassword
   DB_NAME=app

   # Redis Credentials
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Authentication Secrets
   JWT_SECRET=production_super_secret_jwt_key_2026
   JWT_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=30d
   ```

3. **Start All Infrastructure Services via Docker Compose**:
   ```bash
   docker compose up -d
   ```

4. **Verify Container Health**:
   ```bash
   docker compose ps
   ```
   *Ensure `app-postgres` and `app-redis` show status `Healthy`.*

---

### Phase 2: Database Schemas, Migrations & Seeding

1. **Execute Umzug Database Migrations**:
   ```bash
   npm run migration:run
   ```
   *Initializes module database schemas (`user_module`, `catalog_module`, `authorization_module`, etc.) and runs versioned SQL migrations.*

2. **Seed Core RBAC Roles & Permissions**:
   ```bash
   npm run seed:rbac
   ```

3. **Seed Initial Tenants, Accounts & Sample Data**:
   ```bash
   npm run seed:tenants
   ```

---

### Phase 3: Mandatory Pre-Build Code Quality & Error Verification Flow

Before executing a Docker image build (`docker compose build` or `docker compose up --build`), **you MUST run the full verification pipeline in this exact order** to ensure no syntax errors, broken types, test failures, or modular monolith boundary violations enter the build stage:

#### 1. Code Quality & Formatting Check (`lint`)
```bash
npm run lint
```
* **Purpose**: Validates code style, formatting, and standard rules.
* **Pass Criterion**: Exits with code 0 (`--max-warnings=0`). Zero lint errors or warnings allowed.

#### 2. Strict Type Check (`type-check`)
```bash
npm run type-check
```
* **Purpose**: Runs `tsc --noEmit` to verify 100% strict TypeScript compilation across the entire codebase.
* **Pass Criterion**: Zero TypeScript compiler errors.

#### 3. Full Test Suite & Coverage Verification (`test:coverage`)
```bash
npm run test:coverage
```
* **Purpose**: Executes all Jest unit and integration test suites with coverage report collection.
* **Pass Criterion**: All test suites pass 100% (0 failing tests) with minimum **85%+ code coverage** across core modules and seeders.

#### 4. Architecture Guardrails & Monolith Boundary Verification (`test:fallow`)
```bash
npm run test:fallow
```
* **Purpose**: Runs `fallow` to enforce modular monolith boundaries, scan for dead code/exports, and ensure cyclomatic complexity stays below limits.
* **Pass Criterion**: Exits with code 0 (`0 above threshold`). Zero cross-module schema/repository import violations.

---

### Phase 4: Production Docker Build & Container Execution

Once the pre-build verification pipeline passes cleanly:

1. **Build Docker Containers**:
   ```bash
   docker compose build
   ```

2. **Launch Full Stack via Docker Compose**:
   ```bash
   docker compose up -d
   ```

#### 1. Backend Service (`http://localhost:3000/api/v1`)
Start the hot-reloading development server:
```bash
npm run dev
```

Test liveness probe:
```bash
curl http://localhost:3000/api/v1/health/live
```

#### 2. Frontend Admin Application (`http://localhost:3002`)
If your project includes a decoupled Next.js admin frontend:
```bash
cd D:\Projects\admin-dashboard
npm install
npm run dev
```

---

## 4. Multi-Tenant Credentials Reference

| Account Type | Store / Scope | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Global Super Admin** | All Stores *(Global Scope)* | `superadmin@bazar.com` | `Password123!` | `admin` |
| **Store Admin 1** | Alpha Enterprise *(Fashion)* | `urbanvogue_admin@bazar.com` | `Password123!` | `ecommerce_admin` |
| **Store Admin 2** | Kleanja *(Home/Cleaning)* | `pureclean_admin@bazar.com` | `Password123!` | `ecommerce_admin` |
| **Store Admin 3** | Kratkon *(Bags)* | `volttech_admin@bazar.com` | `Password123!` | `ecommerce_admin` |
| **Store Admin 4** | Shree Shyam Impex *(Clothing Hangers)* | `fitpulse_admin@bazar.com` | `Password123!` | `ecommerce_admin` |
| **Store Admin 5** | Rasoi Ansh *(Masalas)* | `freshharvest_admin@bazar.com` | `Password123!` | `ecommerce_admin` |

> ⚠️ **Note**: All passwords end with an **exclamation mark (`!`)**.

---

## 5. Telemetry, Logging & Database Dashboards (Grafana)

1. Open Grafana: [http://localhost:3001](http://localhost:3001)
2. Login credentials: `admin` / `admin`
3. **Provisioned Data Sources**:
   - **PostgreSQL** (`postgres:5432` / `app`): Pre-configured to run direct SQL queries against database schemas.
   - **Prometheus** (`http://prometheus:9090`): Real-time metrics for HTTP requests, DB query durations, and memory usage.
   - **Loki** (`http://loki:3100`): Live container log aggregation.
4. **Pre-Built Dashboards**:
   - Go to **Dashboards** $\rightarrow$ **App Overview** to view live system health.

---

## 6. Modular Monolith Architecture Guardrails

Every code modification in projects using this template **MUST** follow these enforced rules:

### Rule 1: Standard Module Structure
Each module lives under `src/modules/<module-name>/` and follows this exact layout:
```
src/modules/<module-name>/
├── index.ts              # Barrel export — PUBLIC API of the module
├── <module>.routes.ts    # Express router
├── <module>.controller.ts # Request handlers (thin — delegates to service)
├── <module>.service.ts   # Business logic (the main class exported)
├── <module>.repository.ts # Data access layer (NEVER exported from index.ts)
├── <module>.model.ts     # Sequelize model (NEVER exported from index.ts)
├── <module>.validator.ts # Zod validation schemas
└── __tests__/            # Unit and integration tests
```

### Rule 2: No Cross-Module DB Imports
Modules MUST NOT import another module's `.model.ts` or `.repository.ts` directly.
```typescript
// ❌ FORBIDDEN
import { UserModelDef } from '@modules/user/user.model';

// ✅ CORRECT
import { UserService } from '@modules/user';
```

### Rule 3: Barrel Export Enforcement
Cross-module imports MUST go through the module's `index.ts` barrel export only.

### Rule 4: Event-Driven Side Effects
Cross-module communication MUST use `notificationService.publish(EventType, payload)`. Floating promises or un-awaited cross-module method calls are prohibited.

---

## 7. Common Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `SequelizeConnectionRefusedError` | PostgreSQL container is stopped or starting up. | Run `docker compose up -d postgres redis` and re-test. |
| `Invalid email or password` | Missing exclamation mark `!` in password. | Ensure password used is `Password123!`. |
| `EADDRINUSE: :::3000` | Port 3000 is occupied by an existing process. | Stop background node processes before running `npm run dev`. |
| `pq: password authentication failed` | Misconfigured Grafana DB credentials. | Ensure Grafana PostgreSQL datasource uses `user: appuser`, `password: apppassword`, `db: app`. |

---

**Document Control**: Engineering Architecture Team  
**Template Standard Version**: 1.0.0
