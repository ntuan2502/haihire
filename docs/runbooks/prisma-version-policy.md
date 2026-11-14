# Prisma Version & Schema Policy Runbook

> Authoritative policy governing Prisma `7.10.1` (`@prisma/adapter-pg`), `pg.Pool` connection management, and PostgreSQL schema evolution.

---

## 1. Standard Stack Baseline (Decision `D-016`)

HaiHire standardizes on **Prisma `7.10.1` (Stable GA)** with the driver-adapter architecture:

| Component             | Baseline                                                   | Authoritative File                                                                   |
| :-------------------- | :--------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **ORM & CLI**         | `prisma` & `@prisma/client` pinned in lockstep (`7.10.1`)  | [apps/api/package.json](../../apps/api/package.json)                                 |
| **Driver Adapter**    | `@prisma/adapter-pg` + `pg.Pool`                           | [apps/api/src/prisma/prisma.service.ts](../../apps/api/src/prisma/prisma.service.ts) |
| **Prisma CLI Config** | Explicit `prisma.config.ts` schema entry                   | [apps/api/prisma.config.ts](../../apps/api/prisma.config.ts)                         |
| **Schema Definition** | `22` models, `18` enums (`PostgreSQL 17.6`)                | [apps/api/src/prisma/schema.prisma](../../apps/api/src/prisma/schema.prisma)         |
| **Migration History** | Legacy migration files stored under `apps/api/migrations/` | [apps/api/migrations/](../../apps/api/migrations/)                                   |

> [!IMPORTANT]
> Never install a mismatched version between `prisma` and `@prisma/client`. Both packages must advance together with verified client regeneration and container build tests.

---

## 2. Database Workflow Commands

All routine Prisma operations are exposed as root pnpm scripts:

| Command            | Action                                                                                               | Use Case                                   |
| :----------------- | :--------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| `pnpm db:generate` | Regenerate Prisma Client from `apps/api/src/prisma/schema.prisma`                                    | After any schema edit                      |
| `pnpm db:update`   | Apply pending schema changes in development                                                          | Local setup / schema sync                  |
| `pnpm db:migrate`  | Run Prisma migrate flow in `apps/api`                                                                | Creating or applying structured migrations |
| `pnpm db:seed`     | Execute idempotent seed logic                                                                        | Local development bootstrap                |
| `pnpm db:setup`    | Combined `db:update` + `db:seed`                                                                     | Fresh local workspace setup                |
| `pnpm db:status`   | Inspect migration & schema status                                                                    | Pre-deploy verification                    |
| `pnpm db:verify`   | Run schema/database verification check                                                               | Post-migration validation                  |
| `pnpm db:backup`   | Run automated DB + MinIO backup ([scripts/backup-production.ts](../../scripts/backup-production.ts)) | Before production upgrades                 |

---

## 3. Architecture & Coding Rules

1. **AsyncLocalStorage Transaction Propagation:** Multi-step mutations run inside `PrismaService.transaction()` so nested repository/service calls reuse the active `TransactionClient` seamlessly.
2. **Multi-Tenant Query Isolation:** Every query across the `8` tenant-scoped backend modules must enforce `organizationId` scoping and pass `pnpm lint:tenant-scope`. See [Data Model Architecture](../architecture/data-model.md).
3. **Soft-Delete Filtering:** `Job`, `Candidate`, and `TrackingLink` carry `deletedAt DateTime?`; active reads and lookups must filter `deletedAt: null` explicitly.
4. **Build Artifact Integration:** Production Docker builds ([apps/api/Dockerfile](../../apps/api/Dockerfile)) run Prisma client generation and compile NestJS into ESM (`dist/server.mjs`).

---

## 4. Prisma Upgrade Procedure

When upgrading `prisma` / `@prisma/client` in the future:

1. Record an Architecture Decision entry in [Architectural Decisions](../decisions/DECISIONS.md) if changing major/minor policy or driver behavior.
2. Update `prisma`, `@prisma/client`, and `@prisma/adapter-pg` compatibly in [apps/api/package.json](../../apps/api/package.json) and regenerate `pnpm-lock.yaml` via `pnpm install`.
3. Update `pnpm-workspace.yaml` only if security/release age overrides are required.
4. Run full verification:

```bash
pnpm db:generate
pnpm lint:tenant-scope
pnpm typecheck
pnpm test:api
pnpm build:api
```

5. Smoke-test Docker image creation (`apps/api/Dockerfile`) before merging to `main`.

---

## 5. Related Documentation

- [Data Model Architecture](../architecture/data-model.md)
- [Architectural Decisions](../decisions/DECISIONS.md)
- [Backup and Restore Runbook](backup-and-restore.md)
