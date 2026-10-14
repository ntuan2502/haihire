# Milestone Report #34: Task #14A — Frontend Error Boundaries & Resiliency

**Date:** 2026-10-12  
**Status:** Completed  
**Branch:** `fix/task-14a-error-boundaries`  
**Commits:**
- `6a45c96`: `feat(frontend): add error boundaries and fallback component`
- `6b78623`: `test(frontend): add error fallback tests`

---

## 1. Executive Summary

During the **Task #14 Phase 1 Comprehensive Gap Analysis**, a critical P1 resilience vulnerability was identified in the frontend application:
- **Zero Next.js Error Boundaries:** The frontend lacked App Router error boundaries (`error.tsx`, `global-error.tsx`).
- **Zero React Error Boundaries:** Uncaught runtime exceptions inside client components risked unrecoverable blank white-screen failures for recruiters and candidates.
- **Inconsistent 404 Experience:** Missing brand-aligned `not-found.tsx` handler.

**Task #14A** resolved this resilience gap across the entire Next.js App Router hierarchy by implementing a shared, token-compliant `ErrorFallback` component with 3 layout variants, standalone locale fallback logic, 5 route-level boundary files, complete symmetric `en`/`vi` internationalization, and comprehensive unit/integration test coverage.

All 11 CI Architecture verification gates passed cleanly (`11/11 PASSED`).

---

## 2. Architecture & Implementation

### 2.1 Reusable `ErrorFallback` Component

Located at [`frontend/src/components/shared/error-fallback.tsx`](../../frontend/src/components/shared/error-fallback.tsx):

- **3 Visual Variants:**
  - `default`: Centered card container (`max-w-md`) with alert badge, retry CTA, and home navigation.
  - `compact`: Inline embedded layout for scoped route segments (e.g., within dashboard panels and data tables).
  - `fullscreen`: Min-height `100vh` viewport coverage for root layouts and fatal crashes.
- **Design Tokens:** Strict adherence to HaiHire design tokens (`bg-slate-50 dark:bg-slate-950`, `bg-white dark:bg-slate-900`, `border-slate-200/90 dark:border-slate-800`, `shadow-2xs`).
- **Standalone Locale Detection (`detectStandaloneLocale`):**
  When fatal errors crash the root layout before `I18nProvider` mounts (e.g. inside `global-error.tsx`), `ErrorFallback` gracefully inspects `localStorage.getItem("NEXT_LOCALE")`, document cookies, and `navigator.language` to deliver localized Vietnamese/English fallbacks without throwing React context errors.
- **Diagnostic Logging & Digest Support:** Automatically logs runtime errors to `console.error("Error boundary caught:", error)` and presents Next.js error digests in subtle monospace pills when available for SRE/debugging traceability.

### 2.2 Next.js App Router Error Boundaries

1. [`frontend/src/app/global-error.tsx`](../../frontend/src/app/global-error.tsx):
   - Catches fatal errors in the root layout.
   - Replaces `<html>` and `<body>` tags with `variant="fullscreen"`.
   - Utilizes autonomous locale detection since React providers are inaccessible.
2. [`frontend/src/app/error.tsx`](../../frontend/src/app/error.tsx):
   - Root application boundary wrapping all child routes.
   - Provides reset callback and primary navigation.
3. [`frontend/src/app/dashboard/error.tsx`](../../frontend/src/app/dashboard/error.tsx):
   - Dashboard-scoped boundary utilizing `variant="compact"`.
   - Contextual navigation button linking back to `/dashboard`.
4. [`frontend/src/app/careers/error.tsx`](../../frontend/src/app/careers/error.tsx):
   - Public careers portal boundary.
   - Contextual navigation button linking back to `/careers`.
5. [`frontend/src/app/not-found.tsx`](../../frontend/src/app/not-found.tsx):
   - Semantic 404 page featuring `FileQuestion` icon, subtle badge, and navigation CTAs to home and careers.

### 2.3 Two-Way i18n Localization Parity

Added 11 symmetric keys across [`frontend/src/i18n/types.ts`](../../frontend/src/i18n/types.ts), [`frontend/src/i18n/locales/vi.ts`](../../frontend/src/i18n/locales/vi.ts), and [`frontend/src/i18n/locales/en.ts`](../../frontend/src/i18n/locales/en.ts):

| Key | Vietnamese (`vi`) | English (`en`) |
| :--- | :--- | :--- |
| `errors.boundary.title` | Có lỗi xảy ra | Something went wrong |
| `errors.boundary.description` | Chúng tôi đã ghi nhận sự cố. Vui lòng thử lại. | We've logged the issue. Please try again. |
| `errors.boundary.tryAgain` | Thử lại | Try again |
| `errors.boundary.goHome` | Về trang chủ | Go home |
| `errors.boundary.dashboardTitle` | Lỗi Dashboard | Dashboard Error |
| `errors.boundary.dashboardDescription` | Không thể tải dashboard. Vui lòng thử lại. | Could not load dashboard. Please try again. |
| `errors.boundary.careersTitle` | Lỗi trang tuyển dụng | Careers Page Error |
| `errors.boundary.careersDescription` | Không thể tải trang tuyển dụng. Vui lòng thử lại. | Could not load careers page. Please try again. |
| `errors.notFound.title` | Không tìm thấy trang | Page not found |
| `errors.notFound.description` | Trang bạn tìm không tồn tại hoặc đã bị di chuyển. | The page you're looking for doesn't exist or has been moved. |
| `errors.notFound.goHome` | Về trang chủ | Go home |

Total dictionary parity maintained at **1,754 keys** across both languages.

---

## 3. Verification & Test Evidence

### 3.1 Unit & Integration Test Suites

Created two dedicated test specifications adding **10 new automated tests**:

1. [`frontend/src/components/shared/error-fallback.spec.tsx`](../../frontend/src/components/shared/error-fallback.spec.tsx) (6 tests):
   - Default variant rendering (title, description, CTAs).
   - `reset()` callback invocation upon clicking "Try again".
   - Compact variant inline layout classes.
   - Fullscreen variant full-viewport classes.
   - Error digest rendering when `digest` property exists.
   - Standalone rendering resilience without `I18nProvider`.
2. [`frontend/src/app/error.spec.tsx`](../../frontend/src/app/error.spec.tsx) (4 tests):
   - `RootError` component integration with `ErrorFallback`.
   - `DashboardError` component with compact styling and `/dashboard` link.
   - `CareersError` component with `/careers` link.
   - `NotFound` component rendering 404 badge, description, and navigation.

**Test Execution Summary:**
- Frontend Tests: **33 files passed, 200/200 tests passed** (including all 10 new tests).
- Backend Tests: **38 files passed, 377/377 tests passed**.
- Total Suite: **577/577 tests passed** (100% green).

### 3.2 CI Architecture Fast Gates (`pnpm run check:all:fast`)

```text
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.29s
  2. Two-Way i18n & Zero Hardcoded Strings (pnpm lint:i18n) [PASS]    0.70s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   23.80s
  4. TypeScript Type Safety                     [PASS]    9.81s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.30s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.39s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.40s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.43s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.36s
 10. CI Gate 11: Documentation Markdown Link Integrity [PASS]    0.44s
 11. Test Count Delta & Anti-Regression         [PASS]    0.33s
──────────────────────────────────────────────────────────────────
 Total Time: 37.24s
 Status: 🟢 ALL CHECKS PASSED (11/11) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

---

## 4. Deliverables Checklist

- [x] Shared `ErrorFallback` component created with 3 variants (`default`, `compact`, `fullscreen`).
- [x] Top-level fallback `frontend/src/app/global-error.tsx` created with standalone i18n detection.
- [x] Root error boundary `frontend/src/app/error.tsx` created.
- [x] Dashboard error boundary `frontend/src/app/dashboard/error.tsx` created.
- [x] Careers error boundary `frontend/src/app/careers/error.tsx` created.
- [x] Brand-consistent 404 page `frontend/src/app/not-found.tsx` created.
- [x] 11 new translation keys added with 100% parity across `en` and `vi` (1,754 total keys).
- [x] 10 new unit and integration tests passing in Vitest.
- [x] 0 ESLint errors and 0 TypeScript compilation errors.
- [x] 11/11 CI Architecture gates passed.
- [x] Git branch `fix/task-14a-error-boundaries` pushed to remote.
