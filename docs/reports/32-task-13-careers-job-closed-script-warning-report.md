# Task #13 Completion Report: Closed Career Pages Script Warning Remediation & Semantic UX

---

## 1. Executive Summary

- **Task ID:** Task #13
- **Branch:** `fix/task-13-careers-job-closed-script-warning`
- **Objective:** Eliminate the React 19 console warning (`Encountered a script tag while rendering React component`) caused by explicit `notFound()` calls on closed career pages, while elevating user experience by semantically treating closed jobs as valid informational pages rather than generic 404 errors.
- **Outcome:** **100% Resolved**. All 4 E2E Playwright test scenarios passed with **zero console warnings**, 11/11 CI gates passed, 567/567 unit/integration tests passed, and production builds completed cleanly.

---

## 2. Root Cause Analysis

### 2.1 The Issue
When accessing closed jobs (e.g., `http://localhost:13000/careers/admin/information-security-secops-specialist`), Next.js emitted:
```text
Encountered a script tag while rendering React component. Scripts inside
React components are never executed when rendering on the client.
Consider using template tag instead.
  at script (<anonymous>:null:null)
  at RootLayout (src\app\layout.tsx:35:9)
```

### 2.2 Mechanism
1. In `RootLayout` (`frontend/src/app/layout.tsx`), `<Script id="theme-init" strategy="beforeInteractive">` is declared in `<head>` to prevent dark mode flicker.
2. Previously, backend `findBySlug` filtered out any non-`PUBLISHED` jobs (`activeJobs = jobs.filter(j => j.status === 'PUBLISHED')`), returning HTTP 404 for existing closed jobs.
3. Frontend Server Component (`frontend/src/app/careers/[orgSlug]/[jobSlug]/page.tsx`) received `null` and invoked Next.js `notFound()`.
4. Due to Next.js issue #71538 and React 19 architecture, rendering a not-found fallback page forces the segment tree to re-render, causing `<Script strategy="beforeInteractive">` in `<head>` to trigger React 19's script tag runtime warning.
5. Furthermore, returning 404 for closed positions is poor UX: candidates navigating from past hiring campaigns or job boards encountered a dead end with no context or discovery options.

---

## 3. Implemented Architecture & Status Matrix

### 3.1 Job Status Matrix
| Job Status | Previous Behavior | Phase 2 Implemented Behavior | HTTP Code | Console Warning |
| :--- | :--- | :--- | :---: | :---: |
| **PUBLISHED** | Render Job Details | Render Job Details (`JobDetailsClient`) | 200 | None |
| **CLOSED** | `notFound()` → 404 Error | Render Dedicated `JobClosed` Component | 200 | **Zero Warnings** |
| **DRAFT** | `notFound()` → 404 Error | `notFound()` → 404 Error (Hides internal drafts) | 404 | Expected 404 |
| **Non-Existent** | `notFound()` → 404 Error | `notFound()` → 404 Error | 404 | Expected 404 |

### 3.2 Backend Service Updates
In `backend/src/jobs/jobs.service.ts`:
1. Updated `findOne`: Permitted `isPublic` access when `status === "PUBLISHED" || status === "CLOSED"` while strictly redacting applicant PII (`applications: []`, `applicationsCount: 0`).
2. Updated `findBySlug`: Filtered `activeJobs` for both `PUBLISHED` and `CLOSED` statuses so public URLs resolve gracefully.
3. Seed Determinism in `backend/src/prisma/seed.ts`: Explicitly seeded `Information Security & SecOps Specialist` as `CLOSED` and `Customer Success Lead` as `DRAFT` for 100% deterministic testing.

### 3.3 Frontend Component Architecture & Design System Parity
1. **1:1 Design System Parity with Open Job Page**:
   - **Back Navigation**: Exact `< Tất cả vị trí tại {orgName}` header link with `ChevronLeft` icon.
   - **Hero Card (`rounded-3xl` container)**:
     - Top badges row: Department badge, Workplace badge (`Globe2`), Experience Level badge (`Briefcase`), and an amber closed status badge (`Archive` / pulse dot).
     - Title typography: Exact `text-2xl sm:text-4xl font-black tracking-tight leading-tight`.
     - Metadata row: `Building2` (org), `MapPin` (location), `Clock` (job type), and `DollarSign` (salary range in emerald).
   - **Notice Section**: Clean informational card positioned below the hero card, featuring an `Archive` icon, closure title, clear description, and a single responsive CTA button `Xem các vị trí khác` leading to `/careers/[orgSlug]`. Purged redundant elements (removed duplicate organization badge and generic "Tất cả công ty" button) to maintain brand focus and strict design system consistency with the open job experience. No extraneous JD/application forms rendered.
2. **Page Logic (`frontend/src/app/careers/[orgSlug]/[jobSlug]/page.tsx`)**:
   - Server Component conditionally routes `CLOSED` jobs to `JobClosed` without invoking `notFound()`.
   - `generateMetadata` prefixes page title with `[Closed]` for accurate SEO and browser tab context.
3. **i18n Localization**:
   - Synchronously registered `jobClosed: { title, description, viewOtherJobs }` across `types.ts`, `en.ts`, and `vi.ts`.

---

## 4. Verification & Testing Evidence

### 4.1 Playwright E2E Tests
Executed `frontend/tests/e2e/careers-job-closed.spec.ts`:
- **Case 1 (PUBLISHED):** 200 OK, title rendered, apply button visible, 0 script warnings.
- **Case 2 (CLOSED):** 200 OK, `JobClosed` page rendered, title & org link visible, **0 script warnings**.
- **Case 3 (DRAFT):** 404 Not Found as expected.
- **Case 4 (Non-existent):** 404 Not Found as expected.
- **Result:** `4 passed (3.7s)`.

Executed `frontend/tests/e2e/careers-page.spec.ts`:
- **Result:** `4 passed (2.7s)` (0 regressions).

### 4.2 Unit & Integration Tests
- **Backend:** 38 test files, **377/377 passed** (+1 test verifying `findBySlug` closed job access and applicant privacy).
- **Frontend:** 31 test files, **190/190 passed** (+1 test in `job-closed.spec.tsx`, +2 tests in `careers-rsc.spec.tsx`).
- **Total Tests:** **567/567 passed**.

### 4.3 Quality Gates & Static Analysis
Executed `pnpm check:all:fast`:
- Gate 1: `lint:env-sync` [PASS]
- Gate 2: `lint:i18n` (1,743 keys symmetrical) [PASS]
- Gate 3: `lint` (ESLint + Prettier) [PASS]
- Gate 4: `typecheck` (Backend + Frontend TypeScript) [PASS]
- Gate 5: `lint:dtopipe` [PASS]
- Gate 6: `lint:error-i18n` [PASS]
- Gate 7: `lint:api-contract` [PASS]
- Gate 8: `lint:prometheus-rules` [PASS]
- Gate 9: `lint:tenant-scope` [PASS]
- Gate 10: `lint:doc-links` [PASS]
- Gate 11: `test:diff` [PASS]
- **Status:** **11/11 GATES PASSED**.

### 4.4 Production Build
- Executed `pnpm build`: Clean compilation across `@haihire/shared`, `backend` (esbuild), and `frontend` (Next.js Turbopack).
