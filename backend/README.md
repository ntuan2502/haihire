# HaiHire Backend Service

> Enterprise recruitment REST API engineered with NestJS 12, Prisma 8, PostgreSQL 17, Valkey 8, and MinIO S3 storage.

---

## 🛠️ Technology Stack & Architecture

- **Runtime Engine:** Node.js 26 (Active LTS) / pnpm 12.6.0
- **Framework:** NestJS 12.1.2 (Express platform, TypeScript)
- **Database & ORM:** PostgreSQL 17.6 managed via Prisma 8.0 (`@prisma/orm-postgres`)
- **Cache & Async Queues:** Valkey 8.0.2 / BullMQ 6.3 (`@nestjs/bullmq`, `ioredis`)
- **Object Storage:** MinIO S3 Client (`minio` 8.0.7) for encrypted resume storage
- **Authentication:** Passport JWT via secure HttpOnly cookies (`SameSite=Lax`, `Path=/`)
- **Validation & Serialization:** Class-Validator / Class-Transformer with mandatory `DtoPipe` validation

---

## 🌐 Network & Port Allocation

- **Development Port:** `13001` (Mapped via host root `.env`)
- **Production Port:** `3001` (Internal container or reverse-proxy target)
- **Database Port:** `15432` (Docker host port mapped to PostgreSQL `5432`)
- **Valkey Port:** `16379` (Docker host port mapped to Valkey `6379`)
- **MinIO Port:** `19000` (Docker host port mapped to MinIO `9000`)

---

## 📁 Module Organization

The backend is structured into domain modules under `src/`:

```
src/
├── auth/            # JWT authentication, login, register, cookie management, guards
├── users/           # User identity, roles, profile management
├── organizations/   # Multi-tenant organization boundaries, members, invitations
├── jobs/            # Job requisition lifecycle, requirements, workflows
├── candidates/      # Candidate profile repository, CV upload, deduplication
├── applications/    # Application pipeline, stage transitions, screening reviews
├── interviews/      # Interview scheduling, feedback scorecards, time slots
├── documents/       # MinIO S3 resume storage, upload validation, signed URLs
├── activities/      # Enterprise audit log records and state change tracking
├── email/           # Email dispatch engine (SMTP / Resend / SendGrid) with BullMQ
├── prisma/          # Prisma database service, AsyncLocalStorage transaction context, seeds
├── config/          # Centralized type-safe environment configuration (Zod)
└── common/          # Filters, interceptors, decorators, DTO pipes, error envelopes
```

---

## ⚡ Development & Scripts

All scripts can be run from the root repository or inside `backend/`:

```bash
# Start backend in watch mode (Port 13001)
pnpm run dev

# Compile TypeScript production bundle to dist/server.mjs via esbuild
pnpm run build

# Run unit and integration tests (Vitest)
pnpm run test

# Type-check without emitting JavaScript
pnpm run typecheck

# Lint codebase (ESLint + TypeScript compiler)
pnpm run lint

# Push schema changes to PostgreSQL database
pnpm run db:update

# Seed demo tenants, users, jobs, and candidates
pnpm run seed
```

---

## 🔒 Security & Best Practices

1. **Zero `process.env` in Feature Modules:** Always import the validated `env` object from `src/config/env.ts`.
2. **Mandatory DTO Validation:** All `@Body()` parameters must be validated using `DtoPipe` (verified by CI Gate 3).
3. **Multi-Tenant Isolation:** Controller routes must enforce tenant boundaries via `TenantGuard` and database queries must filter on `organizationId`.
4. **Saga Compensations:** File upload workflows that fail database persistence must trigger compensating deletes against MinIO S3.
5. **HttpOnly Cookie Auth:** Never expose raw JWT access tokens in response bodies.

For detailed REST API specifications, refer to [API Overview](file:///c:/Workspaces/haihire/docs/api/overview.md).
