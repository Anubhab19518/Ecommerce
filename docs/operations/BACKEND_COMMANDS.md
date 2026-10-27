# 5 Ecommerce — Backend Commands & Quality-Gate SOP

## 1. Company Backend Quality-Gate SOP

The company strictly enforces a 6-step sequential validation pipeline before Docker image build, deployment, or merge.

**Mandatory Rule:**
If any check fails:
1. Stop the pipeline immediately.
2. Investigate and resolve the root cause.
3. Rerun the failed check.
4. **Repeat the entire sequence from Step 1 (`type-check`) through Step 6 (`build`)** before proceeding to Docker image creation or startup.

---

### Step 1 — Type Checking
```bash
npm run type-check
```
- **Project Script Equivalent:** `npm run type-check` (executes `tsc --noEmit`). Note: The project package script is named `type-check` (with hyphen).
- **Purpose:** Verifies strict TypeScript compile-time type safety across all modules without writing emit files.
- **Expected Outcome:** Zero compilation errors. Exits with code `0`.

---

### Step 2 — Linting & Modular Monolith Boundary Check
```bash
npm run lint
```
- **Command:** `eslint "src/**/*.ts" --max-warnings=0`
- **Purpose:** Enforces code style, TypeScript conventions, and modular monolith architectural rules (`no-cross-module-db-import`, `enforce-barrel-exports`, `no-cross-schema-query`).
- **Expected Outcome:** Zero errors and zero warnings. Exits with code `0`.
- **Auto-Fix Command:** `npm run lint:fix`

---

### Step 3 — Automated Test Suite
```bash
npm run test
```
- **Command:** `jest --passWithNoTests`
- **Purpose:** Runs 40 test suites covering unit logic, service behaviors, controllers, and integration contracts.
- **Expected Outcome:** All test suites pass (506/506 tests passing). Exits with code `0`.

---

### Step 4 — Test Coverage Verification
```bash
npm run test:coverage
```
- **Command:** `jest --coverage --passWithNoTests`
- **Purpose:** Enforces unit and branch coverage thresholds. Configured in `jest.config.ts`:
  - Branches: `>= 60%`
  - Functions: `>= 60%`
  - Lines: `>= 60%`
  - Statements: `>= 60%`
- **Expected Outcome:** Code coverage across modules exceeds minimum global thresholds. Exits with code `0`.

---

### Step 5 — Fallow Maintainability & Dead-Code Analysis
```bash
npm run test:fallow
```
- **Command:** `fallow`
- **Configuration:** `.fallowrc.json`
- **Purpose:** Inspects dead exports, unused files, code duplication, cognitive complexity, and churn hotspots.
- **Expected Outcome:** Maintainability index `>= 90` (good), 0 dead files, 0 dead exports, 0 duplicate blocks. Exits with code `0`.

---

### Step 6 — Production Backend Build
```bash
npm run build
```
- **Command:** `tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`
- **Purpose:** Compiles TypeScript source to production JavaScript in `./dist` and resolves tsconfig path aliases (`@modules/*`, `@shared/*`).
- **Expected Outcome:** Clean build in `./dist`. Exits with code `0`.

---

## 2. Server Runtime Commands

| Task | Command | Description |
|---|---|---|
| **Development** | `npm run dev` | Runs application with `nodemon` and ts-node |
| **Production** | `npm run start` | Runs compiled code `node dist/index.js` |
| **Code Formatting** | `npm run format` | Checks Prettier formatting across TS and tools |
| **Format Auto-Fix** | `npm run format:fix` | Automatically formats TS source and tooling |

---

## 3. Database Migration & Seeder Commands

| Operation | Command | Description |
|---|---|---|
| **Migration Status** | `npm run migration:status` | Shows pending and executed migrations |
| **Migration Dry-Run**| `npm run migration:dry-run` | Validates migration files without applying |
| **Apply Migrations** | `npm run migration:run` | Applies all pending migrations in Umzug transaction |
| **Rollback Migration**| `npm run migration:rollback` | Reverts the last executed migration |
| **Create Migration** | `npm run migration:create -- --name <name>` | Generates a new migration skeleton |
| **Seed RBAC** | `npm run seed:rbac` | Provisions default roles and permissions |
| **Seed Storefronts** | `npm run seed:tenants` | Seeds Super Admin, 4 tenants, catalog, and variants |

---

## 4. Docker Commands and Runtime SOP

The company sequence for container execution:
**Backend Quality Gates → Docker Build → Docker Startup → Health Verification → Smoke Tests.**

### 1. Docker Environment Inspection
```bash
docker --version
docker compose version
docker compose config
docker compose config --services
docker compose ps
```

### 2. Building & Starting Services
- **Build fresh production image:**
  ```bash
  docker compose build
  ```
- **Start services in background:**
  ```bash
  docker compose up -d
  ```
- **Rebuild and restart in one command:**
  ```bash
  docker compose up --build -d
  ```

### 3. Monitoring & Logs
- **View all running service statuses:**
  ```bash
  docker compose ps
  ```
- **Inspect recent 200 log lines:**
  ```bash
  docker compose logs --tail=200
  ```
- **Stream real-time logs across all services:**
  ```bash
  docker compose logs -f
  ```
- **Stream logs for a specific service:**
  ```bash
  docker compose logs -f app
  docker compose logs -f postgres
  docker compose logs -f redis
  ```

### 4. Lifecycle Management
- **Pause/Start existing containers:** `docker compose stop` / `docker compose start`
- **Restart services:** `docker compose restart`
- **Graceful shutdown (Preserves data volumes):**
  ```bash
  docker compose down
  ```

### 5. Troubleshooting & Interactive Shell
- **Inspect running container details:** `docker ps`
- **Inspect images:** `docker image ls`
- **Inspect disk usage:** `docker system df`
- **Open shell in PostgreSQL container:**
  ```bash
  docker compose exec postgres sh
  ```
- **Open shell in Redis container:**
  ```bash
  docker compose exec redis sh
  ```

> [!CAUTION]
> **Data Loss Warning:** Never execute `docker compose down -v` in development or production without explicit authorization. The `-v` flag destroys persistent named volumes (`postgres_data`, `redis_data`, `grafana_data`), completely wiping all databases.  
> Similarly, `docker system prune -a` removes unreferenced images and volumes system-wide, affecting other local projects.
