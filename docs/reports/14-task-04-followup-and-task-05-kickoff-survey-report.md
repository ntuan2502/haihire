# Technical Report: Task #4 Follow-Up & Task #5 Kickoff Survey

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Antigravity Agent  
**Date:** 2026-10-07  
**Status:** ✅ READY FOR DEEPSEEK REVIEW & TASK #5 SPEC RELEASE  
**References:** [docs/reports/13-task-04-e2e-cross-tenant-valkey-report.md](file:///c:/Workspaces/haihire/docs/reports/13-task-04-e2e-cross-tenant-valkey-report.md), [backend/src/prisma/contract.prisma](file:///c:/Workspaces/haihire/backend/src/prisma/contract.prisma)

---

## PART A: VERIFYING ERROR CODE INCONSISTENCIES

In Task #4, 4 cross-tenant rejection scenarios utilized 4 distinct error codes:
1. `CANDIDATE_ORG_MISMATCH` (`GET /candidates`)
2. `JOB_INVALID_ORGANIZATION` (`PATCH /jobs`)
3. `APPLICATION_INVALID_ORGANIZATION` (`DELETE /applications`)
4. `ORG_FORBIDDEN_ACTION` (`PATCH /webhook-settings`)

### 1. Why Does Code #4 (`ORG_FORBIDDEN_ACTION`) Not Follow the `<ENTITY>_<PROBLEM>` Pattern?

Audit of the backend codebase confirms:
`ORG_FORBIDDEN_ACTION` is not tied to a single entity because it represents a **System-Level Organization Guard Error**.

- **Directly used in `TenantGuard` ([`backend/src/common/guards/tenant.guard.ts:L44, L54`](file:///c:/Workspaces/haihire/backend/src/common/guards/tenant.guard.ts#L44-L54)):**
  Whenever an incoming HTTP request carries an `organizationId` (via query, body, or route param) and the user lacks membership in that organization, the guard rejects the request with `AppForbiddenException(APP_ERROR_CODES.ORG_FORBIDDEN_ACTION)`.
- **Shared across organization-level administrative services:**
  - [`backend/src/organizations/organizations.service.ts`](file:///c:/Workspaces/haihire/backend/src/organizations/organizations.service.ts): Membership, invitations, cross-org administration (L431, L589, L751, L854, L962, L1141).
  - [`backend/src/webhook-settings/webhook-settings.service.ts`](file:///c:/Workspaces/haihire/backend/src/webhook-settings/webhook-settings.service.ts): Per-org webhook settings (L118, L222, L368, L414).
  - [`backend/src/activities/activities.service.ts`](file:///c:/Workspaces/haihire/backend/src/activities/activities.service.ts): Activity log access verification (L72, L111).
  - [`backend/src/email/email.service.ts`](file:///c:/Workspaces/haihire/backend/src/email/email.service.ts): Org email dispatch permissions (L82).

**Conclusion:** `ORG_FORBIDDEN_ACTION` serves a broad, cross-cutting purpose (shared guard / organization context). Preserving this error code is architecturally sound.

---

### 2. User Experience in `frontend/src/i18n/locales/vi.ts` and `en.ts`

Actual messages rendered to end-users:

| Error Code | Vietnamese (`vi.ts`) | English (`en.ts`) |
| :--- | :--- | :--- |
| **`ORG_FORBIDDEN_ACTION`** | `"Bạn không có quyền thực hiện thao tác này trong tổ chức ({organizationId})."` | `"You do not have permission to perform this action in organization ({organizationId})."` |
| **`JOB_INVALID_ORGANIZATION`** | `"Vị trí tuyển dụng ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Job position ({id}) does not belong to your organization."` |
| **`APPLICATION_INVALID_ORGANIZATION`**| `"Hồ sơ ứng tuyển ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Application ({id}) does not belong to your organization."` |
| **`CANDIDATE_ORG_MISMATCH`** | `"Ứng viên ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Candidate ({id}) does not belong to your organization."` |

**Observations:**
- The 3 entity-level codes (`JOB_INVALID_ORGANIZATION`, `APPLICATION_INVALID_ORGANIZATION`, `CANDIDATE_ORG_MISMATCH`) follow a standardized semantic pattern:
  `"<Entity Name> ({id}) does not belong to your organization."`
  This clearly identifies for users and developers which resource was denied cross-tenant access.
- `ORG_FORBIDDEN_ACTION` encompasses broader organization guard actions.

---

### 3. Standardization & Documentation Recommendations
- **Preserve the 4 Error Codes:** Do not alter enum constants in `packages/shared/src/errors.ts` to prevent breaking API contracts between Backend and Frontend.
- **UX Messaging:**
  - **Option 1 (Recommended):** Retain detailed entity-specific messages as they provide precise operational context.
  - **Option 2 (Unified phrasing):** If a single consolidated phrase is preferred:
    - VI: `"Bạn không có quyền truy cập dữ liệu của tổ chức khác."`
    - EN: `"You do not have permission to access data from another organization."`
- **Documentation:** Documented this two-tier model (**Tier 1:** Entity-Level Isolation & **Tier 2:** Organization-Guard Isolation) in [`docs/PROJECT_CONTEXT.md`](file:///c:/Workspaces/haihire/docs/PROJECT_CONTEXT.md).

---

## PART B: TASK #5 KICKOFF SURVEY (TENANT SCOPING STATIC ANALYSIS)

---

### Question 1: Enumerate all `*.service.ts` files in `backend/src/`
There are **18 service files** in total:

#### A. Tenant-Scoped Services (8 business services holding multi-tenant data):
1. [`backend/src/activities/activities.service.ts`](file:///c:/Workspaces/haihire/backend/src/activities/activities.service.ts)
2. [`backend/src/applications/applications.service.ts`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts)
3. [`backend/src/candidates/candidates.service.ts`](file:///c:/Workspaces/haihire/backend/src/candidates/candidates.service.ts)
4. [`backend/src/interviews/interviews.service.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.ts)
5. [`backend/src/jobs/jobs.service.ts`](file:///c:/Workspaces/haihire/backend/src/jobs/jobs.service.ts)
6. [`backend/src/organizations/organizations.service.ts`](file:///c:/Workspaces/haihire/backend/src/organizations/organizations.service.ts)
7. [`backend/src/sourcing/sourcing.service.ts`](file:///c:/Workspaces/haihire/backend/src/sourcing/sourcing.service.ts)
8. [`backend/src/webhook-settings/webhook-settings.service.ts`](file:///c:/Workspaces/haihire/backend/src/webhook-settings/webhook-settings.service.ts)
*(Note: [`backend/src/users/users.service.ts`](file:///c:/Workspaces/haihire/backend/src/users/users.service.ts) reads mock demo user accounts)*

#### B. Non-Tenant-Scoped Services (9 infrastructure / system services):
1. `backend/src/app.service.ts` — System health check (Health & Service Status).
2. `backend/src/auth/auth.service.ts` — Authentication, password hashing, JWT issuance.
3. `backend/src/common/encryption.service.ts` — AES-256-GCM encryption algorithms.
4. `backend/src/common/webhook/webhook-notifier.service.ts` — Outbound HTTP webhook dispatcher.
5. `backend/src/email/email.service.ts` — BullMQ worker and SMTP/Resend/SendGrid connectivity.
6. `backend/src/events/events.service.ts` — In-memory SSE event bus.
7. `backend/src/metrics/metrics.service.ts` — Prometheus metrics collector.
8. `backend/src/minio/minio.service.ts` — S3 Object Storage MinIO client.
9. `backend/src/prisma/prisma.service.ts` — Prisma Engine lifecycle manager.

---

### Question 2: ORM Query Statistics in Tenant-Scoped Files
The project employs **Prisma 8 Composer API** (`this.prisma.db.orm.public.<Model>.<method>` or `tx.orm.public.<Model>.<method>`).
Automated static scanner results:

- **Total ORM queries detected:** **214 queries**.
- **Queries filtering by `organizationId` (or `targetOrgId`):** **108 queries**.
- **Queries NOT directly filtering by `organizationId`:** **106 queries** (Categorized into Whitelists under Question 3).

**File Breakdown:**
- `activities.service.ts`: 3 queries (Org-scoped: 1, Non-Org: 2 — dynamic `query.where(...)` on next line).
- `applications.service.ts`: 32 queries (Org-scoped: 13, Non-Org: 19).
- `candidates.service.ts`: 18 queries (Org-scoped: 5, Non-Org: 13).
- `interviews.service.ts`: 26 queries (Org-scoped: 4, Non-Org: 22).
- `jobs.service.ts`: 16 queries (Org-scoped: 6, Non-Org: 10).
- `organizations.service.ts`: 80 queries (Org-scoped: 65, Non-Org: 15).
- `sourcing.service.ts`: 28 queries (Org-scoped: 10, Non-Org: 18).
- `webhook-settings.service.ts`: 10 queries (Org-scoped: 4, Non-Org: 6).
- `users.service.ts`: 1 query (Non-Org: 1).

---

### Question 3: Whitelist Categories for Queries Lacking `organizationId`

Inspecting the schema in [`backend/src/prisma/contract.prisma`](file:///c:/Workspaces/haihire/backend/src/prisma/contract.prisma) identified 4 valid categories:

#### Category 1: Models Without an `organizationId` Column in Schema
1. **Model `Interview`:** Table contains `id`, `applicationId`, `scheduledAt`, etc. **Lacks an `organizationId` column**. Queries filter by `applicationId` (or `id`).
2. **Model `Application`:** Table references `jobId` and `candidateId`. **Lacks an `organizationId` column**. Context is derived via `jobId -> job.organizationId`.
3. **Model `TrackingClick`:** Contains `id` and `trackingLinkId`. Context is derived via `trackingLinkId`.
4. **Model `Organization`:** Primary key is `id`. Queries filter by `id: orgId` or `slug: orgSlug`.

#### Category 2: Auxiliary Queries Protected by Preceding Parent Guard
- *Example 1 (`applications.service.ts:findByJob`):* Function head retrieves `Job` by `jobId` and checks `if (job.organizationId !== tenantOrgId) throw 403`. Subsequent queries for `Application` (`where(a => a.jobId.eq(jobId))`) and `Candidate` (`where(c => c.id.in(candidateIds))`) are safe.
- *Example 2 (`jobs.service.ts:findOne`):* Asserts `job.organizationId === tenantOrgId`, then fetches applications for that job.

#### Category 3: Updates or Deletions by Primary Key (`id`) Post-Verification
- *Example (`jobs.service.ts:update` or `webhook-settings.service.ts:delete`):* First invokes `findOne(id, tenantOrgId)` (throwing 403 on mismatch). Subsequent `update` / `delete` safely target `where((x) => x.id.eq(id))`.

#### Category 4: Public Unauthenticated Endpoints
- *Example (`jobs.service.ts:findBySlug`):* External candidates viewing public job postings via organization slug (`orgSlug`) and `status === "PUBLISHED"`.

---

### Question 4: Query Patterns Beyond `this.prisma.db.orm.public`
1. **Raw SQL (`$queryRaw`, `$executeRaw`):** **ZERO (0 queries)**. Adheres 100% to Prisma 8 Composer type-safe queries.
2. **Transaction Queries:** Employs `tx.orm.public.<Model>...` within `executeTx` callbacks.
3. **Static DB Variables:** `users.service.ts` directly imports `db.orm.public.User` from `../prisma/db.ts`.
4. **Static Scanner Recommendation:** Version 1 regex:
   `/(?:this\.prisma\.db|tx|db)\.orm\.public\.([A-Za-z0-9_]+)/`

---

### Question 5: Structure of `scripts/check-dtopipe-coverage.ts`
- **Parsing Strategy:** Line-by-line regex inspection with recursive `fs.readdirSync` and `fs.readFileSync`.
  - Runs in < 0.2s without Babel or TypeScript compiler APIs, satisfying fast CI gate requirements.
- **Reusability:**
  - Traversal, error formatting (`file:line -> snippet`), and `process.exit(1)` code conventions can be directly leveraged for `scripts/check-tenant-scoping.ts`.

---

## SUMMARY & WORKING TREE STATUS

- **Working Tree:** Clean, branch `feat/task-04-e2e-cross-tenant-test` synchronized with `origin`.
- **Code Status:** No code modifications pending for Parts A/B.
- **Readiness:** Complete 5-point survey archived in `docs/reports/14-task-04-followup-and-task-05-kickoff-survey-report.md`, ready for DeepSeek review and **Task #5 (Tenant Scoping Static Analysis)** kickoff.
