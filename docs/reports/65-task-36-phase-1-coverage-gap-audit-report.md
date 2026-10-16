# Task #36 Phase 1: Coverage Gap Audit Report

**Date**: 2026-10-17T00:15:00+07:00  
**Author**: Antigravity (AI Test Engineer & Quality Specialist)  
**Agent**: `test-engineer`  
**Status**: AUDIT COMPLETE (Zero Tests Written, Evidence-Based V8 Coverage Analysis)  
**Next Phase**: Task #36 Phase 2 (Implementation upon Architectural Review & Approval)

---

## 1. Executive Summary

Following the modularization refactoring campaigns (Tasks #26–#30) that decomposed the monolithic backend services, four critical sub-services were identified as having test coverage deficiencies. In accordance with Task #36 Phase 1 mandates, an exhaustive, evidence-based audit was conducted using the Vitest V8 coverage engine (`pnpm --filter backend exec vitest run --coverage`).

### Key Audit Metrics

| Metric                    | Target Service 1                                                                                          | Target Service 2                                                                                 | Target Service 3                                                                                       | Target Service 4                                                                             | Monorepo Suite      |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------- |
| **Service File**          | [`organizations-core.service.ts`](../../backend/src/organizations/services/organizations-core.service.ts) | [`sourcing-metrics.service.ts`](../../backend/src/sourcing/services/sourcing-metrics.service.ts) | [`applications-saga.service.ts`](../../backend/src/applications/services/applications-saga.service.ts) | [`sourcing-links.service.ts`](../../backend/src/sourcing/services/sourcing-links.service.ts) | **Target Average**  |
| **Current Statement Cov** | **63.70%** (79/124)                                                                                       | **37.54%** (95/253)                                                                              | **61.76%** (84/136)                                                                                    | **52.94%** (63/119)                                                                          | 53.98%              |
| **Current Line Cov**      | **63.55%** (75/118)                                                                                       | **38.36%** (89/232)                                                                              | **66.66%** (84/126)                                                                                    | **58.58%** (58/99)                                                                           | 56.78%              |
| **Current Branch Cov**    | **42.02%** (29/69)                                                                                        | **23.01%** (55/239)                                                                              | **49.29%** (70/142)                                                                                    | **41.54%** (59/142)                                                                          | 38.96%              |
| **Target Coverage**       | **> 75.0%**                                                                                               | **> 70.0%**                                                                                      | **> 75.0%**                                                                                            | **> 75.0%**                                                                                  | **> 75.0%**         |
| **Proposed New Tests**    | **~15 tests**                                                                                             | **~21 tests**                                                                                    | **~13 tests**                                                                                          | **~15 tests**                                                                                | **~64 tests**       |
| **Est. Implementation**   | 2 waves / ~0.5 day                                                                                        | 3 waves / ~1.0 day                                                                               | 2 waves / ~0.5 day                                                                                     | 2 waves / ~0.5 day                                                                           | **~2.5 days total** |

### Primary Root Causes

1. **Uncalled Entire Methods:**
   - In `organizations-core.service.ts`: `updateMyOrg` (72 LOC) and `getPublicOrg` (17 LOC) have **0% coverage**.
   - In `sourcing-links.service.ts`: `updateLink` (49 LOC), `deleteLink` (29 LOC), and `findLinkByToken` (19 LOC) have **0% coverage**.
   - In `sourcing-metrics.service.ts`: `getLinkDetails` (306 LOC) and `getAttributionLog` (109 LOC) have **0% coverage**.
2. **Untested Complex Edge Paths in Saga:**
   - In `applications-saga.service.ts`: While the basic happy path and direct MinIO rollback are verified in `transactions.spec.ts`, the BullMQ Dead Letter Queue (DLQ) retry queue fallback, tracking link resolution (`dto.ref`), referrer domain heuristic parsing (LinkedIn, Indeed, Google, Glassdoor, etc.), and post-transaction applicant confirmation email workflows are completely untested.

---

## 2. Phase A: Coverage Verification

### A.1 Full Coverage Report Execution

- **Command executed:** `pnpm --filter backend exec vitest run --coverage`
- **Engine:** Vitest v5.0.4 with `@vitest/coverage-v8` 5.0.4
- **Baseline execution:** 24 test suites passing (563+ tests passing, 0 failing)

### A.2 Target Services Extraction Table

| Service                                                                                                   | Stmts               | Branch              | Funcs              | Lines               | Uncovered Lines                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`organizations-core.service.ts`](../../backend/src/organizations/services/organizations-core.service.ts) | **63.70%** (79/124) | **42.02%** (29/69)  | **79.48%** (31/39) | **63.55%** (75/118) | `30-31, 33, 80, 141, 196, 210, 227, 279, 284, 287-288, 291-292, 298, 300, 304, 307-308, 311-314, 317, 320-321, 330-332, 334-336, 340, 347, 361, 365, 381, 385, 415, 421, 424-425, 428`                                                                                                                                                                                                                                                                                                               |
| [`sourcing-metrics.service.ts`](../../backend/src/sourcing/services/sourcing-metrics.service.ts)          | **37.54%** (95/253) | **23.01%** (55/239) | **39.06%** (25/64) | **38.36%** (89/232) | `39, 48, 52, 69, 192, 227, 247, 251-253, 259, 321-322, 328, 349, 352-353, 359-360, 367-371, 373-374, 378-385, 389, 394, 397-399, 401, 405, 410, 424, 427, 429-431, 433, 436-438, 440, 443, 451-455, 458-461, 469, 471, 479-482, 485-486, 489-492, 496-498, 501-502, 505, 511-512, 515-516, 519, 521, 523-524, 527-528, 531-532, 534-536, 557-560, 566-568, 574-576, 579, 633-634, 637-638, 640-641, 643-645, 655, 666, 669, 671-672, 676-677, 679-680, 683-684, 687-694, 699, 701-704, 706-708, 723` |
| [`applications-saga.service.ts`](../../backend/src/applications/services/applications-saga.service.ts)    | **61.76%** (84/136) | **49.29%** (70/142) | **85.71%** (12/14) | **66.66%** (84/126) | `63, 74, 81, 106, 128, 165, 177, 201, 240, 249, 252, 258-262, 268-271, 273-274, 276-285, 292, 347, 350, 386-388, 390-391, 394, 421`                                                                                                                                                                                                                                                                                                                                                                  |
| [`sourcing-links.service.ts`](../../backend/src/sourcing/services/sourcing-links.service.ts)              | **52.94%** (63/119) | **41.54%** (59/142) | **55.55%** (15/27) | **58.58%** (58/99)  | `25, 30, 85, 89, 93-94, 96, 184, 195, 268, 273, 276-277, 283-284, 290, 293-300, 302-304, 306-308, 310, 314, 319, 322-323, 329-330, 336, 344-345, 358`                                                                                                                                                                                                                                                                                                                                                |

_(Note: The task background referenced pre-refactoring baseline numbers [organizations-core: 47.58%, applications-saga: 51.47%]. Recent transaction tests in `transactions.spec.ts` had already elevated them to 63.70% and 61.76% statements respectively, but critical business logic remains uncovered)._

### A.3 Uncovered Line Ranges Verification

#### 1. `organizations-core.service.ts` (Total 431 LOC)

- **Lines 30–33 (executeTx fallback):** `p.executeTx(fn)` and fallback `return fn(this.prisma.db)`. Fallback when mock or driver does not provide standard transaction runner.
- **Line 80 (create):** Guard `if (!org) throw new AppNotFoundException(...)` post-creation fetch.
- **Line 141 (getMyOrgs):** Guard `if (!user) return [];` when user ID from token is not present in the DB.
- **Lines 196, 210, 227 (switchOrg):** Error guards: user not found (196), target org not found (210), user is neither owner, member, nor active member (227).
- **Lines 279–347 (updateMyOrg):** **Entire method (68 LOC) completely uncovered.** Checks user org membership, role authorization (MEMBER forbidden), slug uniqueness validation, partial updates (name, slug), and returns updated organization.
- **Lines 361, 365, 381, 385 (deleteMyOrg):** Error branches: user has no org (361), MEMBER role forbidden (365), target org not found (381), requester is not the organization owner (385).
- **Lines 415–428 (getPublicOrg):** **Entire method (17 LOC) completely uncovered.** Resolves public organization by slug or throws `APP_ERROR_CODES.ORG_NOT_FOUND`.

#### 2. `sourcing-metrics.service.ts` (Total 732 LOC)

- **Lines 39, 48, 52, 69, 192 (getStats):** Query filters: time ranges `'7d'`, `'30d'`, `'90d'`, `'custom'` with `startDate`/`endDate`, and `jobId` filtering across click logs and applications.
- **Lines 227, 247, 251–253, 259 (getStats):** Referrer domain breakdown computation and top tracking links ranking when tracking links exist with positive click metrics.
- **Lines 321–322, 328 (getLinkDetails guards):** Link not found / soft-deleted (321), organization tenant boundary check (328).
- **Lines 349–580 (getLinkDetails analytics computation):** **Entire detailed analytics engine (231 LOC) completely uncovered.** Computes click time-series, application conversion funnels, job cross-referencing, candidate detail mappings, and top referrer domain aggregations for an individual link.
- **Lines 633–731 (getAttributionLog):** **Entire paginated audit method (109 LOC) completely uncovered.** Handles job resolution, application filtering by source channel, multi-field search (candidate name, email, UTM campaign), descending chronological sort, and pagination offset calculation.

#### 3. `applications-saga.service.ts` (Total 429 LOC)

- **Line 63 (executeTx fallback):** Fallback execution when transaction interface differs.
- **Line 74 (create pre-check):** Role-based access control guard: `currentUser?.role === "MEMBER"` throws `AppForbiddenException`.
- **Line 81 (create validation):** Guard `!dto.jobId` throws `AppBadRequestException(APP_ERROR_CODES.JOB_ID_REQUIRED)`.
- **Line 106 (create validation):** Guard `job.status !== "PUBLISHED"` throws `AppBadRequestException(APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS)`.
- **Line 128 (create validation):** DTO provides `resumeUrl` directly instead of a Multer file upload.
- **Line 165 (create validation):** Guard `!job.organizationId` throws `AppBadRequestException(APP_ERROR_CODES.JOB_INVALID_ORGANIZATION)`.
- **Line 177 (create candidate):** Branch where candidate already exists in the organization vs creating a new Candidate entity.
- **Line 201 (create candidate):** Provided `dto.candidateId` does not exist in DB (throws `APP_ERROR_CODES.CANDIDATE_NOT_FOUND`).
- **Lines 240–262 (sourcing tracking link resolution):** Look up `TrackingLink` by `dto.ref`, verify tenant ownership and non-deleted status, assign `sourceChannel`, `sourceDetails`, and `utmCampaign`.
- **Lines 268–285 (sourcing referrer heuristics):** Parse `dto.referrer` URL and match against known domain patterns (`linkedin.com`, `indeed.com`, `google.com`, `glassdoor.com`, `facebook.com`, `twitter.com`/`x.com`, `reddit.com`, `stackoverflow.com`, `handshake.com`).
- **Line 292 (sourcing channel fallback):** Direct assignment of `dto.sourceChannel` when no ref token or referrer domain is matched.
- **Lines 347, 350 (compensation failure):** Queue failure during DLQ enqueue (`catch (queueErr)`) and logging when `cleanupQueue` is not provided.
- **Lines 386–394 (applicant email notification):** Fetch enabled `APPLICATION_CONFIRMATION` email template, query organization name, construct dynamic context, and dispatch `emailService.sendEmail`.
- **Line 421 (applicant email error catch):** Safe non-blocking error log when email dispatch encounters transient failure.

#### 4. `sourcing-links.service.ts` (Total 362 LOC)

- **Lines 25, 30 (extractDomain):** Normalizing schemeless URLs (`https://`) and catching malformed URLs in `extractDomain`.
- **Lines 85, 89, 93–96 (getLinks filters):** Filtering by `isActive` boolean, filtering by `jobId`, and multi-field text search query across `name`, `token`, and `campaign`.
- **Lines 184, 195 (createLink guards):** Forbidden check when `organizationId` is missing (184), target job not found in current organization (195).
- **Lines 268–310 (updateLink):** **Entire update workflow (49 LOC) completely uncovered.** Link lookup, not-found check, tenant boundary check, and updating partial UTM attributes (`name`, `source`, `customSource`, `jobId`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`, `isActive`).
- **Lines 314–336 (deleteLink):** **Entire soft-delete workflow (29 LOC) completely uncovered.** Link lookup, not-found check, tenant boundary check, and atomic soft deletion (`deletedAt: toInstant()`, `isActive: false`).
- **Lines 344–358 (findLinkByToken):** **Entire public token resolution method (19 LOC) completely uncovered.** Guard on empty token, select query by token.

---

## 3. Phase B: Classification of Uncovered Code

### B.1 Dead Code / Defensive Infrastructure

Code that represents defensive guards or runtime fallbacks that are practically unreachable under normal execution invariants:

1. **`executeTx` Fallbacks:**
   - `organizations-core.service.ts` Lines 30–33 & `applications-saga.service.ts` Line 63
   - _Nature:_ Fallback branch `if (typeof p.executeTx === 'function')` and `return fn(this.prisma.db)`. Both `PrismaService` and test mocks implement `.transaction()` or `.executeTx()`.
   - _Verdict:_ Keep for defensive runtime resilience; skip writing redundant tests specifically for the 3rd-tier fallback.
2. **Post-Commit Fetch Guard:**
   - `organizations-core.service.ts` Line 80
   - _Nature:_ `if (!org) throw new AppNotFoundException(...)` immediately following `tx.orm.public.Organization.create(...)` in the same local transaction.
   - _Verdict:_ Defensive guard. Retain in code, but no standalone test required.

### B.2 Missing Tests (Core Functional Gaps)

Code that contains standard business logic and CRUD operations that should have had test coverage but were omitted during refactoring:

1. **`organizations-core.service.ts`:**
   - `updateMyOrg` (Lines 278–349): 100% missing (updating name, slug normalization, unchanged slug bypass).
   - `getPublicOrg` (Lines 414–430): 100% missing (retrieving organization by slug).
   - Negative role checks on `deleteMyOrg` (Lines 351–412) (MEMBER forbidden, non-owner admin forbidden).
2. **`sourcing-metrics.service.ts`:**
   - `getLinkDetails` (Lines 316–621): 100% missing (full funnel calculations, applicant lists, domain rankings).
   - `getAttributionLog` (Lines 623–731): 100% missing (paginated candidate log, job mapping, query search).
   - Filter branches in `getStats` (Lines 33–314) (time ranges `'30d'`, `'custom'`, and `jobId`).
3. **`applications-saga.service.ts`:**
   - Role checks (`role === 'MEMBER'`), validation guards (`!jobId`, unpublished job, invalid tenant org).
   - Resume via URL (`dto.resumeUrl`) instead of file upload.
   - Candidate creation vs re-use (`existingCandidate`).
   - Sourcing attribution: `dto.ref` lookup, campaign inheritance, channel matching.
   - Referrer domain regex heuristics (LinkedIn, Indeed, Google, Glassdoor, etc.).
   - Email notification trigger when `APPLICATION_CONFIRMATION` template is active.
4. **`sourcing-links.service.ts`:**
   - `updateLink` (Lines 263–311): 100% missing.
   - `deleteLink` (Lines 313–341): 100% missing.
   - `findLinkByToken` (Lines 343–361): 100% missing.
   - Search and pagination filters in `getLinks` (Lines 44–176) (`isActive`, `jobId`, `search`).

### B.3 Edge Cases & Error Boundaries

Uncommon failure conditions, multi-tenant security gates, or external dependency failures that require specialized mock fixtures:

1. **Multi-tenant Cross-Access Rejection:**
   - `switchOrg` access denial for users who are neither owners nor invite members (Line 227).
   - `updateLink` / `deleteLink` attempting to modify a tracking link belonging to another organization (Lines 284, 330).
   - `getLinkDetails` rejecting tracking links belonging to another tenant (Line 328).
2. **Slug Conflict Collision:**
   - `updateMyOrg` attempting to rename organization slug to an already existing organization slug (Line 320).
3. **Compensating Delete & DLQ Failure:**
   - DB transaction fails AND MinIO compensating delete fails AND BullMQ DLQ queue `.add()` throws (Line 347).
   - DB transaction fails AND MinIO compensating delete fails when `cleanupQueue` is undefined (Line 350).
4. **Transient Email Dispatch Failure:**
   - Application committed successfully in DB, but `emailService.sendEmail` throws network timeout (Line 421). The error must be caught and logged without aborting or rolling back the application.
5. **Malformed External Input Handling:**
   - Invalid URL passed to `extractDomain` or `dto.referrer` (Line 30 in sourcing-links, Line 285 in applications-saga).

---

## 4. Phase C: Per-Service Deep Dive

### C.1 `organizations-core.service.ts`

- **Current Coverage:** 63.70% Stmts | 42.02% Branch | 63.55% Lines
- **Target Coverage:** > 75.0%

| Method                    | LOC | Current Line Cov | Uncovered Cases & Failure Modes                                                                                                                                 |
| ------------------------- | --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor / executeTx` | 20  | 57.1% (4/7)      | Fallback execution when mock lacks standard transaction runner.                                                                                                 |
| `create`                  | 48  | 90.9% (10/11)    | Post-commit defensive guard (`!org`).                                                                                                                           |
| `getMyOrg`                | 46  | 100.0% (9/9)     | Fully covered.                                                                                                                                                  |
| `getMyOrgs`               | 53  | 92.9% (13/14)    | User not found in DB (`!user`) returning empty array.                                                                                                           |
| `switchOrg`               | 91  | 87.0% (20/23)    | User not found (404), target org not found (404), unauthorized non-member (403).                                                                                |
| `updateMyOrg`             | 72  | **0.0% (0/26)**  | User without org (404), MEMBER role forbidden (403), org not found (404), slug collision conflict (409), partial update execution (name only, slug only, both). |
| `deleteMyOrg`             | 62  | 81.0% (17/21)    | User without org (404), MEMBER role forbidden (403), org not found (404), non-owner admin forbidden (403).                                                      |
| `getPublicOrg`            | 17  | **0.0% (0/5)**   | Organization found by slug, organization not found by slug (404).                                                                                               |

---

### C.2 `sourcing-metrics.service.ts`

- **Current Coverage:** 37.54% Stmts | 23.01% Branch | 38.36% Lines
- **Target Coverage:** > 70.0%

| Method              | LOC | Current Line Cov | Uncovered Cases & Failure Modes                                                                                                                                                                                 |
| ------------------- | --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor`       | 7   | 100.0% (2/2)     | Fully covered.                                                                                                                                                                                                  |
| `getStats`          | 282 | 88.7% (86/97)    | Filtering by timeRange (`30d`, `custom` with date range), filtering by `jobId`, calculating domain breakdowns when clicks have referrer domains, sorting top tracking links with active clicks.                 |
| `getLinkDetails`    | 306 | **0.0% (0/95)**  | Link not found (404), wrong tenant organization (403), soft-deleted link (404), click timeline aggregation, application stage conversion funnel, candidate & job details mapping, top referrer domains ranking. |
| `getAttributionLog` | 109 | **0.0% (0/37)**  | Empty organization jobs list, filtering by `jobId`, filtering by `sourceChannel`, multi-keyword search across candidate name/email/campaign, descending date sorting, pagination slicing (`limit`, `page`).     |

---

### C.3 `applications-saga.service.ts`

- **Current Coverage:** 61.76% Stmts | 49.29% Branch | 66.66% Lines
- **Target Coverage:** > 75.0%

| Method / Flow                          | LOC | Current Line Cov | Uncovered Cases & Failure Modes                                                                                                                                                           |
| -------------------------------------- | --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor / executeTx`              | 33  | 91.7% (11/12)    | Fallback execution.                                                                                                                                                                       |
| `create`: Pre-conditions & RBAC        | 60  | 50.0%            | MEMBER role forbidden (403), missing jobId (400), job status not PUBLISHED (400), target job without org (400).                                                                           |
| `create`: Resume Input Options         | 20  | 60.0%            | Providing direct `resumeUrl` without file upload vs file upload.                                                                                                                          |
| `create`: Candidate Resolution         | 30  | 55.0%            | Reusing existing candidate by email vs creating new candidate; candidateId provided but not found (404).                                                                                  |
| `create`: Sourcing & Attribution       | 65  | 30.0%            | Tracking link token resolution (`dto.ref`), cross-tenant link ignore, referrer domain heuristics (LinkedIn, Indeed, Google, Glassdoor, etc.), direct `dto.sourceChannel` fallback.        |
| `create`: Saga Rollback & Compensation | 80  | 70.0%            | DB failure with successful MinIO delete (covered); DB failure with MinIO delete failure enqueued to DLQ; DLQ `.add()` failure exception handling; compensation when queue not configured. |
| `create`: Post-commit Email Dispatch   | 50  | 0.0%             | Fetching enabled `APPLICATION_CONFIRMATION` template, resolving organization name, calling `emailService.sendEmail`, handling transient email error without rollback.                     |

---

### C.4 `sourcing-links.service.ts`

- **Current Coverage:** 52.94% Stmts | 41.54% Branch | 58.58% Lines
- **Target Coverage:** > 75.0%

| Method                        | LOC | Current Line Cov | Uncovered Cases & Failure Modes                                                                                                                 |
| ----------------------------- | --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor & extractDomain` | 22  | 81.8% (9/11)     | Schemeless URL formatting (`domain.com` -> `https://domain.com`), invalid URL catch block.                                                      |
| `getLinks`                    | 133 | 86.1% (31/36)    | Filter by `isActive` (true/false), filter by `jobId`, search filter matching name, token, or campaign.                                          |
| `createLink`                  | 84  | 90.0% (18/20)    | Missing `organizationId` (403), target job belongs to different organization (400).                                                             |
| `updateLink`                  | 49  | **0.0% (0/22)**  | Link not found (404), soft-deleted link (404), cross-tenant access denied (403), partial updates for UTM tags, campaign, and `isActive` toggle. |
| `deleteLink`                  | 29  | **0.0% (0/7)**   | Link not found (404), soft-deleted link (404), cross-tenant access denied (403), successful soft-delete (`deletedAt`, `isActive: false`).       |
| `findLinkByToken`             | 19  | **0.0% (0/3)**   | Empty token returning `null`, valid token returning tracking link, invalid token returning `null`.                                              |

---

## 5. Phase D: Detailed Test Proposals

### D.1 `organizations-core.service.ts` (~15 New Tests)

Proposed target: **63.55% → >80% Line Coverage**

```typescript
describe("OrganizationsCoreService - Gap Augmentation", () => {
  // updateMyOrg suite (8 tests)
  describe("updateMyOrg", () => {
    it("should update organization name successfully");
    it("should update organization slug when unique");
    it("should allow updating name without changing slug");
    it(
      "should throw AppConflictException when new slug already exists on another org",
    );
    it("should throw AppNotFoundException when user has no organizationId");
    it("should throw AppNotFoundException when user record is not found");
    it("should throw AppForbiddenException when requester has MEMBER role");
    it(
      "should throw AppNotFoundException when target organization does not exist",
    );
  });

  // getPublicOrg suite (3 tests)
  describe("getPublicOrg", () => {
    it("should return public organization by slug");
    it("should throw AppNotFoundException when slug does not exist");
    it("should trim and lowercase slug query");
  });

  // deleteMyOrg negative cases (3 tests)
  describe("deleteMyOrg - error boundaries", () => {
    it(
      "should throw AppForbiddenException when non-owner Admin attempts deletion",
    );
    it("should throw AppForbiddenException when MEMBER attempts deletion");
    it(
      "should throw AppNotFoundException when user is not associated with an org",
    );
  });

  // switchOrg error boundaries (2 tests)
  describe("switchOrg - error boundaries", () => {
    it(
      "should throw AppForbiddenException when user has no membership in target org",
    );
    it("should throw AppNotFoundException when target org does not exist");
  });
});
```

---

### D.2 `sourcing-metrics.service.ts` (~21 New Tests)

Proposed target: **38.36% → >75% Line Coverage**

```typescript
describe("SourcingMetricsService - Gap Augmentation", () => {
  // getStats filter branches (5 tests)
  describe("getStats - advanced filters", () => {
    it("should filter metrics by timeRange '30d'");
    it(
      "should filter metrics by timeRange 'custom' with startDate and endDate",
    );
    it(
      "should filter metrics by specific jobId across clicks and applications",
    );
    it(
      "should aggregate referrer domains when clicks have diverse referrer URLs",
    );
    it("should correctly rank top performing tracking links with click counts");
  });

  // getLinkDetails suite (9 tests)
  describe("getLinkDetails", () => {
    it(
      "should compute full link details including click timeline and applications",
    );
    it("should compute stage conversion funnel for applications via link");
    it(
      "should map candidate information and job metadata for attributed applications",
    );
    it("should aggregate top referrer domains for the specific tracking link");
    it(
      "should return empty metrics gracefully when link has zero clicks and zero applications",
    );
    it("should throw AppNotFoundException when link does not exist");
    it("should throw AppNotFoundException when link is soft-deleted");
    it(
      "should throw AppForbiddenException when link belongs to another organization",
    );
    it("should filter link details by timeRange");
  });

  // getAttributionLog suite (7 tests)
  describe("getAttributionLog", () => {
    it("should return paginated attribution log scoped to organization jobs");
    it("should filter attribution log by specific jobId");
    it(
      "should filter attribution log by sourceChannel (e.g. LINKEDIN, DIRECT)",
    );
    it("should search attribution log by candidate name");
    it("should search attribution log by candidate email");
    it("should search attribution log by UTM campaign");
    it("should return empty paginated result when organization has zero jobs");
  });
});
```

---

### D.3 `applications-saga.service.ts` (~13 New Tests)

Proposed target: **66.66% → >80% Line Coverage**

```typescript
describe("ApplicationsSagaService - Gap Augmentation", () => {
  // Pre-condition & RBAC guards (4 tests)
  describe("create - pre-conditions & RBAC", () => {
    it("should throw AppForbiddenException when user has role MEMBER");
    it("should throw AppBadRequestException when jobId is missing");
    it("should throw AppBadRequestException when job status is DRAFT / CLOSED");
    it("should throw AppBadRequestException when job has no organizationId");
  });

  // Resume & Candidate options (3 tests)
  describe("create - input variations", () => {
    it("should accept resumeUrl directly when Multer file is not provided");
    it("should link to existing candidate when email matches existing record");
    it(
      "should throw AppNotFoundException when specified candidateId does not exist",
    );
  });

  // Sourcing attribution resolution (3 tests)
  describe("create - sourcing & attribution", () => {
    it("should resolve tracking link by dto.ref and inherit UTM parameters");
    it(
      "should infer sourceChannel from dto.referrer (LinkedIn, Indeed, Google)",
    );
    it(
      "should fallback to direct dto.sourceChannel when no token or referrer present",
    );
  });

  // DLQ and Email compensation resilience (3 tests)
  describe("create - compensation & post-commit workflows", () => {
    it("should enqueue to BullMQ DLQ when MinIO compensating delete fails");
    it(
      "should log error gracefully when BullMQ DLQ queue.add() fails during compensation",
    );
    it(
      "should dispatch APPLICATION_CONFIRMATION email when template is enabled and log warning if email fails",
    );
  });
});
```

---

### D.4 `sourcing-links.service.ts` (~15 New Tests)

Proposed target: **58.58% → >80% Line Coverage**

```typescript
describe("SourcingLinksService - Gap Augmentation", () => {
  // updateLink suite (6 tests)
  describe("updateLink", () => {
    it("should update tracking link name, source, and customSource");
    it("should update full 5-parameter UTM attributes");
    it("should toggle isActive state");
    it("should throw AppNotFoundException when link does not exist");
    it("should throw AppNotFoundException when link is soft-deleted");
    it(
      "should throw AppForbiddenException when link belongs to another tenant",
    );
  });

  // deleteLink suite (4 tests)
  describe("deleteLink", () => {
    it("should soft-delete link by setting deletedAt and isActive=false");
    it("should throw AppNotFoundException when link does not exist");
    it("should throw AppNotFoundException when link is already deleted");
    it(
      "should throw AppForbiddenException when link belongs to another tenant",
    );
  });

  // findLinkByToken suite (3 tests)
  describe("findLinkByToken", () => {
    it("should return tracking link when token matches");
    it("should return null when token does not exist");
    it("should return null immediately when token is empty string");
  });

  // getLinks query filters (2 tests)
  describe("getLinks - advanced filtering", () => {
    it("should filter tracking links by isActive flag and jobId");
    it("should search tracking links across name, token, and campaign");
  });
});
```

---

## 6. Phase E: Priority Order & Implementation Strategy

We recommend executing the test implementations in the following prioritized sequence:

```
┌────────────────────────────────────────────────────────────────────────┐
│ P1: CRITICAL INFRASTRUCTURE & COMPLEX AGGREGATIONS                     │
│ 1. applications-saga.service.ts (DLQ compensation, RBAC, Attribution) │
│ 2. sourcing-metrics.service.ts (Analytics Funnel, Attribution Log)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ P2: CORE TENANT LIFECYCLE & TRACKING CRUD                              │
│ 3. organizations-core.service.ts (updateMyOrg, getPublicOrg, RBAC)     │
│ 4. sourcing-links.service.ts (updateLink, deleteLink, findLinkByToken) │
└────────────────────────────────────────────────────────────────────────┘
```

### Rationale

1. **`applications-saga.service.ts` (P1 - High Value, High Risk):**
   - The Saga orchestrator coordinates distributed state across MinIO object storage, PostgreSQL transactions, BullMQ Dead Letter Queues, and SMTP email services.
   - Any undetected regression in compensating transactions or attribution resolution directly causes data corruption (orphan S3 files) or silent misattribution of recruitment campaigns.
2. **`sourcing-metrics.service.ts` (P1 - High Complexity):**
   - At 732 LOC, this service carries the lowest coverage (37.54%) and contains 239 branches of complex data transformations (multi-stage funnel math, time-series bucketing, and candidate joins).
   - `getLinkDetails` (306 LOC) and `getAttributionLog` (109 LOC) are currently 100% uncovered.
3. **`organizations-core.service.ts` (P2 - Core Lifecycle):**
   - Modifying organization slugs and deleting workspaces are destructive operations requiring strict tenant and owner isolation.
4. **`sourcing-links.service.ts` (P2 - Standard CRUD):**
   - Standard CRUD logic with well-defined contracts; fastest to implement once mock query builder helpers are established.

---

## 7. Questions for DeepSeek & Team Alignment

Before initiating Phase 2 test implementation, please confirm the following design decisions:

1. **Test Colocation vs Sub-Service Dedicated Specs:**
   - _Option A (Colocated in domain specs):_ Add the new tests into existing `organizations.service.spec.ts`, `sourcing.service.spec.ts`, and `applications.service.spec.ts` (which test through the parent façade services).
   - _Option B (Dedicated unit specs):_ Create dedicated spec files directly alongside the sub-services (`organizations-core.service.spec.ts`, `sourcing-metrics.service.spec.ts`, `sourcing-links.service.spec.ts`, `applications-saga.service.spec.ts`).
   - _Recommendation:_ **Option B (Dedicated specs)** allows lightweight, focused unit mocking, avoiding the heavy ~700-line monolithic spec setups.
2. **In-Memory Query Builder vs Deep Prisma Mocks:**
   - The sourcing service currently uses an in-memory predicate evaluator (`createQueryBuilder`) in tests to simulate Prisma 8 Composer's `.where((x) => x.field.eq(...)).all()`.
   - Shall we extract this helper into `backend/src/test/helpers/prisma-composer-mock.ts` so all 4 spec suites can share clean, deterministic in-memory DB mocks?
3. **BullMQ DLQ Mocking in Saga:**
   - For `applications-saga.service.ts`, shall we verify the DLQ retry backoff policy (`attempts: 5`, exponential backoff) with an explicit BullMQ queue mock spy?
4. **Execution Waves:**
   - Confirm dividing Phase 2 implementation into 2 execution waves:
     - **Wave 1 (P1):** `applications-saga.service.ts` + `sourcing-metrics.service.ts`
     - **Wave 2 (P2):** `organizations-core.service.ts` + `sourcing-links.service.ts`
