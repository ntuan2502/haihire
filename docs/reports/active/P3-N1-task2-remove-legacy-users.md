# Phase 3 - Branch 1: Task 2 - Remove Legacy /users Endpoint (F-002)

## Executive Summary

Completely decommissioned the insecure, legacy global `/users` controller, service, and module (`backend/src/users/`). Phase 2 pre-fix audit empirically confirmed that zero consumers (frontend components, hooks, tests, or scripts) invoked `GET /users`. Legitimate tenant member management is scoped under `GET /organizations/my/members`.

## Changes Implemented

1. **Deleted Legacy Backend Files**:
   - `backend/src/users/users.controller.ts`
   - `backend/src/users/users.service.ts`
   - `backend/src/users/users.module.ts`
2. **Removed from Application Module**:
   - Removed `UsersModule` import and declaration in [`backend/src/app.module.ts`](../../../backend/src/app.module.ts).
3. **Removed Proxy Rewrite**:
   - Removed `/users/:path*` proxy rewrite in [`frontend/next.config.ts`](../../../frontend/next.config.ts).
4. **Updated CI Gate 9 Tenant Scoping Whitelist**:
   - Removed `"backend/src/users/users.service.ts"` from `NON_TENANT_SCOPED_FILES` in [`scripts/tenant-scoping.config.ts`](../../../scripts/tenant-scoping.config.ts).

## Files Touched

- Deleted: `backend/src/users/users.controller.ts`
- Deleted: `backend/src/users/users.service.ts`
- Deleted: `backend/src/users/users.module.ts`
- Modified: [`backend/src/app.module.ts`](../../../backend/src/app.module.ts)
- Modified: [`frontend/next.config.ts`](../../../frontend/next.config.ts)
- Modified: [`scripts/tenant-scoping.config.ts`](../../../scripts/tenant-scoping.config.ts)

## Test & CI Verification Evidence

- CI Gate 9: `pnpm lint:tenant-scope` passed 100% (212/212 queries safe).
- Backend Unit Tests: 546 passed.
- CI Verification: `pnpm check:all` passed 14/14 gates.

## Rollback Plan

- Restore `backend/src/users/` files from commit history.
- Re-add `UsersModule` to `app.module.ts`, `/users/:path*` to `next.config.ts`, and whitelist entry to `tenant-scoping.config.ts`.
