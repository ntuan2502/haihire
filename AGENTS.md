# HaiHire Platform — AI Coding Agent Operating Guide (`AGENTS.md`)

> Authoritative operating contract for AI coding agents and contributors working in the **HaiHire** enterprise ATS monorepo (`apps/api`, `apps/web`, `packages/shared`).

---

<!-- STATS:START -->

| Metric                           | Value                   | Reference / Notes                 |
| :------------------------------- | :---------------------- | :-------------------------------- |
| **Release Target**               | `Unreleased`            | Fresh baseline (post-reset)       |
| **Commit Baseline**              | `6057af18` (2026-11-12) | Author: ntuan2502                 |
| **Workspace Unit Tests**         | `1527 passed`           | Backend: 936, Frontend: 591       |
| **E2E Playwright Specs**         | `34 specs`              | End-to-end recruitment lifecycle  |
| **CI Architecture Gates**        | `18/18 gates`           | `pnpm check:all` mandatory gates  |
| **Environment Configuration**    | `56 keys`               | 100% key parity & codebase sync   |
| **Pre-Release Dependencies**     | `0 (GA only)`           | Prisma 7.10.1 Stable GA           |
| **Documentation Link Integrity** | `100% valid`            | Audited via `pnpm lint:doc-links` |

<!-- STATS:END -->

---

## 1. Mandatory Reading Order & Skills

All AI agents working in this repository MUST read and follow:

1. **Architecture & Coding Rules:**
   - [Engineering Conventions](docs/architecture/conventions.md) — TypeScript discipline, centralized Zod env validation, `DtoPipe` coverage, 2-way i18n, multi-tenant `organizationId` scoping, Next.js 16 `src/proxy.ts` rules, and Shadcn `base-nova` UI standards.
   - [Architectural Decisions](docs/decisions/DECISIONS.md) — Decisions `D-001` through `D-016` (including Prisma `7.10.1` Stable GA + `@prisma/adapter-pg`).
2. **HaiHire Specialized Agent Skills (`.agents/skills/`):**
   - [haihire-nextjs-react](.agents/skills/haihire-nextjs-react/SKILL.md) — Next.js `16.4.5`, React `19.3.1`, Tailwind CSS `^4.3.5`, `shadcn@^4.23.0` (`base-nova` + `@base-ui/react` + standalone `cn`).
   - [haihire-frontend-data-i18n](.agents/skills/haihire-frontend-data-i18n/SKILL.md) — TanStack Query `^5.107.1`, Axios URL Gatekeeper & 401 refresh queue, 17-event SSE invalidation, `react-toastify`, 2-tier vi/en i18n.
   - [haihire-nestjs-backend](.agents/skills/haihire-nestjs-backend/SKILL.md) — NestJS `^12.4.0` ESM (`esbuild`), explicit `@Inject`, `DtoPipe`, 64 `APP_ERROR_CODES`, cookie JWT + `tokenVersion`, dynamic `ownerId` RBAC (`5` roles / `41` permissions), BullMQ DLQ queues, MinIO tenant isolation.
   - [haihire-prisma-postgres](.agents/skills/haihire-prisma-postgres/SKILL.md) — Prisma `7.10.1` (`@prisma/adapter-pg`), `22` models / `18` enums, `AsyncLocalStorage` transaction propagation, `8` tenant-scoped backend modules, `deletedAt` soft-delete rules.
   - [haihire-testing-qa](.agents/skills/haihire-testing-qa/SKILL.md) — Vitest `5.1.0`, `createMockPrismaService`, RTL `jsdom`, Playwright `^1.65.0` E2E specs, `pnpm test:diff` gate.
   - [haihire-devops-release](.agents/skills/haihire-devops-release/SKILL.md) — `pnpm@12.18.0` catalog, Turborepo `^2.11.10`, Node 26 Alpine Dockerfiles, `18/18` CI architecture gates, GitHub Actions workflows.

---

## 2. Verified Platform Architecture Snapshot

| Layer                                    | Implemented Stack & Ground Truth                                                                                                                                                                                                     | Authoritative Source                                                     |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Runtime & Monorepo**                   | Node `26`, `pnpm@12.18.0`, `turbo@^2.11.10`, TypeScript `^6.0.3`                                                                                                                                                                     | [package.json](package.json), [pnpm-workspace.yaml](pnpm-workspace.yaml) |
| **Shared Contracts (`@haihire/shared`)** | `5` Roles, `41` Permissions, `64` `APP_ERROR_CODES`, `17` SSE `AppEventType`s, `16` `SourcingChannel`s, Zod schemas                                                                                                                  | [packages/shared/src/index.ts](packages/shared/src/index.ts)             |
| **Backend (`apps/api`)**                 | NestJS `^12.4.0` (Express ESM -> `dist/server.mjs`), `15` feature/infra modules imported in `AppModule`, `12` controllers, `107` endpoints, BullMQ (`email-queue`, `orphan-cleanup-queue`), MinIO (`haihire-resumes` private bucket) | [docs/api/overview.md](docs/api/overview.md)                             |
| **Database (`PostgreSQL 17.6`)**         | Prisma `7.10.1` (`@prisma/adapter-pg` + `pg.Pool`), `22` models, `18` enums, `3` soft-delete models (`Job`, `Candidate`, `TrackingLink`)                                                                                             | [docs/architecture/data-model.md](docs/architecture/data-model.md)       |
| **Frontend (`apps/web`)**                | Next.js `16.4.5` (`output: "standalone"`, `src/proxy.ts`), React `19.3.1`, Tailwind CSS `^4.3.5` (`oklch`), Shadcn `base-nova` (`@base-ui/react` + `cn@^0.5.2`), TanStack Query `^5.107.1`                                           | [apps/web/README.md](apps/web/README.md)                                 |

---

## 3. Agent Rules & Conflict Hierarchy

- **Prohibited Artifacts:** Do NOT create transient investigation/milestone markdown reports in root or `docs/`. Keep `docs/` synchronized cleanly with code changes.
- **Documentation Verification:** Never use `file://` URLs, backslashes (`\`), or unverified file paths in markdown files; run `pnpm lint:doc-links` and `pnpm lint:doc-sync` after doc edits.
- **Single Source of Truth:** Do not duplicate schemas, error tables, or env definitions across unrelated files—link to the authoritative document instead.
- **Conflict Precedence:** Ground-truth source code and [Engineering Conventions](docs/architecture/conventions.md) + [Architectural Decisions](docs/decisions/DECISIONS.md) take precedence over secondary notes.

---

## 4. Documentation Index

| Area                                 | Document                                                                                 |
| :----------------------------------- | :--------------------------------------------------------------------------------------- |
| **Documentation Portal**             | [docs/README.md](docs/README.md)                                                         |
| **Platform Metrics**                 | [docs/PROJECT_METRICS.md](docs/PROJECT_METRICS.md)                                       |
| **System Overview**                  | [docs/architecture/system-overview.md](docs/architecture/system-overview.md)             |
| **Data Model (`22` models)**         | [docs/architecture/data-model.md](docs/architecture/data-model.md)                       |
| **Security & RBAC**                  | [docs/architecture/security-rbac.md](docs/architecture/security-rbac.md)                 |
| **Conventions (SSOT)**               | [docs/architecture/conventions.md](docs/architecture/conventions.md)                     |
| **Architectural Decisions**          | [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md)                               |
| **REST & SSE API (`107` endpoints)** | [docs/api/overview.md](docs/api/overview.md)                                             |
| **Developer Onboarding**             | [docs/guides/onboarding.md](docs/guides/onboarding.md)                                   |
| **SRE & Ops Runbooks**               | [docs/runbooks/alerts.md](docs/runbooks/alerts.md)                                       |
| **Releases & Versioning**            | [CHANGELOG.md](CHANGELOG.md), [docs/runbooks/versioning.md](docs/runbooks/versioning.md) |

---

## 5. Key Verification Commands

```bash
# Mandatory 18-gate architecture & build pipeline
pnpm check:all

# Individual verification gates
pnpm lint:doc-links
pnpm lint:doc-sync
pnpm lint:tenant-scope
pnpm lint:dtopipe
pnpm lint:i18n
pnpm lint:error-i18n
pnpm lint:env-sync
pnpm lint:nextjs-conventions
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:stats:write
```
