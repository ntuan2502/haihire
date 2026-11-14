# HaiHire — Enterprise Multi-Tenant Applicant Tracking System (ATS)

HaiHire is a multi-tenant Applicant Tracking System built as a TypeScript monorepo with **Next.js 16**, **NestJS 12**, **Prisma 7**, **PostgreSQL 17**, **Valkey 8 / BullMQ**, and **MinIO S3 storage**.

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

## Architecture Highlights

- **Multi-Tenant Isolation:** Row-level `organizationId` filtering enforced at API guards (`TenantGuard`), controller/service boundaries, and static CI analysis ([scripts/check-tenant-scoping.ts](scripts/check-tenant-scoping.ts) inspecting 8 scoped backend modules).
- **Dynamic Owner + 5-Role / 41-Permission RBAC:** Mutable per-organization permission overrides (`OrganizationRolePermission`) with `ADMIN` immutability, dynamic `Organization.ownerId` ownership transfer, and `@haihire/shared` defaults.
- **Atomic Application Saga & Private Resume Storage:** `AsyncLocalStorage`-backed interactive Prisma transactions paired with private MinIO object prefixes (`tenants/<orgId>/...`), authenticated document downloads, and BullMQ dead-letter orphan cleanup (`orphan-cleanup-queue` / `orphan-cleanup-dlq`).
- **Real-Time Collaborative Workspace:** Redis/Valkey-backed Server-Sent Events (`GET /events/sse`) dispatching 17 `AppEventType`s into a debounced `createRealtimeInvalidator` over TanStack Query v5 caches.
- **Two-Tier Localization (`vi` / `en`):** Shared `TranslationSchema` enforced in CI (`pnpm lint:i18n` & `pnpm lint:error-i18n`) combined with user personal overrides (`preferredLanguage`, `preferredTimezone`) falling back to organization settings.

---

## Monorepo Layout

```text
haihire/
├── apps/
│   ├── api/                 # NestJS 12 REST + SSE API, Prisma 7 schema, BullMQ workers
│   └── web/                 # Next.js 16 App Router portal, Tailwind CSS v4, Shadcn base-nova UI
├── packages/
│   └── shared/              # Pure TS schemas (Zod), RBAC matrix (5 roles / 41 perms), 64 error codes
├── monitoring/prometheus/   # Prometheus alert rules + rule unit specs
├── scripts/                 # 18 CI architecture gates, backup, orphan cleanup, stats sync
└── docs/                    # Architecture, API contracts, guides, decisions, and SRE runbooks
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** `26.x`
- **pnpm** `12.18.0+`
- **Docker** (PostgreSQL 17.6, Valkey 8.0.2, MinIO)

### Setup & Run

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure root environment template
cp .env.example .env

# 3. Start PostgreSQL, Valkey/Redis, and MinIO containers
docker compose up -d postgres minio redis

# 4. Generate Prisma client, push schema, and seed sample workspace
pnpm db:generate
pnpm db:update
pnpm db:seed

# 5. Start API + Web development servers
pnpm dev
```

Default endpoints (configurable via root `.env`):

| Service                 | Default Port (`docker-compose.yml` / `.env.example`) | Typical Dev Override         |
| :---------------------- | :--------------------------------------------------- | :--------------------------- |
| **Next.js Web Portal**  | `3000` (`FRONTEND_PORT`)                             | `13000` (Playwright default) |
| **NestJS Backend API**  | `3001` (`BACKEND_PORT`)                              | `13001`                      |
| **PostgreSQL 17**       | `5432` (`POSTGRES_PORT`)                             | `15432`                      |
| **Valkey / Redis 8**    | `6379` (`REDIS_PORT`)                                | `16379`                      |
| **MinIO API / Console** | `9000` / `9001`                                      | `19000` / `19001`            |

---

## Verification & Quality Gates

```bash
pnpm test            # Backend (api + scripts + monitoring) and Frontend Vitest suites
pnpm lint            # ESLint across api, web, and shared
pnpm typecheck       # TypeScript 6 compiler checks
pnpm build           # Production esbuild server.mjs + Next.js standalone bundles
pnpm check:all       # Full 18-gate CI architecture, security, i18n, doc, and build verification
```

---

## Documentation Index

- **Portal:** [docs/README.md](docs/README.md)
- **System Overview:** [docs/architecture/system-overview.md](docs/architecture/system-overview.md)
- **Database Schema (`22` Models / `18` Enums):** [docs/architecture/data-model.md](docs/architecture/data-model.md)
- **Security & RBAC:** [docs/architecture/security-rbac.md](docs/architecture/security-rbac.md)
- **Engineering Conventions:** [docs/architecture/conventions.md](docs/architecture/conventions.md)
- **REST & SSE API (`12` Controllers / `107` Endpoints):** [docs/api/overview.md](docs/api/overview.md)
- **Decisions Log:** [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md)
- **Onboarding & QA:** [docs/guides/onboarding.md](docs/guides/onboarding.md)
- **SRE Runbooks:** [docs/runbooks/alerts.md](docs/runbooks/alerts.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
