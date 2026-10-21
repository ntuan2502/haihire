# Phase 3 - Branch 2: Task 3 - Backend Auth & RolesGuard Refactor (Dynamic isOwner)

## Executive Summary

Refactored the backend authentication and authorization architecture to establish `Organization.ownerId` as the dynamic runtime source of truth for organization ownership ([ADR-003](../../adr/ADR-003-dynamic-org-ownership.md)). Replaced the static `Role.OWNER` bypass in `RolesGuard` with dynamic runtime resolution (`req.user.isOwner`), resolved technical debt **F-014** by converting unauthenticated guard rejections from HTTP 403 to HTTP 401 `AppUnauthorizedException`, and reverted the temporary Branch 1 permission band-aid on `"org:delete"` while strictly restricting `"org:manage_billing"` to owners.

## Changes Implemented

1. **`backend/src/auth/jwt.strategy.ts` & `jwt.strategy.spec.ts`**:
   - In `validate()`, after retrieving the user from the database, eagerly queries their active `organization` if `user.organizationId` is populated.
   - Attaches `isOwner: Boolean(org && org.ownerId === user.id)` and `organization: org` to `request.user`.
   - Added unit test suite covering tenant owners (`isOwner: true`), regular members (`isOwner: false`), and users with no organization attached. All 9 tests pass.

2. **`backend/src/auth/roles.guard.ts`**:
   - Replaced static `user.role === Role.OWNER` bypass with dynamic ownership check:
     ```typescript
     const isOwner = Boolean(
       user.isOwner || user.organization?.ownerId === user.id,
     );
     if (isOwner) {
       return true;
     }
     ```
   - **F-014 Resolution**: Updated missing user check to fail fast with HTTP 401 `AppUnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED, "Unauthenticated user")` instead of HTTP 403 `AppForbiddenException`.

3. **`backend/src/auth/roles.guard.spec.ts` (New Test Suite)**:
   - Created dedicated unit tests verifying:
     - F-014 unauthenticated requests throw 401 `AppUnauthorizedException`.
     - Explicit `isOwner: true` unconditionally bypasses all role/permission gates.
     - Contextual `organization.ownerId === user.id` triggers owner bypass.
     - Role evaluation with `@Roles(...)`.
     - Permission evaluation with `@RequirePermission(...)`.
     - HTTP 403 `AppForbiddenException` on insufficient role/permission.

4. **`backend/src/auth/require-permission.guard.spec.ts`**:
   - Updated suite from 6-role matrix to 5-role matrix.
   - Asserted 401 `AppUnauthorizedException` for missing request user (F-014).
   - Replaced `Role.OWNER` tests with dynamic `isOwner: true` and `organization.ownerId === user.id` test cases.
   - Verified that non-owner `ADMIN` is forbidden from `org:manage_billing`.

5. **`backend/src/applications/applications.controller.spec.ts` & `candidates.controller.spec.ts`**:
   - Updated unauthenticated boundary test cases to assert HTTP 401 `AppUnauthorizedException` per F-014.

6. **`packages/shared/src/permissions.ts`**:
   - Removed `Role.OWNER` across all 32 permission definitions.
   - Reverted `"org:delete"` to `[Role.ADMIN]`.
   - Restricted `"org:manage_billing"` to `[]` (accessible exclusively via `isOwner` bypass).
   - Updated `hasPermission()` to accept optional third parameter `isOwner?: boolean`.

## Files Touched

- Modified: [`backend/src/auth/jwt.strategy.ts`](../../../backend/src/auth/jwt.strategy.ts)
- Modified: [`backend/src/auth/jwt.strategy.spec.ts`](../../../backend/src/auth/jwt.strategy.spec.ts)
- Modified: [`backend/src/auth/roles.guard.ts`](../../../backend/src/auth/roles.guard.ts)
- Created: [`backend/src/auth/roles.guard.spec.ts`](../../../backend/src/auth/roles.guard.spec.ts)
- Modified: [`backend/src/auth/require-permission.guard.spec.ts`](../../../backend/src/auth/require-permission.guard.spec.ts)
- Modified: [`backend/src/applications/applications.controller.spec.ts`](../../../backend/src/applications/applications.controller.spec.ts)
- Modified: [`backend/src/candidates/candidates.controller.spec.ts`](../../../backend/src/candidates/candidates.controller.spec.ts)
- Modified: [`packages/shared/src/permissions.ts`](../../../packages/shared/src/permissions.ts)

## Test & CI Verification Evidence

- Backend Test Suite: 560 passed across 53 test files (+8 tests in `roles.guard.spec.ts`).
- `OrganizationsController` suite: 3/3 tests passed (owner 200, non-owner ADMIN 403, MEMBER 403).
- CI Gate 14 (`pnpm test`): 987 total passed (560 backend + 427 frontend).
- Full Verification Gate (`pnpm check:all`): 14/14 checks passed.

## Rollback Plan

- Revert the Task 3 commit:
  `git revert HEAD`
- Restores static enum bypass and previous guard behavior.
