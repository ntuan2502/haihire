# HaiHire — Enterprise Multi-Tenant Applicant Tracking System (ATS)

HaiHire is a multi-tenant Applicant Tracking System built as a TypeScript monorepo with **Next.js 16**, **NestJS 12**, **Prisma 7**, **PostgreSQL 17**, **Valkey 8 / BullMQ**, and **MinIO S3 storage**.

---

See [Project Metrics](docs/PROJECT_METRICS.md) for the source-derived inventory.

---

## Architecture Highlights

- **Multi-Tenant Isolation:** Row-level `organizationId` filtering enforced at API guards (`TenantGuard`), controller/service boundaries, and static CI analysis ([scripts/check-tenant-scoping.ts](scripts/check-tenant-scoping.ts) inspecting 10 scoped backend modules).
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
│   └── web/                 # Next.js 16 App Router portal, Tailwind CSS v4, Shadcn new-york UI
├── packages/
│   └── shared/              # Pure TS schemas (Zod), RBAC matrix (5 roles / 41 perms), 72 error codes
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

# 3. Start PostgreSQL, Valkey/Redis, MinIO, and Caddy App Gateway (:8080)
docker compose up -d

# 4. Generate Prisma client, push schema, and seed sample workspace
pnpm db:generate
pnpm db:update
pnpm db:seed

# 5. Start API + Web development servers (visit http://localhost:8080 via Caddy)
pnpm dev
```

Standardized endpoints & 3-tier workflow:

- **Dev (`pnpm dev` + [docker-compose.yml](docker-compose.yml)):** `http://localhost:8080` via Caddy Gateway (`GATEWAY_PORT=8080`) routing `/api/*`, `/organizations/*`, and `/events/*` to NestJS (`BACKEND_PORT=3001`) and all UI routes to Next.js (`FRONTEND_PORT=3000`); Postgres `5432`, Valkey/Redis `6379`, MinIO `9000` / `9001`.
- **Local Docker Staging ([docker-compose.staging.yml](docker-compose.staging.yml)):** `http://localhost:8081` (`GATEWAY_PORT=8081`) builds local production Docker images, runs `prisma migrate deploy` automatically, and runs side-by-side with Dev.
- **Production ([docker-compose.prod.yml](docker-compose.prod.yml)):** GitHub Actions ([cd-release.yml](.github/workflows/cd-release.yml)) builds GHCR release images, VPS Host Nginx ([deploy/nginx/host-edge.conf](deploy/nginx/host-edge.conf)) terminates TLS and proxies to Caddy Gateway (`127.0.0.1:8080`).

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
- **Database Schema (`27` Models / `18` Enums):** [docs/architecture/data-model.md](docs/architecture/data-model.md)
- **Security & RBAC:** [docs/architecture/security-rbac.md](docs/architecture/security-rbac.md)
- **Engineering Conventions:** [docs/architecture/conventions.md](docs/architecture/conventions.md)
- **REST & SSE API (`14` Controllers / `145` Endpoints):** [docs/api/overview.md](docs/api/overview.md)
- **Decisions Log:** [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md)
- **Onboarding & QA:** [docs/guides/onboarding.md](docs/guides/onboarding.md)
- **SRE Runbooks:** [docs/runbooks/alerts.md](docs/runbooks/alerts.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
