# Independent Verification & Validation Report IV&V Round 5 (Pre-Golive Final Gate)

> **Auditor:** Independent Verification & Validation (IV&V) Engineer + SRE Auditor  
> **Date:** 01/10/2026  
> **Audit Target:** `docs/audits/phase-10.1-hotfix-report.md` and repository source code at Phase 10.1 commit.  
> **Audit Philosophy:** Zero Trust — Independent empirical evidence (Raw Evidence); self-attestations in reports are not accepted as proof.

---

## 1. Executive Summary of IV&V Round 5 Verdict

```
================================================================================
                    FINAL VERDICT: 🔴 NO-GO (BLOCK GO-LIVE)
================================================================================
  BLOCKING GAPS:
  1. [P1 - RESIDUAL BUG-P10-06]: DtoPipe fix omitted on email.controller.ts (lines 125, 131).
     Malformed payloads dispatched to POST /email/system/test and POST /email/system/send
     receive HTTP 201 Created without being blocked!
  2. [P2 - RESIDUAL BUG-P10-09]: Backups produced by scripts/backup-production.ts CANNOT
     BE RESTORED into PostgreSQL due to TTY escape codes (-t) and UTF-16 BOM encoding;
     additionally, the script omits MinIO object storage entirely.
================================================================================
```

---

## 2. PART A — Verification of 4 Primary Inquiries

### 2.1. Inquiry 1: `BUG-P10-06` and the `DtoPipe` Wrapper on Controllers
* **Static Inspection (Static Grep):**
  Scanned all `@Body()` usages across all controllers (`backend/src/**/*.controller.ts`).
* **Findings:**
  - Most controllers (`auth`, `organizations`, `jobs`, `applications`, `candidates`, `interviews`, `sourcing`) apply `DtoPipe` correctly and return HTTP 400 when receiving malformed payloads.
  - **HOWEVER, identified critical omissions in `backend/src/email/email.controller.ts`:**
    - Line 125: `sendSystemTestEmail(@Body() dto: SendSystemTestEmailDto)`
    - Line 131: `sendSystemEmail(@Body() dto: SendSystemEmailDto)`
* **Empirical Verification (Raw Evidence):**
  Executed verification script `scratch/ivv5-check-missed-dtopipe.ts` sending payload `{ to: "not-an-email-at-all" }`:
  ```
  POST /email/system/test status: 201
  Response body: {
    "id": "1",
    "status": "QUEUED",
    "message": "System email queued for delivery"
  }
  🔴 CRITICAL IV&V FINDING: Validation was BYPASSED on /email/system/test! HTTP 201
  ```
* **Verdict:** The claim *"Applied DtoPipe across all controllers receiving DTO payloads"* in the Phase 10.1 report is a **FALSE CLAIM / INCOMPLETE FIX**.

---

## 2.2. Inquiry 2: Did `prisma.service.ts` Test Coverage Truly Reach 100%?
* **Independent Execution:**
  Executed `pnpm --filter ./backend exec vitest run src/prisma/prisma.service.spec.ts --coverage`.
* **Raw Coverage Data:**
  ```
  -------------------|---------|----------|---------|---------|-------------------
  File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
  -------------------|---------|----------|---------|---------|-------------------
  prisma.service.ts  |     100 |       75 |     100 |     100 | 70                
  -------------------|---------|----------|---------|---------|-------------------
  ```
* **Test Quality Assessment:**
  - `prisma.service.spec.ts` mocks the `db` module (`vi.mock("./db")`). Because `PrismaService` is a thin lifecycle wrapper managing `onModuleInit`, this mock aligns with standard NestJS patterns.
  - Tests exercise 3 primary execution paths: (1) DB already initialized with users $\rightarrow$ skip seed, (2) empty DB $\rightarrow$ seed demo accounts, (3) DB error $\rightarrow$ catches error without crashing server.
  - **Technical Nuance:** Branch Coverage is actually **75%** (Line 70: the fallback `String(error)` branch when the thrown error is not an `Error` instance was unexercised), rather than 100% Branch coverage. However, Line Coverage is **100%** (exceeding the $\ge 60\%$ requirement).

---

## 2.3. Inquiry 3: Origin and Nomenclature of `BUG-P10-06b`
* **Historical Reconciliation with Phase 10:**
  - In the Phase 10 report, Section 2 (A8) and Section 4 (#68), the missing 30s timeout guard in Graceful Shutdown was mistakenly assigned the same identifier as the DTO Validation vulnerability (`BUG-P10-06`).
  - In Phase 10.1, the development team identified this conflict and temporarily designated it `BUG-P10-06b`.
* **Official IV&V Designation:**
  - This is an **independent finding identified during the Phase 10 audit**.
  - Formally re-cataloged as: **`BUG-P10.1-01` [P2]: Graceful Shutdown Missing 30s Force-Exit Timeout**.
  - **Status:** Resolved in `backend/src/main.ts` with `forceExitTimer` (30000ms, `.unref()`).

---

## 2.4. Inquiry 4: Disaggregated Verification of `BUG-P10-08` (Alerting) & `BUG-P10-09` (Backup & Restore)

#### A. Alerting Rules Verification (`BUG-P10-08`):
* File: `monitoring/prometheus/alert-rules.yml`
* Validated PromQL syntax via official Prometheus container:
  ```bash
  docker run --rm --entrypoint promtool -v "C:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml:/etc/prometheus/alert-rules.yml" prom/prometheus:latest check rules /etc/prometheus/alert-rules.yml
  ```
* **Raw Evidence Output:**
  ```
  Checking /etc/prometheus/alert-rules.yml
    SUCCESS: 7 rules found
  ```
* **Verdict:** **PASS**. PromQL syntax and YAML structure are 100% valid.

#### B. Backup & Disaster Recovery Verification (`BUG-P10-09`):
* **Backup Generation Script Execution:**
  Executed `node --no-warnings --experimental-strip-types scripts/backup-production.ts`:
  ```
  [Backup] Initiating automated database backup...
  [Backup] Target: C:\Workspaces\haihire\backups\haihire-db-haihire_db-2026-10-01T15-22-44-309Z.sql
  [Backup] Executing dump command...
  [Backup] Dump completed successfully. File size: 4349.88 KB
  ```
* **Empirical Restore Drill Against Clean Database `haihire_restore_drill`:**
  ```bash
  cmd.exe /c "docker exec -i haihire-postgres psql -U haihire_user -d haihire_restore_drill < C:\Workspaces\haihire\backups\haihire-db-*.sql"
  ```
* **RAW FAILURE EVIDENCE:**
  ```
  invalid command \iRsl"
  invalid command \%
  ERROR:  invalid byte sequence for encoding "UTF8": 0xff
  ```
* **Root Cause Breakdown:**
  1. In `scripts/backup-production.ts`: The command `docker exec -t haihire-postgres pg_dump ...` included `-t` (allocate pseudo-TTY). This inserted terminal escape sequences into the binary stream, corrupting the dump file.
  2. PowerShell redirection `> "${targetPath}"` defaults to UTF-16 LE with BOM (`0xFF 0xFE`), which the Linux container `psql` rejected as invalid UTF-8.
  3. **Absence of MinIO Backups:** `scripts/backup-production.ts` only executed `pg_dump`; it contained zero logic to back up MinIO object storage.
* **Verdict:** **FAIL**. The generated backups were **unrestorable during real disaster recovery**, as no restoration drill had been conducted prior to declaring completion.

---

## 3. PART B — Comprehensive Verification of 68 Regression Scenarios

* **Execution Command:**
  `node --no-warnings --experimental-strip-types scratch/ivv4-regression-68.ts`
* **Result:** **68 / 68 Scenarios PASS (100%)**.
* **Verification of the 8 Scenarios That Previously Failed in Phase 10:**

| # | Scenario | Phase 10 Result | Phase 10.1 Result (IV&V 5) | Raw Evidence |
| :---: | :--- | :---: | :---: | :--- |
| **#13** | Register Invalid Email | 🔴 FAIL (409) | 🟢 **PASS (400)** | Returns `["Invalid email format"]` |
| **#14** | Register Short Password | 🔴 FAIL (201) | 🟢 **PASS (400)** | Returns `["Password must be at least 6 characters"]` |
| **#22** | Optimistic Locking Stage Update | 🔴 FAIL (200) | 🟢 **PASS (409)** | Concurrency collision correctly intercepted |
| **#25** | Create Interview Schedule | 🔴 FAIL (400) | 🟢 **PASS (201)** | Valid DTO interview schedule created |
| **#65** | B9: Production HTTPS Redirection | 🔴 FAIL (No 301) | 🟢 **PASS (301)** | Middleware redirects `x-forwarded-proto !== https` |
| **#67** | B11: Content-Security-Policy | 🔴 FAIL (Header null) | 🟢 **PASS (200)** | `Content-Security-Policy` header verified |
| **#68** | B12: Graceful Shutdown Drain | 🔴 FAIL (No timer) | 🟢 **PASS (200)** | Configured `forceExitTimer` (30,000ms, `.unref()`) |
| **#A6** | Docker Build Context Root | 🔴 FAIL (Path err) | 🟢 **PASS (Build OK)** | Docker Compose context rooted at repository root |

---

## 4. PART C — Independent Test Suite Verification

### 4.1. Independent Test Count
* **Backend Vitest:**
  - Files: **23 passed**
  - Tests: **194 passed**
  - Duration: 6.32s
* **Frontend Vitest:**
  - Files: **21 passed**
  - Tests: **107 passed**
  - Duration: 7.38s
* **Actual Monorepo Total:** **301 tests passed**.
* **Phase 10.1 Report Claim:** Reported **301 / 301 tests**.
* **Assessment:** ✅ **100% Accurate (Zero discrepancies or miscounting found)**.

---

## 5. PART D — Evaluation of 10 New Edge Cases

Executed standalone verification script `scratch/ivv5-test-10-edge-cases.ts`:

| # | Edge Case | Result | Technical Detail (Raw Evidence) |
| :---: | :--- | :---: | :--- |
| **EC1** | DtoPipe with Nested Object | **PASS** | Server rejects nested object when expecting enum with HTTP 400. |
| **EC2** | DtoPipe with Array of DTO | **PASS** | Dispatches array `[{...}]` to single DTO endpoint rejected with HTTP 400. |
| **EC3** | DtoPipe with Query/Path Params | **OBSERVATION** | `@Query()` does not auto-validate without explicit pipe; ignores unmodeled params. |
| **EC4** | Stress Test `/health` (1,000 Reqs) | **PASS** | 1,000 consecutive requests in 944ms returned **1,000x HTTP 200 OK**, **0x 429**. |
| **EC5** | CSP Does Not Break Next.js Chunks | **PASS** | CSP placed on Backend API; Frontend Next.js loads dynamic chunks without issue. |
| **EC6** | HTTPS Redirect Loop Protection | **PASS** | Requests with `x-forwarded-proto: https` return HTTP 200 without redirect loops. |
| **EC7** | Backup Script Under Path/Disk Errors | **PASS** | Gracefully catches `ENOENT`/IO errors, exits with status 1 without crashing. |
| **EC8** | Backup Script with MinIO Storage | 🔴 **FAIL** | Script `backup-production.ts` omits MinIO completely; only dumps Postgres. |
| **EC9** | PromQL Alert Rule Syntax Check | **PASS** | `promtool` correctly intercepts invalid PromQL syntax (`{{{}}`). |
| **EC10**| Graceful Shutdown Under 100 In-Flight | **PASS** | `forceExitTimer` (30s) ensures clean termination even with hung sockets. |

---

## 6. Credibility Assessment of Phase 10.1

| Evaluation Criteria | Phase 9 | Phase 10.1 | Auditor Analysis |
| :--- | :---: | :---: | :--- |
| **Verified Claims Ratio** | 70 / 100 | **82 / 100** | Successfully verified 8/9 findings, coverage gains verified, skipThrottle and CSP functional. |
| **False Claim Count** | 65 / 100 | **78 / 100** | 2 inaccurate claims: DtoPipe on all controllers (omitted 2 email endpoints), backup ready (dumps corrupted). |
| **Evidence Quality** | 80 / 100 | **90 / 100** | Detailed raw output logs and repro scripts provided. |
| **SRE & Operations Integrity** | 70 / 100 | **75 / 100** | Absence of practical restore drill caused corrupted dumps to pass unnoticed. |
| **Test Counting Accuracy** | 85 / 100 | **100 / 100** | 301/301 tests perfectly reconciled between code and documentation. |
| **AVERAGE CREDIBILITY SCORE** | **78 / 100** | **85.0 / 100** | 📈 **Rebounded (+7.0 points), satisfying baseline 85/100 threshold**. |

---

## 7. Action Items for Phase 10.2 Go-Live Approval

Prior to granting **APPROVED FOR GOLIVE**, the engineering team must execute the following 2 tasks:

1. **Remediate Omitted `DtoPipe` Annotations on `email.controller.ts`:**
   - Attach `DtoPipe(SendSystemTestEmailDto)` at line 125.
   - Attach `DtoPipe(SendSystemEmailDto)` at line 131.
2. **Resolve Corrupted Database Dumps in `scripts/backup-production.ts`:**
   - Remove the `-t` flag from `docker exec` (use `docker exec -i`).
   - Export dump output via raw binary streams or write directly using `pg_dump -f` rather than PowerShell stdout redirection (`>`).
   - Add automated sync/archival for the MinIO storage volume.
   - Execute a successful Restore Drill into a live test database.
