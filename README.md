# HaiHire Enterprise ATS Platform

> Modern, AI-powered Applicant Tracking System (ATS) engineered for enterprise recruitment workflows.  
> Built with NestJS 12, Next.js 16 (App Router & Server Components), PostgreSQL 17, Prisma 8, Valkey 8, and MinIO S3 storage.

---

## 🚀 Key Architectural Highlights

- **Backend Architecture:** NestJS 12.1.2 modular monolith with Saga transaction orchestration, compensations, AsyncLocalStorage request context tracking, and DLQ-backed BullMQ processing.
- **Frontend Architecture:** Next.js 16.3.8 with React 19 Server Components (RSC), `@tanstack/react-query` v5 client caching, Base UI / Radix UI primitives, Tailwind CSS v4, and dual-language internationalization (vi / en).
- **Data & Storage:** PostgreSQL 17.6 managed via Prisma 8 ORM, Valkey 8.0.2 for distributed caching / rate limiting, and MinIO S3 object storage for candidate resumes.
- **Security & Reliability:** Strict HttpOnly JWT cookies, CSRF protection, AES-256 data encryption at rest, 7 comprehensive CI gates, and 379 verified automated tests.

---

## 📋 System Prerequisites

Ensure the following tools are installed on your host system:

| Prerequisite | Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `>= 26.0.0` (LTS) | `node -v` |
| **pnpm** | `>= 12.0.0` | `pnpm -v` |
| **Docker Engine & Compose** | `>= 27.0.0` | `docker compose version` |

---

## 🌐 Port Allocation Architecture

HaiHire employs strict non-standard port offsets to prevent conflicts with local development services:

| Service | Host Port (Local Dev) | Container Port | Purpose / Description |
| :--- | :---: | :---: | :--- |
| **Frontend Web** | `13000` | `3000` | Next.js recruiter & candidate portal |
| **Backend API** | `13001` | `3001` | NestJS REST API & health probes |
| **PostgreSQL** | `15432` | `5432` | Primary relational database |
| **Valkey** | `16379` | `6379` | Cache, sessions & async BullMQ queues |
| **MinIO API** | `19000` | `9000` | S3-compatible resume upload endpoint |
| **MinIO Console** | `19001` | `9001` | S3 bucket management web interface |

---

## ⚡ Quick Start (Local Development)

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/ntuan2502/haihire.git
cd haihire
pnpm install
```

### 2. Configure Environment Files
Copy the environment templates into their respective locations:
```bash
# Root infrastructure ports template
cp .env.example .env

# Backend runtime configuration
cp backend/.env.example backend/.env

# Frontend runtime configuration
cp frontend/.env.example frontend/.env
```
> For complete environment segregation details, read the [Environment Management Runbook](file:///c:/Workspaces/haihire/docs/runbooks/env-management.md).

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

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Start backend (`13001`) and frontend (`13000`) concurrently in watch mode |
| `pnpm build` | Build shared package, backend bundle (`dist/server.mjs`), and Next.js frontend |
| `pnpm check:all` | Run complete 7-gate CI verification (lint, typecheck, tests, env sync, contracts) |
| `pnpm check:all:fast` | Run rapid pre-commit verification (skip long-running smoke/load tests) |
| `pnpm test` | Run full unit & integration test suite (379 tests across backend & frontend) |
| `pnpm test:e2e` | Run Playwright end-to-end browser tests |
| `pnpm db:setup` | Push Prisma schema changes and execute database seeds |
| `pnpm docker:prod:up` | Launch production container stack (`docker-compose.prod.yml`) |
| `pnpm docker:prod:config` | Validate production Compose file against `.env.production` |

---

## 📂 Documentation Directory

Comprehensive system documentation is maintained under the [`docs/`](file:///c:/Workspaces/haihire/docs/) directory:

- 📖 [**Developer Onboarding Guide**](file:///c:/Workspaces/haihire/docs/onboarding.md): Step-by-step onboarding for new team members.
- 🏛️ [**System Architecture Overview**](file:///c:/Workspaces/haihire/docs/architecture/system-overview.md): High-level topology, Mermaid diagrams, and design patterns.
- 🔌 [**REST API Overview**](file:///c:/Workspaces/haihire/docs/api/overview.md): Controller mappings, 77 REST endpoints, auth, and error contracts.
- 🚀 [**Production Deployment Plan**](file:///c:/Workspaces/haihire/docs/runbooks/production-deployment-plan.md): 5-phase production release protocol.
- 💾 [**Backup & Disaster Recovery**](file:///c:/Workspaces/haihire/docs/runbooks/backup-and-restore.md): Automated PostgreSQL dumps, MinIO hot backup, and restore drills.
- 🧹 [**MinIO Orphan Cleanup**](file:///c:/Workspaces/haihire/docs/runbooks/orphan-cleanup.md): Daily cron purging unreferenced files with a 30-day grace period.
- 🚨 [**Monitoring & Alerting Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/alerts.md): Prometheus alert catalog and emergency SOPs.
- 🛡️ [**Audit Reports Archive**](file:///c:/Workspaces/haihire/docs/audits/README.md): Historical verification reports and cross-phase synthesis.

---

## 📜 License

HaiHire is proprietary enterprise software. All rights reserved.
