# AGENTS.md — Node.js Modular Monolith Production Template

## Token Optimization & Execution Guardrails
- **Execution Strategy:** Proactively ask for confirmation BEFORE reading, modifying, or executing commands across multiple files.
- **Strict Scope Bounding:** Only parse files explicitly mentioned in the prompt. Do NOT recursively crawl directories to search for unrelated files.
- **No Redundant Scanning:** If a file has already been read in this session, use your internal memory instead of re-reading the raw file unless explicitly commanded.
- **Minimalist Output:** Keep explanations ultra-short. Provide code fixes directly without verbose pre-ambles or long concluding summaries.

## Context Budget Rules
Before reading a file:
1. Explain WHY the file is needed.
2. Read at most ONE file at a time.
3. Never read an entire directory.
4. Never glob-search the repository.
5. Never read files larger than 500 lines in full.
6. For large files, first inspect symbols/classes/functions only.

## Code Search Rules
Prefer:
- grep
- symbol search
- function lookup

Avoid:
- opening entire files
- reading generated files
- reading lockfiles
- reading migration history

## Modification Rules
Only modify files explicitly approved.
If another file appears necessary:
- stop
- explain why
- ask for confirmation

## Refactoring Rules
Do not refactor unrelated code.
Implement the minimum viable change.

## Token Budget
Target:
- < 50k context tokens per task
If estimated context exceeds budget:
- stop
- request narrower scope

## Planning
Generate exactly one implementation plan.
Do not repeatedly revise plans.
Proceed directly to implementation unless blocked.

---

# Modular Monolith Architecture Rules

**These rules are MANDATORY for every code change in this repository. Violations WILL break CI.**

## Module Structure

Every module lives under `src/modules/<module-name>/` and MUST follow this structure:

```
src/modules/<module-name>/
├── index.ts              # Barrel export — PUBLIC API of the module
├── <module>.routes.ts    # Express router (registered in server.ts)
├── <module>.controller.ts # Request handlers (thin — delegates to service)
├── <module>.service.ts   # Business logic (the only class typically exported)
├── <module>.repository.ts # Data access layer (NEVER exported from index.ts)
├── <module>.model.ts     # Sequelize model definition (NEVER exported from index.ts)
├── <module>.validator.ts # Zod schemas for request validation
└── __tests__/            # Unit and integration tests
```

## Strict Boundary Rules (Enforced by ESLint)

### Rule 1: No Cross-Module DB Imports
**ESLint rule: `modular-monolith/no-cross-module-db-import`**

Modules MUST NEVER import another module's `.model.ts` or `.repository.ts` files directly.

```typescript
// ❌ FORBIDDEN — directly accessing another module's data layer
import { UserModelDef } from '@modules/user/user.model';
import { UserRepository } from '@modules/user/user.repository';

// ✅ CORRECT — use the module's public API
import { UserService } from '@modules/user';
```

### Rule 2: Barrel Export Enforcement
**ESLint rule: `modular-monolith/enforce-barrel-exports`**

Cross-module imports MUST go through the module's `index.ts` barrel export only.

```typescript
// ❌ FORBIDDEN — bypassing barrel export
import { checkLiveness } from '@modules/health/health.service';

// ✅ CORRECT — import from barrel
import { healthRoutes } from '@modules/health';
```

### Rule 3: No Cross-Schema SQL Queries
**ESLint rule: `modular-monolith/no-cross-schema-query`**

Raw SQL queries MUST NOT reference another module's database schema.

```typescript
// ❌ FORBIDDEN — querying another module's schema
sequelize.query('SELECT * FROM user_module.users WHERE ...');

// ✅ CORRECT — call the owning module's service
const userService = new UserService();
const user = await userService.getUserById(id);
```

### Rule 4: Data Isolation via Schemas
Each module owns a dedicated PostgreSQL schema:
- `user_module` → User module
- `notification_module` → Notification module
- `public` → Shared infrastructure (SequelizeMeta, etc.)

When creating a new module:
1. Add a schema in `config/init-db.sql`
2. Grant permissions to the app user
3. Update `MODULE_SCHEMA_MAP` in `tools/eslint-plugin-modular-monolith/rules/no-cross-schema-query.js`
4. Set `schema: '<module>_module'` in all Sequelize model definitions

### Rule 5: Event-Driven Communication
Cross-module communication MUST use the notification module's event bus:

```typescript
import { notificationService, EventType } from '@modules/notification';

// Publishing events
notificationService.publish(EventType.USER_CREATED, {
  userId: user.id,
  email: user.email,
});

// Subscribing to events
notificationService.subscribe(EventType.USER_CREATED, async (event) => {
  // React to user creation in another module
});
```

### Rule 5.1: Fire-and-Forget Rules (No Floating Promises)
Do NOT use `void service.method()` or un-awaited promises to perform fire-and-forget cross-module operations. If you encounter a `@typescript-eslint/no-floating-promises` error during a cross-module interaction, do not bypass it with `void` or a dummy `.catch()`. You MUST refactor the logic to use the notification module's event bus (`notificationService.publish`).

When adding new events:
1. Add the event type to `EventType` enum in `src/modules/notification/notification.types.ts`
2. Add the payload type to `EventPayloadMap` interface
3. Use typed publish/subscribe — the compiler enforces payload correctness

## Adding a New Module Checklist

1. Create `src/modules/<name>/` with all required files
2. Create barrel export `index.ts` — expose ONLY the service and routes
3. Add database schema to `config/init-db.sql`
4. Update `MODULE_SCHEMA_MAP` in `no-cross-schema-query.js`
5. Create migration in `src/infrastructure/database/migrations/`
6. Register routes in `src/server.ts`
7. Add event types to notification module (if needed)
8. Write tests in `__tests__/` directory

## Infrastructure Patterns

### Database
- Use Sequelize models with `schema: '<module>_module'` and `underscored: true`
- All queries go through the repository layer
- Repositories are NEVER exported from module barrel
- Use `getSequelize()` for connection (lazy singleton)
- Connection pooling configured via `DB_POOL_*` env vars

### Migrations
- File naming: `YYYYMMDDHHMMSS-description.js`
- Each migration runs in a transaction (via Umzug)
- Failed migrations retry 3 times with exponential backoff
- Always implement both `up()` and `down()`
- Use `npm run migration:dry-run` before applying

### Redis
- Use `getRedis()` for connection (lazy singleton)
- Wrap commands with `trackedRedisCommand()` for metrics
- Health check via `checkRedisHealth()`

### Logging
- Use `logger` from `@infrastructure/logging/logger`
- NEVER use `console.log` in application code (ESLint enforces this)
- Structured JSON in production, colored output in development
- Request ID automatically injected via CLS

### Metrics
- Prometheus metrics exposed at `/api/v1/health/metrics`
- HTTP metrics recorded by `metricsMiddleware`
- DB query metrics recorded in repositories via `dbQueryDuration`
- Redis metrics recorded via `trackedRedisCommand`

### Testing
- Jest with `ts-jest` preset
- Path aliases configured in `jest.config.ts`
- Mock infrastructure dependencies (DB, Redis, logger)
- Mock cross-module dependencies via barrel imports
- Run: `npm test` (unit), `npm run test:coverage` (with coverage)

## CI Pipeline Requirements
- `npm run lint` — Zero warnings allowed (`--max-warnings=0`)
- `npm run type-check` — TypeScript strict mode
- `npm run format` — Prettier check
- `npm test` — All tests must pass
- All modular monolith ESLint rules are errors (not warnings)
