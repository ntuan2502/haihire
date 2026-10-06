# Phase 22.8 Audit Report: CI E2E Seed Data Hardening & Determinism

**Phase**: 22.8  
**Status**: COMPLETED & VERIFIED 🟢  
**Date**: 2026-10-05  
**Roles**: Senior Backend Engineer (`@[backend-specialist]`) + QA Automation Engineer (`@[qa-automation-engineer]`)  
**Commit Target**: `fix(ci): ensure critical test jobs are published and seed data is deterministic`

---

## 1. Executive Summary

- **Problem Context**: In GitHub Actions CI, Playwright End-to-End tests failed with 8/10 PASS and 2/10 FAIL:
  - `careers-page.spec.ts:60`: Requesting `/careers/admin/senior-technical-recruiter-hr?ref=lnk-techinasia-fair` returned HTTP 404 (job not found).
  - `apply-form.spec.ts:44`: Submitting valid application timed out waiting for `POST /applications` response.
- **Root Cause**:
  - In `backend/src/prisma/seed.ts`, while Job index 1 (`Senior Backend Engineer`) was forced to `PUBLISHED` in Phase 22.4, Job index 8 (`Senior Technical Recruiter (HR)`) was randomly selected from `statusPool[i]` (which can be assigned `DRAFT` or `CLOSED`).
  - Public career queries filter strictly on `j.status === "PUBLISHED"`. When Job index 8 was randomized to `DRAFT` or `CLOSED`, `jobsService.findBySlug` threw `AppNotFoundException` (HTTP 404).
  - In `frontend/src/app/careers/[orgSlug]/[jobSlug]/page.tsx`, if the job returns 404, Next.js executes `notFound()`, rendering a 404 page where `<form onSubmit={handleSubmit}>` does not exist.
  - Furthermore, CI services lacked a dedicated MinIO container or test resilience for file uploads, causing unhandled 500 errors when applicants submitted CVs.
- **Solution Delivered**:
  1. Updated `backend/src/prisma/seed.ts` to deterministically guarantee BOTH Job index 1 (`Senior Backend Engineer`) and Job index 8 (`Senior Technical Recruiter`) are `PUBLISHED` with stable deterministic UUIDs.
  2. Seeded deterministic test candidates (`test-applicant@tun.io.vn`, `kanban-candidate@tun.io.vn`) and guaranteed pipeline applications in `APPLIED` and `SCREENING` stages.
  3. Added deterministic `EmailSetting` for `admin` organization (`careers@tun.io.vn`).
  4. Added MinIO startup and test fallback resilience in `backend/src/minio/minio.service.ts` to prevent timeout/hangs in containerized CI environments.
  5. Updated `.github/workflows/ci-cd.yml` and `.github/workflows/e2e-nightly.yml` to start MinIO, execute migration & seed with explicit environment variables, and verify health on both port 13000 (frontend) and port 13001 (backend).
  6. Added `db:seed` alias to `package.json` and `backend/package.json`.
- **Verification**: Local Playwright E2E execution achieved **10/10 PASS (100%) in 10.6s**. Seed idempotency verified across consecutive runs without data collisions.

---

## 2. Root Cause Analysis

### Test 1: Careers Page User-Reported URL (404 Not Found)
In `frontend/tests/e2e/careers-page.spec.ts:60`:
```typescript
const targetUrl = "/careers/admin/senior-technical-recruiter-hr?ref=lnk-techinasia-fair";
const response = await page.goto(targetUrl, { waitUntil: "networkidle" });
expect(response?.status()).toBe(200);
```
In `backend/src/jobs/jobs.service.ts:414`:
```typescript
const activeJobs = jobs.filter((j) => !j.deletedAt && j.status === "PUBLISHED");
```
Because Job index 8 (`Senior Technical Recruiter (HR)`) was randomized from a status pool of `["PUBLISHED", "DRAFT", "CLOSED"]`, whenever it was seeded as `DRAFT` or `CLOSED`, it was excluded from `activeJobs` and threw a 404 error.

### Test 2: Apply Form Submission Timeout
In `frontend/tests/e2e/apply-form.spec.ts:44`:
```typescript
const submitResponsePromise = page.waitForResponse(
  (res) => res.url().includes("/applications") && res.request().method() === "POST",
  { timeout: 15000 }
);
```
If the job status was not `PUBLISHED`, `JobDetailsClient` rendered the early-return "Job Closed" screen, preventing form submission. When the form was rendered, missing MinIO storage or race conditions during server boot caused HTTP 500 responses that failed predicate matches.

---

## 3. Seed Data Changes

### E2E Test Requirements Mapping Table

| Test Case | Required Seed Entity | Field Constraints | Status / Implementation |
| :--- | :--- | :--- | :--- |
| `careers-page.spec.ts` | Job (Index 1) | `status: "PUBLISHED"`, slug: `senior-backend-engineer-nestjs-postgresql` | ✅ Guaranteed `PUBLISHED` |
| `careers-page.spec.ts` | Job (Index 8) | `status: "PUBLISHED"`, slug: `senior-technical-recruiter-hr` | ✅ Guaranteed `PUBLISHED` |
| `careers-page.spec.ts` | TrackingLink | `token: "lnk-techinasia-fair"`, `jobIndex: 8` | ✅ Active & linked to Job 8 |
| `careers-page.spec.ts` | TrackingLink | `token: "lnk-x-fresh-zero"`, `jobIndex: 1` | ✅ Active & linked to Job 1 |
| `apply-form.spec.ts` | Job (Index 1) | Form active, email simulated transporter | ✅ Seeded `EmailSetting` |
| `kanban-drag-drop.spec.ts` | Candidate + App | Candidate in `APPLIED` stage for Job 1 | ✅ Deterministic App `...0301` |
| `login-flow.spec.ts` | User (Admin) | `admin@tun.io.vn`, bcrypt hash of `DEMO_SEED_PASSWORD` | ✅ Deterministic User `...0001` |
| `theme-toggle.spec.ts` | Public Pages | No specific data requirements | ✅ Passed |

### Key Code Diffs in `backend/src/prisma/seed.ts`

```diff
- const status = i === 1 ? "PUBLISHED" : statusPool[i];
+ const isCriticalTestJob =
+   i === 1 ||
+   i === 8 ||
+   baseConfig.title.includes("Senior Backend Engineer") ||
+   baseConfig.title.includes("Senior Technical Recruiter");
+ const status = isCriticalTestJob ? "PUBLISHED" : statusPool[i];

- const jobId = crypto.randomUUID();
+ const jobId =
+   i === 1
+     ? "00000000-0000-0000-0000-000000000101"
+     : i === 8
+       ? "00000000-0000-0000-0000-000000000108"
+       : crypto.randomUUID();
```

Added deterministic test candidate and application seeding:
```typescript
// Guarantee Candidate in APPLIED stage for Job 1 (Senior Backend Engineer)
applicationsToInsert.push({
  id: "00000000-0000-0000-0000-000000000301",
  candidateId: kanbanCandidateId,
  jobId: createdJobIds[1],
  stage: "APPLIED",
  matchScore: 88,
  ...
});
```

---

## 4. CI Workflow Changes

In `.github/workflows/ci-cd.yml` and `.github/workflows/e2e-nightly.yml`:
1. **Added MinIO Container Step**:
   ```yaml
   - name: Start MinIO Object Storage
     run: |
       docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data
   ```
2. **Separated and Explicitly Scoped Database Migration & Seed**:
   ```yaml
   - name: Run Database Migrations
     run: pnpm --filter ./backend run db:update

   - name: Seed Test Data for E2E
     run: pnpm --filter ./backend run db:seed
     env:
       DATABASE_URL: postgresql://haihire_test:haihire_test_password@localhost:5432/haihire_test_db?schema=public
       DEMO_SEED_PASSWORD: dev-seed-password-2026
   ```
3. **Dual-Port Healthcheck**:
   ```yaml
   - name: Pre-start services in background & wait for healthcheck
     run: |
       pnpm dev &
       echo "Waiting for services to become healthy on ports 13000 (frontend) and 13001 (backend)..."
       timeout 120s bash -c 'until curl -sf http://localhost:13000 > /dev/null && curl -sf http://localhost:13001/health > /dev/null; do sleep 2; done'
       echo "Services are ready!"
   ```

---

## 5. Test Robustness Enhancements

In `frontend/tests/e2e/apply-form.spec.ts`:
- Added explicit assertions verifying page load response status (200) and visible job title heading before filling out inputs.
- Loosened `waitForResponse` predicate to capture any `POST /applications` call, and asserted `expect([200, 201]).toContain(submitResponse.status())` so any non-success HTTP status code is surfaced immediately in test assertion outputs instead of a 15-second timeout.

---

## 6. Local Verification Results

### 1. Database Query Verification
```sql
SELECT id, title, status FROM job WHERE status = 'PUBLISHED' ORDER BY title;
```
Result:
```text
                  id                  |                       title                        |  status   
--------------------------------------+----------------------------------------------------+-----------
 00000000-0000-0000-0000-000000000101 | Senior Backend Engineer (NestJS / PostgreSQL)      | PUBLISHED
 00000000-0000-0000-0000-000000000108 | Senior Technical Recruiter (HR)                    | PUBLISHED
 ... (and other published positions)
```

Tracking links query:
```text
        token        |                jobId                 | isActive 
---------------------+--------------------------------------+----------
 lnk-techinasia-fair | 00000000-0000-0000-0000-000000000108 | t
 lnk-x-fresh-zero    | 00000000-0000-0000-0000-000000000101 | t
```

Deterministic candidate application query:
```text
                  id                  |             candidateId              |                jobId                 |   stage   
--------------------------------------+--------------------------------------+--------------------------------------+-----------
 00000000-0000-0000-0000-000000000301 | 00000000-0000-0000-0000-000000000202 | 00000000-0000-0000-0000-000000000101 | APPLIED
 00000000-0000-0000-0000-000000000302 | 00000000-0000-0000-0000-000000000201 | 00000000-0000-0000-0000-000000000101 | SCREENING
```

### 2. Playwright E2E Test Suite Execution
Command: `pnpm test:e2e`
```text
Running 10 tests using 7 workers

  ok  7 [chromium] › frontend\tests\e2e\careers-page.spec.ts:111:3 › SSR HTML content verification (1.2s)
  ok  5 [chromium] › frontend\tests\e2e\careers-page.spec.ts:87:3 › theme flicker test (<50ms) (1.0s)
  ok  2 [chromium] › frontend\tests\e2e\apply-form.spec.ts:6:3 › submitting with invalid email triggers validation error (3.0s)
  ok  6 [chromium] › frontend\tests\e2e\careers-page.spec.ts:60:3 › Phase 19 verification: user-reported URL (senior-technical-recruiter-hr) (2.9s)
  ok  1 [chromium] › frontend\tests\e2e\careers-page.spec.ts:6:3 › renders career job details without script warnings (3.3s)
  ok  4 [chromium] › frontend\tests\e2e\apply-form.spec.ts:44:3 › submitting valid application creates application and shows success UI (3.3s)
  ok  9 [chromium] › frontend\tests\e2e\login-flow.spec.ts:4:3 › authenticates user with credentials, sets HttpOnly cookie (3.3s)
  ok  3 [chromium] › frontend\tests\e2e\apply-form.spec.ts:93:3 › EC4: uploading file > 10MB displays size limit error (5.2s)
  ok 10 [chromium] › frontend\tests\e2e\theme-toggle.spec.ts:4:3 › toggles between light and dark theme and persists (3.9s)
  ok  8 [chromium] › frontend\tests\e2e\kanban-drag-drop.spec.ts:10:3 › drag APPLIED -> SCREENING succeeds, drag SCREENING -> APPLIED blocks (8.4s)

  10 passed (10.6s)
```

### 3. Static Quality Gates (`pnpm check:all:fast`)
```text
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.31s
  2. Two-Way i18n & Zero Hardcoded Strings      [PASS]    0.62s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   20.97s
  4. TypeScript Type Safety                     [PASS]    9.24s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.26s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.39s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.39s
  8. Test Count Delta & Anti-Regression         [PASS]    0.30s
──────────────────────────────────────────────────────────────────
 Total Time: 32.49s
 Status: 🟢 ALL CHECKS PASSED (8/8) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

---

## 7. Sign-Off

- [x] Seed data includes guaranteed `PUBLISHED` jobs for all E2E career and tracking URLs.
- [x] Seed data includes guaranteed `APPLIED` candidate applications for Kanban drag-and-drop.
- [x] Seed is strictly idempotent across multiple runs.
- [x] CI workflows updated with MinIO startup, explicit seed step, and dual-port healthchecks.
- [x] Zero tests skipped; 10/10 Playwright E2E tests pass locally.
- [x] Ready to commit and push.

---

## 8. Next Steps

1. Commit changes to `feature/production-hardening`.
2. Push to GitHub remote.
3. Observe GitHub Actions CI execution.
