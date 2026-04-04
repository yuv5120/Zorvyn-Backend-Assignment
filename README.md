# Zorvyn Finance Backend

A production-quality REST API for a finance dashboard system featuring role-based access control, financial record management, and aggregated analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| Framework | Express.js 4 |
| ORM | Prisma 5 |
| Database | SQLite (via Prisma) |
| Auth | JWT (access + refresh tokens with rotation) |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| Testing | Vitest + Supertest + @vitest/coverage-v8 |
| API Docs | Swagger UI (OpenAPI 3.0) |

---

## Project Structure

```
src/
├── app.ts                     # Express app — middleware, routes, Swagger
├── server.ts                  # Entry point — DB connect, graceful shutdown
├── config/
│   ├── env.ts                 # Environment config with validation
│   └── prisma.ts              # Singleton Prisma client
├── middleware/
│   ├── auth.middleware.ts     # JWT Bearer verification
│   ├── role.middleware.ts     # RBAC guard factory (requireRole)
│   └── error.middleware.ts    # Global error handler
├── modules/
│   ├── auth/                  # Register, login, refresh, logout, me
│   ├── users/                 # User CRUD (Admin only)
│   ├── records/               # Financial records with search + soft delete
│   └── dashboard/             # Aggregated analytics
├── utils/
│   ├── response.ts            # Unified { success, data, meta } shape
│   ├── errors.ts              # Custom AppError hierarchy
│   └── pagination.ts          # Reusable Prisma pagination helpers
├── types/
│   └── express.d.ts           # Extends req.user type
└── tests/
    ├── auth.test.ts
    ├── records.test.ts
    └── dashboard.test.ts
prisma/
├── schema.prisma              # Data models
└── seed.ts                    # Seed one user per role + 20 records
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Run database migrations
npm run db:migrate

# 4. Seed the database with test data
npm run seed

# 5. Start the development server
npm run dev
```

The server will start on **http://localhost:3000**

---

## Seeded Accounts

After running `npm run seed`, the following accounts are available:

| Role | Email | Password |
|---|---|---|
| **ADMIN** | admin@zorvyn.com | Admin@123 |
| **ANALYST** | analyst@zorvyn.com | Analyst@123 |
| **VIEWER** | viewer@zorvyn.com | Viewer@123 |

> The seed also creates **20 active financial records** across 4 months and 1 soft-deleted record to demonstrate the soft delete feature.

---

## API Documentation

**Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

**Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create a new account | None |
| POST | `/api/auth/login` | Login and receive tokens | None |
| POST | `/api/auth/refresh` | Rotate refresh token | None |
| POST | `/api/auth/logout` | Invalidate refresh token | None |
| GET | `/api/auth/me` | Get current user | Bearer |

### Users (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users (paginated) |
| GET | `/api/users/:id` | Get a single user |
| POST | `/api/users` | Create a new user |
| PATCH | `/api/users/:id` | Update name, role, or status |
| DELETE | `/api/users/:id` | Deactivate a user |

### Financial Records

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/records` | All roles | List with filters, search, pagination |
| GET | `/api/records/:id` | All roles | Get a single record |
| POST | `/api/records` | Analyst, Admin | Create a record |
| PATCH | `/api/records/:id` | Analyst (own), Admin (any) | Update a record |
| DELETE | `/api/records/:id` | Admin only | Soft-delete a record |
| GET | `/api/records/export` | Analyst, Admin | Export records to CSV |

#### Query Parameters for `GET /api/records`

| Parameter | Type | Description |
|---|---|---|
| `type` | `INCOME` \| `EXPENSE` | Filter by type |
| `category` | string | Filter by category (partial match) |
| `dateFrom` | date string | Filter records on or after this date |
| `dateTo` | date string | Filter records on or before this date |
| `search` | string | Full-text search in category and notes |
| `sortBy` | `date` \| `amount` \| `createdAt` \| `category` | Sort field (default: `date`) |
| `sortOrder` | `asc` \| `desc` | Sort direction (default: `desc`) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |

### Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | All roles | Total income, expenses, net balance |
| GET | `/api/dashboard/by-category` | All roles | Category-wise income/expense breakdown |
| GET | `/api/dashboard/trends` | Analyst, Admin | Monthly income/expense trends |
| GET | `/api/dashboard/recent` | All roles | Recent financial activity |

---

## Role Permissions Matrix

| Capability | VIEWER | ANALYST | ADMIN |
|---|:---:|:---:|:---:|
| View own profile (`/me`) | ✅ | ✅ | ✅ |
| List financial records | ✅ | ✅ | ✅ |
| View dashboard summary | ✅ | ✅ | ✅ |
| View recent activity | ✅ | ✅ | ✅ |
| View category breakdown | ✅ | ✅ | ✅ |
| Access monthly trends | ❌ | ✅ | ✅ |
| Create financial records | ❌ | ✅ | ✅ |
| Update own records | ❌ | ✅ | ✅ |
| Update any record | ❌ | ❌ | ✅ |
| Soft-delete records | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## Running Tests

```bash
npm test
```

The test suite uses a **separate `test.db`** so your development data is never affected. Prisma migrations are automatically applied to the test database before the suite runs.

**Test coverage includes:**

- Auth: register, login, token refresh/rotation, logout, inactive user guard
- Records: CRUD, RBAC enforcement per role, search, filters, pagination, soft delete
- Dashboard: analytics accuracy, soft-delete exclusion from aggregates, RBAC on trends

```bash
# Generate coverage report
npm run test:coverage
```

---

## Key Design Decisions

### Soft Delete
Financial records are never hard-deleted. The `deletedAt` timestamp is set on deletion. All queries filter with `WHERE deletedAt IS NULL`, so soft-deleted records vanish from all lists and analytics while remaining in the database for audit purposes.

### Token Rotation
Refresh tokens are rotated on every use. The old token is immediately invalidated, preventing replay attacks. Tokens are stored as SHA-256 hashes — the raw token is never persisted. **Note:** Refresh tokens are **not** JWTs. They are generated as random 64-byte hex strings.

### Role Hierarchy
Roles follow a strict hierarchy: `VIEWER (0) < ANALYST (1) < ADMIN (2)`. The `requireRole('ANALYST')` guard passes for both ANALYST and ADMIN. This is implemented in `role.middleware.ts` as a numeric level comparison.

### Analyst Record Ownership
Analysts can only update records they created themselves. Admins can update any record. This is enforced in `records.service.ts` — not in the router — keeping the business rule co-located with the data logic.

### Validation Strategy
All incoming request bodies and query strings are validated with Zod schemas before reaching the service layer. Zod errors are caught by the global error middleware and returned as structured field-level error arrays.

### Rate Limiting
- `POST /api/auth/register` — 5 requests/minute
- `POST /api/auth/login` — 10 requests/minute
- All other routes — 200 requests/minute global ceiling

---

## Assumptions

1. **Roles are flat strings** stored as plain text in SQLite (SQLite has no native ENUM). Validity is enforced at the API layer via Zod.
2. **Amount is stored as a Float**. For a real financial system, a DECIMAL type or integer (storing cents) would be preferred. This project uses Float for simplicity with SQLite.
3. **Analysts can update their own records only**. The assignment left this ambiguous; this restriction makes the RBAC model more realistic.
4. **Deactivating a user** (admin action) does not invalidate their existing JWT access tokens until they expire (15 minutes, configurable). The `authenticate` middleware re-checks user status on every request for this reason.
5. **No multi-tenancy** — all records are visible to all users with the appropriate role. A real system would scope records by organization.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | `file:./dev.db` | Prisma database URL |
| `JWT_ACCESS_SECRET` | — | **Required.** Secret for signing access tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
