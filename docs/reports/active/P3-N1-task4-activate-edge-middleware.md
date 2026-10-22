# Phase 3 - Branch 1: Task 4 - Activate Edge Middleware (F-004)

> **Severity**: P1 (Security / Edge Route Protection — Aligned with Phase 1 Audit Finding F-004)

## Executive Summary

Activated Next.js server-side Edge Middleware by renaming `frontend/src/proxy.ts` to `frontend/src/middleware.ts` and exporting `export function middleware(request: NextRequest)`. Previously, unauthenticated requests to `/dashboard/*` reached the client before client-side hooks redirected to `/auth/login`, causing a brief visual flash and executing client JS unnecessarily. With edge middleware enabled, Next.js performs an immediate server-side HTTP 307 redirect before rendering any page HTML. (Note: Restored to `proxy.ts` for Next.js 16 compliance).

## Changes Implemented

1. **File Renamed**:
   - `frontend/src/proxy.ts` → `frontend/src/middleware.ts` (restored to [`frontend/src/proxy.ts`](../../../frontend/src/proxy.ts) for Next.js 16) via `git mv`.
2. **Function Renamed**:
   - Renamed `export function proxy(request: NextRequest)` to `export function middleware(request: NextRequest)`.
3. **Matcher Configuration Verified**:
   - Matches `/auth/:path*` and `/dashboard/:path*`.
4. **Unit & Integration Tests Added**:
   - [`frontend/src/proxy.spec.ts`](../../../frontend/src/proxy.spec.ts):
     - Case 1: Unauthenticated request to `/dashboard` returns server-side HTTP 307 redirect to `/auth/login?redirect=%2Fdashboard`.
     - Case 2: Authenticated user with organization accesses `/dashboard` directly (HTTP 200 `NextResponse.next()`).
     - Case 3: Authenticated user accessing `/auth/login` is redirected to `/dashboard` (HTTP 307).
     - Case 4: Authenticated user without organization accessing `/dashboard` is redirected to `/auth/onboarding` (HTTP 307).

## Files Touched

- Renamed: `frontend/src/proxy.ts` → `frontend/src/middleware.ts` (restored to [`frontend/src/proxy.ts`](../../../frontend/src/proxy.ts))
- Created: [`frontend/src/proxy.spec.ts`](../../../frontend/src/proxy.spec.ts)

## Test & CI Verification Evidence

- Middleware Unit Tests: 4 passed (`vitest run src/proxy.spec.ts`).
- Frontend Build: `pnpm --filter ./frontend run build` completed successfully with standalone output.
- CI Verification: `pnpm check:all` passed 14/14 gates.

## Rollback Plan

- Revert commit `fix(frontend): rename proxy.ts to middleware.ts to activate edge middleware`.
- `git mv frontend/src/middleware.ts frontend/src/proxy.ts`.
