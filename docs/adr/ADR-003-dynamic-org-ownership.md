# ADR-003: Dynamic Organization Ownership via ownerId and Deprecation of Role.OWNER

## Status

**Accepted** (Approved by Project Owner & Architecture Review — Date: 2026-10-21)

---

## Context

1. **Dual Source of Truth Architectural Defect (Finding F-003):**
   - The HaiHire multi-tenant ATS historically defined an `OWNER` value inside the static `Role` enum (`Role.OWNER`) in [`packages/shared/src/permissions.ts`](../../packages/shared/src/permissions.ts) and [`backend/src/prisma/contract.prisma`](../../backend/src/prisma/contract.prisma).
   - Simultaneously, the `Organization` data model contained an `ownerId` column (`String?`), pointing to the user who created the tenant.
   - When users register and provision a tenant via `POST /organizations`, the backend service sets `Organization.ownerId = userId`, but assigns the creator the role `"ADMIN"` in `User` and `OrganizationMember` tables.
   - This architectural mismatch created a dual-source-of-truth bug:
     - `RolesGuard` ([`backend/src/auth/roles.guard.ts`](../../backend/src/auth/roles.guard.ts)) enforced authorization strictly by inspecting `user.role === Role.OWNER`.
     - Endpoints requiring owner privileges (such as `DELETE /organizations/my`) were decorated with `@RequirePermission("org:delete")`, mapped strictly to `[Role.OWNER]`.
     - Because tenant creators were stored with role `ADMIN`, `RolesGuard` rejected valid organization creators with HTTP 403 Forbidden before the request could reach the service layer's `ownerId` verification ([`backend/src/organizations/services/organizations-core.service.ts:384`](../../backend/src/organizations/services/organizations-core.service.ts#L384)).
2. **Phase 3 Branch 1 Band-aid Limitation:**
   - In Branch 1, a temporary band-aid expanded `"org:delete"` to `[Role.OWNER, Role.ADMIN]`, relying on the service layer to check `currentOrg.ownerId !== userId`.
   - While this unblocked organization deletion, it left the static `Role.OWNER` enum in place and maintained confusing dual ownership semantics across the codebase.
3. **Multi-Tenant Context Invariance:**
   - A user's role is contextual to an organization membership, but true tenant ownership is a relational property of the `Organization` entity (`Organization.ownerId`).
   - Having a static `OWNER` role at the user level prevents clean multi-tenant workflows where a user might be an owner of Organization A but a regular member or recruiter in Organization B.

---

## Decision

The project unanimously adopts **Option A (Dynamic `ownerId`-First Architecture)**:

1. **Single Source of Truth**:
   - `Organization.ownerId` is established as the sole, non-nullable source of truth for organization ownership.
   - Ownership is dynamically evaluated at runtime: `isOwner = Boolean(user.id === currentOrg.ownerId)`.
2. **Deprecation and Removal of `Role.OWNER`**:
   - The `OWNER` value is completely deprecated and removed from the `Role` enum across the database schema, Prisma contract, `@haihire/shared` permission system, and frontend types.
   - All existing users and members holding `Role.OWNER` are remapped to `Role.ADMIN`.
3. **Runtime Ownership Resolution**:
   - NestJS authentication layer ([`backend/src/auth/jwt.strategy.ts`](../../backend/src/auth/jwt.strategy.ts)) resolves and injects `isOwner` and `organization` into `request.user`.
   - `RolesGuard` ([`backend/src/auth/roles.guard.ts`](../../backend/src/auth/roles.guard.ts)) checks `isOwner` at runtime to grant unconditional tenant super-admin bypass, eliminating static enum checks.
   - Revert the temporary band-aid: `"org:delete"` in `packages/shared/src/permissions.ts` is restricted to `[Role.ADMIN]`.
4. **Frontend Alignment**:
   - Frontend `AuthContext` and `useHasPermission` evaluate `user.isOwner` dynamically rather than checking `user.role === "OWNER"`.

---

## Consequences & Mitigations

### 1. Database & Schema Changes

- **Non-nullable `Organization.ownerId`**:
  - `Organization.ownerId` becomes non-nullable `String` with a Foreign Key constraint targeting `User(id)` with `onDelete: Restrict`.
  - Database index added on `Organization(ownerId)` for high-performance join and lookup queries.
- **Role Enum Modification**:
  - Postgres enum `Role` is altered to contain exactly 5 tenant roles: `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`.

### 2. Authorization & Guard Refactor

- `RolesGuard` bypass changes from `user.role === Role.OWNER` to `Boolean(user.isOwner || user.organization?.ownerId === user.id)`.
- Defensive unauthenticated fallback in `RolesGuard` is updated from HTTP 403 `AppForbiddenException` to HTTP 401 `AppUnauthorizedException` (resolving technical debt **F-014**).

### 3. Frontend Experience

- The UI unambiguously determines owner-only controls (e.g. "Danger Zone" organization deletion in settings) via `user.isOwner`.

---

## Database Migration Plan

The migration is executed in 3 strictly sequential, idempotent steps:

1. **Step 1 — Backfill `ownerId`**:
   - Scan all `organization` records where `ownerId IS NULL`.
   - For each organization, backfill `ownerId` with the ID of an associated user with role `OWNER`, falling back to the earliest created `ADMIN` user.
   - Fail-fast guard: If any orphaned organization has zero users, the migration aborts.
2. **Step 2 — Data Remap**:
   - `UPDATE "user" SET role = 'ADMIN' WHERE role = 'OWNER'`.
   - `UPDATE "organizationMember" SET role = 'ADMIN' WHERE role = 'OWNER'`.
3. **Step 3 — Schema Alteration**:
   - Add NOT NULL constraint and Foreign Key constraint on `organization(ownerId) REFERENCES "user"(id) ON DELETE RESTRICT`.
   - Update `Role` check constraints / Postgres enum to drop `OWNER`.
   - Update `contract.prisma` to match the target schema.

---

## Rollback Plan

If critical regressions occur during deployment:

1. Revert the Git commits associated with branch `refactor/p3-branch2-ownerid-first`.
2. Apply down-migration script:
   - Alter `Organization.ownerId` back to nullable `String?` and drop foreign key if necessary.
   - Re-add `'OWNER'` to `Role` enum in PostgreSQL and Prisma contract.
   - Restore historical user roles from pre-migration backup dump if available.
