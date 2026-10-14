# Project Metrics (Single Source of Truth)

> Canonical metrics for the HaiHire Enterprise ATS platform.  
> All documentation MUST reference this file. DO NOT duplicate numbers across other files.

**Last Updated:** 2026-10-14  
**Platform Version:** v0.1.0 (Pre-release)  

---

## Release Stage

- **Current:** Pre-release (v0.1.0)
- **Target:** Stable release (v1.0.0) — when ready
- **Branch strategy:** dev -> staging -> main
- **Hotfix flow:** hotfix/* from main -> main + dev

---

## Quality & Verification Metrics
- **Automated Tests:** 606 total
  - Backend: 406 passing (Vitest, 40 test suites)
  - Frontend: 200 passing (Vitest + JSDOM, 33 test suites)
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
  10. `lint:doc-links` — Documentation Markdown Link Integrity (115 files)
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
- **God Files (>400 LOC):** 5
  - `frontend/src/components/applications/applications-data-table.tsx` (1,706 LOC)
  - `backend/src/organizations/organizations.service.ts` (1,359 LOC)
  - `backend/src/applications/applications.service.ts` (1,188 LOC)
  - `backend/src/sourcing/sourcing.service.ts` (1,091 LOC)
  - `frontend/src/components/jobs/job-list.tsx` (956 LOC)

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

## Environment Architecture

- **Single Source of Truth:** Root `.env` file (gitignored).
- **Template:** `.env.example` (tracked, 10-section standardized).
- **Production Template:** `.env.production.example` (tracked).
- **NO** per-package env files (`backend/.env` and `frontend/.env` removed in Task #11).
