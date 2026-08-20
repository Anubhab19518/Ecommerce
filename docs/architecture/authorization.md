# Authorization Module — Architecture Document

> **Module Path:** `src/modules/authorization/`
> **Database Schema:** `authorization_module`
> **Primary Dependency:** `@casl/ability` (isolated to a single file)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Data Flow](#3-data-flow)
4. [Database Schema](#4-database-schema)
5. [CASL Isolation Strategy](#5-casl-isolation-strategy)
6. [Role Hierarchy](#6-role-hierarchy)
7. [ABAC Condition System](#7-abac-condition-system)
8. [Caching Strategy](#8-caching-strategy)
9. [Integration Guide](#9-integration-guide)
10. [Admin REST API](#10-admin-rest-api)
11. [Security Considerations](#11-security-considerations)
12. [Performance Characteristics](#12-performance-characteristics)
13. [Configuration](#13-configuration)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Overview

The authorization module provides a **hybrid RBAC + ABAC** (Role-Based + Attribute-Based Access Control) system built on top of [CASL](https://casl.js.org/). It is designed as a **template-grade, production-ready** authorization layer that can be adopted in any Node.js project built on this modular monolith architecture.

### Key Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Database-Driven** | All roles, permissions, and conditions are stored in PostgreSQL — zero hard-coded authorization logic |
| **CASL Isolation** | CASL is imported in exactly one file (`authorization.ability-factory.ts`). Every other layer uses plain TypeScript interfaces |
| **Cache-First** | Redis-backed permission context cache with configurable TTL and multi-level invalidation |
| **Modular Monolith Compliant** | Follows all boundary rules — barrel exports, no cross-module DB imports, event-driven communication |
| **Scalable** | Role hierarchy, field-level permissions, condition templates, and temporal role assignments |

---

## 2. Architecture Layers

The module follows a strict layered architecture where each layer has a single responsibility and well-defined dependencies:

```
┌──────────────────────────────────────────────────────┐
│                  Consuming Modules                    │
│         (import from @modules/authorization)          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │          Authorization Service                 │  │
│  │       (Public API — authorization.service.ts)  │  │
│  │                                                │  │
│  │  • can() / canOrFail()                        │  │
│  │  • Role & Permission CRUD                     │  │
│  │  • User ↔ Role assignment                     │  │
│  │  • Cache management                           │  │
│  └─────────────────┬──────────────────────────────┘  │
│                    │                                  │
│  ┌─────────────────▼──────────────────────────────┐  │
│  │           Ability Factory                      │  │
│  │  (CASL Isolation — authorization.ability-      │  │
│  │   factory.ts)                                  │  │
│  │                                                │  │
│  │  • buildAbility() — creates CASL abilities     │  │
│  │  • checkAbility() — runs CASL checks           │  │
│  │  █ ONLY file that imports @casl/ability █      │  │
│  └─────────────────┬──────────────────────────────┘  │
│                    │                                  │
│  ┌─────────────────▼──────────────────────────────┐  │
│  │         Permission Repository                  │  │
│  │     (Data Access — authorization.repository.ts)│  │
│  │                                                │  │
│  │  • Role, Permission, Assignment CRUD           │  │
│  │  • Role hierarchy resolution                   │  │
│  │  • Sequelize queries with metrics              │  │
│  └─────────────────┬──────────────────────────────┘  │
│                    │                                  │
│  ┌─────────────────▼──────────┐  ┌────────────────┐  │
│  │    Condition Compiler      │  │ Permission     │  │
│  │  (authorization.condition- │  │ Cache          │  │
│  │   compiler.ts)             │  │ (authorization │  │
│  │                            │  │  .cache.ts)    │  │
│  │  • Template interpolation  │  │                │  │
│  │  • Operator validation     │  │ • Redis-backed │  │
│  │  • Safe variable resolution│  │ • TTL-based    │  │
│  └────────────────────────────┘  │ • Multi-level  │  │
│                                  │   invalidation │  │
│                                  └────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | File | Responsibility | Exports? |
|-------|------|---------------|----------|
| **Service** | `authorization.service.ts` | Public API. Orchestrates cache, repository, and ability factory | ✅ Via barrel |
| **Ability Factory** | `authorization.ability-factory.ts` | CASL isolation. Builds and checks abilities | ❌ Internal |
| **Repository** | `authorization.repository.ts` | Database queries with Sequelize. Hierarchy resolution | ❌ Internal |
| **Condition Compiler** | `authorization.condition-compiler.ts` | JSON template interpolation for ABAC conditions | ❌ Internal |
| **Cache** | `authorization.cache.ts` | Redis-backed UserPermissionContext cache | ❌ Internal |
| **Middleware** | `authorization.middleware.ts` | Express middleware factory for route-level checks | ✅ Via barrel |
| **Types** | `authorization.types.ts` | All shared interfaces and enums | ✅ Via barrel |

---

## 3. Data Flow

### Permission Check Flow (`can()` / `canOrFail()`)

```
Request arrives
      │
      ▼
┌─────────────┐    ┌──────────┐
│   Service   │───▶│  Cache   │──── Hit? ──▶ UserPermissionContext
│   can()     │    │  (Redis) │
└──────┬──────┘    └──────────┘
       │                │
       │            Miss │
       │                ▼
       │         ┌──────────────┐
       │         │  Repository  │──▶ DB Query (roles + permissions
       │         │              │     + hierarchy resolution)
       │         └──────┬───────┘
       │                │
       │                ▼
       │         ┌──────────────┐
       │         │    Cache     │──▶ Store context with TTL
       │         │   (write)    │
       │         └──────┬───────┘
       │                │
       ▼                ▼
┌──────────────────────────────┐
│       Ability Factory        │
│                              │
│  1. Compile conditions       │◀── Condition Compiler
│  2. Convert to CASL rules    │
│  3. Create MongoAbility      │
│  4. Run can()/cannot() check │
│  5. Return AuthorizationResult│
└──────────────────────────────┘
       │
       ▼
  AuthorizationResult { allowed, reason, matchedRule }
```

### Cache Invalidation Flow

```
Role/Permission change
        │
        ▼
┌───────────────┐     ┌──────────┐
│   Service     │────▶│  Cache   │──▶ Invalidate affected users
│   (update)    │     │          │
└───────┬───────┘     └──────────┘
        │
        ▼
┌───────────────┐
│ Notification  │──▶ Publish event (ROLE_ASSIGNED,
│   Module      │    ROLE_REVOKED, PERMISSIONS_UPDATED)
└───────────────┘
```

---

## 4. Database Schema

All tables reside in the `authorization_module` PostgreSQL schema.

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────────┐
│    roles     │         │   permissions    │
├──────────────┤         ├──────────────────┤
│ id (PK)      │    ┌───▶│ id (PK)          │
│ name (UQ)    │    │    │ action           │
│ description  │    │    │ subject          │
│ parent_role_id│───┐    │ fields (JSONB)   │
│ is_active    │   │    │ conditions_json  │
│ metadata     │   │    │  (JSONB)         │
│ created_at   │   │    │ inverted         │
│ updated_at   │   │    │ reason           │
└──────┬───────┘   │    │ is_active        │
       │           │    │ created_at       │
       │ Self-ref  │    │ updated_at       │
       └───────────┘    └────────┬─────────┘
       │                         │
       │   ┌─────────────────┐   │
       └──▶│ role_permissions │◀──┘
            ├─────────────────┤
            │ id (PK)         │
            │ role_id (FK)    │
            │ permission_id   │
            │  (FK)           │
            │ created_at      │
            └─────────────────┘

┌──────────────┐
│  user_roles  │
├──────────────┤    ┌──────────────────────┐
│ id (PK)      │    │ permission_conditions │
│ user_id      │    ├──────────────────────┤
│ role_id (FK) │    │ id (PK)              │
│ scope        │    │ name (UQ)            │
│ assigned_at  │    │ description          │
│ expires_at   │    │ template (JSONB)     │
└──────────────┘    │ is_active            │
                    │ created_at           │
                    │ updated_at           │
                    └──────────────────────┘
```

### Table Details

#### `roles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | VARCHAR(100), UNIQUE | Machine-readable role identifier (e.g., `admin`, `editor`) |
| `description` | VARCHAR(500) | Human-readable description |
| `parent_role_id` | UUID (FK → roles.id), NULLABLE | Role hierarchy parent. Permissions are inherited upward. |
| `is_active` | BOOLEAN | Soft-delete flag |
| `metadata` | JSONB, NULLABLE | Arbitrary key-value data for application-specific role metadata |
| `created_at` / `updated_at` | TIMESTAMP | Audit timestamps |

#### `permissions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `action` | VARCHAR(50) | Action identifier: `create`, `read`, `update`, `delete`, `list`, `export`, `import`, `manage` |
| `subject` | VARCHAR(100) | Resource type: `User`, `Article`, `Order`, or `all` (wildcard) |
| `fields` | JSONB, NULLABLE | Array of permitted field names for field-level ABAC (e.g., `["name", "email"]`) |
| `conditions_json` | JSONB, NULLABLE | ABAC condition template with interpolation placeholders |
| `inverted` | BOOLEAN | If `true`, this is a deny/forbid rule |
| `reason` | VARCHAR(500), NULLABLE | Human-readable reason shown when this rule denies access |
| `is_active` | BOOLEAN | Soft-delete flag |

#### `role_permissions` (M2M Join)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `role_id` | UUID (FK → roles.id) | CASCADE on delete |
| `permission_id` | UUID (FK → permissions.id) | CASCADE on delete |
| **Unique constraint** | `(role_id, permission_id)` | Prevents duplicate assignments |

#### `user_roles` (M2M Join)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID | References user from user module (no FK — cross-module boundary) |
| `role_id` | UUID (FK → roles.id) | CASCADE on delete |
| `scope` | VARCHAR(255), NULLABLE | Optional scope/tenant qualifier (e.g., `org:acme`, `project:123`) |
| `assigned_at` | TIMESTAMP | When the role was assigned |
| `expires_at` | TIMESTAMP, NULLABLE | Temporal role assignment — auto-expires after this time |
| **Unique constraint** | `(user_id, role_id)` | One assignment per user-role pair |

#### `permission_conditions` (Named Templates)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | VARCHAR(100), UNIQUE | Template identifier (e.g., `own-resource`, `same-department`) |
| `description` | VARCHAR(500) | What this condition checks |
| `template` | JSONB | The condition template with `${...}` placeholders |
| `is_active` | BOOLEAN | Soft-delete flag |

---

## 5. CASL Isolation Strategy

CASL is treated as an **internal implementation detail** of the authorization module. It is never exposed to consuming modules.

### Isolation Boundary

```
External (plain TypeScript)          │  Internal (CASL)
                                     │
AuthorizationService                 │
  ├── AuthorizationRequest           │
  ├── AuthorizationResult            │
  ├── PermissionDefinition           │
  └── RoleDefinition                 │
                                     │
         ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                                     │
                                     │  AbilityFactory
                                     │    ├── @casl/ability
                                     │    ├── MongoAbility
                                     │    ├── RawRuleOf
                                     │    └── createMongoAbility
```

### Why This Matters

1. **Swappable** — CASL could be replaced (e.g., with Open Policy Agent, Casbin, or a custom engine) by changing a single file
2. **Testable** — The ability factory can be mocked in service tests without any CASL knowledge
3. **Clean API** — Consuming modules never see CASL types, only `AuthorizationResult`

---

## 6. Role Hierarchy

Roles support hierarchical inheritance through the `parent_role_id` self-referencing foreign key.

### How It Works

```
                 admin
                   │
            ┌──────┴──────┐
            │             │
          editor       moderator
            │
         viewer
```

When resolving permissions for a user with the `editor` role:
1. Start with `editor`'s own permissions
2. Walk up to `admin` (parent) and include its permissions
3. Stop at the root (no more parents) or at max depth (10 levels)

### Cycle Prevention

- The `MAX_HIERARCHY_DEPTH` constant (10) prevents infinite loops
- A visited-set tracks already-processed role IDs
- The service layer prevents setting `parentRoleId` to the role's own ID

### Resolution Algorithm

```typescript
// Simplified pseudocode
async resolveRole(role, depth, visited):
  if depth > MAX_DEPTH or role.id in visited: return
  visited.add(role.id)
  
  collectPermissions(role)
  
  if role.parentRoleId:
    parent = await findRoleById(role.parentRoleId)
    await resolveRole(parent, depth + 1, visited)
```

---

## 7. ABAC Condition System

The Attribute-Based Access Control layer enables fine-grained permissions based on resource and user attributes.

### Condition Templates

Conditions are stored as JSONB in the database with `${...}` template placeholders:

```json
{
  "createdBy": "${user.id}",
  "status": { "$in": ["draft", "review"] },
  "department": "${user.department}"
}
```

### Template Variable Resolution

| Variable Path | Source | Example |
|--------------|--------|---------|
| `${user.id}` | Runtime context | `"abc-123"` |
| `${user.email}` | Runtime context | `"alice@example.com"` |
| `${user.profile.department}` | Deep path resolution | `"engineering"` |
| `${now}` | Built-in | `"2024-01-15T10:30:00Z"` |
| `${env.AUTHZ_*}` | Environment variable (restricted to `AUTHZ_` prefix) | `"custom-value"` |

### Supported Operators

The condition compiler supports all CASL-compatible MongoDB-style operators:

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equals | `{ "status": { "$eq": "active" } }` |
| `$ne` | Not equals | `{ "type": { "$ne": "archived" } }` |
| `$in` | In array | `{ "role": { "$in": ["admin", "editor"] } }` |
| `$nin` | Not in array | `{ "status": { "$nin": ["deleted"] } }` |
| `$gt` / `$gte` | Greater than | `{ "priority": { "$gte": 3 } }` |
| `$lt` / `$lte` | Less than | `{ "score": { "$lt": 100 } }` |
| `$exists` | Field exists | `{ "deletedAt": { "$exists": false } }` |
| `$regex` | Regular expression | `{ "name": { "$regex": "^admin" } }` |
| `$and` / `$or` | Logical operators | `{ "$or": [{ "a": 1 }, { "b": 2 }] }` |

### Type Preservation

When a template expression is the entire value (e.g., `"${user.id}"`), the **raw type** is preserved:

```typescript
// Template: { count: "${data.count}" }
// Context:  { data: { count: 42 } }
// Result:   { count: 42 }  ← number, not string "42"
```

### Security

- Unknown operators are **skipped** (with a warning log)
- Environment variable access is restricted to `AUTHZ_` prefix
- Maximum nesting depth of 10 prevents stack overflow
- Template variable paths are validated against `^[a-zA-Z_][a-zA-Z0-9_.]*$`

---

## 8. Caching Strategy

### Architecture

```
┌──────────────────────────────────────────────┐
│                   Redis                       │
│                                              │
│  authz:user:<userId>:ctx  ──▶ JSON blob      │
│    (TTL = AUTHZ_CACHE_TTL_SECONDS)           │
│                                              │
│  authz:role:<roleId>:users ──▶ SET of userIds│
│    (TTL = 2x context TTL, for invalidation)  │
└──────────────────────────────────────────────┘
```

### Cache Key Patterns

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `authz:user:<userId>:ctx` | String (JSON) | `AUTHZ_CACHE_TTL_SECONDS` | Full UserPermissionContext for a user |
| `authz:role:<roleId>:users` | Set | 2× context TTL | Tracks which users have a given role (for bulk invalidation) |

### Invalidation Triggers

| Event | Invalidation Scope | Method |
|-------|-------------------|--------|
| Role permissions changed | All users with that role | `invalidateRole(roleId)` |
| Role assigned to user | That specific user | `invalidateUser(userId)` |
| Role revoked from user | That specific user | `invalidateUser(userId)` |
| Permission updated | All users (broad) | `invalidateAll()` |
| Admin manual flush | All users | `invalidateAll()` |

### Error Resilience

Cache operations are **non-fatal**:
- On read failure → treats as cache miss (queries DB)
- On write failure → logs warning, next request will re-query
- On invalidation failure → logs warning

---

## 9. Integration Guide

### Route-Level Authorization

Use the `authorize()` middleware factory in any module's routes:

```typescript
import { authorize, Action } from '@modules/authorization';

// Simple RBAC check
router.get('/articles',
  authorize({ action: Action.LIST, subject: 'Article' }),
  listArticles,
);

// ABAC check with dynamic context (ownership)
router.patch('/articles/:id',
  authorize({
    action: Action.UPDATE,
    subject: 'Article',
    contextResolver: (req) => ({
      user: { id: req.user?.id },
      resource: { id: req.params.id },
    }),
  }),
  updateArticle,
);
```

### Programmatic Authorization Check

Call the service directly for complex authorization logic:

```typescript
import { AuthorizationService, Action } from '@modules/authorization';

const authz = new AuthorizationService();

// Check and get result
const result = await authz.can({
  userId: 'user-123',
  action: Action.DELETE,
  subject: 'Article',
  context: { resource: articleData },
});

if (!result.allowed) {
  logger.warn('Access denied', { reason: result.reason });
}

// Or throw on denial
await authz.canOrFail({
  userId: 'user-123',
  action: Action.DELETE,
  subject: 'Article',
});
```

### Managing Roles at Runtime

```typescript
const authz = new AuthorizationService();

// Create roles
const adminRole = await authz.createRole({
  name: 'admin',
  description: 'Full system access',
});

const editorRole = await authz.createRole({
  name: 'editor',
  description: 'Can edit content',
  parentRoleId: adminRole.id, // Inherits from admin
});

// Create permissions
const readArticle = await authz.createPermission({
  action: Action.READ,
  subject: 'Article',
});

const manageArticle = await authz.createPermission({
  action: Action.MANAGE,
  subject: 'Article',
});

// Attach permissions to roles
await authz.attachPermissionToRole(editorRole.id, readArticle.id);
await authz.attachPermissionToRole(adminRole.id, manageArticle.id);

// Assign roles to users
await authz.assignRoleToUser('user-123', editorRole.id);

// Temporal role assignment (expires in 30 days)
await authz.assignRoleToUser('contractor-456', editorRole.id, undefined,
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
);
```

### Prerequisites

The `authorize()` middleware expects `req.user.id` to be set by upstream authentication middleware. The authorization module does **not** handle authentication.

```typescript
// Your auth middleware (not part of this module)
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await verifyToken(token);
  req.user = { id: user.id, email: user.email };
  next();
});

// Then authorization middleware works
app.use('/api/v1/articles', authorize({ action: Action.LIST, subject: 'Article' }), ...);
```

---

## 10. Admin REST API

All routes are mounted at `/api/v1/authorization`.

### Roles

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/roles` | List all roles (query: `?includeInactive=true`) |
| `POST` | `/roles` | Create a new role |
| `GET` | `/roles/:id` | Get role by ID (includes permissions) |
| `PATCH` | `/roles/:id` | Update a role |
| `DELETE` | `/roles/:id` | Soft-delete a role |

### Role ↔ Permission

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/roles/:id/permissions` | Attach a permission to a role |
| `DELETE` | `/roles/:id/permissions/:permissionId` | Detach a permission |

### Permissions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/permissions` | List all permissions |
| `POST` | `/permissions` | Create a new permission |
| `PATCH` | `/permissions/:id` | Update a permission |
| `DELETE` | `/permissions/:id` | Soft-delete a permission |

### User ↔ Role

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users/:userId/roles` | Assign a role to a user |
| `DELETE` | `/users/:userId/roles/:roleId` | Revoke a role |
| `GET` | `/users/:userId/permissions` | Get effective permissions for a user |

### Diagnostic & Cache

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/check` | Check a permission (diagnostic/testing) |
| `POST` | `/cache/invalidate` | Flush all authorization caches |

---

## 11. Security Considerations

### What This Module Does

- ✅ **Authorization** — determines if a user CAN perform an action
- ✅ **ABAC conditions** — enforces attribute-based rules at check time
- ✅ **Audit logging** — logs role assignments, revocations, and permission changes
- ✅ **Input validation** — Zod schemas validate all admin API inputs
- ✅ **Injection prevention** — condition compiler validates template syntax and restricts env access

### What This Module Does NOT Do

- ❌ **Authentication** — verifying user identity (use JWT, OAuth, etc. upstream)
- ❌ **Session management** — tracking login sessions
- ❌ **Password hashing** — credential storage

### Admin API Protection

The authorization admin routes (`/api/v1/authorization/*`) should be protected with authentication middleware and ideally with authorization checks themselves (bootstrapping problem — seed initial admin role via migration or startup script).

### Condition Template Safety

- Template variables are restricted to `^[a-zA-Z_][a-zA-Z0-9_.]*$`
- Environment variable access is limited to `AUTHZ_` prefix
- Unknown operators are silently skipped (logged as warnings)
- Maximum nesting depth of 10 prevents stack overflow attacks

---

## 12. Performance Characteristics

### Typical Permission Check Latency

| Scenario | Expected Latency |
|----------|-----------------|
| Cache hit (Redis) | < 5ms |
| Cache miss (DB + Redis write) | 20–50ms |
| Cache miss, complex hierarchy (3+ levels) | 50–100ms |

### Optimization Strategies

1. **Cache-first architecture** — most checks hit Redis, not the database
2. **Eager hierarchy resolution** — the entire permission tree is resolved and cached once per user
3. **Targeted invalidation** — role-level invalidation only affects users with that specific role
4. **SCAN-based flush** — full cache invalidation uses Redis SCAN (non-blocking) instead of KEYS
5. **Prometheus metrics** — all DB queries and Redis commands are instrumented for monitoring

### Scaling Considerations

- **Horizontal scaling** — Redis is shared across app instances, so cache invalidation works across a cluster
- **Cache thundering herd** — if many users have their cache invalidated simultaneously, consider adding jitter to TTLs
- **Large role hierarchies** — the `MAX_HIERARCHY_DEPTH` guard (10) prevents runaway resolution

---

## 13. Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `AUTHZ_CACHE_TTL_SECONDS` | `300` (5 min) | Redis cache TTL for user permission contexts |

---

## 14. Testing Strategy

### Unit Tests

Located in `src/modules/authorization/__tests__/`:

| Test File | What It Tests |
|-----------|--------------|
| `authorization.condition-compiler.test.ts` | Template interpolation, type preservation, operator validation, env access |
| `authorization.ability-factory.test.ts` | CASL rule construction, allow/deny, manage wildcard, field-level, inverted rules |
| `authorization.cache.test.ts` | Redis cache hit/miss, TTL, invalidation strategies, error resilience |
| `authorization.service.test.ts` | Service orchestration, cache-first flow, role management, event publishing |

### Test Isolation

All tests mock infrastructure dependencies:
- `@infrastructure/logging/logger` — mocked logger
- `@infrastructure/redis` — mocked Redis client
- `@infrastructure/metrics/metrics` — mocked Prometheus metrics
- `@modules/notification` — mocked notification service

The ability factory tests mock the condition compiler to test CASL integration in isolation.

### Running Tests

```bash
# All authorization tests
npm test -- --testPathPattern=authorization

# With coverage
npm run test:coverage -- --testPathPattern=authorization

# Specific test file
npm test -- --testPathPattern=condition-compiler
```

---

## Module File Map

```
src/modules/authorization/
├── index.ts                          # Barrel export (public API)
├── authorization.types.ts            # Type definitions (Action, Subject, etc.)
├── authorization.service.ts          # Service layer (public API class)
├── authorization.ability-factory.ts  # CASL isolation (ONLY CASL import)
├── authorization.repository.ts       # Data access layer (DB queries)
├── authorization.model.ts            # Sequelize model definitions (5 tables)
├── authorization.condition-compiler.ts # ABAC condition template interpolation
├── authorization.cache.ts            # Redis-backed permission cache
├── authorization.validator.ts        # Zod validation schemas
├── authorization.controller.ts       # Admin REST endpoint handlers
├── authorization.routes.ts           # Express router definition
├── authorization.middleware.ts       # authorize() middleware factory
└── __tests__/
    ├── authorization.condition-compiler.test.ts
    ├── authorization.ability-factory.test.ts
    ├── authorization.cache.test.ts
    └── authorization.service.test.ts
```
