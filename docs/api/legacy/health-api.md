# Health & Observability API Specification

Provides health checks, readiness probes, and Prometheus metrics for orchestrators and monitoring systems.

**Base Path**: `/api/v1/health`  
**Authentication**: Not required

---

## Endpoints

### 1. Liveness Probe
Determines if the application process is running.

- **Method**: `GET`
- **Path**: `/api/v1/health/live`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "status": "healthy",
    "uptime": 124.52,
    "timestamp": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 2. Readiness Probe
Verifies that database (PostgreSQL) and cache (Redis) connections are responsive before routing live traffic to the instance.

- **Method**: `GET`
- **Path**: `/api/v1/health/ready`
- **Success Response**: `200 OK`
```json
{
  "status": "ok",
  "data": {
    "status": "healthy",
    "checks": {
      "database": {
        "status": "healthy",
        "responseTimeMs": 3
      },
      "redis": {
        "status": "healthy",
        "responseTimeMs": 1
      }
    },
    "timestamp": "2026-08-20T10:00:00.000Z"
  }
}
```

---

### 3. Prometheus Metrics
Exposes internal Prometheus metrics (HTTP requests, durations, query latencies).

- **Method**: `GET`
- **Path**: `/api/v1/health/metrics`
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Success Response**: `200 OK`

---

## Possible Errors

| HTTP Status | Code | Cause / Trigger | Response Body |
| :--- | :--- | :--- | :--- |
| `503 Service Unavailable` | `SERVICE_UNAVAILABLE` | PostgreSQL connection pool timeout or query failure during readiness check. | ```json { "status": "error", "message": "Database health check failed", "code": "SERVICE_UNAVAILABLE" } ``` |
| `503 Service Unavailable` | `SERVICE_UNAVAILABLE` | Redis ping failure or socket disconnection during readiness check. | ```json { "status": "error", "message": "Redis health check failed", "code": "SERVICE_UNAVAILABLE" } ``` |
| `500 Internal Error` | `INTERNAL_ERROR` | Unexpected unhandled exception in health check probe. | ```json { "status": "error", "message": "Internal server error", "code": "INTERNAL_ERROR" } ``` |
