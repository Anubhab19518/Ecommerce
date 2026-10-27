# 5 Ecommerce — Error Handling & Observability

## 1. Error Architecture & Hierarchy

All application errors inherit from the base `AppError` class located in [`src/shared/errors/app-error.ts`](file:///d:/Projects/Ecommerce/src/shared/errors/app-error.ts).

```mermaid
graph TD
    Error[JavaScript Error]
    AppError[AppError (isOperational = true)]
    
    ValidationError[ValidationError (400)]
    UnauthorizedError[UnauthorizedError (401)]
    ForbiddenError[ForbiddenError (403)]
    NotFoundError[NotFoundError (404)]
    ConflictError[ConflictError (409)]
    InternalError[Internal Server Error (500)]

    Error --> AppError
    AppError --> ValidationError
    AppError --> UnauthorizedError
    AppError --> ForbiddenError
    AppError --> NotFoundError
    AppError --> ConflictError
    Error --> InternalError
```

---

## 2. Standardized Error Response Formats

### Operational Errors (`AppError`)
Operational errors represent expected failure modes (validation failure, duplicate unique keys, missing records).

```json
{
  "status": "error",
  "message": "Product with slug 'nike-air' already exists"
}
```

### Validation Failure (`ZodError` -> `ValidationError`)
Returned when request parameters or payload fail schema validation constraints.

- **Status Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Validation error",
  "details": [
    {
      "field": "price",
      "message": "Price cannot be negative"
    },
    {
      "field": "offerPrice",
      "message": "Offer price cannot be greater than regular price"
    }
  ]
}
```

### Unhandled System Errors
Unexpected exceptions (network failure, database connection drop) are captured by the global error handler, logged with full stack traces, and returned to the client as sanitized 500 errors:

- **Status Code:** `500 Internal Server Error`
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## 3. Distributed Request Tracing with CLS

Every incoming request passes through [`requestIdMiddleware`](file:///d:/Projects/Ecommerce/src/shared/middleware/request-id.ts):
1. Reads incoming `X-Request-Id` header or generates a fresh UUIDv4.
2. Injects the request ID into a Continuation-Local Storage (CLS) namespace.
3. Sets the `X-Request-Id` header on the outgoing response.
4. Winston logger automatically extracts the active request ID from CLS, appending it to all log messages:
```
2026-10-26 17:10:00.123 [3e58f683-e0f9-420a-8022-888f79ff88da] info: GET /api/v1/catalog/products 200
```

---

## 4. Structured Logging with Winston
- **Console Transport:** Human-readable colorized output in development.
- **Production Mode:** Structured JSON output formatted for automated log aggregation (Grafana Alloy & Loki).
- **Prohibited Code:** Calling raw `console.log` is strictly forbidden and rejected by ESLint (`no-console`).
