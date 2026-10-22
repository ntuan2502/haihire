# HaiHire Enterprise ATS Platform

> Modern, AI-powered Applicant Tracking System (ATS) engineered for enterprise recruitment workflows.  
> Built with NestJS 12, Next.js 16 (App Router & Server Components), PostgreSQL 17, Prisma 8, Valkey 8, and MinIO S3 storage.

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

## 🤖 AI Agent Guidelines

All AI coding agents, contributors, and automation workflows must comply with the guidelines defined in [**AGENTS.md**](AGENTS.md).

---

## 🚀 Key Architectural Highlights

- **Backend Architecture:** NestJS 12.1.2 modular monolith with Saga transaction orchestration, compensations, AsyncLocalStorage request context tracking, and DLQ-backed BullMQ processing.
- **Frontend Architecture:** Next.js 16.4.0 with React 19 Server Components (RSC), `@tanstack/react-query` v5 client caching, Base UI / Radix UI primitives, Tailwind CSS v4, and dual-language internationalization (vi / en).
- **Data & Storage:** PostgreSQL 17.6 managed via Prisma 8 ORM, Valkey 8.0.2 for distributed caching / rate limiting, and MinIO S3 object storage for candidate resumes.
- **Security & Reliability:** Strict HttpOnly JWT cookies, CSRF protection, AES-256 data encryption at rest, 16 comprehensive CI gates, and 963 verified automated tests.

---

## 📋 System Prerequisites

Ensure the following tools are installed on your host system:

| Prerequisite                | Version           | Verification Command     |
| :-------------------------- | :---------------- | :----------------------- |
| **Node.js**                 | `>= 26.0.0` (LTS) | `node -v`                |
| **pnpm**                    | `>= 12.0.0`       | `pnpm -v`                |
| **Docker Engine & Compose** | `>= 27.0.0`       | `docker compose version` |

---

## 🌐 Port Allocation Architecture

HaiHire employs strict non-standard port offsets to prevent conflicts with local development services:

| Service           | Host Port (Local Dev) | Container Port | Purpose / Description                 |
| :---------------- | :-------------------: | :------------: | :------------------------------------ |
| **Frontend Web**  |        `13000`        |     `3000`     | Next.js recruiter & candidate portal  |
| **Backend API**   |        `13001`        |     `3001`     | NestJS REST API & health probes       |
| **PostgreSQL**    |        `15432`        |     `5432`     | Primary relational database           |
| **Valkey**        |        `16379`        |     `6379`     | Cache, sessions & async BullMQ queues |
| **MinIO API**     |        `19000`        |     `9000`     | S3-compatible resume upload endpoint  |
| **MinIO Console** |        `19001`        |     `9001`     | S3 bucket management web interface    |

---

## ⚡ Quick Start (Local Development)

### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/ntuan2502/haihire.git
cd haihire
pnpm install
```

### 2. Configure Environment

HaiHire utilizes a unified Single Source of Truth environment architecture. Copy the template:

```bash
cp .env.example .env
```

_(On Windows PowerShell: `Copy-Item .env.example .env`)_

All services (Backend, Frontend, Prisma CLI, and Docker Compose) read directly from this single root `.env` file.

> For complete architecture details, read the [Environment Management Runbook](docs/runbooks/env-management.md).

### 3. Spin Up Infrastructure Containers

Start PostgreSQL, Valkey, and MinIO in the background:

```bash
pnpm docker:infra:up
```

### 4. Run Database Migrations & Seeds

Initialize database schemas and populate demo seed data:

```bash
pnpm db:setup
```

### 5. Launch Full Stack

Run backend and frontend dev servers concurrently:

```bash
pnpm dev
```

- Open Frontend: [http://localhost:13000](http://localhost:13000)
- Backend API Health: [http://localhost:13001/health](http://localhost:13001/health)
- MinIO Web Console: [http://localhost:19001](http://localhost:19001)

---

## 🛠️ CLI Script Reference

| Command                   | Purpose                                                                                                                       |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                | Start backend (`13001`) and frontend (`13000`) concurrently in watch mode                                                     |
| `pnpm build`              | Build shared package, backend bundle (`dist/server.mjs`), and Next.js frontend                                                |
| `pnpm check:all`          | Run complete 16-gate CI verification (lint, typecheck, tests, env sync, contracts, alerts, tenant scope, doc links, doc sync) |
| `pnpm check:all:fast`     | Run rapid pre-commit verification (skip long-running smoke/load tests)                                                        |
| `pnpm test`               | Run full unit & integration test suite (963 tests across backend & frontend)                                                  |
| `pnpm test:e2e`           | Run Playwright end-to-end browser tests                                                                                       |
| `pnpm db:setup`           | Push Prisma schema changes and execute database seeds                                                                         |
| `pnpm docker:prod:up`     | Launch production container stack (`docker-compose.prod.yml`)                                                                 |
| `pnpm docker:prod:config` | Validate production Compose file against `.env.production`                                                                    |

---

## 📂 Documentation Directory

Comprehensive system documentation is maintained under the [`docs/`](docs/README.md) directory:

> 🧭 For full navigation across all architecture blueprints, specifications, and runbooks, visit the [**HaiHire Documentation Portal**](docs/README.md).

- 🧭 [**Documentation Portal**](docs/README.md): Central navigation matrix mapping developer and operator queries to specifications.
- 🏛️ [**System Architecture Overview**](docs/architecture/system-overview.md): High-level topology, Mermaid diagrams, and core patterns.
- 📐 [**Engineering Conventions (SSOT)**](docs/architecture/conventions.md): Pure TypeScript, fail-fast env, DtoPipe, i18n, and tenant scoping rules.
- 📋 [**Data Model & Schema**](docs/architecture/data-model.md): 16 Prisma models, relations, cascade rules, and soft-delete retention.
- 🔐 [**Security & RBAC Architecture**](docs/architecture/security-rbac.md): Cookie JWT auth, dynamic org ownership, 5 roles, 41 permissions.
- 🔌 [**REST API Overview**](docs/api/overview.md): Controller mappings, 86 REST endpoints, auth, and error contracts.
- 📊 [**Project Metrics (Single Source of Truth)**](docs/PROJECT_METRICS.md): Master metrics, verification counts, and architectural baseline.
- 📖 [**Developer Onboarding Guide**](docs/onboarding.md): Step-by-step onboarding for new team members.
- 🚀 [**Production Deployment Plan**](docs/runbooks/production-deployment-plan.md): 5-phase production release protocol.
- 💾 [**Backup & Disaster Recovery**](docs/runbooks/backup-and-restore.md): Automated PostgreSQL dumps, MinIO hot backup, and restore drills.
- 🚨 [**Monitoring & Alerting Runbook**](docs/runbooks/alerts.md): Prometheus alert catalog and emergency SOPs.

---

## 🏛️ Architectural Decisions Log

Critical architectural choices, trade-offs, and pre-release package rationales are consolidated in [`docs/decisions/DECISIONS.md`](docs/decisions/DECISIONS.md):

- [**D-001: Acceptance of 11 High CVEs from Prisma 8 RC / Alchemy as Known Limitation**](docs/decisions/DECISIONS.md#d-001)
- [**D-002: Next.js Proxy Rewrites without /api Prefix & v0.4.0 Standardization**](docs/decisions/DECISIONS.md#d-002)
- [**D-003: Dynamic Organization Ownership via Organization.ownerId and Deprecation of Role.OWNER**](docs/decisions/DECISIONS.md#d-003)
- [**D-004: Next.js 16 Proxy Convention Adoption (proxy.ts Replaces middleware.ts)**](docs/decisions/DECISIONS.md#d-004)
- [**D-005: GitHub Actions dorny/paths-filter@v4 Upgrade and Node 24 Action Baseline**](docs/decisions/DECISIONS.md#d-005)
- [**D-006: Separation of Recruitment ActivityLog from Enterprise Tenant Administration**](docs/decisions/DECISIONS.md#d-006)

---

## ⚠️ Known Limitations (v0.3.0 Release)

1. **Transitive High CVEs in Build Tooling:** 11 High CVEs exist in transitive Hono dependencies via `@prisma/composer-prisma-cloud` (see [D-001](docs/decisions/DECISIONS.md#d-001)). Mitigated via production network isolation and container security policies. Scheduled for exit upon Prisma 8 GA.
2. **Next.js Direct Path Rewrites:** Direct proxy rewrites (`/jobs/*`, `/organizations/*`) are retained in Next.js config without `/api` prefix (see [D-002](docs/decisions/DECISIONS.md#d-002)) to prevent breaking changes. Scheduled for `/api/v1` migration in v0.4.0.
3. **Fixed RBAC Permission Matrix:** The 5 organization roles have fixed permissions mapped in `@haihire/shared`. Customizable role-permission mappings and tenant-level custom roles are scheduled for v0.4.0.

---

## 📜 License

HaiHire is proprietary enterprise software. All rights reserved.
