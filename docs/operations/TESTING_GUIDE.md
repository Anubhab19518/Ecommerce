# 5 Ecommerce — Testing & Verification Guide

## 1. Testing Framework & Tooling

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Test Runner** | Jest | `29.7.0` | Test execution, assertions, coverage collection |
| **TypeScript Preset**| `ts-jest` | `29.2.5` | In-memory TypeScript compilation without emit |
| **HTTP Assertions** | `supertest` | `7.0.0` | Integration testing Express app factory (`createApp()`) |
| **Static Analysis** | Fallow | `3.10.0` | Dead code, churn, duplicate analysis, and cognitive complexity |

---

## 2. Test Suite Architecture

The repository contains **40 test suites** with **506 passing automated tests** organized across three layers:

```
src/
├── __tests__/server.test.ts                         # End-to-end HTTP pipeline tests
├── infrastructure/
│   ├── database/__tests__/                          # Connection pooling, Umzug migrations
│   ├── database/seeders/__tests__/                  # RBAC and multi-tenant seeder verification
│   ├── logging/__tests__/                           # Winston logger and CLS request ID tests
│   ├── metrics/__tests__/                           # Prometheus counter and histogram tests
│   ├── redis/__tests__/                             # Redis connection and health checks
│   └── upload/__tests__/                            # Cloudinary buffer upload and delete tests
├── modules/
│   ├── auth/__tests__/                              # Login, token rotation, cookies, bcrypt
│   ├── authorization/__tests__/                     # CASL ability, condition compiler, Redis cache
│   ├── catalog/__tests__/                           # Products, variants, options, coupons, orders
│   ├── health/__tests__/                            # Liveness, readiness, and metrics handlers
│   ├── notification/__tests__/                      # In-memory event bus pub/sub tests
│   └── user/__tests__/                              # User CRUD, email unique constraints
└── shared/
    ├── errors/__tests__/                            # Error handler, status code mapping
    └── middleware/__tests__/                        # Authentication and Multer upload middleware
```

---

## 3. Mocking & Isolation Strategies

1. **Database Isolation:** Integration tests leverage Sequelize transactions or mocked repositories. Database connection tests mock `pg` pool instances.
2. **Redis Isolation:** Redis operations are mocked using Jest spies or isolated test instances to prevent test state leakage.
3. **Cloudinary Isolation:** Tested in [`cloudinary.service.test.ts`](file:///d:/Projects/Ecommerce/src/infrastructure/upload/__tests__/cloudinary.service.test.ts) by mocking `cloudinary.v2.uploader.upload_stream` and `destroy` methods. Network calls to Cloudinary are never made during automated test runs.
4. **App Factory Pattern:** [`createApp()`](file:///d:/Projects/Ecommerce/src/server.ts) returns an un-bound Express application instance, allowing Supertest to inject requests directly in-memory without binding local network ports.

---

## 4. Execution Commands

### Run Full Suite
```bash
npm run test
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run a Single Test File
```bash
npx jest src/modules/catalog/__tests__/coupon.service.test.ts
```

### Run a Specific Test Name / Pattern
```bash
npx jest -t "evaluates first order coupon correctly"
```

### Run in Watch Mode (TDD)
```bash
npm run test:watch
```

### Run Fallow Maintainability Check
```bash
npm run test:fallow
```

---

## 5. Coverage Thresholds & Actual Metrics

Enforced thresholds in `jest.config.ts`:
- **Branches:** `60%`
- **Functions:** `60%`
- **Lines:** `60%`
- **Statements:** `60%`

### Actual Verified Coverage Outcomes:
- **Catalog Module:** `94.18%` lines, `81.42%` branches, `93.26%` functions.
- **Auth Module:** `95.12%` lines, `88.88%` branches, `100%` functions.
- **Authorization Module:** `93.75%` lines, `81.08%` branches, `95.45%` functions.
- **User Module:** `98.41%` lines, `80.95%` branches, `100%` functions.
- **Health Module:** `95.08%` lines, `82.60%` branches, `100%` functions.
- **Total Test Suites:** `40 passed, 40 total (100%)`.
- **Total Tests:** `506 passed, 506 total (100%)`.

---

## 6. Identified Test Gaps & Audit Findings

1. **Payment Webhook Tests:** Currently absent because payment gateway integrations are not yet implemented.
2. **Automatic Stock Deduction Tests:** Inventory quantity updates are tested via admin endpoints, but tests for automatic concurrent inventory decrements on order creation are not present.
3. **Cart Session Tests:** Server-side persistent cart sessions are not yet implemented, so cart tests are limited to client DTO validation in `coupon.service.test.ts`.
