# Phase 3 - Branch 1: Task 1 - RBAC Guards for Document Download (F-001)

## Executive Summary

Enforced RBAC authorization on resume and candidate attachment document download endpoints in `ApplicationsController` and `CandidatesController`. Previously, `GET /applications/:id/documents/download` and `GET /candidates/:id/documents/download` only validated authentication via `AuthGuard("jwt")`, allowing unprivileged tenant roles (`Role.MEMBER`) to download sensitive candidate CVs and attachments.

## Changes Implemented

1. **`backend/src/applications/applications.controller.ts`**:
   - Added `RolesGuard` to `@UseGuards(AuthGuard("jwt"), RolesGuard)`.
   - Added `@RequirePermission("application:document_download")` to `downloadDocument`.
2. **`backend/src/candidates/candidates.controller.ts`**:
   - Added `@UseGuards(AuthGuard("jwt"), RolesGuard)` and `@RequirePermission("candidate:document_download")` to `downloadDocument`.
3. **Unit Tests Added**:
   - `backend/src/applications/applications.controller.spec.ts`: Added tests for `Role.MEMBER` (403), `Role.RECRUITER` (200/stream OK), and unauthenticated request (403).
   - `backend/src/candidates/candidates.controller.spec.ts`: Added tests for `Role.MEMBER` (403), `Role.RECRUITER` (200/stream OK), and unauthenticated request (403).

## Files Touched

- [`backend/src/applications/applications.controller.ts`](../../../backend/src/applications/applications.controller.ts)
- [`backend/src/candidates/candidates.controller.ts`](../../../backend/src/candidates/candidates.controller.ts)
- [`backend/src/applications/applications.controller.spec.ts`](../../../backend/src/applications/applications.controller.spec.ts)
- [`backend/src/candidates/candidates.controller.spec.ts`](../../../backend/src/candidates/candidates.controller.spec.ts)

## Test & CI Verification Evidence

- Unit Tests: `vitest run src/applications/applications.controller.spec.ts src/candidates/candidates.controller.spec.ts` -> 6/6 passed.
- All backend tests: 546 passed (+6 tests net increase, 0 regressions).
- CI Verification: `pnpm check:all` passed 14/14 gates.

## Rollback Plan

- Revert commit `fix(security): add RBAC guards to document download endpoints`.
- Remove `@RequirePermission` and `RolesGuard` from the two controller endpoints.
