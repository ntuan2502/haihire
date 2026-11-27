# System Overview

HaiHire is an enterprise multi-tenant Applicant Tracking System organized as a `pnpm` + Turborepo TypeScript monorepo.

---

## 1. High-Level Topology

```text
Browser / Candidate Portal
   │
   ├── HTTP/SSE ──► Next.js 16 Frontend (apps/web, port 3000 dev/prod, 13000 E2E)
   │                   ├── src/proxy.ts (JWT cookie check & /dashboard -> /auth/login redirect)
   │                   ├── next.config.ts rewrites (/api/* -> API)
   │                   ├── Shared Dashboard Layout (src/app/(workspace)/layout.tsx) & RSC pages
   │                   ├── Lazy-Loaded i18n Dictionaries (zero-FOUC initial dictionary injection)
   │                   └── TanStack Query v5 (orgId cache isolation) + Axios (URL Gatekeeper + 401 refresh queue)
   │
   ▼
NestJS 12 ESM Backend (apps/api, port 3001, dist/server.mjs)
   ├── Security Pipeline: CorrelationIdMiddleware -> ThrottlerGuard (ThrottlerStorageRedisService)
   │                      -> JwtAuthGuard -> RolesGuard (PermissionResolverService 2-tier cache)
   │                      -> TenantGuard -> DtoPipe (Zod validation coverage)
   ├── Error Handling:    GlobalExceptionFilter + AppException (72 APP_ERROR_CODES)
   │
   ├── PostgreSQL 17.6 ◄── Prisma 7.10.1 (@prisma/adapter-pg + pg.Pool + AsyncLocalStorage tx)
   ├── Valkey 8.0.2     ◄── ioredis + BullMQ (email-queue, email-dlq-queue, orphan-cleanup-queue,
   │                        orphan-cleanup-dlq), SSE pub/sub, Distributed Rate Limiting,
   │                        and Permission Resolver L2 Cache with Cross-Replica Pub/Sub Invalidation
   └── MinIO S3         ◄── Private bucket `haihire-resumes` (`tenants/<orgId>/...`)
```

---

## 2. Workspace Packages & Applications

### `packages/shared` (`@haihire/shared`)

Consumed directly by both `apps/api` and `apps/web` without build drift:

- `permissions.ts`: `5` roles (`ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`), `41` permission strings, `PERMISSIONS` default matrix, and `hasPermission`.
- `errors.ts`: `72` `APP_ERROR_CODES`, `ApiErrorPayload`, `ErrorLocaleDictionary`.
- `events.ts`: `17` `APP_EVENT_TYPES` powering server SSE broadcasts and frontend cache invalidation.
- `schemas/`: Zod contracts (`auth`, `job`, `candidate`, `application`) plus domain helpers (`applications`, `candidates`, `jobs`, `interviews`, `sourcing`, `email-templates`, `webhooks`, `person-name`, `organizations`).

### `apps/api` (NestJS `12.4.0` Backend)

Compiled into a single ESM artifact (`dist/server.mjs`) via `esbuild`.

- **Domain & Infrastructure Modules** wired in [apps/api/src/app.module.ts](../../apps/api/src/app.module.ts): `PrismaModule`, `RedisModule`, `MinioModule`, `AuthModule`, `EventsModule`, `OrganizationsModule`, `JobsModule`, `ApplicationsModule`, `CandidatesModule`, `InterviewsModule`, `NotificationsModule`, `ActivitiesModule`, `EmailModule`, `SourcingModule`, `WebhookSettingsModule`, `AiModule`, `MetricsModule`.
- **API Surface:** Full REST and SSE surface documented in [API Overview](../api/overview.md).
- **Observability:** `GET /health` probes PostgreSQL, Valkey/Redis, and MinIO; `GET /metrics` exposes Prometheus gauges gated by constant-time `METRICS_TOKEN` verification (`404` in production if unset).

### `apps/web` (Next.js `16.4.5` Portal)

- **App Router & `output: "standalone"`:** Configured in [apps/web/next.config.ts](../../apps/web/next.config.ts) with dynamic local network `allowedDevOrigins` and proxy rewrites. Features shared dashboard shell (`src/app/(workspace)/layout.tsx`), React Server Components (RSC) for landing, auth layouts, and careers directories, and modular UI components under 500 LOC.
- **Request Boundary (`src/proxy.ts`):** Uses Next.js 16 `proxy()` convention (with zero legacy `middleware.ts` files).
- **UI Stack:** React `19.3.1`, Tailwind CSS `^4.3.5` CSS-first `@theme inline` + `oklch(...)` variables in [apps/web/src/app/globals.css](../../apps/web/src/app/globals.css), and Shadcn `new-york` built on `radix-ui` + standalone `cn` package. Shared overlay archetypes ([apps/web/src/components/shared/index.ts](../../apps/web/src/components/shared/index.ts)) standardize confirmation, form, preview, and detail dialogs, `Sheet` slide-over & filter drawers (`SlideOver`, `FilterDrawer`), `DropdownMenu` pickers (`ColumnPicker`), `Popover`-backed `CustomSelect` controls, and `<PageHeader>` + in-card `<Pagination>` workspace list views.
- **Data & Real-Time Layer:** Axios interceptor chain in [apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts) prevents `[object Object]` URL leaks, queues concurrent `401` retries behind a cookie-authenticated refresh request with an empty body and credentials enabled, and routes resume previews through tenant-guarded API download routes. TanStack Query v5 keys are scoped by `orgId` for strict multi-tenant cache isolation. SSE events trigger debounced (`100ms`) query prefix invalidation via `createRealtimeInvalidator` ([apps/web/src/lib/realtime-sync.ts](../../apps/web/src/lib/realtime-sync.ts)).
- **Internationalization (i18n):** 2-tier Vietnamese/English dictionaries loaded dynamically with zero FOUC via server-side dictionary injection in root layout and client-side on-demand chunk loading.

---

## 3. Asynchronous Reliability & Storage Compensation

- **Application Creation Saga:** The service checks that the job is published and uploads an attached resume to the tenant's MinIO prefix before starting the database transaction. The transaction creates or restores the candidate and persists the application and associated document records. If the transaction fails after upload, the service attempts to delete the file and falls back to the orphan cleanup queue. After the transaction succeeds, the service records activity, processes confirmation email, and emits SSE events.
- **Email Delivery Pipeline:** `EmailProcessor` processes transactional `send-email` and `send-system-email` jobs with configurable per-org/system transporters (`SMTP`, `Resend`, `SendGrid`, or `SIMULATED` in non-prod) and routes exhausted failures into `email-dlq-queue` with optional webhook alerts (`Telegram`, `Discord`, `Generic`).
