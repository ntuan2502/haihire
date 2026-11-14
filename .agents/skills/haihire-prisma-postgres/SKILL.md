---
name: haihire-prisma-postgres
description: Enforces Prisma 7.10.1 with @prisma/adapter-pg, AsyncLocalStorage transactions, 22-model PostgreSQL schema rules, soft-delete filters, and multi-tenant organizationId query isolation. Use when editing schema.prisma, PrismaService, repositories, or service database queries in apps/api.
---

# HaiHire Prisma 7, PostgreSQL & Tenant Isolation Skill

Stack baselines verified in `apps/api/package.json`, `apps/api/prisma.config.ts`, and `apps/api/src/prisma/`:
- **Prisma**: `7.10.1` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) with `pg@^8.23.1` (`pg.Pool`)
- **Config (`apps/api/prisma.config.ts`)**: `defineConfig({ schema: "src/prisma/schema.prisma", datasource: { url: env("DATABASE_URL") } })`
- **Schema (`apps/api/src/prisma/schema.prisma`)**: `22` models, `18` enums, `provider = "prisma-client-js"` (`datasource db { provider = "postgresql" }` without inline `url`)

---

## 1. Prisma 7 Driver Adapter Initialization

Per Prisma 7 official architecture:
- `schema.prisma` declares `datasource db { provider = "postgresql" }` without `url = env(...)`; CLI tools read `DATABASE_URL` from `apps/api/prisma.config.ts` (which loads root `.env`).
- Runtime `PrismaService` (`apps/api/src/prisma/prisma.service.ts`) instantiates a `pg.Pool` (`env.DATABASE_URL`), wraps it in `new PrismaPg(pool)`, and passes `{ adapter }` into `super({ adapter })`.
- Never instantiate a second standalone `PrismaClient` inside request handlers or services; inject `PrismaService` to share the single connection pool.
- Note on schema updates: production schema updates use `apps/api/src/prisma/schema.prisma` (`pnpm --filter api db:update` / `db:generate`).

---

## 2. `AsyncLocalStorage` Transaction Propagation

- Use `runInTransaction(this.prisma, async (tx) => ...)` (or `this.prisma.transaction(...)` / `executeTx`) whenever multiple writes must be atomic (e.g., application creation saga, org creation + membership creation, demo auto-seed ordering, ownership transfer).
- `PrismaService` stores the active interactive transaction client inside `AsyncLocalStorage` and exposes `this.tx` cleanly across `PrismaPg.$transaction`.
- **Ordering invariant for Org/User creation:** Always create/upsert `User` (`organizationId: null`) before creating `Organization` (`ownerId: user.id`), then update `User.organizationId`, because `Organization.ownerId` and `User.organizationId` cross-reference each other.

---

## 3. Mandatory Multi-Tenant Query Isolation (`pnpm lint:tenant-scope`)

CI Gate 9 (`scripts/check-tenant-scoping.ts`) statically audits every Prisma query across the **8 tenant-scoped modules** (`applications`, `candidates`, `jobs`, `interviews`, `sourcing`, `activities`, `organizations`, `webhook-settings`):
- Every query against a tenant-owned model MUST satisfy one of four verified rules:
  1. **Inline `organizationId` / `targetOrgId` filter inside the query's 350-character lookahead window** (or `organizationId` in `select` if checking immediately after).
  2. **Model in `MODELS_WITHOUT_ORG_COLUMN`** (`Organization` only — defined in `scripts/tenant-scoping.config.ts`). `Application`, `Interview`, and `TrackingClick` all carry `organizationId` directly and enforce both direct tenant filters/checks and parent ownership verification.
  3. **Parent ownership guard in the SAME enclosing method** (`entity.organizationId !== ...`, `entity.organizationId === ...`, or `throw new AppForbiddenException`). Never assume an earlier method's guard covers a later method, and keep lookback guards inside the same method as the query.
  4. **Explicitly whitelisted safe public pattern** in `SAFE_QUERY_PATTERNS` (`findBySlug`, `healthCheck`, `recordClick`).
- Never suppress cross-tenant warnings by copying unrelated guards into methods; enforce true relational `organizationId` filtering on `findMany`, `findFirst`, `update`, `updateMany`, and `deleteMany`, especially in enrichment queries (e.g., `candidate.findMany` and `job.findMany` inside `InterviewsQueryService`).

---

## 4. Soft Delete (`deletedAt`) & Unique Constraint Rules

- **3 Soft-Deletable Models:** `Job`, `Candidate`, and `TrackingLink` carry `deletedAt DateTime?`.
- Always filter `deletedAt: null` on active reads, counts, search lists, public job listings, and application sagas (`job.findFirst({ where: { id: dto.jobId, deletedAt: null } })`, `candidate.findFirst({ where: { id: candidateId, deletedAt: null } })`).
- **Soft-deleted Candidate re-application:** `Candidate` has a unique constraint on `(organizationId, email)`. When creating an application by `email`, query by `(organizationId, email)` selecting `deletedAt`, and if found with `deletedAt !== null`, restore it (`deletedAt: null, updatedAt: toInstant()`) inside the transaction before linking the new `Application`.
- For non-deleted lookups by relation (`Interview` -> `Application` -> `Job` / `Candidate`), check `deletedAt` / stage rules consistently before allowing mutations.
