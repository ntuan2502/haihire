# Project Metrics (Single Source of Truth)

> Canonical metrics for the HaiHire Enterprise ATS platform.  
> All documentation MUST reference this file. DO NOT duplicate numbers across other files.

**Last Updated:** 2026-10-22  
**Platform Version:** v0.3.0 (Pre-release)

---

## Release Stage

- **Current:** Pre-release (`v0.3.0`)
- **Target:** Feature branch `feat/v0.3.0-rbac-agents-ci` -> Release Tag `v0.3.0`
- **Branch strategy:** `feat/*` -> `dev` -> `staging` -> `main`
- **Hotfix flow:** `hotfix/*` from `main` -> `main` + `dev`

---

## Quality & Verification Metrics

- **Automated Tests:** 1,019 total (+148 tests added since v0.2.0: 871 → 1,019)
  - Backend: 589 passing (Vitest, 57 test suites)
  - Frontend: 430 passing (Vitest + JSDOM, 58 test suites)
- **Test Code Coverage:**
  - Frontend Coverage: 51.45% Statements (53.35% Lines, 47.92% Branch, 46.85% Funcs)
  - Backend Coverage: 79.54% Statements (80.92% Lines, 62.35% Branch, 80.38% Funcs)
  - Critical Services Coverage:
    - `applications-saga.service.ts`: 97.61% lines
    - `sourcing-metrics.service.ts`: 98.27% lines
    - `organizations-core.service.ts`: 94.91% lines
    - `sourcing-links.service.ts`: 97.97% lines
- **Accessibility Compliance (WCAG 2.1 AA):** 92.4% (27 issues remediated: 5 critical, 11 high, 7 medium, 4 low)
- **CI Architecture Gates:** 16 automated quality gates (`scripts/check-all.ts`)
  1. `lint:env-sync` — Environment Variables Synchronization & Parity (55 keys dev / prod)
  2. `lint:i18n` — Two-Way i18n & Zero Hardcoded Strings (1,769 keys vi / en)
  3. `lint` — ESLint Code Quality across Backend & Frontend
  4. `typecheck` — Strict TypeScript Typecheck (`tsc --noEmit`)
  5. `lint:dtopipe` — DtoPipe Validation Coverage (31 properly piped controller endpoints)
  6. `lint:error-i18n` — Error Code i18n Localization (57 domain error codes)
  7. `lint:api-contract` — API Contract & Leaks Audit (86 REST endpoints)
  8. `lint:prometheus-rules` — Prometheus Alert Rules Audit (14 PromQL alert rules)
  9. `lint:tenant-scope` — Tenant Scoping Static Analysis (219 Prisma queries isolated)
  10. `lint:doc-links` — Documentation Markdown Link Integrity (42 markdown files)
  11. `lint:doc-sync` — Documentation Synchronization & Drift Gate
  12. `check:prod-email` — Production Email Provider Validation (prohibits simulated provider in prod)
  13. `test:diff` — Test Count Delta & Anti-Regression Gate
  14. `lint:nextjs-conventions` — Next.js 16 File Conventions Audit (`proxy.ts` enforced)
  15. `lint:github-action-versions` — GitHub Actions Minimum Versions Audit (Node 24 action runtime)
  16. `test` — Unit & Integration Test Suite (1,019 tests)
- **Prometheus Alert Rules:** 14 active rules (`monitoring/prometheus/alert-rules.yml`)
- **E2E Browser Tests:** 23 specs across end-to-end recruitment lifecycle journeys
- **Test Pass Rate:** 100% (Zero skipped, zero flaky, zero commented-out tests)

---

## Architecture & Codebase Metrics

- **Monorepo Packages:** 3 (`backend`, `frontend`, `packages/shared`)
- **Backend Architecture:** Modular monolith on NestJS 12.1.2 with Express platform adapter
- **Backend Modules:** 18
- **Backend Controllers:** 12
- **REST API Endpoints:** 86
- **Roles & Permissions:** 5 active organization roles (`Role.OWNER` deprecated per D-003: `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`), 41 granular permissions
- **Frontend Mutation Hooks:** 35 (30 standardized with `onError` cache invalidation)
- **Database Models:** 16 Prisma models (`contract.prisma`)
- **God Files (>400 LOC):** 23 remaining logic/UI/service files >400 LOC (excluding exempt i18n dictionaries and seed scripts); 10/10 identified God Files refactored across Waves 1–4
  - Max refactored file size: 280 LOC (`frontend/src/components/interviews/calendar/components/calendar-month-view.tsx`)
  - Detailed inventory tracked in [`docs/guides/roadmap.md`](guides/roadmap.md)

---

## Operations & Release Metrics

- **Supported Languages:** 2 (`vi` Vietnamese + `en` English)
- **Documentation Language:** 100% English
- **Runtime Infrastructure:**
  - PostgreSQL 17.6-alpine
  - Valkey 8.0.2-alpine
  - MinIO S3 Object Storage (SHA256 pinned)
  - Node.js 26-alpine

---

## CI/CD & Security Architecture

- **Workflows Count:** 7 single-responsibility workflows
  - `ci-feature.yml` — Fast feedback on feature PRs (2–3 min)
  - `ci-dev.yml` — Post-merge integration gate on `dev` (3–4 min code / ~30s docs via path filtering)
  - `ci-staging.yml` — Pre-production E2E & build verification on `staging` (8–10 min code / ~30s docs)
  - `ci-main.yml` — Production release gatekeeper & pnpm audit (10–12 min)
  - `cd-release.yml` — GHCR container publishing, Trivy scan, GitHub release (5–7 min)
  - `e2e-weekly.yml` — Scheduled weekly Playwright sweep on `staging` (03:00 UTC Mondays)
  - `security-weekly.yml` — Scheduled weekly vulnerability & tenant AST sweep (06:00 UTC Wednesdays)
- **CI Compute Efficiency:** ~72% reduction (~420 min/month vs ~1,500 min/month baseline)
- **Git Hooks Architecture (3-Tier):**
  - Tier 1 (Pre-commit): `lint-staged` running ESLint & Prettier on staged files (<3s)
  - Tier 2 (Pre-push): `pnpm lint && pnpm typecheck` full static verification (~25s)
  - Tier 3 (Remote CI): 16 Architecture Gates & E2E Suites
- **Security Defenses:** 3 active layers
  - Layer 1: `pnpm audit --audit-level=high` (Build gate)
  - Layer 2: GitHub Dependabot (Automated weekly grouped updates on Saturdays at 04:00 UTC targeting `dev`)
  - Layer 3: Aquasecurity Trivy container scanner (SARIF report on GHCR images)

---

## Environment Architecture

- **Single Source of Truth:** Root `.env` file (gitignored).
- **Template:** `.env.example` (tracked, 55 keys).
- **Production Template:** `.env.production.example` (tracked).
- **Zero Drift:** Enforced by Gate 1 (`pnpm lint:env-sync`).
