# Developer Onboarding Guide

Welcome to **HaiHire**. This guide sets up a complete local multi-tenant workspace (Next.js 16 frontend, NestJS 12 backend, PostgreSQL 17, Valkey 8, and MinIO S3 storage).

---

## 1. Prerequisites

- **Node.js `26.x`** (matching `node:26-alpine` production images and `@types/node@^26.6.6`)
- **`pnpm@12.18.0`** (`corepack enable` or `npm i -g pnpm@12`)
- **Docker Engine / Docker Desktop** with Compose v2

---

## 2. Initial Workspace Bootstrap

```bash
# 1. Clone and install dependencies
pnpm install

# 2. Copy root environment template (Single Source of Truth)
cp .env.example .env

# 3. Start infrastructure services (PostgreSQL 17.6, MinIO, Valkey 8.0.2)
docker compose up -d postgres minio redis

# 4. Generate Prisma 7 client and push schema
pnpm db:generate
pnpm db:update

# 5. Populate development workspace data
pnpm db:seed
```

---

## 3. Running Services Locally

Start both apps simultaneously via Turborepo:

```bash
pnpm dev
```

Or run them independently:

```bash
pnpm dev:api   # NestJS watch server via tsx (PORT in .env, default 3001)
pnpm dev:web   # Next.js 16 dev server (FRONTEND_PORT in .env, default 3000)
```

Verify core infrastructure ports from [docker-compose.yml](../../docker-compose.yml) and [.env.example](../../.env.example):

| Service            | Env Variable                        | Compose Default Host Port |    Typical Dev / E2E Override    |
| :----------------- | :---------------------------------- | :-----------------------: | :------------------------------: |
| Next.js Portal     | `FRONTEND_PORT`                     |          `3000`           | `13000` (`playwright.config.ts`) |
| NestJS API         | `BACKEND_PORT`                      |          `3001`           |             `13001`              |
| PostgreSQL 17      | `POSTGRES_PORT`                     |          `5432`           |             `15432`              |
| Valkey / Redis     | `REDIS_PORT`                        |          `6379`           |             `16379`              |
| MinIO S3 / Console | `MINIO_PORT` / `MINIO_CONSOLE_PORT` |      `9000` / `9001`      |        `19000` / `19001`         |

---

## 4. Database, Seeding & Prisma Workflow

HaiHire uses **Prisma `7.10.1`** with `@prisma/adapter-pg` and `apps/api/prisma.config.ts`:

```bash
pnpm db:verify     # Validate src/prisma/schema.prisma
pnpm db:generate   # Regenerate Prisma Client
pnpm db:update     # Push schema updates (prisma db push)
pnpm db:seed       # Seed demo organization and users
```

> **Windows PowerShell Note:** Execute commands separately rather than chaining with `&&`.

---

## 5. First Verification Run

Run unit suites and static architecture checks before opening your first PR:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm check:all:fast
```

For full team expectations and coding rules, continue to [Engineering Conventions](../architecture/conventions.md) and [Definition of Done](definition-of-done.md).
