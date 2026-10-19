# Project Metrics (Single Source of Truth)

> Canonical metrics for the HaiHire Enterprise ATS platform.  
> All documentation MUST reference this file. DO NOT duplicate numbers across other files.

**Last Updated:** 2026-10-19  
**Platform Version:** v0.1.4 (Pre-release)

---

## Release Stage

- **Current:** Pre-release (v0.1.4)
- **Target:** Stable release (v1.0.0) — when ready
- **Branch strategy:** dev -> staging -> main
- **Hotfix flow:** hotfix/* from main -> main + dev

---

## Quality & Verification Metrics

- **Automated Tests:** 871 total (+4 from Task 44 Wave 4.5 Phase B)
  - Backend: 485 passing (Vitest, 45 test suites)
  - Frontend: 386 passing (Vitest + JSDOM, 48 test suites)
- **Test Code Coverage:**
  - Frontend Coverage: 51.45% Statements (53.35% Lines, 47.92% Branch, 46.85% Funcs)
  - Backend Coverage: 79.54% Statements (80.92% Lines, 62.35% Branch, 80.38% Funcs)
  - Critical Services Coverage (Task #36):
    - `applications-saga.service.ts`: 97.61% lines (was 66.66%)
    - `sourcing-metrics.service.ts`: 98.27% lines (was 38.36%)
    - `organizations-core.service.ts`: 94.91% lines (was 63.55%)
    - `sourcing-links.service.ts`: 97.97% lines (was 58.58%)
- **Accessibility Compliance (WCAG 2.1 AA):** 92.4% (Tasks #37-#40, 27 issues fixed: 5 critical, 11 high, 7 medium, 4 low)
- **CI Architecture Gates:** 11 gates (`scripts/check-all.ts`)
  1. `lint:env-sync` — Env Variables Synchronization & Parity
  2. `lint:i18n` — Two-Way i18n & Zero Hardcoded Strings
  3. `lint` — ESLint Code Quality (Backend + Frontend)
  4. `typecheck` — Strict TypeScript Typecheck (`tsc --noEmit`)
  5. `lint:dtopipe` — DtoPipe Validation Coverage (29 piped endpoints)
  6. `lint:error-i18n` — Error Code i18n Localization (54 codes)
  7. `lint:api-contract` — API Contract & Leaks Audit (84 endpoints)
  8. `lint:prometheus-rules` — Prometheus Alert Rules Audit (14 rules)
  9. `lint:tenant-scope` — Tenant Scoping Static Analysis (212 queries)
  10. `lint:doc-links` — Documentation Markdown Link Integrity (162 files)
  11. `test:diff` — Test Count Delta & Anti-Regression
- **Prometheus Alert Rules:** 14 active rules (`monitoring/prometheus/alert-rules.yml`)
- **E2E Browser Tests:**
  - Cross-Tenant Suite: 6 tests (`frontend/tests/e2e/tenant-security.spec.ts`)
  - Total E2E: 19 tests across 7 Playwright specs (10 critical user journeys)
- **Test Pass Rate:** 100% (Zero skipped, zero flaky)

---

## Architecture & Codebase Metrics

- **Monorepo Packages:** 3 (`backend`, `frontend`, `packages/shared`)
- **Backend Modules:** 18
- **Backend Controllers:** 13
- **REST API Endpoints:** 84
- **Frontend Mutation Hooks:** 35 (30 standardized with `onError` cache invalidation in Task #8)
- **Database Models:** 16 (9 camelCase tech debt + 7 snake_case)
- **God Files (>400 LOC):** 19 remaining (reduced from 28; 5 God Files refactored in v0.1.2, 4 refactored in Task 43 Wave 4)
  - Max file size: 268 LOC (`frontend/src/app/dashboard/candidates/[id]/candidate-detail-view.tsx`)
  - Refactored God Files in v0.1.2 & Wave 4:
    - `frontend/src/app/dashboard/applications/[id]/page.tsx` (857 → 10 LOC wrapper, 10 modular sub-files, Task 43 Wave 4.4)
    - `frontend/src/app/dashboard/candidates/[id]/page.tsx` (941 → 10 LOC wrapper, 9 modular sub-files, Task 43 Wave 4.3)
    - `frontend/src/app/dashboard/candidates/page.tsx` (1,050 → 14 LOC wrapper, 8 modular sub-files, Task 43 Wave 4.2)
    - `frontend/src/components/jobs/job-wizard-editor.tsx` (838 → 2 LOC shim, 4 hooks + 2 components, Task 43 Wave 4.1)
    - `frontend/src/components/applications/applications-data-table.tsx` (1,706 → 2 LOC shim, 16 modular subcomponents)
    - `backend/src/organizations/organizations.service.ts` (1,366 → 125 LOC facade, 3 sub-services)
    - `backend/src/sourcing/sourcing.service.ts` (1,214 → 162 LOC facade, 3 sub-services)
    - `backend/src/applications/applications.service.ts` (1,189 → 150 LOC facade, 4 sub-services)
    - `frontend/src/components/jobs/job-list.tsx` (957 → 10 LOC shim, 8 subcomponents)
  - Detailed inventory of remaining 19 files tracked in [`docs/ROADMAP.md`](ROADMAP.md)

---

## Operations & Release Metrics

- **Hardening Milestones:** 20+ tasks (Tasks #1A → #14D)
- **Restructure:** Task #9 complete
- **Supported Languages:** 2 (`vi` Vietnamese + `en` English)
- **Documentation Language:** 100% English (Task #7.5 convention)
- **Runtime Infrastructure:**
  - PostgreSQL 17.6-alpine
  - Valkey 8.0.2-alpine
  - MinIO (SHA256 pinned)
  - Caddy 2.8-alpine
  - Node.js 26-alpine

---

## CI/CD & Security Architecture

- **Workflows Count:** 7 single-responsibility workflows
  - `ci-feature.yml` — Fast feedback on feature PRs (2–3 min)
  - `ci-dev.yml` — Post-merge integration gate on `dev` (3–4 min code / ~30s docs via path filtering)
  - `ci-staging.yml` — Pre-production E2E & build verification on `staging` (8–10 min code / ~30s docs)
  - `ci-main.yml` — Production release gatekeeper & pnpm audit (10–12 min)
  - `cd-release.yml` — GHCR container publishing, Trivy scan, GitHub release (5–7 min)
  - `e2e-weekly.yml` — Scheduled weekly 10-journey Playwright sweep on `staging` (03:00 UTC Mondays)
  - `security-weekly.yml` — Scheduled weekly vulnerability & tenant AST sweep (06:00 UTC Wednesdays)
- **CI Compute Efficiency:** ~72% reduction (~420 min/month vs ~1,500 min/month baseline)
- **Git Hooks Architecture (3-Tier):**
  - Tier 1 (Pre-commit): `lint-staged` running ESLint & Prettier on staged files (<3s)
  - Tier 2 (Pre-push): `pnpm lint && pnpm typecheck` full static verification (~25s)
  - Tier 3 (Remote CI): 11 Architecture Gates & E2E Suites
- **Security Defenses:** 3 active layers
  - Layer 1: `pnpm audit --audit-level=high` (Build gate)
  - Layer 2: GitHub Dependabot (Automated weekly grouped updates on Saturdays at 04:00 UTC targeting `dev`)
  - Layer 3: Aquasecurity Trivy container scanner (SARIF report on GHCR images)

---

## Environment Architecture

- **Single Source of Truth:** Root `.env` file (gitignored).
- **Template:** `.env.example` (tracked, 10-section standardized).
- **Production Template:** `.env.production.example` (tracked).
- **NO** per-package env files (`backend/.env` and `frontend/.env` removed in Task #11).
