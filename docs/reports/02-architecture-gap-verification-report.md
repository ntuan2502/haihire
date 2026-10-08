# Technical Verification Report #02: Prisma Gaps, DLQ Worker & Tenant Security Audit
> **Report for DeepSeek & Project Owner (Single Source of Truth - Deep Dive Verification)**  
> **Project:** HaiHire Enterprise ATS Platform  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Date:** 2026-10-06  
> **Report ID:** `DOCS-REP-02`

---

## Table of Contents
1. [PRISMA FEATURE GAP] Inspection of advanced Prisma features in `backend/src/`
2. [DLQ WORKER] Dead-Letter Queue mechanics (`orphan-cleanup-dlq`) & Alert channels
3. [E2E TENANT] Status of real HTTP Cross-Tenant End-to-End testing
4. [TENANT SCOPE STATIC] Status of static analysis for `organizationId` in ORM queries
5. [RISK SUMMARY & ARCHITECTURAL RECOMMENDATIONS] Action items for DeepSeek & Engineering Team

---

## 1. [PRISMA FEATURE GAP] Advanced Prisma Features Inspection in `backend/src/`

Inspected the entire `backend/src/` codebase to evaluate coupling to Prisma Engine advanced features:

| Prisma Feature | Actual Status | Details & Codebase Evidence |
| :--- | :---: | :--- |
| **`$extends` (Prisma Client Extensions)** | **NOT USED** | Scanning `backend/src/` yields **0 matches**. The system uses Prisma 8 RC (`@prisma/orm-postgres/runtime`) under a Contract-first architecture with the client initialized in [`backend/src/prisma/db.ts:L23-25`](file:///c:/Workspaces/haihire/backend/src/prisma/db.ts#L23-L25). Conventional Prisma Client runtime extensions are not used. |
| **Complex Nested Writes (`create: { ... create: { ... } }`)** | **NOT USED** | Prisma 8 RC contract-first uses **flat queries**. All multi-table write operations (e.g. Candidate + Application + CandidateDocument) are split into sequential, isolated queries within `executeTx(async tx => ...)` ([`applications.service.ts:L537`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L537) & [`L654`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L654)). |
| **`transaction({ isolationLevel: ... })`** | **NOT USED** | Transaction management in [`backend/src/prisma/prisma.service.ts:L19-34`](file:///c:/Workspaces/haihire/backend/src/prisma/prisma.service.ts#L19-L34) takes a callback `fn: (tx) => Promise<T>`, with **no option arguments or `isolationLevel`**. Transactions execute under PostgreSQL's default isolation level (`READ COMMITTED`). |
| **Catching `P2002` (Unique constraint)** | **NOT USED** | Scanning yields **0 matches**. HaiHire does not catch `P2002` error codes upon query crash; instead, it enforces **Proactive Pre-flight Checks**: inspecting collisions prior to insertion (e.g. email checks in [`applications.service.ts:L529-536`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L529-L536) and [`auth.service.ts:L186-193`](file:///c:/Workspaces/haihire/backend/src/auth/auth.service.ts#L186-L193)), throwing domain exceptions `AppBadRequestException` or `AppConflictException`. |

---

## 2. [DLQ WORKER] Dead-Letter Queue Mechanics & Alert Channels

### 2.1 Worker and Consumer Architecture
- **Queue Registration:** In [`backend/src/applications/applications.module.ts:L21-25`](file:///c:/Workspaces/haihire/backend/src/applications/applications.module.ts#L21-L25), both `orphan-cleanup-queue` and `orphan-cleanup-dlq` are registered with BullMQ.
- **Worker Processing:** Only [`OrphanCleanupProcessor`](file:///c:/Workspaces/haihire/backend/src/applications/orphan-cleanup.processor.ts#L16-L18) consumes the primary queue `orphan-cleanup-queue`.
- **Failure Behavior:** When a job fails 5 times (`job.attemptsMade >= 5`), the `@OnWorkerEvent("failed")` handler ([`orphan-cleanup.processor.ts:L47-68`](file:///c:/Workspaces/haihire/backend/src/applications/orphan-cleanup.processor.ts#L47-L68)) logs the error and moves the job into `orphan-cleanup-dlq` named `dead-letter-cleanup`.
- ⚠️ **CONSUMER FINDING:** **Zero workers consume the `dead-letter-cleanup` (`orphan-cleanup-dlq`) queue.**

### 2.2 Alert Destination
- When a job enters the DLQ, the system originally emitted only:
  ```typescript
  // orphan-cleanup.processor.ts:L51-53
  this.logger.error(
    `[CRITICAL ALERT - DLQ] MinIO orphan cleanup failed permanently for object '${job.data.objectName}' after ${job.attemptsMade} attempts: ${err.message}. Moving to DLQ.`,
  );
  ```
- **Alert Channel:** **Exclusively printed to Console Logger (STDOUT/STDERR)**. Originally lacked automated webhooks to Slack, Discord, Telegram, or PagerDuty (Resolved in Tasks #1A & #1B).

### 2.3 Is the DLQ a "Graveyard" or a "Safety Net"?
- **Original Status (Graveyard):** Failed jobs remain in Valkey/Redis awaiting manual inspection by SRE engineers via CLI or UI tools.
- **Storage Safety Net:** The system features a nightly 4:00 AM cron script ([`scripts/cleanup-orphan-minio.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.ts)) reconciling database state against MinIO. Orphan files older than 30 days (grace period) are automatically purged.

---

## 3. [E2E TENANT] Status of Real HTTP Cross-Tenant Testing

- **Historical Status:** **NOT IMPLEMENTED PRIOR TO TASK #4.**
- **Preexisting Playwright Tests:** The directory [`frontend/tests/e2e/`](file:///c:/Workspaces/haihire/frontend/tests/e2e/) contained 5 browser scenarios:
  1. `apply-form.spec.ts`: Public candidate job application.
  2. `careers-page.spec.ts`: Public job descriptions and UTM link tracking.
  3. `kanban-drag-drop.spec.ts`: Kanban candidate stage drag-and-drop.
  4. `login-flow.spec.ts`: Login & HttpOnly cookie validation.
  5. `theme-toggle.spec.ts`: Dark/Light theme switching.
- **Audit Findings:** Multi-tenant isolation was initially only tested at Unit & Integration levels within NestJS:
  - [`backend/src/test/tenant-isolation.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/tenant-isolation.spec.ts) (3 cases - mock ExecutionContext).
  - [`backend/src/interviews/interviews.service.spec.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.spec.ts) (4 cases - direct service method invocation).
  - **No tests started a real HTTP server, logged in User A, and issued real HTTP requests with cookies to User B's endpoints asserting HTTP 403 Forbidden.** (Resolved in Task #4).

---

## 4. [TENANT SCOPE STATIC] Status of Static Analysis for `organizationId`

- **Historical Status:** **NOT IMPLEMENTED PRIOR TO TASK #5.**
- **Status of CI Gates in `scripts/`:**
  - `check-dtopipe-coverage.ts`: Regex scan verifying `@Body()` uses `DtoPipe`.
  - `check-api-contract-coverage.ts`: Validates controller endpoints against frontend API client methods; guards against `JSON.stringify(err)` and `alert()` leaks.
  - `check-error-code-i18n.ts`: Validates `APP_ERROR_CODES` parity in `vi.ts`/`en.ts`.
  - `check-env-sync.ts`: Verifies 100% key parity across 5 `.env` manifests.
  - `frontend/scripts/check-i18n.ts`: Validates zero hardcoded strings in JSX.
- **Audit Findings:** Prior to Task #5, no AST scanner or ESLint rule checked backend queries `prisma.db.orm.public.[Model].select(...).where(...)` to ensure they contain `organizationId.eq(...)`. Tenant isolation relied on:
  1. Controller-level `TenantGuard` attachments.
  2. Developer discipline during service method implementation. (Resolved in Task #5).

---

## 5. [RISK SUMMARY & ARCHITECTURAL RECOMMENDATIONS]

Backlog items for DeepSeek and Project Owner:

| Issue | Risk Level | Architectural Action Item |
| :--- | :---: | :--- |
| **DLQ lacks Consumer & External Alerts** | **Medium** | **RESOLVED (Tasks #1A & #1B):** Implemented multi-channel webhook notifications (Telegram, Discord, Generic) with per-organization configuration and DLQ event alerting. |
| **Missing HTTP E2E Cross-Tenant Tests** | **High** | **RESOLVED (Task #4):** Implemented Playwright `tenant-security.spec.ts` asserting HTTP 403 on cross-tenant access. |
| **Missing Static Analysis for ORM Scoping** | **High** | **RESOLVED (Task #5):** Implemented CI gate `scripts/check-tenant-scoping.ts` ensuring all tenant-scoped queries enforce isolation. |
| **Prisma Engine Simplicity** | **Low (Advantage)** | Avoiding `$extends`, complex nested writes, and `P2002` catches keeps the codebase clean, decoupling logic from engine internals and facilitating future Prisma 8 upgrades. |
