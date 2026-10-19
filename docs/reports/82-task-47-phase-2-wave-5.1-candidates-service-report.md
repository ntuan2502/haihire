# Task #47 Phase 2: Wave 5.1 Refactor Report (candidates.service.ts)

**Date**: 2026-10-19T16:10:00+07:00  
**Author**: Antigravity (AI Senior Full-Stack Architect & Backend Specialist)  
**Agent**: `backend-specialist`  
**Skills Active**: `@clean-code`, `@verify-changes`, `@api-patterns`  
**Branch**: `refactor/task-47-wave-5.1-candidates-service`  
**Pull Request**: [#104 (Wave 5.1 Candidates Service Refactor)](https://github.com/ntuan2502/haihire/pull/104)  
**Status**: COMPLETE (All 11/11 CI Gates Passed, 885 Tests Passing, Clean Architecture)

---

## 1. Executive Summary

In Wave 5.1 of the God File Refactoring Initiative (Task #47 Phase 2), `backend/src/candidates/candidates.service.ts` (previously 630 LOC, 693 raw lines) was successfully decomposed into a clean **Facade pattern** delegating 1:1 to three domain-specific sub-services residing under `backend/src/candidates/services/`.

### Key Outcomes

| Metric                         | Before Refactor             | After Refactor                              | Improvement / Delta                         |
| ------------------------------ | --------------------------- | ------------------------------------------- | ------------------------------------------- |
| **`candidates.service.ts`**    | 630 non-blank LOC (693 raw) | 129 LOC (129 raw)                           | **-79.5% LOC (Thin Facade)**                |
| **Max Service LOC**            | 630 LOC (Monolith)          | 319 LOC (`candidates-crud.service.ts`)      | **100% compliant (<400 LOC anti-monolith)** |
| **Direct Unit Tests**          | 0 tests (0.00% coverage)    | 14 tests (100% passing in 18ms)             | **+14 tests**                               |
| **Facade Line Coverage**       | 0.00%                       | **100.00%**                                 | **+100.00%**                                |
| **Sub-Services Line Coverage** | N/A                         | **86.79%**                                  | **Target >70% exceeded**                    |
| **Workspace Test Suite**       | 871 passed                  | **885 passed (499 backend + 386 frontend)** | **+14 net tests, 0 regressions**            |
| **CI Architecture Gates**      | 11/11 Passing               | **11/11 Passing (`pnpm check:all:fast`)**   | **100% Verified**                           |

---

## 2. Characterization Testing (Pre-Refactor Phase A)

Prior to modifying any production code, comprehensive characterization tests were created in `backend/src/candidates/candidates.service.spec.ts` covering all 8 public methods, edge cases, security controls, and tenant isolation constraints:

1. **`findAll`**:
   - Strict tenant isolation: enforces `organizationId` filter matching caller context.
   - Soft-delete filtering: enforces `deletedAt: null` across all queries.
   - Multi-field search filtering (name, email, phone) and cursor/offset pagination slicing.
2. **`findOne`**:
   - `404 Not Found` upon non-existent or soft-deleted candidate records.
   - `403 Forbidden` on cross-tenant lookup attempts.
   - Relational aggregation: joins applications, jobs, interviews, and candidate documents.
   - PII Audit Logging: verifies asynchronous `PII_READ` activity logging.
3. **`create`**:
   - Email uniqueness enforcement per organization (`409 Conflict`).
   - Full name parsing into `firstName` and `lastName`.
   - `dateOfBirth` string parsing into `Temporal.Instant`.
4. **`update`**:
   - Candidate fields mutation with name parsing and DOB instant normalization.
5. **`uploadDocument` & `prepareDocumentDownload`**:
   - Magic bytes / MIME validation and MinIO storage upload.
   - SSRF Protection: rejects document download requests for URLs unassociated with the candidate (`403 Forbidden`).
   - RFC 5987 UTF-8 encoded `Content-Disposition` header generation.
6. **`deleteDocument`**:
   - Candidate document deletion with fallback/reset of candidate's primary resume fields.
7. **`remove`**:
   - Two-Tier Soft Deletion within an explicit database transaction (`deletedAt` timestamp).
8. **Dependency Injection & Polymorphic Instantiation**:
   - Direct NestJS DI constructor instantiation compatibility.

**Commit**: `16eb8ae` — `test(candidates): add characterization tests for candidates service before refactor`

---

## 3. Architecture & Decomposition (Phase B)

### 3.1 Directory Structure

```
backend/src/candidates/
├── candidates.controller.ts            (Untouched, zero consumer modifications)
├── candidates.module.ts                (Registered & exported sub-services)
├── candidates.service.spec.ts          (14 characterization tests)
├── candidates.service.ts               (Facade, 129 LOC)
└── services/
    ├── candidates-crud.service.ts      (319 LOC)
    ├── candidates-documents.service.ts (274 LOC)
    ├── candidates-profile.service.ts   (222 LOC)
    └── index.ts                        (4 LOC, Barrel export)
```

### 3.2 Sub-Services Responsibilities

#### 1. `CandidatesCrudService` (319 LOC)

- **Responsibilities**: Candidate CRUD lifecycle, list querying, email deduplication, and Two-Tier soft deletion.
- **Methods**: `findAll`, `create`, `update`, `remove`.
- **Integrations**: `PrismaService`, `MinioService` (compensating delete), `CandidatesProfileService`.
- **Safety**: Executes deletion within `this.prisma.executeTx`, setting `deletedAt` without cascading physical row destruction (retaining 30-day grace period).

#### 2. `CandidatesDocumentsService` (274 LOC)

- **Responsibilities**: Document uploads, secure presigned download preparation, SSRF verification, and document lifecycle.
- **Methods**: `uploadDocument`, `prepareDocumentDownload`, `deleteDocument`.
- **Integrations**: `PrismaService`, `MinioService`, `CandidatesProfileService`, `ActivitiesService`.
- **Safety**:
  - Validates uploaded buffer MIME types and magic bytes.
  - Generates RFC 5987 compliant filenames (`filename*=UTF-8''...`).
  - Enforces SSRF defense by verifying document URL membership on candidate documents prior to stream dispatch.
  - Multi-tenant DB update scoping via chained `.where((c) => c.id.eq(id)).where((c) => c.organizationId.eq(candidate.organizationId))`.

#### 3. `CandidatesProfileService` (222 LOC)

- **Responsibilities**: Deep relational candidate profile retrieval, related entities aggregation, and PII audit logging.
- **Methods**: `findOne`.
- **Integrations**: `PrismaService`, `ActivitiesService`.
- **Safety**:
  - Cross-tenant access rejection (`AppForbiddenException`).
  - Emits non-blocking `PII_READ` audit trail activity record.

#### 4. `CandidatesService` (Facade, 129 LOC)

- **Pattern**: Thin delegator forwarding all 8 methods 1:1 to sub-services.
- **Polymorphic Constructor**: Supports both standard NestJS DI injection (`CandidatesCrudService`, `CandidatesDocumentsService`, `CandidatesProfileService`) and legacy direct instantiation (`PrismaService`, `MinioService`, `ActivitiesService`) used by legacy unit/e2e specs.

---

## 4. Verification Evidence & Quality Gates

### 4.1 Vitest Coverage Report

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
 ...src/candidates |     100 |     87.5 |     100 |     100 |
  ...es.service.ts |     100 |     87.5 |     100 |     100 | 47
 ...dates/services |   86.72 |    61.15 |   86.36 |   86.79 |
  ...ud.service.ts |   83.96 |    63.35 |     100 |      84 | ...75,288,292,298
  ...ts.service.ts |   83.56 |    50.74 |   61.53 |    84.5 | ...22,238,252-253
  ...le.service.ts |   97.87 |    67.74 |   92.85 |   97.56 | 150
  index.ts         |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```

### 4.2 Comprehensive 11/11 CI Gates (`pnpm check:all:fast`)

```
==================================================================
                       VERIFICATION SUMMARY
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.36s
  2. Two-Way i18n & Zero Hardcoded Strings (pnpm lint:i18n) [PASS]    0.85s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   29.65s
  4. TypeScript Type Safety                     [PASS]   10.87s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.26s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.36s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.40s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.41s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.36s
 10. CI Gate 11: Documentation Markdown Link Integrity [PASS]    0.42s
 11. Test Count Delta & Anti-Regression         [PASS]    0.35s
──────────────────────────────────────────────────────────────────
 Total Time: 44.29s
 Status: 🟢 ALL CHECKS PASSED (11/11) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

### 4.3 Test Suite Execution Summary

- **Backend**: 46/46 test files passed, 499/499 tests passed (100%).
- **Frontend**: 48/48 test files passed, 386/386 tests passed (100%).
- **Total Suite**: 885 passing tests.

---

## 5. Git Commit & Pull Request

1. `16eb8ae`: `test(candidates): add characterization tests for candidates service before refactor`
2. `ed3ff8a`: `refactor(candidates): split god service into facade and 3 sub-services`

**Pull Request**: https://github.com/ntuan2502/haihire/pull/104

---

## 6. Next Steps: Wave 5.2

With Wave 5.1 complete and verified, the next target in Wave 5 is:

- **Target**: `backend/src/email/email.service.ts` (622 LOC, Backend, High Risk)
- **Scope**: 3 provider transporters (SMTP, Resend, SendGrid), BullMQ queue integration, template interpolation, email logging.
- **Sub-Waves Remaining in Wave 5**:
  - Wave 5.2: `email.service.ts` (622 LOC)
  - Wave 5.3: `candidate-drawer.tsx` (778 LOC)
  - Wave 5.4: `settings/members/page.tsx` (747 LOC)
  - Wave 5.5: `interviews/page.tsx` (716 LOC)
  - Wave 5.6: `jobs/[id]/pipeline/page.tsx` (678 LOC)
