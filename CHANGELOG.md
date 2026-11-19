# Changelog

All notable architectural milestones and releases for **HaiHire Platform** are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning (`v0.1.0` workspace baseline; see [Versioning Policy](docs/runbooks/versioning.md)).

---

## [Unreleased]

### Security

- Closed three cross-tenant IDOR gaps in interview query filtering/enrichment (`interviews-query.service.ts`), attribution logging (`sourcing-metrics.service.ts`), and tracking link updates (`sourcing-links.service.ts`), backed by cross-tenant unit tests.
- Eliminated greedy multi-method masking in [scripts/check-tenant-scoping.ts](scripts/check-tenant-scoping.ts) so parent guards in earlier methods cannot exempt unscoped queries in later methods; resolved 5 surfaced tenant-scoping findings across `candidates-documents.service.ts`, `jobs.service.ts`, and `organizations-invites.service.ts`.
- Verified `GET /metrics` constant-time Bearer `METRICS_TOKEN` protection (`crypto.timingSafeEqual`) returning `404` when unconfigured in production.

### Fixed

- Enforced `deletedAt: null` checks when validating `Job` and `Candidate` entities during application creation sagas, and cleanly restored soft-deleted candidate records when re-applying with an existing email under the unique `(organizationId, email)` constraint.
- Added best-effort MinIO object deletion compensation inside application and candidate `deleteDocument` workflows.
- Fixed SendGrid `From:` parser (`parseSendGridFrom`) to extract both display name and email address cleanly.
- Fixed demo auto-seed ordering in `PrismaService.onModuleInit` and `AuthService.validateRecruiter` (`User` created/upserted with `organizationId: null` -> `Organization` created with `ownerId` -> `User.organizationId` linked) inside transactions.
- Enforced fail-on-regression (`netNew < 0`) in [scripts/check-test-count.ts](scripts/check-test-count.ts) and corrected SARIF artifact paths (`trivy-api-results.sarif`, `trivy-web-results.sarif`) in `.github/workflows/cd-release.yml`.
- Migrated [CustomSelect](apps/web/src/components/shared/custom-select.tsx) and [CustomSelectPopup](apps/web/src/components/shared/custom-select-popup.tsx) off raw `createPortal` onto Radix `Popover` (`Popover`, `PopoverAnchor`, `PopoverContent`), fixing pointer interaction, search input focus, and wheel/touch scroll when used inside modal `Dialog` and `Sheet` overlays.

### Changed

- Standardized [apps/web](apps/web/README.md) onto Shadcn `new-york` (`radix-ui` + standalone `cn` package), removing `@base-ui/react`, unused `@radix-ui/*` packages, and retired custom overlay files (`CustomModal`, `JobQuickDetailDrawer`, `SourcingHeader`).
- Introduced shared overlay archetypes under `apps/web/src/components/shared/` (`ConfirmDestructiveModal` / `ConfirmModal`, `FormModal`, `PreviewModal`, `DetailModal`, `SlideOver` / `DetailDrawer`, `FilterDrawer` + `FilterPillGroup`, `ColumnPicker`) plus [FlowEmailToggleField](apps/web/src/components/email/flow-email-toggle-field.tsx), and migrated workspace modals, drawers, filter drawers, column pickers, and row action menus onto Radix primitives.
- Synchronized layout structure, typography, controls, and mobile responsiveness across the 5 workspace list pages (`jobs`, `candidates`, `applications`, `interviews`, `source-tracking`) using [PageHeader](apps/web/src/components/shared/page-header.tsx) (`font-bold` titles, `rounded-full` count pills), `h-9` primary CTA and Filter toolbar buttons, `RotateCcw` Reset actions, active filter chip strips, uppercase `<thead>` sort headers, `h-8 w-8` row action icon buttons, and in-card [Pagination](apps/web/src/components/shared/pagination.tsx) footers.
- Synchronized `minimumReleaseAgeExclude` in [pnpm-workspace.yaml](pnpm-workspace.yaml) with active `next@16.4.5`, `eslint-config-next@16.4.5`, `bullmq@6.7.2`, and `lucide-react@1.70.0` versions.
- Rebuilt `.agents/skills/` around 6 HaiHire-specific skills aligned with current official documentation (`Next.js 16`, `React 19`, `Tailwind CSS v4`, `Shadcn v4`, `TanStack Query v5`, `NestJS 12`, `Prisma 7.10.1`, `BullMQ`, `Vitest 5`, `Playwright`).
- Rebuilt project documentation under [docs/](docs/README.md), root markdowns, and workspace READMEs from verified source-code ground truth.

---

## [0.1.0] — Baseline

### Added

- Multi-tenant NestJS 12 ESM backend (`15` feature/infra modules imported in `AppModule`, `12` controllers, `107` endpoints) with PostgreSQL 17 + Prisma `7.10.1` (`@prisma/adapter-pg`, `22` models, `18` enums).
- Next.js 16 App Router portal (`output: "standalone"`, `src/proxy.ts`) with React 19, Tailwind CSS v4 (`oklch`), Shadcn UI, TanStack Query v5, Axios silent refresh queue, SSE real-time cache invalidation (`17` `AppEventType`s), and 2-tier `vi`/`en` localization (`64` `APP_ERROR_CODES`).
- Dynamic `Organization.ownerId` RBAC with `5` roles, `41` permissions, mutable `OrganizationRolePermission` overrides, invite links, and audit logging.
- Asynchronous BullMQ processing (`email-queue` / `email-dlq-queue`, `orphan-cleanup-queue` / `orphan-cleanup-dlq`) and Prometheus metrics + alerting suite.
- `18`-gate CI architecture pipeline (`pnpm check:all`) with Vitest backend/frontend unit specs and Playwright E2E test suite (`9` spec files / `34` test cases).
