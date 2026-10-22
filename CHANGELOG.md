# Changelog

All notable changes to the HaiHire Enterprise ATS platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Security

## [0.2.0] - 2026-10-19

### Changed

- **Wave 4 God Files Refactoring (Tasks #43-44):**
  - job-wizard-editor.tsx: 838 → 2 LOC shim (6 sub-files).
  - candidates/page.tsx: 1,050 → 14 LOC wrapper (8 sub-files).
  - candidates/[id]/page.tsx: 941 → 10 LOC wrapper (9 sub-files).
  - applications/[id]/page.tsx: 857 → 10 LOC wrapper (10 sub-files).
  - interviews-calendar-view.tsx: 942 → 7 LOC shim (12 sub-files, 2-phase extraction).

- **Cumulative God Files Refactored (Waves 1-4):**
  - 10/10 major files refactored.
  - ~12,500 LOC eliminated from monoliths.
  - Max file size: 1,706 → 280 LOC.
  - 85+ modular sub-files created.

### Added

- Wave 4 characterization tests: +107 tests.
- Total tests: 764 → 871 (+107).
- 44 sub-files across 5 Wave 4 files.
- Calendar hooks: use-calendar-date-math.ts, use-calendar-events.ts.
- Candidate page: candidates-view.tsx + 8 sub-files.
- Application detail: application-detail-view.tsx + 9 sub-files.
- Job wizard: wizard/ directory with 4 hooks + 2 components.

### Fixed

- Zero breaking changes across all 5 Wave 4 refactors.
- All consumers unaffected (App Router pages, dashboard pages).
- Preserved localStorage keys, URL behavior, state machine.

### Security

- No security changes.
- Zero new dependencies in Wave 4.

## [0.1.4] - 2026-10-17

### Changed

- **Accessibility Campaign (Tasks #37-#40):**
  - WCAG 2.1 AA compliance: 0% → 92.4%.
  - Fixed 27 accessibility issues (5 Critical, 11 High, 7 Medium, 4 Low).
  - Added Skip to Main Content link (2.4.1).
  - Dynamic `html lang` from NEXT_LOCALE cookie (3.1.1).
  - Main landmarks + h1 across all dashboard routes (1.3.1, 2.4.1).
  - Form labels htmlFor/id association across auth + careers (1.3.1, 3.3.2).
  - Keyboard-accessible table rows (2.1.1).
  - aria-sort on sortable headers (1.3.1, 2.1.1).
  - CustomSelect full W3C ARIA Listbox pattern with arrow keys, Home/End, Enter/Space, Escape, auto-scroll (2.1.1, 4.1.2).
  - Skip link component reusable (SkipToContent).
  - useKeyboardClick hook for non-native interactive elements.
  - Brand logo focus-visible rings.
  - aria-hidden on decorative icons + pulsing badges.
  - Pagination `<nav>` + `aria-current="page"`.
  - Form errors `role="alert"` + `aria-live="assertive"`.
  - Toast notifications localized aria-label.
  - Search inputs aria-label across 10 views.
  - Filter dismiss buttons aria-label.
  - Table action buttons contextual aria-label.
  - Settings nav landmark label.

- **Coverage Augmentation (Task #36 Phase 2):**
  - applications-saga.service.ts: 66.66% → 97.61% (+30.95%).
  - sourcing-metrics.service.ts: 38.36% → 98.27% (+59.91%).
  - organizations-core.service.ts: 63.55% → 94.91% (+31.36%).
  - sourcing-links.service.ts: 58.58% → 97.97% (+39.39%).
  - Total tests: 685 → 764 (+79).
  - Added backend test suites: 40 → 45.
  - New reusable `prisma-composer-mock` helper (zero dependency).
  - Bonus hardening: stage cards → buttons, recent apps rows → Links, drawer dropzone accessible.

### Added

- docs/releases/v0.1.4.md.
- backend/src/test/helpers/prisma-composer-mock.ts.
- 4 new service specs (saga, metrics, organizations-core, links).
- SkipToContent component.
- useKeyboardClick hook.

### Fixed

- Zero visual regression across all a11y fixes.
- Zero breaking changes for public APIs.

### Security

- No changes to security posture.
- Multi-tenant isolation verified through coverage tests.

## [0.1.3] - 2026-10-16

### Changed

- **CI/CD Optimization (Task #32):**
  - Removed duplicate `pull_request` triggers from `ci-dev.yml` and `ci-staging.yml` (triggers only on push post-merge).
  - Added `dorny/paths-filter@v3` for `ci-dev.yml` and `ci-staging.yml`: docs-only changes bypass 11 architecture gates, running lightweight `docs-verify` job (~30s vs ~3m).
  - Replaced `pnpm test` (30s) in `.husky/pre-commit` with `lint-staged` (<5s staged file checks).
  - Added `.husky/pre-push` running `pnpm lint` + `pnpm typecheck` (~25s).
  - Implemented 3-tier Git hooks: pre-commit (<5s), pre-push (~25s), CI (full gates).

- **Dependabot Optimization:**
  - Rescheduled Dependabot from Monday 04:00 UTC → Saturday 04:00 UTC.
  - Added `production-dependencies` group and `security-updates` group.
  - Total 3 groups: dev-dependencies, production-dependencies, security.

- **Workflow Schedule Staggering:**
  - Moved `security-weekly.yml` from Monday 06:00 UTC → Wednesday 06:00 UTC (`0 6 * * 3`).
  - Updated `e2e-weekly.yml` target from `main` → `staging`.

- **Documentation Reorganization (Task #33):**
  - Merged 4 overlapping runbooks into 2 canonical files:
    - `ci-strategy.md` → merged Test Pyramid + Critical Paths into `ci-cd.md`.
    - `github-branch-protection.md` + `branch-protection-update.md` + `github-manual-fixes.md` → consolidated as `branch-protection.md`.
  - Archived 4 deprecated runbooks into `docs/archive/runbooks-deprecated/`.
  - Restructured `docs/reports/README.md` with 4-phase grouping:
    - Phase 1: Hardening (01-40).
    - Phase 2: Infrastructure (41-51).
    - Phase 3: Refactor (52-58).
    - Phase 4: Optimization (59+).

### Added

- **Release Notes:** `docs/releases/v0.1.1.md` (backfilled from Task #24).
- **Canonical Runbook:** `docs/runbooks/branch-protection.md` (unified from 3 files).
- **Report #63:** Task #33 Phase 2 completion report.

### Fixed

- Documentation links updated across 7 living docs (PROJECT_METRICS, PROJECT_CONTEXT, ROADMAP, TESTCASES, onboarding, README, CONTRIBUTING).
- Duplicate CI workflow runs eliminated (previously executed twice per merge).
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

### Security

- No vulnerabilities introduced during refactor.
- Saga pattern and distributed transaction integrity preserved.

---

## [0.1.1] - 2026-10-14

### Fixed

- **E2E Nightly Verification Failure:** Fixed authentication session injection in `webhook-settings.spec.ts` (commit `5237202`).
- **Dependabot Target Branch:** Configured automated updates to target `dev` branch instead of `main`.

### Infrastructure & Governance

- **3-Tier Promotion Flow:** Verified full end-to-end branch promotion pipeline (`dev` → `staging` → `main`).
- **Linear History Settings:** Adjusted branch rules to support GitHub Flow merge commits without commit SHA fragmentation.
- **Workflow Schedule Optimization:** Established scheduled weekly E2E sweep on Monday at 03:00 UTC.

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

---

_For historical pre-release development logs (Phases 1-22.8), see milestone releases in [docs/releases/](docs/releases/v0.1.0.md)._
