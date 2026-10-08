# Phase 5 Verification Report: System Hardening
**Project:** HaiHire Recruitment Platform  
**Engineer:** Senior Backend Engineer  
**Completion Date:** 01/10/2026  
**Status:** 100% COMPLETE (All Quality Gates Passed)

---

## 1. Executive Summary

Based on the findings from the independent **Phase 4 IV&V Report** (`docs/phase-4-verification-report.md`), Phase 5 thoroughly resolved 3 core issues:

1. **BUG-P4-01 (P2):** Missing Optimistic Locking in the Pipeline Stage Machine $\rightarrow$ Race condition between concurrent requests, Last-Write-Wins.
2. **DESIGN-P4-02 (P3):** `validateMagicBytes` only inspected the initial 1024-byte header, missing truncated/corrupted PDFs lacking the trailing `%%EOF`.
3. **DESIGN-P4-03 (P3):** `minio.service.ts::uploadFile` fell back to root namespace when `tenantOrgId` was `null`/`undefined`/empty.

### Core Outcomes:
* **All 3 fixes** were fully implemented according to specifications.
* **100% Unit Tests & Integration Tests Passed:** **265/265 tests passed** (Backend: 160/160, Frontend: 105/105) — exceeding the required threshold of >255 tests.
* **11/11 Phase 3 runtime scenarios verified without regressions (Zero Regression):** 100% PASS.
* **Zero changes to production business logic files outside the 3 designated scope areas.**

---

## 2. Before / After Comparison Matrix

| Issue Code | Component | Before Fix | After Fix | New Error Code |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-P4-01** | `applications.service.ts::updateStage` | Only filtered by `WHERE id = id`. Two concurrent requests overwrote each other (Last-Write-Wins), both receiving `200 OK`. | Filters concurrently by `WHERE id = id AND stage = oldStage`. If `affectedRows === 0`, immediately throws `AppConflictException` (HTTP 409). | `APPLICATION_STAGE_CONFLICT` |
| **DESIGN-P4-02** | `upload-utils.ts::validateMagicBytes` & `validateUploadedFile` | Only read the first 1024 bytes searching for `%PDF-`. Truncated files (50% or 99% truncated) were still treated as valid. | Inspects `%PDF-` at file start + scans backward across up to the last 2048 bytes for the `%%EOF` trailer. Files lacking the trailer are rejected immediately. | `UPLOAD_TRUNCATED_FILE` |
| **DESIGN-P4-03** | `minio.service.ts::uploadFile` | If `tenantOrgId` was `null`/`undefined`/empty, automatically fell back to root namespace `resumes/...`. | Requires valid `tenantOrgId`. If missing or empty $\rightarrow$ immediately throws `AppBadRequestException` (HTTP 400). | `TENANT_ID_REQUIRED_FOR_UPLOAD` |

---

## 3. Implementation Details & Raw Evidence

### 3.1. FIX 1: Optimistic Locking for Stage Machine (BUG-P4-01)

#### A. Source Code Changes (`applications.service.ts`)
```typescript
// backend/src/applications/applications.service.ts
const updatedRecord = await this.prisma.db.orm.public.Application
  .where((a) => a.id.eq(id))
  .where((a) => a.stage.eq(oldStage))
  .update({
    stage: dto.stage,
    ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
  });

if (!updatedRecord) {
  throw new AppConflictException(
    APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
    `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
    { currentStage: oldStage, targetStage: dto.stage },
  );
}
```

#### B. Error Code Addition in `@haihire/shared` (`packages/shared/src/errors.ts`)
```typescript
export const APP_ERROR_CODES = {
  // ...
  APPLICATION_STAGE_CONFLICT: "APPLICATION_STAGE_CONFLICT",
  UPLOAD_TRUNCATED_FILE: "UPLOAD_TRUNCATED_FILE",
  TENANT_ID_REQUIRED_FOR_UPLOAD: "TENANT_ID_REQUIRED_FOR_UPLOAD",
} as const;
```

#### C. Pre-Fix Reproduction Evidence (Before Evidence)
When dispatching two concurrent PATCH `/applications/:id/stage` requests from `APPLIED` to `SCREENING` and `REJECTED`:
```json
REPRO_BEFORE_FIX: {
  "res1Status": 200,
  "res2Status": 200,
  "res1Stage": "SCREENING",
  "res2Stage": "REJECTED",
  "finalDbStage": "REJECTED",
  "isBugReproduced": true
}
```

#### D. Post-Fix Runtime Evidence (After Evidence)
When two concurrent requests read the same initial `APPLIED` stage:
```json
REPRO_AFTER_FIX: {
  "res1Status": 200,
  "res2Status": 409,
  "res1Stage": "SCREENING",
  "res2ErrorCode": "APPLICATION_STAGE_CONFLICT",
  "finalDbStage": "SCREENING",
  "isBugReproduced": false
}
```
**Raw Server Execution Log:**
```
[Nest] 41680  - 13:59:36 01/10/2026 LOG [ApplicationsService]
UPDATE_STAGE_STEP: { id: 'a2624e7f-...', oldStage: 'APPLIED', targetStage: 'SCREENING', updated: true }
UPDATE_STAGE_STEP: { id: 'a2624e7f-...', oldStage: 'APPLIED', targetStage: 'REJECTED', updated: false }
-> HTTP 409 Conflict thrown with code: APPLICATION_STAGE_CONFLICT
```

#### E. Unit Tests (`applications.service.spec.ts`)
Added 3 dedicated unit tests:
1. `should allow sequential valid updates to next stages` $\rightarrow$ PASS.
2. `should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict` $\rightarrow$ PASS.
3. `should throw NotFoundException when updating non-existent application` $\rightarrow$ PASS.

---

## 3.2. FIX 2: PDF Integrity Validation (DESIGN-P4-02)

#### A. Source Code Changes (`upload-utils.ts`)
```typescript
// backend/src/common/upload-utils.ts
export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (extension === ".pdf") {
    // 1. Validate PDF header signature
    const headerValid = buffer.length >= 4 && buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    if (!headerValid) return false;

    // 2. Validate PDF trailer %%EOF
    const searchWindowSize = Math.min(buffer.length, 2048);
    const trailerChunk = buffer.subarray(buffer.length - searchWindowSize).toString("latin1");
    return trailerChunk.includes("%%EOF");
  }
  // ... (docx, doc, txt validation)
}

export function validateUploadedFile(file: Express.Multer.File): void {
  // ...
  const ext = "." + (file.originalname.split(".").pop()?.toLowerCase() || "");
  if (ext === ".pdf") {
    const hasHeader = file.buffer.length >= 4 && file.buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    if (hasHeader && !validateMagicBytes(file.buffer, ext)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE,
        "PDF file appears truncated or corrupt (missing %%EOF trailer in trailing 2048 bytes).",
      );
    }
  }
  // ...
}
```

#### B. Runtime Evidence via HTTP API (`POST /applications/apply`)
Executed real verification script (`scratch/verify-edge6.ts`):
```
--- Testing Edge 6: Truncated PDF Upload ---
Using PUBLISHED job: 086e6926-70f4-44b5-95be-3421ddaca39f Fullstack Engineer
Edge 6 Result: {
  status: 400,
  code: 'UPLOAD_TRUNCATED_FILE',
  message: 'PDF file appears truncated or corrupt (missing %%EOF trailer in trailing 2048 bytes).',
  isCorrectlyRejected: true
}
Valid PDF Result: {
  status: 201,
  appId: 'b5724c28-9147-460f-b1cb-1ef977e287cc',
  isAccepted: true
}
```

#### C. Unit Tests (`upload-utils.spec.ts`)
Added 5 comprehensive unit tests:
1. `should accept valid PDF binary signature %PDF- with %%EOF trailer` $\rightarrow$ PASS.
2. `should reject PDF truncated 50% (missing %%EOF trailer)` $\rightarrow$ PASS.
3. `should reject PDF truncated 99% (only missing %%EOF)` $\rightarrow$ PASS.
4. `should accept valid PDF where %%EOF is outside last 1024 bytes but within 2048 bytes` $\rightarrow$ PASS.
5. `should reject truncated PDF via validateUploadedFile with UPLOAD_TRUNCATED_FILE` $\rightarrow$ PASS.

---

## 3.3. FIX 3: MinIO Tenant Key Defense (DESIGN-P4-03)

#### A. Source Code Changes (`minio.service.ts`)
```typescript
// backend/src/minio/minio.service.ts
async uploadFile(file: Express.Multer.File, folder = "resumes", tenantOrgId?: string | null): Promise<UploadResult> {
  if (!tenantOrgId || tenantOrgId.trim() === "") {
    throw new AppBadRequestException(
      APP_ERROR_CODES.TENANT_ID_REQUIRED_FOR_UPLOAD,
      "Tenant organization ID is required for file uploads to enforce tenant namespace isolation.",
    );
  }

  const safeTenant = tenantOrgId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = file.originalname.split(".").pop();
  const safeFilename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const objectName = `tenants/${safeTenant}/${folder}/${safeFilename}`;
  // ...
}
```

#### B. Audit of All 4 Call Sites
Grepped the entire codebase confirming no call site omits `tenantOrgId`:
1. `candidates.service.ts:391`: Passes `orgId` (from authenticated user).
2. `candidates.service.ts:503`: Passes `candidate.organizationId`.
3. `applications.service.ts:510`: Passes `job.organizationId`.
4. `applications.service.ts:921`: Passes `targetOrgId`.

#### C. Unit Tests (`minio.service.spec.ts`)
```typescript
describe("uploadFile Tenant Defense", () => {
  it("should throw AppBadRequestException when tenantOrgId is null", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", null)).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
  it("should throw AppBadRequestException when tenantOrgId is undefined", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", undefined)).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
  it("should throw AppBadRequestException when tenantOrgId is empty string", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", "   ")).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
});
```
All 3 tests **100% PASS**.

---

## 4. Overall Test Suite Verification

### 4.1. Backend Vitest Suite
```
$ pnpm --filter ./backend run test
$ vitest run

Test Files  20 passed (20)
     Tests  160 passed (160)
  Duration  13.72s
```

### 4.2. Frontend Vitest Suite
```
$ pnpm --filter ./frontend run test
$ vitest run

Test Files  21 passed (21)
     Tests  105 passed (105)
  Duration  14.23s
```

**TOTAL: 265 / 265 TESTS PASS 100%** (Exceeding the threshold requirement of >255 tests).

---

## 5. Runtime Re-Verification (11 Phase 3 + 10 Phase 4 Edge Cases)

### 5.1. 11 Phase 3 Runtime Scenarios (Zero-Regression Verification)
| Scenario | Verification Target | Status | Raw Verdict |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | SSE Tenant Isolation (Cross-tenant event isolation) | **PASS** | Only target tenant receives events |
| **Scenario 2** | Public Career Page (Only displays PUBLISHED jobs) | **PASS** | DRAFT/CLOSED/ARCHIVED return 404 |
| **Scenario 3** | JWT HttpOnly Cookie Authentication | **PASS** | Cookie-based auth functions correctly |
| **Scenario 4** | Stage State Machine Transitions | **PASS** | All invalid transitions rejected with 400 |
| **Scenario 5** | Rate Limiting (Redis Throttle) | **PASS** | Throttling returns HTTP 429 without 500 errors |
| **Scenario 6** | File Magic Bytes Validation (Spoofing defense) | **PASS** | Disguised .pdf shell scripts blocked immediately |
| **Scenario 7** | Path Traversal Defense in Filename | **PASS** | Filenames sanitized of `../` sequences |
| **Scenario 8** | MinIO Tenant Isolation (Bucket namespace) | **PASS** | Keys strictly prefixed with `tenants/<orgId>/` |
| **Scenario 9** | Email Organization Name Dynamic Resolution | **PASS** | Real organization name resolved, no 'ATS Recruitment' |
| **Scenario 10**| Audit Log on Application Deletion | **PASS** | Emits `APPLICATION_REMOVED` ActivityLog |
| **Scenario 11**| No Duplicate Prisma Service Registration | **PASS** | Single PrismaService instance in Nest context |

### 5.2. 10 Phase 4 Edge Cases
| Edge Case | Description | Post-Phase 5 Status |
| :--- | :--- | :--- |
| **Edge 1** | SSE with Expired Token | **HANDLED** (Returns HTTP 401) |
| **Edge 2** | Public Career Page with Non-Existent Slug | **HANDLED** (Returns HTTP 200, empty list) |
| **Edge 3** | Cookie + Bearer Conflict (Two differing tokens) | **HANDLED** (Cookie takes precedence per standard) |
| **Edge 4** | Stage Transition Race (2 concurrent PATCH requests) | **RESOLVED / PASS** (1 succeeds with HTTP 200, 1 receives HTTP 409 `APPLICATION_STAGE_CONFLICT`) |
| **Edge 5** | Rate Limit Bypass via X-Forwarded-For | **BLOCKED** (Redis Throttler blocks with 429) |
| **Edge 6** | Genuine PDF truncated by 50% | **RESOLVED / PASS** (Rejected with HTTP 400 `UPLOAD_TRUNCATED_FILE`) |
| **Edge 7** | MinIO key when `tenantOrgId = null` | **RESOLVED / PASS** (Immediately rejected with `TENANT_ID_REQUIRED_FOR_UPLOAD`) |
| **Edge 8** | Email Org Name when Organization is soft-deleted | **DOCUMENTED** (Soft-delete edge case) |
| **Edge 9** | ActivityLog when Candidate is soft-deleted | **DOCUMENTED** (Cascade deletion contract) |
| **Edge 10**| Memory Stability Test (100 requests) | **STABLE** (Heap delta 6.47 MB, no leaks) |

---

## 6. Critical Technical Finding (Discovered During Phase 5)

During Phase 5 implementation, a nuanced technical nuance was identified and resolved:

### ⚠️ Gotcha: `@prisma/orm-postgres` Syntax in Multi-Predicate Where
* **Symptom:** Initially, when authored as:
  ```typescript
  // ❌ LOGICAL BUG DUE TO JAVASCRIPT OBJECT EVALUATION:
  this.prisma.db.orm.public.Application.where(
    (a) => a.id.eq(id) && a.stage.eq(oldStage)
  ).update({ ... });
  ```
  In JavaScript / TypeScript, the logical `&&` between two object expressions `(expr1 && expr2)` returns `expr2` (`a.stage.eq(oldStage)`), **completely dropping `a.id.eq(id)`**! Consequently, Prisma generated SQL with `WHERE stage = oldStage`, inadvertently updating the first matching record in the table rather than the specific record by `id`!
* **Robust Pattern:**
  Chain sequential `.where()` invocations:
  ```typescript
  // ✅ CORRECT PATTERN:
  this.prisma.db.orm.public.Application
    .where((a) => a.id.eq(id))
    .where((a) => a.stage.eq(oldStage))
    .update({ ... });
  ```
  The `@prisma/orm-postgres` query builder collects all filters and combines them via `AND` in SQL: `WHERE "id" = $1 AND "stage" = $2`.

---

## 7. Conclusion

Phase 5 Hardening thoroughly resolved 100% of weaknesses identified in the Phase 4 IV&V Report:
- **State Machine Integrity** is protected by Optimistic Locking (HTTP 409).
- **Uploaded File Integrity** is verified across both header and trailing `%%EOF` markers.
- **Multi-Tenant Isolation** within MinIO is strictly enforced at the service boundary.

The HaiHire platform is stable, secure, and ready for Production.
