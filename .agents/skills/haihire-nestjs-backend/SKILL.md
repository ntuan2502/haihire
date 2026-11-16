---
name: haihire-nestjs-backend
description: Develops NestJS 12 ESM backend modules, controllers, validation pipes, exception filters, JWT cookie auth, RBAC permissions, BullMQ workers, and MinIO storage in apps/api. Use when adding endpoints, guards, DTOs, queues, emails, webhooks, or security controls in HaiHire.
---

# HaiHire NestJS 12 Backend, Auth, RBAC & Queues Skill

Stack baselines verified in `apps/api/package.json` and `apps/api/src/`:
- **Framework**: NestJS `^12.4.0` on `@nestjs/platform-express`, ESM (`"type": "module"`), bundled to `dist/server.mjs` via `esbuild --platform=node --format=esm --packages=external`
- **Architecture**: `AppModule` imports 15 feature/infrastructure modules (`Prisma`, `Redis`, `Minio`, `Auth`, `Events`, `Organizations`, `Jobs`, `Applications`, `Candidates`, `Interviews`, `Activities`, `Email`, `Sourcing`, `WebhookSettings`, `Metrics`) exposing **12 controllers / 107 endpoints**
- **Validation**: `DtoPipe()` supporting both `class-validator` DTO classes and `@haihire/shared` Zod schemas (`apps/api/src/common/dto-validation.pipe.ts`)
- **Queues**: `@nestjs/bullmq@^12.0.1` + `bullmq@^6.7.2` on Valkey/Redis (`ioredis@^6.0.0`)

---

## 1. ESM & `esbuild` Bundler Hazards (Critical)

- **Always annotate constructor dependencies with explicit `@Inject(Token)`** and `@Optional() @Inject(Token)`. Under ESM / `tsx` / `esbuild`, implicit TypeScript `design:paramtypes` reflection can be stripped or suffer CJS/ESM dual-package token mismatches (see `throttlerReflectorToken` workaround in `apps/api/src/app.module.ts`).
- **Always validate body/query/params with `@Body(DtoPipe(DtoOrZodSchema))` / `@Query(DtoPipe(...))` (`pnpm lint:dtopipe`).** Using `@UsePipes` or omitting `DtoPipe(...)` fails CI Gate 5 because explicit `expectedType` / `ZodValidationPipe` guarantees runtime validation even when metadata is erased (`AppModule` also registers a global `APP_PIPE` `ValidationPipe` safety net alongside `DtoPipe`).
- **No `any` & Strict Logging:** Prefer explicit interfaces or `unknown`, use `CorrelationLogger` + `CorrelationIdMiddleware` (`correlationStorage`), and sanitize sensitive tokens/UUIDs (`sanitizeLogPath` in `src/main.ts`).

---

## 2. Fail-Fast Env, Error Envelope & HTTP Security

- **Fail-Fast Env (`apps/api/src/config/env.ts`):** All environment variables are parsed once via Zod on startup (`findWorkspaceRoot()` finds `.env` regardless of CWD). Never read ad-hoc `process.env.FOO` outside `env.ts` without registering parity in `.env.example` (`pnpm lint:env-sync`).
- **Structured Exceptions (`apps/api/src/common/app-exception.ts`):** Always throw `AppBadRequestException`, `AppUnauthorizedException`, `AppForbiddenException`, `AppNotFoundException`, `AppConflictException`, or `AppServiceUnavailableException` with one of the `64` codes in `APP_ERROR_CODES` (`packages/shared/src/errors.ts`).
- **`GlobalExceptionFilter` (`apps/api/src/common/http-exception.filter.ts`):**
  - Duck-types `ThrottlerException` (HTTP `429`, `code: "TOO_MANY_REQUESTS"`), preserves `AppException` `{ statusCode, code, message, params }` envelopes, attaches `code: "VALIDATION_ERROR"` to Nest validation errors, and hides internal details behind `500 Internal server error`.
- **HTTP Hardening (`apps/api/src/main.ts` & `src/app.controller.ts`):**
  - Strict CORS from comma-separated `FRONTEND_URL` with `credentials: true`.
  - Security headers (`nosniff`, `DENY`, CSP `default-src 'self'; frame-ancestors 'none'`).
  - `GET /metrics` checks `METRICS_TOKEN` via `crypto.timingSafeEqual` and throws `NotFoundException` in `production` when `METRICS_TOKEN` is unset.

---

## 3. Authentication, Multi-Tenant Guards & Dynamic RBAC

- **Cookie JWT + Revocation:**
  - `JwtAuthGuard` + `JwtStrategy` validate `haihire_token` cookie (or Bearer header) and verify `user.tokenVersion` against the database so password change / logout revokes active tokens immediately.
- **Tenant Boundary (`TenantGuard`):**
  - Checks `req.query?.organizationId`, `req.body?.organizationId`, and `req.params?.organizationId` against `req.user.organizationId` or `OrganizationMember` rows, throwing `AppForbiddenException(ORG_FORBIDDEN_ACTION)` on mismatch.
  - Controllers also pass `req.user?.organizationId` as `tenantOrgId` down to every tenant-scoped service method (`pnpm lint:tenant-scope`).
- **Dynamic Owner + 5 Roles + 41 Permissions (`RolesGuard` & `PermissionResolverService`):**
  - **5 Roles:** `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`.
  - **41 Permissions:** Defined in `packages/shared/src/permissions.ts`.
  - **Precedence:** Organization Owner (`user.isOwner` or `user.organization?.ownerId === user.id`) and `ADMIN` always bypass/resolve granted -> per-org `OrganizationRolePermission` DB override (`60s` in-memory cache per `organizationId`) -> `@haihire/shared` static `PERMISSIONS` fallback.
  - **Webhook SSRF Protection:** Any outbound webhook URL must pass DNS/private-IP SSRF checks (already tested in `smtp.transporter.spec.ts` / webhook providers).

---

## 4. BullMQ Queues & Private MinIO Storage

Per BullMQ official patterns and HaiHire processors:
- **Email Queue (`apps/api/src/email/email.processor.ts`):**
  - Queues: `EMAIL_QUEUE_NAME = "email-queue"` and `EMAIL_DLQ_NAME = "email-dlq-queue"`.
  - Worker listens to `@OnWorkerEvent("failed")` and routes exhausted jobs to the DLQ for audit/replay + optional webhook alert.
- **Orphan File Cleanup Queue (`apps/api/src/applications/orphan-cleanup.processor.ts`):**
  - Queues: `ORPHAN_CLEANUP_QUEUE = "orphan-cleanup-queue"` and `ORPHAN_CLEANUP_DLQ = "orphan-cleanup-dlq"`.
  - Used by saga compensation when DB persistence fails after MinIO upload; bulk reconciliation (`orphan-cleanup` script) runs via CLI only (no `@Cron` scheduler).
- **MinIO (`apps/api/src/minio/minio.service.ts`):**
  - Bucket `haihire-resumes` is private (no public read policy).
  - Always scope object keys under `tenants/${safeTenant}/...`, normalize filenames via `sanitizeFilename`, delete MinIO objects best-effort on document removal or saga failure, and serve files exclusively via authenticated download endpoints.
