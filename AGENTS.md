# HaiHire Platform — AI Coding Agent Operating Guide (AGENTS.md)

> This document is the primary architectural contract and operational protocol for all AI coding agents, contributors, and automated tooling operating within the HaiHire codebase. Every rule defined herein is strictly binding.

---

<!-- STATS:START -->

| Metric                           | Value                             | Reference / Notes                                   |
| :------------------------------- | :-------------------------------- | :-------------------------------------------------- |
| **Release Target**               | `v0.3.0`                          | Pre-tag feature branch `feat/v0.3.0-rbac-agents-ci` |
| **Commit Baseline**              | `a12ffa8` (2026-10-21)            | Author: Tún                                         |
| **Workspace Unit Tests**         | `963 passed`                      | Backend: 540, Frontend: 423                         |
| **E2E Playwright Specs**         | `23 specs`                        | End-to-end recruitment lifecycle                    |
| **CI Architecture Gates**        | `16/16 gates`                     | `pnpm check:all` mandatory gates                    |
| **Environment Configuration**    | `55 keys`                         | 100% key parity & codebase sync                     |
| **Pre-Release Dependencies**     | `3 packages (covered by ADR-001)` | Prisma 8 RC & effect override                       |
| **Documentation Link Integrity** | `100% valid`                      | Audited via `pnpm lint:doc-links`                   |

<!-- STATS:END -->

---

## 1. Project Identity

HaiHire is a modern, high-performance, multi-tenant Applicant Tracking System (ATS) engineered for enterprise recruitment workflows.

### Core Technology Stack

- **Runtime & Package Management:** Node.js 26 (LTS baseline), pnpm 12 monorepo.
- **Backend Architecture:** NestJS 12.1.2 modular monolith, Fastify engine, Saga transaction orchestration with compensating actions, and BullMQ async job queues.
- **Frontend Architecture:** Next.js 16 (App Router with React 19 Server Components), `@tanstack/react-query` v5 client state caching, Base UI / Radix UI primitives, Tailwind CSS v4, and 2-way i18n dictionary.
- **Database & Contract:** PostgreSQL 17.6 managed via **Prisma 8 RC** (`@prisma/orm-postgres@8.0.0-rc.13`, contract `./src/prisma/contract.prisma`, `backend/migrations/app/`).
- **Distributed Cache & State:** Valkey 8.0.2 (Redis-compatible, BSD licensed).
- **Object Storage:** MinIO S3-compatible storage with tenant path isolation and buffer magic byte verification.

### Key Architectural Decision Records (ADRs)

- [**ADR-001: Acceptance of 11 High CVEs from Prisma 8 RC / Alchemy as Known Limitation**](docs/adr/ADR-001-prisma-8-rc.md)
- [**ADR-002: Next.js Proxy Rewrites without /api Prefix & v0.4.0 Standardization**](docs/adr/ADR-002-frontend-rewrite-path.md)

---

## 2. Repository Structure

HaiHire is organized as a strict pnpm monorepo workspace.

```
haihire/
├── backend/                  # NestJS 12 enterprise backend application
│   ├── migrations/app/       # Prisma 8 migration files (migration.ts, ops.json, migration.sql)
│   ├── src/
│   │   ├── applications/     # Candidate applications module & Saga orchestrators
│   │   ├── auth/             # JWT auth, RBAC guards, decorators, strategies
│   │   ├── candidates/       # Candidate profiles, resumes & PII encryption
│   │   ├── common/           # Shared guards, interceptors, pipes, encryption
│   │   ├── config/           # Centralized Zod fail-fast environment schema (env.ts)
│   │   ├── email/            # Email templates & providers (Resend, SendGrid, SMTP)
│   │   ├── interviews/       # Scheduling, scorecards & feedback
│   │   ├── jobs/             # Job requisitions, lifecycle stages & pipelines
│   │   ├── metrics/          # Prometheus metrics exporter & alerting probes
│   │   ├── organizations/    # Multi-tenant organization scoping & memberships
│   │   ├── prisma/           # Prisma 8 contract (contract.prisma), client, service
│   │   ├── sourcing/         # Candidate sourcing & attribution tracking links
│   │   └── webhook-settings/ # Webhook integrations (Telegram, Discord, Generic)
│   └── vitest.config.ts      # Backend test runner configuration
├── frontend/                 # Next.js 16 + React 19 frontend application
│   ├── next.config.ts        # Next.js configuration & backend rewrites (see ADR-002)
│   ├── src/
│   │   ├── app/              # Next.js App Router (pages, layouts, error boundaries)
│   │   ├── components/       # UI feature & shared presentation components
│   │   ├── constants/        # Application constants & error translations
│   │   ├── context/          # React contexts (AuthContext, ThemeContext)
│   │   ├── hooks/            # Custom React hooks (e.g. useHasPermission)
│   │   ├── lib/              # Axios client, stage helpers, env schema (env.ts)
│   │   └── types/            # Frontend TypeScript definitions
│   └── vitest.config.mts     # Frontend test runner configuration
├── packages/
│   └── shared/               # Universal domain models, RBAC permissions, types
│       ├── package.json      # @haihire/shared package manifest
│       └── src/
│           ├── index.ts      # Main barrel re-export
│           ├── permissions.ts# 6 roles & 32 permission definitions (hasPermission)
│           ├── organizations.ts # Tenant types & organization roles
│           └── ...           # Shared entities & schemas
├── scripts/                  # CI verification gates & operational automation
├── docs/                     # Architecture, runbooks, metrics, and ADRs
│   ├── adr/                  # Architectural Decision Records (ADR-001, ADR-002)
│   └── PROJECT_METRICS.md    # Single source of truth metrics baseline
├── .agents/                  # Antigravity AI rules, memory, and specialized skills
├── docker-compose.yml        # Development infrastructure container stack
├── docker-compose.prod.yml   # Production container stack definition
├── .env.example              # Development environment 55-key template
└── .env.production.example   # Production environment template
```

> 🔴 **CRITICAL PATH RULE:** The shared workspace package is located strictly at `packages/shared/` and published internally as `@haihire/shared`. **NEVER** use the literal shorthand `shared/` without the `packages/` prefix in code, imports, markdown documentation, or bash scripts.

---

## 3. Code Rules

Every contribution must adhere strictly to these non-negotiable coding rules:

1. **Pure TypeScript Mandate:** Every file must be TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`). Zero plain JavaScript (`.js`, `.cjs`, `.mjs`) files are permitted anywhere in the repository.
2. **Strict Zero-Any Typing:** The TypeScript `any` type is strictly forbidden across all workspaces (`backend`, `frontend`, `packages/shared`, `scripts`). Use explicit types, generics, `unknown`, or Zod inferred types.
3. **Fail-Fast Centralized Environment Validation:**
   - All environment variables are validated at boot via centralized Zod schemas (`backend/src/config/env.ts` and `frontend/src/lib/env.ts`).
   - Zero runtime fallbacks or silent defaults for security secrets (`JWT_SECRET`, `ENCRYPTION_SECRET`, `DATABASE_URL`).
   - Direct access to `process.env.X` inside business logic or controllers is forbidden; import and use `backendEnv` or `env`.
4. **100% DtoPipe Validation Coverage:** Every controller `@Body()` parameter in NestJS must be protected by `@Body(DtoPipe)` to guarantee runtime type safety and payload sanitization (enforced by `pnpm lint:dtopipe`).
5. **100% Two-Way i18n Localization:**
   - Zero hardcoded human-readable strings in JSX/TSX.
   - All labels, placeholders, titles, and notifications must be mapped to translation keys in `frontend/src/constants/translations/` and consumed via `t('key')` (enforced by `pnpm lint:i18n`).
6. **Fixed 6-Role RBAC Authorization:**
   - 6 roles: `OWNER`, `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`.
   - 32 granular permissions declared in `@haihire/shared` (`packages/shared/src/permissions.ts`).
   - Controllers must be guarded via `@RequirePermission(PERMISSIONS.<RESOURCE>_<ACTION>)` and `RequirePermissionGuard`.
   - The `OWNER` role holds unconditional super-admin bypass.
   - Controllers must never perform direct role checking; always inspect permissions.

---

## 4. Testing Rules

1. **Test Suite Hygiene:**
   - Unit and integration tests must live adjacent to the source file they test (`*.spec.ts`, `*.spec.tsx`).
   - E2E Playwright tests live in `e2e/*.spec.ts`.
2. **Zero-Tolerated Regression:**
   - Running `pnpm test` executes the complete suite (540 backend tests + 423 frontend tests = 963 tests).
   - Test count delta is verified by `pnpm test:diff` (Gate 12 / `scripts/check-test-count.ts`); net test count cannot decrease.
3. **No Skipped or Commented-Out Tests:**
   - Never use `it.skip`, `describe.skip`, `test.skip`, or comment out existing tests to force CI to pass.
4. **AAA Testing Pattern:** All unit tests must structure logic using Arrange-Act-Assert.

---

## 5. Documentation Rules

1. **Documentation Parity:**
   - When modifying environment variables: immediately update `.env.example`, `.env.production.example`, and verify with `pnpm lint:env-sync`.
   - When introducing or altering architectural decisions: author a formal ADR under `docs/adr/ADR-XXX-<name>.md`.
   - When updating endpoints or error codes: synchronize `docs/api/overview.md` and error dictionaries in `packages/shared`.
2. **Link Portability & Markdown Integrity:**
   - All markdown links must use relative paths (`../`, `./`) targeting existing files on disk.
   - Every markdown file is validated by `pnpm lint:doc-links` (Gate 11) and `pnpm lint:doc-sync` (Gate 13).

---

## 6. CI Gate Rules

The HaiHire platform enforces a 13-stage automated verification pipeline via `pnpm check:all`. Every pull request must pass 13/13 gates before merging.

|   #    | Gate ID                 | Command                          | Implementation Script                    | Validation Objective                                                   |
| :----: | :---------------------- | :------------------------------- | :--------------------------------------- | :--------------------------------------------------------------------- |
| **1**  | `lint:env-sync`         | `pnpm lint:env-sync`             | `scripts/check-env-sync.ts`              | 100% key parity dev/prod, Docker compose coverage & codebase sync      |
| **2**  | `lint:i18n`             | `pnpm lint:i18n`                 | `scripts/check-i18n.ts`                  | 2-way dictionary symmetry (vi/en) and zero hardcoded JSX strings       |
| **3**  | `lint`                  | `pnpm lint`                      | `eslint .` (Backend & Frontend)          | Zero ESLint warnings or errors; clean-code style compliance            |
| **4**  | `typecheck`             | `pnpm typecheck`                 | `tsc --noEmit`                           | Zero TypeScript compiler errors across all workspace packages          |
| **5**  | `lint:dtopipe`          | `pnpm lint:dtopipe`              | `scripts/check-dtopipe-coverage.ts`      | 100% of `@Body()` parameters guarded by `DtoPipe`                      |
| **6**  | `lint:error-i18n`       | `pnpm lint:error-i18n`           | `scripts/check-error-code-i18n.ts`       | 100% domain error codes translated in both `vi.ts` and `en.ts`         |
| **7**  | `lint:api-contract`     | `pnpm lint:api-contract`         | `scripts/check-api-contract-coverage.ts` | API contract synchronization, zero raw Error leaks, zero `alert()`     |
| **8**  | `lint:prometheus-rules` | `pnpm lint:prometheus-rules`     | `scripts/check-prometheus-rules.ts`      | Valid PromQL alert rules, required `sre` team labels & annotations     |
| **9**  | `lint:tenant-scope`     | `pnpm lint:tenant-scope`         | `scripts/check-tenant-scoping.ts`        | 100% of Prisma queries isolated by tenant `organizationId`             |
| **10** | `lint:doc-links`        | `pnpm lint:doc-links`            | `scripts/verify-doc-links.ts`            | Zero broken relative markdown links across docs and memory             |
| **11** | `check:prod-email`      | `pnpm check:prod-email-provider` | `scripts/check-prod-email-provider.ts`   | Prohibits simulated email provider in production environments          |
| **12** | `test:diff`             | `pnpm test:diff`                 | `scripts/check-test-count.ts`            | Detects and blocks test count regression against `HEAD~1`              |
| **13** | `lint:doc-sync`         | `pnpm lint:doc-sync`             | `scripts/check-doc-sync.ts`              | Verifies doc paths existence, env sync, metrics sync, and ADR coverage |

---

## 7. Forbidden Patterns

| ❌ Forbidden Pattern             | Reason / Risk                                                   | ✅ Approved Pattern                                            |
| :------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------------- |
| `any` or `as any`                | Bypasses type safety, introduces runtime null/undefined crashes | Explicit interfaces, generics, Zod `z.infer<T>`, or `unknown`  |
| Inline styles (`style={{...}}`)  | Defeats design token system, violates CSP style policies        | Tailwind CSS v4 design tokens and utility classes              |
| Hardcoded UI string in JSX       | Breaks multi-language support (Vietnamese / English)            | `t('translation_key')` mapped in `TranslationSchema`           |
| `process.env.VARIABLE` in code   | Bypasses boot fail-fast validation, allows missing env drift    | Import typed `backendEnv` from `config/env.ts` or `env`        |
| `SEED_DEMO_ON_BOOT=true` in prod | Overwrites production database records with demo fixtures       | Boot seed restricted strictly to `NODE_ENV=development`        |
| `\|\| true` in CI workflow steps | Masks test or security failures, breaks CI gates                | Fix the root cause or formally document in an ADR              |
| Commented-out tests or `.skip`   | Hides regressions and inflates false confidence                 | Maintain passing tests or refactor to reflect contract changes |
| `shared/` shorthand path         | Ambiguous path; breaks scripts expecting workspace package      | `packages/shared/` or `@haihire/shared`                        |
| Direct Prisma query without org  | Cross-tenant data leakage vulnerability                         | Filter every query with `where: { organizationId }`            |
| Unescaped HTML in email strings  | Cross-Site Scripting (XSS) vulnerability in user mailboxes      | Sanitize context variables and use safe template engine        |
