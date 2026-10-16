# Changelog

All notable changes to the HaiHire Enterprise ATS platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-10-16

### Changed

- **CI/CD Optimization (Task #32):**
  - Removed duplicate `pull_request` triggers from `ci-dev.yml` và
    `ci-staging.yml` (chỉ trigger `push` post-merge).
  - Added `dorny/paths-filter@v3` cho `ci-dev.yml` và `ci-staging.yml`:
    docs-only changes bypass 11 architecture gates, running lightweight
    `docs-verify` job (~30s vs ~3m).
  - Replaced `pnpm test` (30s) trong `.husky/pre-commit` với
    `lint-staged` (<5s staged file checks).
  - Added `.husky/pre-push` running `pnpm lint` + `pnpm typecheck` (~25s).
  - Implemented 3-tier Git hooks: pre-commit (<5s), pre-push (~25s),
    CI (full gates).

- **Dependabot Optimization:**
  - Rescheduled Dependabot từ Monday 04:00 UTC → Saturday 04:00 UTC.
  - Added `production-dependencies` group và `security-updates` group.
  - Total 3 groups: dev-dependencies, production-dependencies, security.

- **Workflow Schedule Staggering:**
  - Moved `security-weekly.yml` từ Monday 06:00 UTC → Wednesday
    06:00 UTC (`0 6 * * 3`).
  - Updated `e2e-weekly.yml` target từ `main` → `staging`.

- **Documentation Reorganization (Task #33):**
  - Merged 4 overlapping runbooks vào 2 canonical files:
    - `ci-strategy.md` → merged Test Pyramid + Critical Paths vào `ci-cd.md`.
    - `github-branch-protection.md` + `branch-protection-update.md` +
      `github-manual-fixes.md` → consolidated thành `branch-protection.md`.
  - Archived 4 deprecated runbooks vào `docs/archive/runbooks-deprecated/`.
  - Restructured `docs/reports/README.md` với 4-phase grouping:
    - Phase 1: Hardening (01-40).
    - Phase 2: Infrastructure (41-51).
    - Phase 3: Refactor (52-58).
    - Phase 4: Optimization (59+).

### Added

- **Release Notes:** `docs/releases/v0.1.1.md` (backfilled from Task #24).
- **Canonical Runbook:** `docs/runbooks/branch-protection.md` (unified
  từ 3 files).
- **Report #63:** Task #33 Phase 2 completion report.

### Fixed

- Documentation links updated across 7 living docs (PROJECT_METRICS,
  PROJECT_CONTEXT, ROADMAP, TESTCASES, onboarding, README, CONTRIBUTING).
- Duplicate CI workflow runs eliminated (đã chạy 2 lần per merge).
- Outdated test counts synchronized (563 → 656).

### Security

- No changes to security posture.
- Dependabot groups improve patch cadence visibility.

---

## [0.1.2] - 2026-10-16

### Changed

- Refactored 5 God Files (>400 LOC) into modular architecture:
  - `backend/src/organizations/organizations.service.ts` (1,366 → 125 LOC)
  - `backend/src/sourcing/sourcing.service.ts` (1,214 → 162 LOC)
  - `backend/src/applications/applications.service.ts` (1,189 → 150 LOC)
  - `frontend/src/components/jobs/job-list.tsx` (957 → 10 LOC shim)
  - `frontend/src/components/applications/applications-data-table.tsx` (1,706 → 2 LOC shim)
- Cumulative: 5,696 LOC eliminated, max file size reduced to 265 LOC.

### Added

- 50 new characterization tests (from 606 → 656 passing tests).
- Refactoring patterns documented in `CONTRIBUTING.md`.

### Fixed

- E2E weekly verification (Monday 03:00 UTC).
- Dependabot target branch (`dev`).

### Security

- No vulnerabilities introduced during refactor.
- Saga pattern and distributed transaction integrity preserved.

---

## [0.1.0] - 2026-10-14

### Pre-release Note

This is the first pre-release of HaiHire Enterprise ATS. While the
platform has undergone extensive hardening, it is still in active
development. The public API may change before the stable 1.0.0 release.

### Added

- Multi-channel webhook notifications (Telegram, Discord, Generic)
  with HMAC-SHA256 signing (Task #1A).
- Per-organization webhook settings with AES-256-GCM encryption (Task #1B).
- Dynamic BullMQ metrics with per-queue timeout protection (Task #2).
- 14 Prometheus alert rules covering infrastructure and queues (Task #3, #7).
- E2E cross-tenant isolation tests via Playwright (6 tests) (Task #4).
- Tenant scoping static analysis CI gate (100% query coverage) (Task #5).
- Cron Pushgateway metrics for orphan cleanup (7 metrics) (Task #6).
- Frontend onError hook standardization across 30 mutation hooks (Task #8).
- Frontend Error Boundaries (global-error, error, dashboard, careers, 404)
  (Task #14A).
- Redis distributed lock for click counter (multi-instance safe)
  (Task #14B Third Follow-up).
- ISR caching for public careers pages (Task #14C).
- Email queue DLQ alerting with webhook notification (Task #14C).
- Refresh token revocation via tokenVersion (Task #14D).
- Correlation ID (X-Request-ID) middleware (Task #14D).
- Single source of truth for project metrics (docs/PROJECT_METRICS.md)
  (Task #10).
- Single root .env architecture with 10-section template (Task #11).

### Changed

- Standardized all documentation, code comments, and alert descriptions
  to English (Task #7.5).
- Repository restructured: audits archived in docs/archive/audits/
  (Task #9).
- Environment variables unified into single root .env (Task #11).
- Package.json scripts standardized across 3 manifests (Task #12).
- Memory files deduplicated: user-preferences vs project-conventions
  (Task #10).
- All markdown links converted to portable relative paths (Task #10.5).
- Valkey configuration: maxmemory-policy noeviction to prevent BullMQ
  job eviction (Task #4).

### Fixed

- Unbounded in-memory table scans in sourcing analytics queries
  (Task #14B).
- Race condition in click counter under concurrent access (Task #14B).
- Missing database composite indexes for tenant queries (Task #14B).
- Startup N+1 query in membership backfill (Task #14B).
- Silent DLQ alerts for email queue terminal failures (Task #14C).
- Hardcoded bullmq_queue_depth metric (now dynamic) (Task #2).
- Vietnamese text in 7 alert rule descriptions (Task #10).
- 288 absolute file:/// links across 46 markdown files (Task #10.5).
- PORT collision between backend (13001) and frontend (13000) (Task #11).
- Script warning on closed/draft career pages (Task #13).

### Security

- Refresh token revocation (instant session invalidation on logout or
  password change) (Task #14D).
- Tenant scoping static analysis: 0 unsafe queries (Task #5).
- Webhook URLs and secret tokens encrypted at-rest (Task #1B).
- HMAC-SHA256 signature verification for generic webhooks (Task #1A).
- Distributed lock prevents click counter race condition across
  multi-instance deployments (Task #14B Third Follow-up).

## Pre-1.0.0

Initial development phases 1-22 with 10 IV&V cycles achieving 99-100%
reliability score, followed by 20+ hardening tasks.

---

## [Unreleased] - Phase 21: Documentation Audit & Sync (2026-10-03)

### Added

- Root-level repository documentation: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`.
- Comprehensive system architecture blueprint: `docs/architecture/system-overview.md`.
- Complete REST API documentation covering 77 endpoints: `docs/api/overview.md`.
- Prometheus alerting and incident triage runbook: `docs/runbooks/alerts.md`.
- Developer onboarding guide: `docs/onboarding.md`.
- Documentation index portal: `docs/README.md`.
- Audit reports registry and cross-phase synthesis: `docs/archive/audits/README.md` and `docs/archive/audits/SUMMARY.md`.
- Archive structure for historical audits: `docs/archive/audits/phase-01-to-10/`.
- Package README for shared library: `packages/shared/README.md`.

### Changed

- Modernized `backend/README.md` and `frontend/README.md` to reflect production architecture.
- Translated `docs/runbooks/orphan-cleanup.md` to English adhering to workspace memory conventions.
- Synchronized all runbook port allocations, container naming conventions, and test metrics (379 tests).

---

## [1.0.0-phase20] - Phase 20: Environment Architecture & Sync Fix (2026-10-03)

### Added

- Strictly segregated 5-file environment architecture (`.env`, `.env.example`, `backend/.env`, `frontend/.env`, `.env.production`).
- Automated env synchronization check script (`scripts/check-env-sync.ts`) and CI script `pnpm lint:env-sync`.
- Production environment management runbook: `docs/runbooks/env-management.md`.

### Changed

- Implemented dynamic host port rewriting in `backend/src/config/env.ts` to automatically synchronize localhost ports with root `.env`.
- Updated `docker-compose.prod.yml` to inject `.env.production` directly and isolate internal backend/db networks.

---

## [0.19.2] - Phase 19.2: Auth Controller Environment Conventions (2026-10-03)

### Fixed

- Replaced direct `process.env.NODE_ENV` references in `backend/src/auth/auth.controller.ts` with validated `env.NODE_ENV` object.

---

## [0.19.1] - Phase 19.1: IV&V Round 10 Verification (2026-10-03)

### Verified

- Zero-trust independent verification of rate limiters, anti-FOUC script, and test suite consistency.
- Maintained 99.0% enterprise credibility score.

---

## [0.19.0] - Phase 19: Theme Script Hydration & Rate Limiting (2026-10-02)

### Fixed

- Fixed theme flash of unstyled content (FOUC) by adding inline head script in Next.js RootLayout.
- Configured environment-aware auth rate limiting in development vs production modes.

---

## [0.18.1] - Phase 18.1: MinIO Orphan Cleanup Cron Hardening (2026-10-02)

### Added

- Automated daily orphan cleanup cron container (`orphan-cleanup`) in `docker-compose.prod.yml` scheduled at `0 4 * * *`.
- Mandatory 30-day grace period for unreferenced CV files to prevent in-flight upload deletion.
- MinIO orphan cleanup operational runbook: `docs/runbooks/orphan-cleanup.md`.

---

## [0.17.0] - Phase 17: Production Backup Automation & Disaster Recovery (2026-10-01)

### Added

- Standalone TypeScript production backup script: `scripts/backup-production.ts`.
- Automated PostgreSQL dual-format dumps (`.dump` custom archive and `.sql` plain text).
- Hot MinIO volume archiving to `.tar.gz`.
- Automated test restore drill to temporary database (`haihire_restore_drill`) with Table of Contents verification.
- Production backup and disaster recovery runbook: `docs/runbooks/backup-and-restore.md`.

---

## [0.16.0] - Phase 16: Playwright E2E Testing Suite (2026-09-30)

### Added

- End-to-end browser testing suite with Playwright covering critical candidate and recruiter workflows.
- Playwright npm scripts (`pnpm test:e2e`, `pnpm test:e2e:ui`).
- Unified CI runner `scripts/check-all.ts` supporting `--fast` and `--e2e` flags.

---

## [0.15.0] - Phase 15: Bundle Optimization & Performance Profiling (2026-09-28)

### Changed

- Optimized Next.js 16 production build chunks, removing unused client dependencies.
- Added comprehensive HTTP request duration metrics (P95 latency tracking) in Prometheus exporter.

---

## [0.14.0] - Phase 14: Engine Upgrade (Node 26, Valkey 8, Postgres 17) (2026-09-25)

### Changed

- Upgraded runtime baseline to Node.js 26 LTS.
- Migrated caching and BullMQ queuing from legacy Redis to Valkey 8.0.2 alpine.
- Upgraded primary database engine to PostgreSQL 17.6 alpine.

---

## [0.13.0] - Phase 13: Next.js 16 & React 19 RSC Migration (2026-09-22)

### Changed

- Upgraded frontend framework to Next.js 16.3.8 and React 19.3.0.
- Implemented React Server Components (RSC) across job listings and dashboard overviews.
- Upgraded `@tanstack/react-query` to v5 for declarative client caching and mutations.

---

## [0.12.0] - Phase 12: Distributed Architecture Patterns (2026-09-18)

### Added

- Distributed Saga transaction orchestrator with automated step rollbacks for application submission.
- Node.js `AsyncLocalStorage` request context propagating `reqId`, `tenantId`, and `userId` across asynchronous call trees.
- BullMQ Dead Letter Queue (DLQ) with exponential backoff for background resume indexing.

---

## [0.11.0] - Phase 11: CI Quality Gates & Contract Verification (2026-09-14)

### Added

- 7 comprehensive CI verification gates: DTO ValidationPipe coverage, i18n error code coverage, API contract sync, unit tests, linting, typechecks, and environment validation.
- Standardized `APP_ERROR_CODES` enum across frontend and backend.

---

## [0.1.0] - Phases 1 to 10: Platform Foundation & Core ATS (2026-08-01 to 2026-09-10)

### Added

- Multi-tenant ATS database schema with Prisma ORM.
- Modular NestJS backend structure: Auth, Organizations, Jobs, Applications, Candidates, Interviews, Documents, Analytics.
- Recruiter dashboard with interactive Kanban candidate pipeline stages (`@dnd-kit`).
- MinIO S3 integration for encrypted resume storage.
- Bilingual localization (Vietnamese and English) across candidate portal and recruiter backoffice.
