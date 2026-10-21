# Phase 3 - Branch 1: Task 3 - Band-aid Owner Delete Org (F-003)

## Executive Summary

Implemented runtime band-aid to allow organization owners to delete their organization via `DELETE /organizations/my`. Previously, `DELETE /organizations/my` was restricted strictly to `[Role.OWNER]` via `@RequirePermission("org:delete")`, but tenant creators are assigned role `"ADMIN"` in the database. `RolesGuard` rejected the request with 403 Forbidden before reaching the service layer's ownership check.

## Changes Implemented

1. **`packages/shared/src/permissions.ts`**:
   - Expanded `"org:delete"` mapping from `[Role.OWNER]` to `[Role.OWNER, Role.ADMIN]`.
2. **Preserved Service Layer Defense**:
   - Confirmed that `OrganizationsCoreService.deleteMyOrg` strictly asserts `currentOrg.ownerId === userId` ([`backend/src/organizations/services/organizations-core.service.ts`](../../../backend/src/organizations/services/organizations-core.service.ts#L384)).
   - Non-owner ADMIN members are rejected with HTTP 403 `ORG_FORBIDDEN_ACTION` by the service.
3. **Unit Tests Added**:
   - [`backend/src/organizations/organizations.controller.spec.ts`](../../../backend/src/organizations/organizations.controller.spec.ts):
     - Case 1: Owner (`role=ADMIN`, `user.id === org.ownerId`) -> 200 OK.
     - Case 2: Non-owner ADMIN (`user.id !== org.ownerId`) -> 403 from service layer.
     - Case 3: MEMBER -> 403 from `RolesGuard` layer.

## Files Touched

- [`packages/shared/src/permissions.ts`](../../../packages/shared/src/permissions.ts)
- [`backend/src/organizations/organizations.controller.spec.ts`](../../../backend/src/organizations/organizations.controller.spec.ts)

## Test & CI Verification Evidence

- Organization Unit Tests: 59 passed (4 test files).
- Backend Unit Tests: 549 passed (+3 tests net increase, 0 regressions).
- CI Verification: `pnpm check:all` passed 14/14 gates.

## Rollback Plan

- Revert commit `fix(org): allow owner to delete organization (runtime band-aid)`.
- Restrict `"org:delete"` back to `[Role.OWNER]`.
- Will be formally superseded by ADR-003 dynamic ownership resolution in Sprint 2.
