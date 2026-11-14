# System Overview

HaiHire is an enterprise multi-tenant Applicant Tracking System organized as a `pnpm` + Turborepo TypeScript monorepo.

---

## 1. High-Level Topology

```text
Browser / Candidate Portal
   │
   ├── HTTP/SSE ──► Next.js 16 Frontend (apps/web, port 3000 dev/prod, 13000 E2E)
   │                   ├── src/proxy.ts (JWT cookie check & /dashboard -> /auth/login redirect)
   │                   ├── next.config.ts rewrites (/api/* -> API, /haihire-resumes/* -> MinIO)
   │                   └── TanStack Query v5 + Axios (URL Gatekeeper + 401 refresh queue)
   │
   ▼
NestJS 12 ESM Backend (apps/api, port 3001, dist/server.mjs)
   ├── Security Pipeline: CorrelationIdMiddleware -> ThrottlerGuard -> JwtAuthGuard
   │                      -> RolesGuard (PermissionResolverService) -> TenantGuard -> DtoPipe
   ├── Error Handling:    GlobalExceptionFilter + AppException (64 APP_ERROR_CODES)
   │
   ├── PostgreSQL 17.6 ◄── Prisma 7.10.1 (@prisma/adapter-pg + pg.Pool + AsyncLocalStorage tx)
   ├── Valkey 8.0.2     ◄── ioredis + BullMQ (email-queue, email-dlq-queue, orphan-cleanup-queue,
   │                                           orphan-cleanup-dlq, SSE event pub/sub)
   └── MinIO S3         ◄── Private bucket `haihire-resumes` (`tenants/<orgId>/...`)
```

---

## 2. Workspace Packages & Applications

### `packages/shared` (`@haihire/shared`)

Consumed directly by both `apps/api` and `apps/web` without build drift:

- `permissions.ts`: `5` roles (`ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`), `41` permission strings, `PERMISSIONS` default matrix, and `hasPermission`.
- `errors.ts`: `64` `APP_ERROR_CODES`, `ApiErrorPayload`, `ErrorLocaleDictionary`.
- `events.ts`: `17` `APP_EVENT_TYPES` powering server SSE broadcasts and frontend cache invalidation.
- `schemas/`: Zod contracts (`auth`, `job`, `candidate`, `application`) plus domain helpers (`applications`, `candidates`, `jobs`, `interviews`, `sourcing`, `email-templates`, `webhooks`, `person-name`, `organizations`).

### `apps/api` (NestJS `12.4.0` Backend)

Compiled into a single ESM artifact (`dist/server.mjs`) via `esbuild`.

- **15 Domain & Infrastructure Modules** wired in [apps/api/src/app.module.ts](../../apps/api/src/app.module.ts): `PrismaModule`, `RedisModule`, `MinioModule`, `AuthModule`, `EventsModule`, `OrganizationsModule`, `JobsModule`, `ApplicationsModule`, `CandidatesModule`, `InterviewsModule`, `ActivitiesModule`, `EmailModule`, `SourcingModule`, `WebhookSettingsModule`, `MetricsModule`.
- **12 Controllers / 107 Endpoints:** Full REST and SSE surface documented in [API Overview](../api/overview.md).
- **Observability:** `GET /health` probes PostgreSQL, Valkey/Redis, and MinIO; `GET /metrics` exposes Prometheus gauges gated by constant-time `METRICS_TOKEN` verification (`404` in production if unset).

### `apps/web` (Next.js `16.4.5` Portal)

- **App Router & `output: "standalone"`:** Configured in [apps/web/next.config.ts](../../apps/web/next.config.ts) with dynamic local network `allowedDevOrigins` and proxy rewrites.
- **Request Boundary (`src/proxy.ts`):** Uses Next.js 16 `proxy()` convention (with zero legacy `middleware.ts` files).
- **UI Stack:** React `19.3.1`, Tailwind CSS `^4.3.5` CSS-first `@theme inline` + `oklch(...)` variables in [apps/web/src/app/globals.css](../../apps/web/src/app/globals.css), and Shadcn `base-nova` built on `@base-ui/react` + standalone `cn` package.
- **Data & Real-Time Layer:** Axios interceptor chain in [apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts) prevents `[object Object]` URL leaks, queues concurrent `401` retries behind silent token refresh, and routes resume previews through tenant-guarded API download routes. SSE events trigger debounced (`100ms`) query prefix invalidation via `createRealtimeInvalidator` ([apps/web/src/lib/realtime-sync.ts](../../apps/web/src/lib/realtime-sync.ts)).

---

## 3. Asynchronous Reliability & Storage Compensation

- **Application Creation Saga:** Inside `runInTransaction`, creates/restores `Candidate` (handling `deletedAt` soft-delete restoration on `(organizationId, email)` conflict), checks `Job` (`deletedAt: null`, status `PUBLISHED`), uploads resume into `tenants/<orgId>/...` in MinIO, persists `Application`, `CandidateDocument`, `ActivityLog`, triggers system/flow confirmation emails via `email-queue`, and emits real-time SSE events. On DB failure after MinIO upload, compensating deletion runs inline and falls back to `orphan-cleanup-queue` -> `orphan-cleanup-dlq`.
- **Email Delivery Pipeline:** `EmailProcessor` processes transactional `send-email` and `send-system-email` jobs with configurable per-org/system transporters (`SMTP`, `Resend`, `SendGrid`, or `SIMULATED` in non-prod) and routes exhausted failures into `email-dlq-queue` with optional webhook alerts (`Telegram`, `Discord`, `Generic`).
