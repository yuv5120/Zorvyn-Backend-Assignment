# Engineering & Design Decisions

This document outlines the key technical decisions made while building the Zorvyn Finance Backend.

## 1. Database & Column Types (SQLite + Float)
- **Decision:** Used SQLite as the primary database with Prisma ORM.
- **Tradeoff - The `amount` Field:** SQLite does not natively support an exact `DECIMAL` or `NUMERIC` type. Currently, the `amount` field is defined as a `Float`. In a real-world financial system, floating-point math can lead to precision errors (e.g. `100.0` being stored and calculated as `99.9999999`).
- **Production Solution:** If this system were moved to PostgreSQL or MySQL, the `amount` field would immediately be changed to `Decimal(10, 2)` or integer cents to ensure 100% precision. SQLite is used here for zero-setup execution.

## 2. Refresh Token Strategy
- **Decision:** Refresh tokens are **not** JWTs. They are generated as random 64-byte hex strings.
- **Security Logic:** JWTs are stateless and cannot be revoked easily without maintaining a blacklist. By using opaque random strings stored in the database, we can instantly revoke them (e.g., on logout).
- **Storage:** Refresh tokens are hashed using SHA-256 before being stored in the database (`tokenHash`). If the database leaks, the attacker cannot use the stored hashes to hijack sessions.

## 3. Role-Based Access Control (RBAC) Layering
- **Decision:** Enforcement happens at both the middleware boundary and the service layer.
- **Reasoning:** The `requireRole` middleware prevents unauthorized users from even hitting the controller. However, for context-aware rules (e.g., "Analysts can only update their *own* records"), the logic must live in the service layer where the record ownership is evaluated. This provides "defense in depth."

## 4. Soft Deletion Strategy
- **Decision:** Financial records are never truly deleted; instead, a `deletedAt` timestamp is populated.
- **Reasoning:** In financial and auditing systems, destructive operations are risky. Soft deletes preserve historical data, maintain referential integrity, and allow for potential recovery, while keeping the standard queries uncluttered (all reads add `where: { deletedAt: null }`).

## 5. Security & Rate Limiting Layers
- **Decision:** Granular rate limiting on authentication routes.
- **Implementation:** `POST /api/auth/login` and `/refresh` are tightly throttled, while open routes have a more generous global limit. This protects against credential stuffing and brute-force token replay attacks.
