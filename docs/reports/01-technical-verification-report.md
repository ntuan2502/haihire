# Technical Verification Report #01: Architecture & Test Coverage
> **Report for DeepSeek & Project Owner (Single Source of Truth - Technical Verification)**  
> **Project:** HaiHire Enterprise ATS Platform  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Date:** 2026-10-06  
> **Report ID:** `DOCS-REP-01`

---

## Table of Contents
1. [EMAIL ADAPTER] `EmailProvider` abstraction structure in `backend/src/email/`
2. [DLQ MONITORING] Prometheus Alert Rules status for BullMQ Queue Size & DLQ Size
3. [TENANT ISOLATION TEST] Multi-Tenant isolation tests between Org A and Org B
4. [PRISMA PIN] Prisma 8 RC exact version pinning mechanism
5. [SAGA ROLLBACK TEST] Distributed transaction compensation tests (MinIO Compensating Delete & DLQ Enqueue)
6. [SUMMARY & RECOMMENDATIONS] Proposed technical action items for DeepSeek

---

## 1. [EMAIL ADAPTER] Abstraction Structure in `backend/src/email/`

### 1.1 Audit Findings
- **Is there an abstract interface?** **YES**. The project defines the [`IEmailTransporter`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts#L15-L17) interface in [`backend/src/email/transporters/transporter.interface.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts).
- **What is `SIMULATED`?** `SIMULATED` is a **concrete implementation** ([`SimulatedTransporter`](file:///c:/Workspaces/haihire/backend/src/email/transporters/simulated.transporter.ts)) that implements `IEmailTransporter`.
- **Implementation Pattern:** Applies the **Factory Pattern** via [`EmailTransporterFactory`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts#L7-L21) in [`backend/src/email/transporters/transporter.factory.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts). The primary service ([`EmailService`](file:///c:/Workspaces/haihire/backend/src/email/email.service.ts)) calls the factory to instantiate transporters dynamically based on Organization or System settings.

### 1.2 Email Module Directory Tree
```text
backend/src/email/
├── dto/
│   ├── send-email.dto.ts
│   └── update-email-setting.dto.ts
├── transporters/                             # ABSTRACTION LAYER AND IMPLEMENTATIONS
│   ├── transporter.interface.ts              # IEmailTransporter, TransporterConfig interfaces
│   ├── transporter.factory.ts                # EmailTransporterFactory.create(config)
│   ├── simulated.transporter.ts              # class SimulatedTransporter implements IEmailTransporter
│   ├── smtp.transporter.ts                   # class SmtpTransporter implements IEmailTransporter
│   ├── resend.transporter.ts                 # class ResendTransporter implements IEmailTransporter
│   └── sendgrid.transporter.ts               # class SendGridTransporter implements IEmailTransporter
├── email.controller.ts                       # REST API Controller
├── email.module.ts                           # NestJS Module
├── email.processor.ts                        # BullMQ Worker processing asynchronous email sending
├── email.service.ts                          # Business logic, emailLogs auditing
├── variable-registry.ts                      # Template context interpolation & Anti-XSS sanitization
└── email.service.spec.ts                     # Unit test suite
```

### 1.3 Code Evidence
Interface excerpt from [`transporter.interface.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts#L15-L20):
```typescript
export interface IEmailTransporter {
  send(payload: EmailSendPayload): Promise<EmailSendResult>;
}

export interface TransporterConfig {
  provider: "SIMULATED" | "SMTP" | "RESEND" | "SENDGRID" | string;
  fromName: string;
  fromEmail: string;
  smtpHost?: string | null;
  // ...
}
```

Factory excerpt from [`transporter.factory.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts#L7-L21):
```typescript
export class EmailTransporterFactory {
  static create(config: TransporterConfig): IEmailTransporter {
    switch (config.provider) {
      case "SMTP":
        return new SmtpTransporter(config);
      case "RESEND":
        return new ResendTransporter(config);
      case "SENDGRID":
        return new SendGridTransporter(config);
      case "SIMULATED":
      default:
        return new SimulatedTransporter();
    }
  }
}
```

---

## 2. [DLQ MONITORING] Status of Prometheus Alert Rules for BullMQ & DLQ

### 2.1 Audit Findings
- **In alert rules file:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml) originally contained exactly **7 alert rules**:
  1. `HaiHireBackendDown` (Lines 4-11): Detects unreachable NestJS instance (>1m).
  2. `HaiHirePostgresDown` (Lines 13-20): Failed Postgres database healthcheck (>30s).
  3. `HaiHireRedisDown` (Lines 22-29): Failed Valkey/Redis ping (>30s).
  4. `HaiHireMinioDown` (Lines 31-38): Failed MinIO bucket healthcheck (>1m).
  5. `HaiHireHighHttp5xxErrorRate` (Lines 40-47): 5xx error rate exceeds 5% over 5m.
  6. `HaiHireHighHttpLatencyP95` (Lines 49-56): P95 HTTP latency exceeds 1000ms over 3m.
  7. `HaiHireHighRateLimit429Rate` (Lines 58-65): Rate-limited requests exceed 50 req/s.
- ⚠️ **HISTORICAL FINDING:** **Originally lacked alert rules for BullMQ queue depth and Dead-Letter Queue (DLQ) size.** (Resolved in Task #3).
- **In metrics service:** In [`backend/src/metrics/metrics.service.ts:L49-51`](file:///c:/Workspaces/haihire/backend/src/metrics/metrics.service.ts#L49-L51), the `bullmq_queue_depth` metric was originally declared as a **static gauge reporting 0**, not connected to live queues (`orphan-cleanup-queue`, `email-queue`). (Resolved in Task #2).

```typescript
// backend/src/metrics/metrics.service.ts:L49-51 (prior to Task #2)
"# HELP bullmq_queue_depth Estimated depth of BullMQ async jobs queue.",
"# TYPE bullmq_queue_depth gauge",
"bullmq_queue_depth 0",
```

---

## 3. [TENANT ISOLATION TEST] Multi-Tenant Isolation Tests Between Org A and Org B

### 3.1 Audit Findings
The project features a dedicated test suite simulating two organizations (`org-alpha` and `org-beta`) and asserting authorization rejections with HTTP 403 (`AppForbiddenException`).

### 3.2 Test Files & Test Cases

#### Primary File: [`backend/src/test/tenant-isolation.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/tenant-isolation.spec.ts) (3 test cases)
- **Mock Data Setup (Lines 21-39):**
  - Instantiates two organizations: `org-alpha` ("Alpha Tech Corp") and `org-beta` ("Beta Financials").
  - Instantiates two admins: `usr-alpha` (belonging to Org Alpha) and `usr-beta` (belonging to Org Beta).
  - Instantiates jobs and candidates partitioned under each organization.
- **Case 1 (Lines 89-102):** `permits requests when user accesses their own organization resources`
  - User `usr-alpha` accesses resources with `query: { organizationId: "org-alpha" }` $\rightarrow$ `expect(allowed).toBe(true)`.
- **Case 2 (Lines 104-137):** `rejects cross-tenant requests with AppForbiddenException when Org Alpha tries to access Org Beta`
  - User `usr-alpha` attempts to access with `query: { organizationId: "org-beta" }`.
  - **Assert:** Throws `AppForbiddenException` (HTTP 403).
  ```typescript
  // tenant-isolation.spec.ts:L134-136
  await expect(restrictedGuard.canActivate(crossTenantContext)).rejects.toThrow(
    AppForbiddenException
  );
  ```
- **Case 3 (Lines 141-146):** `returns empty result set when organizationId is missing or invalid`
  - `candidatesService.findAll(undefined)` returns `{ data: [], total: 0 }`, preventing global data leakage.

#### Domain Service Cross-Tenant Tests:
- **File: [`backend/src/interviews/interviews.service.spec.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.spec.ts):**
  - Line 321: `should throw AppForbiddenException when scheduling interview across different organizations`.
  - Lines 349-350: `should throw AppForbiddenException when accessing an interview belonging to another organization` (calling `service.findOne("intv-1", "other-org")` $\rightarrow$ assert `AppForbiddenException`).
  - Lines 368-377: `should throw AppForbiddenException when updating an interview from another organization`.
  - Lines 380-381: `should throw AppForbiddenException when deleting an interview from another organization`.

---

## 4. [PRISMA PIN] Prisma 8 RC Exact Version Pinning

### 4.1 Audit Findings
Prisma 8 RC is pinned using **EXACT VERSIONS (no caret `^` or tilde `~`)** uniformly across all 3 dependency manifests: `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.

### 4.2 Code Line Evidence

1. **[`backend/package.json`](file:///c:/Workspaces/haihire/backend/package.json):**
   - Line 40: `"@prisma/composer": "0.25.0"` (exact)
   - Line 41: `"@prisma/composer-prisma-cloud": "0.25.0"` (exact)
   - Line 42: `"@prisma/orm-postgres": "8.0.0-rc.13"` (exact, **no `^`**)
   - Line 69: `"prisma": "8.0.0-rc.19"` (exact, **no `^`**)

2. **[`pnpm-workspace.yaml`](file:///c:/Workspaces/haihire/pnpm-workspace.yaml):**
   - Line 11: `minimumReleaseAgeExclude: - "@prisma/*"` (excludes Prisma from pnpm automated aging hold)
   - Line 26: `minimumReleaseAgeExclude: - prisma@8.0.0-rc.19`
   - Line 29: `overrides: "@prisma/cli-engine": "0.6.1"` (enforces pinned CLI engine)

3. **[`pnpm-lock.yaml`](file:///c:/Workspaces/haihire/pnpm-lock.yaml):**
   - Line 9: `overrides: '@prisma/cli-engine': 0.6.1`
   - Lines 66-67:
     ```yaml
     '@prisma/orm-postgres':
       specifier: 8.0.0-rc.13
       version: 8.0.0-rc.13(...)
     ```
   - Lines 142-143:
     ```yaml
     prisma:
       specifier: 8.0.0-rc.19
       version: 8.0.0-rc.19(...)
     ```

---

## 5. [SAGA ROLLBACK TEST] Distributed Transaction Compensation Tests

### 5.1 Audit Findings
Both test scenarios (MinIO rollback upon DB failure, and DLQ enqueue upon MinIO compensating failure) are fully implemented and verified.

### 5.2 Test Files & Test Cases

#### Scenario 1: MinIO upload OK $\rightarrow$ DB write FAIL $\rightarrow$ Assert MinIO file deleted
- **File:** [`backend/src/test/transactions.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/transactions.spec.ts)
- **Test name:** `Failure Scenario & Repro: DB failure triggers transaction rollback AND MinIO compensating delete`
- **Location:** [Lines 407 to 461](file:///c:/Workspaces/haihire/backend/src/test/transactions.spec.ts#L407-L461)
- **Execution Mechanism:**
  - Line 421: Mocks database write failure: `Application.create = vi.fn().mockRejectedValue(new Error("Simulated DB Crash on Application write"))`.
  - Lines 440-449: Invokes `appService.create(...)`, asserts caught DB Crash error.
  - Lines 452-456: Asserts complete DB transaction rollback (no Candidate or Application records persisted).
  - Lines 457-460: **Saga verification:** Asserts MinIO delete function triggered, removing the exact uploaded file:
  ```typescript
  // transactions.spec.ts:L458-460
  expect(minioUploadedFiles.length).toBe(1);
  expect(minioDeletedFiles.length).toBe(1);
  expect(minioDeletedFiles[0]).toBe(minioUploadedFiles[0]);
  ```

#### Scenario 2: MinIO delete FAIL $\rightarrow$ Assert job enqueued to DLQ with 5 attempts
- **File:** [`backend/src/test/orphan-cleanup.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts)
- **Test name:** `Test 2: When compensating delete fails (MinIO down), file is pushed to DLQ queue with 5 attempts`
- **Location:** [Lines 186 to 225](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts#L186-L225)
- **Execution Mechanism:**
  - Lines 196-197: Mocks DB transaction crash, while MinIO `deleteFile` throws `503 Service Unavailable`.
  - Line 216: Confirms attempt to call `minio.deleteFile`.
  - Lines 218-224: **Assert:** Job pushed to `orphanCleanupQueue` with 5 retry attempts and exponential backoff:
  ```typescript
  // orphan-cleanup.spec.ts:L218-224
  expect(enqueuedJobs.length).toBe(1);
  expect(enqueuedJobs[0].name).toBe("cleanup");
  expect(enqueuedJobs[0].data.objectName).toBe("tenants/org-1/resumes/test.pdf");
  expect(enqueuedJobs[0].data.reason).toBe("transaction-rollback-compensation-failed");
  expect(enqueuedJobs[0].opts?.attempts).toBe(5);
  expect(enqueuedJobs[0].opts?.backoff?.type).toBe("exponential");
  ```
- **Supplementary Test (Test 4 - DLQ Terminal Failure):** In [Lines 256-277](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts#L256-L277) (`Test 4: Worker terminal failure — after 5 attempts, moves to Dead-Letter Queue (DLQ) & alerts`), verifies that after 5 failed retries, the job transitions into the Dead-Letter Queue `dead-letter-cleanup`.

---

## 6. [SUMMARY & RECOMMENDATIONS] Action Items for DeepSeek & Project Owner

| Category | Codebase Status | Recommended Action Item |
| :--- | :--- | :--- |
| **Email Transporter** | Factory Pattern & 4 Transporters completed (Simulated, SMTP, Resend, SendGrid). | Configure production credentials for chosen official provider. |
| **DLQ Monitoring** | Originally lacked DLQ monitoring rules; `MetricsService` hardcoded `bullmq_queue_depth 0`. | **RESOLVED (Tasks #2 & #3):** Implemented Prometheus `HaiHireBullMqDlqGrowing` rule and dynamic BullMQ metrics in `MetricsService`. |
| **Tenant Isolation** | Guard & service layer tests in place (403 `AppForbiddenException`). | **RESOLVED (Task #4):** Implemented live E2E HTTP cross-tenant test suite in Playwright. |
| **Prisma Pinning** | Strictly pinned exact versions `8.0.0-rc.13` & `8.0.0-rc.19` with `overrides`. | Keep intact. Do not run `pnpm update` for Prisma until official GA release. |
| **Saga Compensations** | Both branches tested: successful rollback and DLQ enqueue upon rollback failure. | Meets enterprise reliability standards. |
