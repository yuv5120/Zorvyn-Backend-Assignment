# Financial Application

A production-quality REST API for a finance dashboard system featuring role-based access control, financial record management, and aggregated analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.11+ |
| Framework | Django 4.2 + Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens with rotation) |
| ORM | Django ORM |
| Validation | DRF Serializers |
| Rate Limiting | django-ratelimit |
| API Docs | drf-spectacular (OpenAPI 3.0 / Swagger UI) |
| Env Config | python-decouple |

---

## Project Structure

```
finance_backend/         # Django project settings package
│   settings.py
│   urls.py
│   wsgi.py
apps/
├── auth_app/            # register, login, refresh, logout, me
│   ├── authentication.py  # Custom JWT authentication backend
│   ├── models.py          # RefreshToken (hashed storage)
│   ├── services.py        # Auth business logic
│   ├── views.py
│   └── urls.py
├── users/               # User CRUD (Admin only)
│   ├── models.py          # Custom User model with Role/Status
│   ├── permissions.py     # RBAC RequireRole permission class
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── records/             # Financial records with search + soft delete
│   ├── models.py          # FinancialRecord with deleted_at
│   ├── serializers.py
│   ├── views.py           # List, create, update, soft-delete, CSV export
│   └── urls.py
├── dashboard/           # Aggregated analytics
│   ├── services.py        # Pure analytics functions
│   ├── views.py
│   └── urls.py
└── core/                # Shared utilities
    ├── exceptions.py      # Custom exception handler + error classes
    ├── pagination.py      # Standard pagination with meta
    ├── response.py        # Unified { success, data, meta } response
    └── management/
        └── commands/
            └── seed.py    # Seed one user per role + 20 records
manage.py
requirements.txt
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- pip
- PostgreSQL (or use the `DATABASE_URL` env var pointing to any PostgreSQL instance)

### Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_ACCESS_SECRET at minimum

# 4. Run database migrations
python manage.py migrate

# 5. Seed the database with test data
python manage.py seed

# 6. Start the development server
python manage.py runserver
```

The server will start on **http://localhost:8000**

---

## Seeded Accounts

After running `python manage.py seed`, the following accounts are available:

| Role | Email | Password |
|---|---|---|
| **ADMIN** | admin@finance.com | Admin@123 |
| **ANALYST** | analyst@finance.com | Analyst@123 |
| **VIEWER** | viewer@finance.com | Viewer@123 |

> The seed also creates **20 active financial records** across 4 months and 1 soft-deleted record to demonstrate the soft delete feature.

---

## API Documentation

**Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

**OpenAPI Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

**Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

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
| GET | `/api/users/` | List all users (paginated) |
| GET | `/api/users/<id>/` | Get a single user |
| POST | `/api/users/` | Create a new user |
| PATCH | `/api/users/<id>/` | Update name, role, or status |
| DELETE | `/api/users/<id>/` | Deactivate a user |

### Financial Records

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/records/` | All roles | List with filters, search, pagination |
| GET | `/api/records/<id>/` | All roles | Get a single record |
| POST | `/api/records/` | Analyst, Admin | Create a record |
| PATCH | `/api/records/<id>/` | Analyst (own), Admin (any) | Update a record |
| DELETE | `/api/records/<id>/` | Admin only | Soft-delete a record |
| GET | `/api/records/export` | Analyst, Admin | Export records to CSV |

#### Query Parameters for `GET /api/records/`

| Parameter | Type | Description |
|---|---|---|
| `type` | `INCOME` \| `EXPENSE` | Filter by type |
| `category` | string | Filter by category (partial match) |
| `dateFrom` | date string | Filter records on or after this date |
| `dateTo` | date string | Filter records on or before this date |
| `search` | string | Full-text search in category and notes |
| `sortBy` | `date` \| `amount` \| `created_at` \| `category` | Sort field (default: `date`) |
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

## Key Design Decisions

### Soft Delete
Financial records are never hard-deleted. The `deleted_at` timestamp is set on deletion. All queries filter with `WHERE deleted_at IS NULL`, so soft-deleted records vanish from all lists and analytics while remaining in the database for audit purposes.

### Token Rotation
Refresh tokens are rotated on every use. The old token is immediately invalidated, preventing replay attacks. Tokens are stored as SHA-256 hashes — the raw token is never persisted. Refresh tokens are random 128-byte hex strings, not JWTs.

### Role Hierarchy
Roles follow a strict hierarchy: `VIEWER (0) < ANALYST (1) < ADMIN (2)`. The `RequireRole.for_role('ANALYST')` permission passes for both ANALYST and ADMIN. Implemented in `apps/users/permissions.py` as a numeric level comparison.

### Analyst Record Ownership
Analysts can only update records they created themselves. Admins can update any record. Enforced in the view layer within the PATCH handler, mirroring the original service-layer rule.

### Validation Strategy
All incoming request bodies are validated with DRF serializers before reaching business logic. Validation errors are caught by the global exception handler and returned as structured field-level error arrays in the `{ success, error }` shape.

### Live User Status Check
The custom JWT authentication backend re-fetches the user from the database on every authenticated request. This ensures that role changes or account deactivations take effect immediately without waiting for the access token to expire.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `django-insecure-...` | **Required in production.** Django secret key |
| `DEBUG` | `True` | Set to `False` in production |
| `DATABASE_URL` | SQLite fallback | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | `SECRET_KEY` | Secret for signing access tokens |
| `JWT_ACCESS_EXPIRES_MINUTES` | `15` | Access token lifetime in minutes |
| `JWT_REFRESH_EXPIRES_DAYS` | `7` | Refresh token lifetime in days |
| `ALLOWED_HOSTS` | `*` | Comma-separated allowed host list |
| `CORS_ALLOW_ALL_ORIGINS` | `True` | Set to `False` and configure in production |

---

## Deployment (Render)

Add these environment variables in your Render service dashboard:

```
SECRET_KEY=<generate a 50+ character random string>
DEBUG=False
DATABASE_URL=<your PostgreSQL connection string>
JWT_ACCESS_SECRET=<your secret>
ALLOWED_HOSTS=<your-app>.onrender.com
CORS_ALLOW_ALL_ORIGINS=False
```

**Start command:**
```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py runserver 0.0.0.0:$PORT
```

For production, prefer gunicorn:
```bash
pip install gunicorn && gunicorn finance_backend.wsgi:application --bind 0.0.0.0:$PORT
```
