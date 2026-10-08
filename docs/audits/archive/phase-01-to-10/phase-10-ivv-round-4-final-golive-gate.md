# Independent Verification & Validation Report (IV&V Round 4 - Final Pre-Golive Gate)
## Project: HaiHire ATS Platform | Evaluation of Phase 9 Production Readiness Report

---

| Audit Information | Details |
| :--- | :--- |
| **Phase** | **Phase 10: IV&V Round 4 — FINAL PRE-GOLIVE GATE** |
| **Evaluation Target** | `docs/audits/phase-9-production-deployment-report.md` & Commit `57a81b5` |
| **Role** | **Independent Verification & Validation (IV&V) Engineer + SRE Auditor** |
| **Audit Philosophy** | **Zero Trust — Actively search for every justified reason to BLOCK GO-LIVE** |
| **Runtime Environment** | Windows x64, Docker Desktop (WSL2), Node v22.14 / v26, NestJS (Port 13001), PostgreSQL (15432), Redis (16379), MinIO (19000/19001) |
| **Date** | 01/10/2026 |
| **FINAL GATE VERDICT** | 🔴 **NO-GO (BLOCK GO-LIVE — MANDATORY PHASE 10.1 HOTFIX SPRINT REQUIRED)** |

---

## 1. Executive Summary

Conducting an independent 4th evaluation cycle (Final Pre-Golive Gate) across the entire codebase, production artifacts, and claims of Phase 9:
* **FINAL VERDICT:** 🔴 **NO-GO (FULL PRODUCTION RELEASE BLOCKED)**.
* **Core Blocking Drivers:**
  1. **Critical P1 Security Vulnerability in DTO Validation (`BUG-P10-06`):** The production build step using `esbuild` stripped TypeScript decorator parameter metadata (`emitDecoratorMetadata`), causing NestJS `ValidationPipe` to bypass runtime class-validator DTO validation completely (e.g., `password: "123"` or malformed emails succeeded with HTTP 201).
  2. **Critical File Test Coverage < 50%:** Violated mandatory pre-golive quality gates (`applications.service.ts` at 44.78%, `prisma.service.ts` at 11.76%).
  3. **Methodologically Flawed Load Testing:** Phase 9 claimed "SLA p95 < 500ms achieved" by pooling 202 failed HTTP 429 requests (which responded instantly within 20ms) into the latency percentile calculation across 500 requests originating from a single IP.
  4. **Embellished & Inaccurate Technical Claims (Credibility Score: 78/100):** Claimed creating user `nestjs (UID 1001)` while actual containers used `node (UID 1000)`; claimed a "30s graceful shutdown drain" that merely printed log messages without timer logic; `docker build` failed due to invalid build contexts; and complete absence of CSP headers and resource limits.

---

## 2. PART A — Verification of 8 Inquiries into Phase 9

### A1. Verification of 284 Test Count — Investigating Repeated Miscounting Pattern
* **Executed Command:** `node --no-warnings --experimental-strip-types scripts/check-test-count.ts b321d3e 57a81b5`
* **Raw Output:**
  ```text
  Analyzing test changes between [b321d3e] and [57a81b5]...
  =================================================
              TEST SUITE DIFF AUDIT REPORT         
  =================================================
  Added test declarations (+it/+test):   9
  Removed test declarations (-it/-test): 1
  Net New Tests:                         8
  =================================================
  Added Tests:
    1. + should return root message (controller)
    2. + should return health status 200 when all services are healthy (controller)
    3. + should throw ServiceUnavailableException (HTTP 503) when any service is down (controller)
    4. + should return metrics string from MetricsService (controller)
    5. + should return ok health status when postgres, redis, and minio are all up (service)
    6. + should return degraded health status when redis ping fails (service)
    7. + should return degraded health status when minio bucket check fails (service)
    8. + should return valid Prometheus initial format when no requests recorded (metrics)
    9. + should record requests and format counters and summaries accurately (metrics)
  Removed / Renamed Old Tests:
    1. - should return ok health status when database query succeeds (service)
  ```
* **Analysis:**
  - Current total tests: **284 tests** (177 backend + 107 frontend) $\rightarrow$ **Accurate**.
  - Net New: $9 - 1 = 8$ tests (matches $284 - 276 = 8$).
  - **Phase 9 Claim:** *"Authored 9 new unit tests for healthcheck"*. Reality: Only 6 healthcheck tests (4 controller + 2 new service tests), 1 renamed from an old test, and 2 belonging to `metrics.service.spec.ts`.
* **Verdict:** **COUNT-VALID (Total counts are accurate, but narrative documentation repeated the conflation pattern for the 3rd time)**.

---

## A2. Verification of Load Testing Methodology
* **Source Code Inspection of `scripts/smoke-and-load-test.ts`:**
  - Dispatched from a single IP `127.0.0.1` directly confronting `ThrottlerGuard` (limit 100 req/60s).
  - Latency algorithm: `latencies.push(reqDuration)` was executed for **both 200 OK and 429 Too Many Requests**. Because 429 responses returned instantly (20-30ms), mixing 202 rate-limited responses with 298 success responses artificially compressed p95 down to 412ms!
* **Independent Execution Results Across 3 Scenarios (`scratch/ivv4-load-tests.ts`):**

  | Scenario | Total Reqs | Concurrency | 200 OK | 429 Error | p50 (All) | p95 (All) | **True p95 (200 OK)** | Throughput |
  | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
  | **Test 1: Baseline** | 500 | 50 | 200 | 300 | 23ms | 128ms | **155ms** | 1196.2 req/s |
  | **Test 2: Isolate Unthrottled** | 90 | 30 | 90 | 0 | 40ms | 110ms | **110ms** | 592.1 req/s |
  | **Test 3: Stress Test** | 5000 | 100 | 110 | 4890 | 27ms | 80ms | **252ms** | 3035.8 req/s |

* **Analysis:**
  - Unable to toggle rate limiting via environment variables due to hardcoding in `app.module.ts`.
  - When isolating successful requests (200 OK): True p95 was **110ms - 252ms** (genuinely satisfying the SLA < 500ms target).
  - Non-429 network error rate was 0%. The core server sustained 3000+ req/s without crashing.
* **Verdict:** **LOADTEST-METHODOLOGY-FLAWED (Phase 9 report used flawed metric methodology by pooling 429 errors into p95; however, underlying core throughput and isolated latency proved robust)**.

---

## A3. Verification of Test Coverage Audit
* **Executed Commands:** `pnpm --filter ./backend run test --coverage` and `pnpm --filter ./frontend run test --coverage`
* **Raw Coverage Measured:**
  - **Backend:** 59.99% Stmts, 45.43% Branch, 61.28% Funcs, 61.81% Lines.
  - **Frontend:** 48.04% Stmts, 45.86% Branch, 38.41% Funcs, 48.58% Lines.
* **Critical Files Assessment:**

  | Critical File | % Stmts | % Branch | % Funcs | % Lines | Risk Assessment |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | `backend/src/auth/jwt.strategy.ts` | 93.33% | 90.00% | 75.00% | 93.33% | 🟢 OK |
  | `backend/src/auth/auth.service.ts` | 78.75% | 68.42% | 85.71% | 78.75% | 🟢 OK |
  | `backend/src/applications/applications.service.ts` | **44.78%** | 34.43% | 51.56% | 46.41% | 🔴 **CRITICAL RISK (< 50%)** |
  | `backend/src/jobs/jobs.service.ts` | 72.15% | 71.63% | 64.28% | 77.41% | 🟢 OK |
  | `backend/src/minio/minio.service.ts` | 62.26% | 76.92% | 33.33% | 61.53% | 🟡 WARNING |
  | `backend/src/common/upload-utils.ts` | 77.04% | 55.55% | 100% | 77.96% | 🟢 OK |
  | `backend/src/events/events.service.ts` | 63.63% | 63.33% | 63.63% | 63.63% | 🟡 WARNING |
  | `backend/src/prisma/prisma.service.ts` | **11.76%** | 0.00% | 0.00% | 11.76% | 🔴 **CRITICAL RISK (< 50%)** |

* **Bottom 5 Frontend Files:** `auth-context.tsx` (2.73%), `organizations.ts` (3.44%), `applications.ts` (4.76%), `candidates.ts` (4.76%), `auth-guard.tsx` (5.00%).
* **Verdict:** 🔴 **COVERAGE-INSUFFICIENT (Automatic NO-GO triggered due to 2 critical files having < 50% statement coverage)**.

---

## A4. Verification of Redundant Keys in `/health` Payload
* **Executed Command:** `curl -i http://127.0.0.1:13001/health`
* **Raw Output:**
  ```json
  {"status":"ok","timestamp":"2026-10-01T13:56:13.314Z","uptime":6.81,"services":{"postgres":"up","redis":"up","minio":"up","database":"up"}}
  ```
* **Analysis:** Both keys `"postgres"` and `"database"` exist in the `services` payload, referencing the exact same `postgresStatus`. Root cause: Phase 9 added `postgres` but failed to deprecate legacy key `database`.
* **Verdict:** **FAIL $\rightarrow$ Logged as finding `BUG-P10-01` (P3)**.

---

## A5. Verification of Rate Limiting Impact on Observability
* **Source Code Inspection:** Checked `AppController` and confirmed missing `@SkipThrottle()` decorator.
* **Experiment:** Sent 200 consecutive requests to `/metrics` from a single IP.
* **Outcome:** Requests 1 to 100 returned HTTP 200; requests 101 to 200 returned **HTTP 429 Too Many Requests**.
* **SRE Impact:** Prometheus scrapers and Kubernetes Liveness Probes scraping frequently will be throttled, causing monitoring blackouts.
* **Verdict:** **MONITORING-BLOCKED $\rightarrow$ Logged as finding `BUG-P10-02` (P2)**.

---

## A6. Verification of Real Docker Builds
* **Command 1:** `docker build -t haihire-backend:test backend/`
* **Raw Error:**
  ```text
  ERROR: failed to build: failed to compute cache key: failed to calculate checksum of ref ...: "/packages/shared": not found
  ```
  *(Failed immediately because Dockerfile references outside context directory `backend/`)*.
* **Command 2:** `docker build -f backend/Dockerfile -t haihire-backend:test .`
  - Step 16 (esbuild): Finished in 20ms.
  - Step 20: `RUN chown -R node:node /app` hung for > 6 minutes due to recursing through tens of thousands of pnpm symlinks.
  - User check: `USER node` (UID 1000). Phase 9 claim regarding user `nestjs (UID 1001)` was **INCORRECT**.
* **Verdict:** **DOCKER-BROKEN $\rightarrow$ Logged as finding `BUG-P10-05` (P2)**.

---

## A7. Verification of CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
* **Syntax & Structural Review:**
  - Valid YAML syntax.
  - Complete environment matrix (`POSTGRES_USER`, `REDIS_HOST`, simulated mail).
* **Local Simulation of Stages:**
  - `pnpm check:i18n` $\rightarrow$ PASS (1682/1682 keys).
  - `pnpm lint` $\rightarrow$ PASS (0 errors).
  - `pnpm test:coverage` $\rightarrow$ PASS (284/284 tests).
  - `pnpm test:diff` $\rightarrow$ PASS.
  - `pnpm build` $\rightarrow$ PASS.
  - Deploy Staging & Deploy Production: **BLOCKED** (Requires live GitHub Actions runners and tokens).
* **Verdict:** **CI-VALID (Pipeline structure feasible)**.

---

## A8. Verification of Graceful Shutdown (SIGTERM)
* **Source Code Inspection in `backend/src/main.ts` (Lines 108-119):**
  ```typescript
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Lifecycle] Received ${signal}. Starting 30s graceful shutdown drain...`);
    try {
      await app.close();
      console.log("[Lifecycle] HaiHire backend shutdown completed cleanly.");
      process.exit(0);
  ```
* **Analysis:** The implementation only logged `"Starting 30s graceful shutdown drain..."` before immediately calling `await app.close()` and `process.exit(0)`. **NO 30S TIMER OR IN-FLIGHT DRAIN LOGIC EXISTED**.
* **Verdict:** **SHUTDOWN-PARTIAL $\rightarrow$ Logged as finding `BUG-P10-06` (P2)**.

---

## 3. PART B — Evaluation of 12 New Edge Cases

| Case | Scenario | Raw Evidence | Status |
| :--- | :--- | :--- | :---: |
| **B1** | Container Crash Loop | Docker daemon with `restart: unless-stopped` recovered in 2.1s. | **PASS** |
| **B2** | PostgreSQL Pool Exhaustion | 100 concurrent queries queued and completed cleanly in 282ms. | **PASS** |
| **B3** | Redis Down Resilience | BullMQ handled connection drop gracefully without crashing HTTP API. | **PASS** |
| **B4** | MinIO Down Resilience | MinIO outage returns HTTP 503 on `/health` and rejects uploads without orphan records. | **PASS** |
| **B5** | JWT Secret Rotation | Tokens signed with revoked secret rejected. Lacks dual-key transition window. | **PASS (Observed)** |
| **B6** | Memory Leak 300 Reqs | Initial RSS: 89MB, final RSS: 93MB ($\Delta$ 3.88MB). Zero memory leak. | **PASS** |
| **B7** | Log Flood Policy | `docker-compose.prod.yml` configured with `max-size: "20m"`, `max-file: "5"`. | **PASS** |
| **B8** | CORS Defense | Origin `https://evil.com` rejected without CORS headers. Internal origins allowed. | **PASS** |
| **B9** | HTTPS Redirection | HTTP requests lack 301/308 redirect middleware to HTTPS. | 🔴 **FAIL (`BUG-P10-04`)** |
| **B10** | Cookie Secure Flag | `backend/src/auth/auth.controller.ts` enforces `secure: env.NODE_ENV === "production"`. | **PASS** |
| **B11** | CSP Security Headers | Endpoints completely missing `Content-Security-Policy` header. | 🔴 **FAIL (`BUG-P10-03`)** |
| **B12** | Database Migration Rollback | Prisma migrate provides atomic transactions for schema migrations. | **PASS** |

---

## 4. PART C — Comprehensive 68-Scenario Regression Check

* **Total Scenarios Evaluated:** 68 scenarios.
* **Scenarios Passing:** **60 / 68 scenarios (88.2%)**.
* **Scenarios Failing:** **8 / 68 scenarios**.
* **Detailed Breakdown of the 8 Failing Scenarios:**

| # | Scenario | Failing Result | Root Cause |
| :---: | :--- | :--- | :--- |
| **#13** | Register Invalid Email | Returned HTTP 409 instead of 400 | DTO validation bypassed in esbuild bundle (`BUG-P10-06`) |
| **#14** | Register Short Password | Returned HTTP 201 Created | `@MinLength(6)` ignored due to missing metadata (`BUG-P10-06`) |
| **#22** | Optimistic Locking | Returned HTTP 200 instead of 409 | Version payload coerced as untyped object |
| **#25** | Create Interview | Returned HTTP 500 | Interview type schema check constraint mismatch |
| **#65** | B9: HTTPS Redirection | No redirect | Missing reverse proxy TLS redirect (`BUG-P10-04`) |
| **#67** | B11: CSP Header | Null header | Missing CSP header configuration (`BUG-P10-03`) |
| **#68** | B12: Graceful Shutdown | Missing 30s timer | Missing drain timeout logic (`BUG-P10-06`) |
| **--** | **#A6** Docker Build Context | Build failed | Build context misconfigured to `backend/` |

---

## 5. PART D — SRE Audit Checklist

### D1. Security Audit
* **Non-Root Execution:** Container runs as user `node` (UID 1000). *(Not root, but differs from claimed nestjs UID 1001)*.
* **Secrets In Git:** Identified live SMTP credentials in `backend/.env` (`qrruggyjbdltidmd`) and committed development encryption keys.
* **Trivy Vulnerability Scan:** **BLOCKED** (Binary trivy not installed on host machine).

### D2. Reliability Audit
* **Restart Policy:** Compliant (`restart: unless-stopped`).
* **Healthcheck:** Compliant (`/health` multi-service).
* **Resource Limits:** 🔴 **COMPLETELY MISSING**. `docker-compose.prod.yml` lacks `deploy.resources.limits` or `mem_limit` $\rightarrow$ Memory leaks could crash host node (`BUG-P10-07`).

### D3. Observability Audit
* **Log Format:** Structured JSON request logging compliant (PII redacted).
* **Metrics Labels:** Missing `method` label in `MetricsService` output.
* **Trace ID Propagation:** Lacks `x-request-id` / `traceparent` propagation across request contexts.

### D4. Operations Audit
* **Alerting Rules:** 🔴 **COMPLETELY MISSING**. No alert configuration files for Prometheus/Alertmanager (`BUG-P10-08`).
* **Backup & Restore Runbook:** 🔴 **COMPLETELY MISSING**. No automated backup scripts for PostgreSQL and MinIO (`BUG-P10-09`).

---

## 6. Findings & Bug Inventory in Phase 10

### 1. `BUG-P10-06` [P1 - CRITICAL BLOCKING]: DTO Validation Pipeline Bypassed Due to esbuild Decorator Metadata Loss
* **Description:** The production build command executed `esbuild src/main.ts --bundle`. `esbuild` does not emit TypeScript parameter metadata (`design:paramtypes`). When NestJS executes `ValidationPipe({ transform: true })`, the runtime `metatype` evaluates to generic `Object`, causing class-validator to skip 100% of validation rules.
* **Evidence:** Sending `POST /auth/register` with `password: "123"` returned **HTTP 201 Created** and created the user record.
* **Impact:** Malicious payloads, invalid strings, and injection attempts bypass gateway guards into the database.
* **Remediation:** Configure `@swc/core` or custom tsconfig/esbuild plugins to preserve decorator metadata.

### 2. `BUG-P10-02` [P2 - HIGH]: Prometheus Scraper & Healthcheck Subject to Rate Limiting Blackout
* **Description:** Missing `@SkipThrottle()` on `/health` and `/metrics`. Exceeding 100 requests in 60 seconds returns HTTP 429.
* **Impact:** Prometheus scrapers and Kubernetes probes will be throttled and fail.
* **Remediation:** Decorate `AppController` with `@SkipThrottle()`.

### 3. `BUG-P10-03` [P2 - MEDIUM]: Missing Content-Security-Policy (CSP) Header
* **Description:** HTTP responses lack `Content-Security-Policy` headers.
* **Remediation:** Integrate Helmet or explicit CSP middleware in `main.ts`.

### 4. `BUG-P10-04` [P2 - MEDIUM]: Missing Enforced HTTPS Redirection in Production Stack
* **Description:** Compose stack opens raw HTTP ports without reverse proxy TLS enforcement.
* **Remediation:** Add Caddy or Nginx reverse proxy container with automatic HTTPS redirects.

### 5. `BUG-P10-05` [P2 - MEDIUM]: Inefficient Layer Chown Freezing Docker Build
* **Description:** `RUN chown -R node:node /app` recurses through pnpm symlinks, hanging build processes.
* **Remediation:** Utilize `COPY --chown=node:node` in place of `RUN chown -R`.

### 6. `BUG-P10-07` [P2 - MEDIUM]: Missing Container Resource Limits (CPU & Memory)
* **Description:** `docker-compose.prod.yml` defines no resource bounds.
* **Remediation:** Declare `mem_limit: 1g` and `cpus: 1.0` per service.

### 7. `BUG-P10-08` [P2 - MEDIUM]: Missing Production Alerting Rules
* **Description:** Missing Prometheus alert configurations.
* **Remediation:** Provide standard alert definitions (`HighHttpErrorRate`, `ServiceDown`, `DiskFull`).

### 8. `BUG-P10-09` [P2 - MEDIUM]: Missing Automated Database & Storage Backup Procedures
* **Description:** Absence of automated pg_dump and cold storage backup procedures.
* **Remediation:** Provide backup container scripts for PostgreSQL and MinIO.

### 9. `BUG-P10-01` [P3 - LOW]: Redundant Key in `/health` JSON Payload
* **Description:** Both `postgres` and `database` keys returned in status dictionary.
* **Remediation:** Remove legacy `database` key.

---

## 7. Credibility Assessment of Phase 9

| Criteria | Score (Scale of 100) | Auditor Assessment |
| :--- | :---: | :--- |
| **Verified Claims Ratio** | **70 / 100** | Core capabilities worked (healthcheck, metrics, rate limits), but claims regarding Docker users, 30s graceful drain, and build context commands were invalid. |
| **False Claim Count** | **65 / 100** | Identified 4 incorrect claims (nestjs user 1001, 30s drain timer, 9 new healthcheck tests, docker build context). |
| **Evidence Quality** | **80 / 100** | Unit test logs provided; lacked empirical evidence for Docker builds and shutdown behavior. |
| **SRE Metrics Integrity** | **70 / 100** | Load test methodology flawed (mixed HTTP 429 into p95). Overlooked critical files with coverage < 50%. |
| **Test Counting Accuracy** | **85 / 100** | `check-test-count.ts` tool is sound, but narrative text repeated the test-renaming aggregation error. |
| **OVERALL CREDIBILITY SCORE** | **78 / 100** | ⚠️ **Dropped significantly below the 85/100 threshold**. |

* **Credibility Trend Across Phases:**
  - Phase 4: **92/100**
  - Phase 6: **88/100**
  - Phase 8: **92/100**
  - Phase 10 (Reviewing Phase 9): **78/100 (-14 POINTS)**.

---

## 8. Final Go-Live Decision

```
================================================================================
                    FINAL DECISION: 🔴 NO-GO (BLOCK GO-LIVE)
================================================================================
  RELEASE BLOCKING REASONS:
  1. Critical P1 Flaw [BUG-P10-06]: ValidationPipe bypassed entirely in production
     builds due to esbuild decorator metadata stripping.
  2. Test coverage on 2 critical files < 50% (applications.service: 44.78%,
     prisma.service: 11.76%).
  3. Load test methodology reported artificial p95 figures by pooling 429 errors.
  4. Missing foundational SRE controls: CSP headers, Resource Limits, and
     Alerting rules.
================================================================================
```

### Hotfix Plan for Phase 10.1 (Estimated: 2 - 3 Days):
1. **Fix P1 `BUG-P10-06`:** Configure SWC or tsconfig/esbuild plugins to preserve `emitDecoratorMetadata`.
2. **Elevate Critical Coverage:** Add unit tests to `applications.service.ts` and `prisma.service.ts` to achieve $\ge 60\%$.
3. **Add `@SkipThrottle()`:** Exempt `/health` and `/metrics` from rate limits.
4. **Optimize Dockerfile:** Use `COPY --chown=node:node` and standardize root build context.
5. **Establish SRE Baseline:** Add CSP headers, CPU/RAM limits in compose, and baseline Prometheus alert rules.
6. **Execute IV&V Round 5 Re-Gate** prior to routing live user traffic.
