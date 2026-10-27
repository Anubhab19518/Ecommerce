# 5 Ecommerce — Local Environment Setup Guide

## 1. Prerequisites & Version Requirements

| Dependency | Minimum Version | Verified Runtime | Purpose |
|---|---|---|---|
| **Node.js** | `>=20.0.0` | `v20.x` / `v22.x` (Container: `24-slim`) | Backend JavaScript runtime |
| **npm** | `>=10.0.0` | `10.8+` | Package manager |
| **Docker Engine** | `>=24.0.0` | `28.3.2` | Containerized services |
| **Docker Compose**| `>=2.20.0` | `v2.39.1` | Multi-container orchestration |
| **PostgreSQL** | `17` | `17-alpine` | Primary relational database |
| **Redis** | `7.4` | `7.4-alpine` | Session cache, token revocation, pub-sub |

---

## 2. Step-by-Step Local Developer Onboarding

### Step 1: Clone Repository & Install Dependencies
```bash
git clone <repository_url>
cd Ecommerce
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

#### Environment Variables Reference
```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app
DB_USER=appuser
DB_PASSWORD=apppassword
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_ACQUIRE_MS=30000
DB_POOL_IDLE_MS=10000
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY_MS=1000

# Authentication & Authorization Secrets
AUTHZ_CACHE_TTL_SECONDS=300
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Observability
LOG_LEVEL=debug
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

### Step 3: Start Backing Services via Docker
Start PostgreSQL and Redis:
```bash
docker compose up -d postgres redis
```
Verify container health:
```bash
docker compose ps
```
The health checks ensure PostgreSQL and Redis are ready to accept connections before the application attempts to connect.

---

### Step 4: Run Migrations and Seeders

1. **Verify Migration Status:**
   ```bash
   npm run migration:status
   ```
2. **Execute Migrations (Umzug Transactional Runner):**
   ```bash
   npm run migration:run
   ```
3. **Seed RBAC Defaults (Roles & Permissions):**
   ```bash
   npm run seed:rbac
   ```
4. **Seed Multi-Tenant Storefronts & Catalog:**
   ```bash
   npm run seed:tenants
   ```

#### 🔑 Seeded Default Login Credentials

| Account / Role | Email | Password | Assigned Tenant Store | Scope |
|---|---|---|---|---|
| **Platform Super Admin** | `superadmin@bazar.com` | `Password123!` | Global (All Stores) | `*` (Global Admin) |
| **Store Admin 1** | `urbanvogue_admin@bazar.com` | `Password123!` | **Alpha Enterprise** (`alpha-enterprise`) | Store UUID |
| **Store Admin 2** | `pureclean_admin@bazar.com` | `Password123!` | **Kleanja** (`kleanja`) | Store UUID |
| **Store Admin 3** | `freshharvest_admin@bazar.com` | `Password123!` | **Rasoi Ansh** (`rasoi-ansh`) | Store UUID |
| **Store Admin 4** | `volttech_admin@bazar.com` | `Password123!` | **Kratkon** (`kratkon`) | Store UUID |
| **Store Admin 5** | `fitpulse_admin@bazar.com` | `Password123!` | **Shree Shyam Impex** (`shree-shyam-impex`) | Store UUID |

*Note: All seeded accounts use the default development password `Password123!`.*

---

### Step 5: Start Local Development Server
```bash
npm run dev
```
Nodemon will boot the application in watch mode on `http://localhost:3000`.

---

## 3. Verification & Smoke Testing

### 1. Test Process Liveness
```bash
curl http://localhost:3000/api/v1/health/live
```
**Expected Response:**
```json
{"status":"ok","uptime":5.2}
```

### 2. Test Infrastructure Readiness
```bash
curl http://localhost:3000/api/v1/health/ready
```
**Expected Response:**
```json
{"status":"ok","checks":{"database":"up","redis":"up"}}
```

### 3. Test Authentication Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@bazar.com","password":"Password123!"}'
```

---

## 4. Common Troubleshooting Scenarios

### Issue 1: Database Connection Refused
- **Cause:** PostgreSQL container is starting or not healthy.
- **Fix:** Check `docker compose logs postgres`. Ensure port `5432` is not already occupied by a local PostgreSQL service.

### Issue 2: `ltree` extension not found
- **Cause:** `ltree` PostgreSQL extension was not created on container initialization.
- **Fix:** Run `docker compose exec postgres psql -U appuser -d app -c "CREATE EXTENSION IF NOT EXISTS ltree;"`.

### Issue 3: Redis Connection Timeout
- **Cause:** Port 6379 blocked or container restarting.
- **Fix:** Run `docker compose logs redis` and verify `redis-cli ping` returns `PONG`.
