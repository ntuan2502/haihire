# HaiHire Backend API (`apps/api`)

Multi-tenant NestJS 12 REST & SSE backend bundled as a standalone ESM artifact (`dist/server.mjs`) via `esbuild`.

---

## Stack Summary

- **Framework:** NestJS `^12.4.0` (`@nestjs/platform-express`, `"type": "module"`)
- **Database:** PostgreSQL 17 + Prisma `7.10.1` (`@prisma/adapter-pg` + `pg.Pool`) in [src/prisma/schema.prisma](src/prisma/schema.prisma) (`22` models, `18` enums)
- **Cache & Queues:** Valkey 8 (`ioredis@^6.0.0`) + `@nestjs/bullmq@^12.0.1` (`bullmq@^6.7.2`) for `email-queue`/`email-dlq-queue` and `orphan-cleanup-queue`/`orphan-cleanup-dlq`
- **Object Storage:** MinIO S3 (`minio@^8.0.7`) with private bucket `haihire-resumes` and `tenants/<orgId>/` object key isolation
- **Validation & Security:** `DtoPipe` (`class-validator` + `@haihire/shared` Zod), `GlobalExceptionFilter`, `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`, `TenantGuard`, constant-time `METRICS_TOKEN` check (`GET /metrics`), and encrypted per-org email/webhook secrets (`ENCRYPTION_SECRET`)

---

## Modules & Surface

`AppModule` ([src/app.module.ts](src/app.module.ts)) wires `15` core domain/infrastructure modules (`Prisma`, `Redis`, `Minio`, `Auth`, `Events`, `Organizations`, `Jobs`, `Applications`, `Candidates`, `Interviews`, `Activities`, `Email`, `Sourcing`, `WebhookSettings`, `Metrics`) alongside `AppController`, exposing **12 controllers and 107 endpoints**. See [API Overview](../../docs/api/overview.md) and [Data Model](../../docs/architecture/data-model.md).

---

## Scripts

Run from repository root using `pnpm --filter api <script>` (or from `apps/api/`):

```bash
pnpm --filter api dev          # Start watch server via tsx (PORT from root .env, default 3001)
pnpm --filter api build        # Bundle ESM production artifact -> dist/server.mjs
pnpm --filter api start        # Run bundled node dist/server.mjs
pnpm --filter api lint         # Run ESLint
pnpm --filter api typecheck    # Run tsc --noEmit
pnpm --filter api test         # Run Vitest suite (backend + scripts/__tests__ + monitoring)
pnpm --filter api db:generate  # Generate Prisma client
pnpm --filter api db:update    # Push schema.prisma changes to database
pnpm --filter api db:verify    # Validate schema.prisma via prisma.config.ts
pnpm --filter api db:seed      # Seed demo/development data
```

> **Prisma 7 Note:** Datasource URL configuration lives in [prisma.config.ts](prisma.config.ts), not inside `schema.prisma`.
