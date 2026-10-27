# Health & Observability API (`/api/v1/health`)

## Overview
The Health module provides Kubernetes-compatible liveness and readiness probe endpoints along with Prometheus-formatted application runtime metrics.

- **Base Route Prefix:** `/api/v1/health`
- **Module Directory:** `src/modules/health/`
- **Authentication:** None (Publicly exposed for container orchestrators and Prometheus scrapers)
- **Primary Files:**
  - Route: [`health.routes.ts`](file:///d:/Projects/Ecommerce/src/modules/health/health.routes.ts)
  - Controller: [`health.controller.ts`](file:///d:/Projects/Ecommerce/src/modules/health/health.controller.ts)
  - Service: [`health.service.ts`](file:///d:/Projects/Ecommerce/src/modules/health/health.service.ts)
  - Metrics Middleware: [`metrics.ts`](file:///d:/Projects/Ecommerce/src/shared/middleware/metrics.ts)

---

## Endpoint Specifications

### 1. Liveness Probe
- **Endpoint:** `GET /api/v1/health/live`
- **Purpose:** Used by Docker container healthchecks and Kubernetes kubelet to detect whether the process is alive.
- **Success Response:** `200 OK`
```json
{
  "status": "ok",
  "uptime": 1284.52,
  "timestamp": "2026-10-26T17:48:00.000Z"
}
```

---

### 2. Readiness Probe
- **Endpoint:** `GET /api/v1/health/ready`
- **Purpose:** Confirms connectivity to all critical downstream infrastructure dependencies (PostgreSQL database pool and Redis connection).
- **Behavior:**
  - Pings PostgreSQL via `SELECT 1`.
  - Pings Redis via `PING`.
  - If both are healthy, returns `200 OK`.
  - If either dependency fails, returns `503 Service Unavailable` and publishes `EventType.HEALTH_CHECK_FAILED`.

#### Success Response
- **Status Code:** `200 OK`
- **Body:**
```json
{
  "status": "ok",
  "checks": {
    "database": "up",
    "redis": "up"
  },
  "timestamp": "2026-10-26T17:48:00.000Z"
}
```

#### Degraded Response
- **Status Code:** `503 Service Unavailable`
- **Body:**
```json
{
  "status": "degraded",
  "checks": {
    "database": "down",
    "redis": "up"
  },
  "timestamp": "2026-10-26T17:48:00.000Z"
}
```

---

### 3. Prometheus Metrics Endpoint
- **Endpoint:** `GET /api/v1/health/metrics`
- **Purpose:** Exposes default Node.js process metrics (event loop lag, memory RSS, GC) and custom business metrics (HTTP request duration histogram, DB query duration, Redis command latency).
- **Content-Type:** `text/plain; version=0.0.4; charset=utf-8`
- **Example Metrics:**
  - `http_request_duration_seconds_bucket{method="GET",route="/api/v1/catalog/products",status_code="200"}`
  - `db_query_duration_seconds_bucket{operation="findAndCountAll",model="Product"}`
  - `redis_command_duration_seconds_bucket{command="get"}`
