# Changelog

All notable changes to the HaiHire Enterprise ATS platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - Phase 22: Version Alignment & Container Registry Publishing (2026-10-03)
### Added
- Monorepo lockstep version synchronization tooling: `scripts/sync-version.ts` and `scripts/bump-version.ts`.
- Automation commands: `pnpm version:sync` and `pnpm version:bump`.
- Container publishing GitHub Actions workflow: `.github/workflows/docker-publish.yml` (multi-stage buildx, GHA cache, OCI metadata, GHCR publish, and GitHub release generation).
- GitHub release and changelog workflow: `.github/workflows/release.yml`.
- Versioning and container registry runbook: `docs/runbooks/versioning.md`.
- Production environment variables `GITHUB_REPOSITORY` and `IMAGE_TAG` in `.env.production.example`.

### Changed
- Synchronized all 4 package manifests (`package.json`, `backend/package.json`, `frontend/package.json`, `packages/shared/package.json`) to `1.0.0`.
- Updated `docker-compose.prod.yml` to remove local `build:` directives and pull pre-built immutable container images from GHCR.
- Updated `docs/runbooks/production-deployment-plan.md` to replace local container builds with GHCR pull, digest recording, and immutable tag rollback SOPs.
- Updated `.github/workflows/ci-cd.yml` to align image naming (`haihire-backend`, `haihire-frontend`) and pull from GHCR during deployment.
- Updated `CONTRIBUTING.md` and `.agents/memory/project-conventions.md` with versioning and container publishing protocols.

---

## [Unreleased] - Phase 21: Documentation Audit & Sync (2026-10-03)
### Added
- Root-level repository documentation: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`.
- Comprehensive system architecture blueprint: `docs/architecture/system-overview.md`.
- Complete REST API documentation covering 77 endpoints: `docs/api/overview.md`.
- Prometheus alerting and incident triage runbook: `docs/runbooks/alerts.md`.
- Developer onboarding guide: `docs/onboarding.md`.
- Documentation index portal: `docs/README.md`.
- Audit reports registry and cross-phase synthesis: `docs/audits/README.md` and `docs/audits/SUMMARY.md`.
- Archive structure for historical audits: `docs/audits/archive/phase-01-to-10/`.
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
