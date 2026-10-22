# Developer Onboarding Guide

Welcome to the HaiHire engineering team! This guide will walk you through setting up your local development environment, understanding our system architecture, and running your first full-stack workflow.

---

## 🛠️ 1. Prerequisites

Before setting up the repository, verify that your local machine has the required tooling installed:

| Tool                        | Required Version  | Verification Command     | Notes                                                        |
| :-------------------------- | :---------------- | :----------------------- | :----------------------------------------------------------- |
| **Node.js**                 | `>= 26.0.0` (LTS) | `node -v`                | Node 26 provides native Temporal and modern V8 performance.  |
| **pnpm**                    | `>= 12.0.0`       | `pnpm -v`                | Installed via `npm install -g pnpm@12` (never use Corepack). |
| **Docker & Docker Compose** | `>= 27.0.0`       | `docker compose version` | Used for local PostgreSQL, Valkey, and MinIO storage.        |
| **Git**                     | `>= 2.40.0`       | `git -v`                 | Conventional Commits enforced via Husky hooks.               |

---

## 🚀 2. Step-by-Step Environment Setup

### Step 2.1: Clone the Repository

```bash
git clone https://github.com/ntuan2502/haihire.git
cd haihire
```

### Step 2.2: Install Monorepo Dependencies

Install all workspace dependencies using `pnpm`:

```bash
pnpm install
```

### Step 2.3: Configure Environment

HaiHire uses a unified single-source-of-truth environment architecture. Create your local development environment by copying the root template:

```bash
cp .env.example .env
```

_(On Windows PowerShell, use `Copy-Item .env.example .env`)_

All services (Backend, Frontend, Prisma CLI, and Docker Compose) read directly from this single root `.env` file. No package-level `.env` files are required.

### Step 2.4: Spin Up Infrastructure Containers

Start the local PostgreSQL database, Valkey cache/queue, and MinIO S3 object storage:

```bash
pnpm docker:infra:up
```

Verify that all three containers are healthy:

```bash
docker ps
```

You should see:

- `haihire-postgres` on port `15432`
- `haihire-valkey` on port `16379`
- `haihire-minio` on ports `19000` (API) and `19001` (Web Console)

### Step 2.5: Initialize Database Schema & Demo Seed

Push the Prisma contract schema to PostgreSQL and populate initial demo data (organizations, recruiter accounts, jobs, and candidate pipelines):

```bash
pnpm db:setup
```

### Step 2.6: Launch Development Servers

Start both backend and frontend applications concurrently:

```bash
pnpm dev
```

Once running, access your local services:

- 🌐 **Recruiter & Candidate Web Portal:** [http://localhost:13000](http://localhost:13000)
- 🔌 **NestJS Backend API Health:** [http://localhost:13001/health](http://localhost:13001/health)
- 📊 **Prometheus Metrics:** [http://localhost:13001/metrics](http://localhost:13001/metrics)
- 🗄️ **MinIO Storage Console:** [http://localhost:19001](http://localhost:19001) (User: `minioadmin`, Pass: `minioadmin`)

---

## 🧭 3. Where to Find What

| Directory                      | Scope & Purpose                                                                                                                     |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`backend/src/`**             | NestJS backend source code organized into domain modules (`auth`, `jobs`, `candidates`, `applications`, `interviews`, `documents`). |
| **`backend/src/prisma/`**      | Prisma contract definition (`contract.prisma`), AsyncLocalStorage transaction manager, and seed scripts.                            |
| **`frontend/src/app/`**        | Next.js App Router routes: `(auth)`, `(dashboard)`, and public `careers/` (React Server Components).                                |
| **`frontend/src/components/`** | Component library: `ui/` (Shadcn primitives), `components/shared/` (ATS controls), `layout/` (App shell).                           |
| **`frontend/src/i18n/`**       | Localization files: `vi.ts` and `en.ts` dictionaries. Zero hardcoded text mandate.                                                  |
| **`packages/shared/`**         | Monorepo shared package: Canonical types, `APP_ERROR_CODES`, and brand constants.                                                   |
| **`scripts/`**                 | Monorepo automation scripts: `check-all.ts`, `backup-production.ts`, `check-env-sync.ts`.                                           |
| **`docs/`**                    | Central documentation repository: Architecture blueprints, API overview, runbooks, and audit history.                               |
| **`.agents/`**                 | AI agent runtime configuration, skills, and operational rules managed by AG Kit.                                                    |

---

## 💻 4. Common Developer Commands

```bash
# Run full 11-gate CI verification pipeline
pnpm check:all

# Run quick static checks before committing
pnpm check:all:fast

# Run fast pre-commit checks (<5s via lint-staged)
pnpm pre-commit

# Run pre-push verification (~25s lint + typecheck)
pnpm pre-push

# Run all unit & integration tests (871 tests)
pnpm test

# Run frontend tests only
pnpm test:frontend

# Run backend tests only
pnpm test:backend

# Run Playwright E2E browser tests
pnpm test:e2e

# Build all monorepo packages for production
pnpm build

# Verify environment synchronization
pnpm lint:env-sync

# Verify i18n translation key parity
pnpm lint:i18n
```

---

## ❓ 5. Troubleshooting & FAQ

### Issue: "Port 15432 or 13001 is already in use"

**Solution:** Check if existing background containers or node processes are running:

```bash
docker compose down
# Windows PowerShell to inspect listening ports:
Get-NetTCPConnection -LocalPort 13001, 15432 -ErrorAction SilentlyContinue
```

### Issue: "Missing environment variable error on startup"

**Solution:** Run the environment audit script to identify missing or desynchronized keys:

```bash
pnpm lint:env-sync
```

Ensure that root `.env` has been populated from `.env.example`.

### Issue: "Prisma client or contract types are out of sync"

**Solution:** Re-emit the Prisma contract bindings:

```bash
pnpm contract:emit
```

---

## 📚 6. Next Steps

- Read [System Architecture Overview](architecture/system-overview.md) to understand data flows and design patterns.
- Read [REST API Overview](api/overview.md) to review endpoints, auth, and error codes.
- Read [Contributing Guide](../CONTRIBUTING.md) for branch naming, commit conventions, and CI quality gates.
