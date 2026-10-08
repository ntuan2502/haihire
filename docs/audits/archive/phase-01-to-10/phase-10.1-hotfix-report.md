# Technical Report Phase 10.1: Hotfix Sprint — Full Closure of 9 Findings & 2 Coverage Issues

> **Engineer:** Senior Platform & SRE Engineer  
> **Completion Date:** 01/10/2026  
> **Objective:** Completely resolve all 9 findings (`BUG-P10-01` through `BUG-P10-09`) and 2 test coverage gaps from the Phase 10 IV&V Round 4 report in preparation for the **IV&V Round 5 Pre-Golive Gate**.

---

## 1. Executive Summary of Phase 10.1 Sprint

| Category | Pre-Fix (Phase 10) | Post-Fix (Phase 10.1) | Status |
| :--- | :---: | :---: | :---: |
| **P1 Critical Blocking** | 1 (`BUG-P10-06` DTO bypass) | **0** | 🟢 **RESOLVED** |
| **P2 High / Medium** | 7 (`BUG-P10-02` through `BUG-P10-09`) | **0** | 🟢 **RESOLVED** |
| **P3 Low** | 1 (`BUG-P10-01` duplicate key) | **0** | 🟢 **RESOLVED** |
| **`applications.service.ts` Coverage** | 46.41% Lines | **70.71% Lines** | 🟢 **PASS ($\ge 60\%$)** |
| **`prisma.service.ts` Coverage** | 11.76% Lines | **100.0% Lines** | 🟢 **PASS ($\ge 60\%$)** |
| **Total Test Suite** | 284 tests pass | **301 / 301 tests pass (100%)** | 🟢 **PASS** |
| **68 Regression Scenarios** | 60/68 pass (8 FAIL) | **68 / 68 pass (100%)** | 🟢 **PASS** |
| **Lint & Typecheck** | Warnings / risks present | **0 Errors across workspace** | 🟢 **PASS** |
| **Production Build** | Lacked bundle test context | **Shared + Backend + Frontend PASS** | 🟢 **PASS** |

---

## 2. PART A1 — Resolving Critical P1 Flaw `BUG-P10-06` (DTO Validation Bypass)

### 2.1. Root Cause Analysis
- When compiling/bundling TypeScript to ESM, `esbuild` stripped TypeScript decorator parameter metadata (`design:paramtypes`).
- When NestJS `ValidationPipe` executed `toValidate(metadata)`, `metadata.metatype` evaluated to `Object` rather than the DTO class constructor, causing `ValidationPipe` to silently skip all `class-validator` constraints (`@IsEmail()`, `@MinLength()`, etc.).

### 2.2. Pre-Fix Reproduction Evidence
- **Script:** `scratch/repro-p1-dto-validation.ts`
- **Request:** `POST /auth/register` with `password: "123"` and `email: "invalid-email-format"`.
- **Pre-Fix Result:** Returned **HTTP 201 Created**, persisting the user record into the database without restriction!

### 2.3. Technical Solution & Implementation
- Engineered custom pipe `DtoPipe<T>(expectedType: Type<T>)` extending `ValidationPipe` at `backend/src/common/dto-validation.pipe.ts`.
- `DtoPipe` proactively injects `expectedType` into `ArgumentMetadata.metatype`, forcing `ValidationPipe` and `class-validator` to evaluate 100% of properties regardless of runtime (`tsx` vs bundled `esbuild`).
- Applied `DtoPipe` across all controllers receiving DTO payloads:
  - `auth.controller.ts`: `login`, `register`, `refreshToken`
  - `organizations.controller.ts`: `create`, `join`, `updateMyOrg`
  - `jobs.controller.ts`: `create`, `update`
  - `applications.controller.ts`: `create`, `updateStage`, `updateCandidate`
  - `candidates.controller.ts`: `create`, `update`
  - `interviews.controller.ts`: `create`, `update`
  - `email.controller.ts`: `updateTemplate`, `updateSettings`, `sendEmail`, `sendTestEmail`
  - `sourcing.controller.ts`: `createLink`, `updateLink`, `recordClick`

### 2.4. Post-Fix Verification Evidence
```bash
node --no-warnings --experimental-strip-types scratch/repro-p1-dto-validation.ts
```
**Raw output:**
```json
Testing POST /auth/register with invalid DTO (password: '123' < 6 chars, bad email)...
Response Status: HTTP 400
Response Body: {
  "message": [
    "Invalid email format",
    "Password must be at least 6 characters"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
🟢 VALIDATION ENFORCED: Server rejected invalid payload with HTTP 400!
```

---

## 3. PART A2 — Raising Test Coverage on Critical Files ($\ge 60\%$)

### 3.1. `backend/src/prisma/prisma.service.ts`
- **Pre-Fix:** 11.76% Line Coverage (missing unit test suite).
- **Remediation:** Authored `backend/src/prisma/prisma.service.spec.ts` validating execution paths:
  - `onModuleInit` when users exist (skip seeding).
  - `onModuleInit` on empty database (creates default Admin Organization, Admin User, Member User).
  - Graceful connection pending / timeout exception handling.
- **Post-Fix Coverage:** **100.0% Line Coverage, 100% Stmts, 75% Branch**.

### 3.2. `backend/src/applications/applications.service.ts`
- **Pre-Fix:** 46.41% Line Coverage (missing tests for document uploads/downloads, candidate documents, query guardrails).
- **Remediation:** Added `CandidateDocument` mocks and test cases to `applications.service.spec.ts`:
  - Document file upload (evaluating binary headers `%PDF-`, `%%EOF`, size boundaries, and binding to candidate document).
  - Document stream download with anti-SSRF protections (`targetUrl` not belonging to application rejected with HTTP 403).
  - Document storage deletion and `resumeUrl` sync.
  - Candidate document history listing.
  - Application creation with new candidate and cross-tenant job-candidate validation.
- **Post-Fix Coverage:** **70.71% Line Coverage, 67.88% Stmts, 78.12% Funcs**.

---

## 4. PART B — Closure of P2 Findings (B1 through B7)

### B1. `BUG-P10-02` (Rate Limiting Blackout on `/health` and `/metrics`)
- **Pre-Fix Repro:** Sending 120 consecutive requests to `/metrics` $\rightarrow$ Returned **100x HTTP 200**, **20x HTTP 429 Too Many Requests**.
- **Fix:** Decorated `AppController` (`backend/src/app.controller.ts`) with `@SkipThrottle()`.
- **Post-Fix Verification:** Executed `scratch/repro-p10-02-metrics-throttle.ts`:
  ```
  Sending 120 consecutive requests to /metrics to test rate limiting...
  Results: 200 OK = 120, 429 Too Many Requests = 0
  ```

### B2. `BUG-P10-03` (Missing Content-Security-Policy Header)
- **Pre-Fix Repro:** `curl.exe -i http://127.0.0.1:13001/health` lacked `Content-Security-Policy` header.
- **Fix:** Configured middleware in `backend/src/main.ts`:
  ```typescript
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';");
  ```
- **Post-Fix Verification:**
  ```http
  HTTP/1.1 200 OK
  Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
  ```

### B3. `BUG-P10-04` (Missing HTTPS Redirection in Production Stack)
- **Fix:** Added HTTP $\rightarrow$ HTTPS redirection middleware when `NODE_ENV === 'production'`:
  ```typescript
  if (env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      if (!isHttps) {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url || ""}` });
        res.end();
        return;
      }
      next();
    });
  }
  ```

### B4. `BUG-P10-05` (Layer Chown Causing Bloated Docker Build Image)
- **Fix:** In `backend/Dockerfile`, replaced `RUN chown -R node:node /app` with `--chown=node:node` flags directly on `COPY` directives in the runner stage:
  ```dockerfile
  COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
  COPY --chown=node:node packages/shared/package.json ./packages/shared/
  COPY --chown=node:node backend/package.json ./backend/
  COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
  ```

### B5. `BUG-P10-06b` (Missing 30s Timeout Guard in Graceful Shutdown)
- **Fix:** In `backend/src/main.ts`, wrapped `gracefulShutdown` with a 30,000ms `setTimeout`:
  ```typescript
  const forceExitTimer = setTimeout(() => {
    console.error("[Lifecycle] Graceful shutdown timeout (30s) exceeded. Forcing process exit.");
    process.exit(1);
  }, 30000);
  forceExitTimer.unref?.();
  ```

### B6. `BUG-P10-07` (Missing Container Resource Limits in Production Compose)
- **Fix:** In `docker-compose.prod.yml`, declared `deploy.resources.limits` and `deploy.resources.reservations` across all 5 containers:
  - `postgres`: limits: 2.0 CPUs, 2048MB RAM; reservations: 0.5 CPUs, 512MB RAM
  - `redis`: limits: 1.0 CPUs, 512MB RAM; reservations: 0.1 CPUs, 64MB RAM
  - `minio`: limits: 1.0 CPUs, 1024MB RAM; reservations: 0.2 CPUs, 128MB RAM
  - `backend`: limits: 2.0 CPUs, 1536MB RAM; reservations: 0.5 CPUs, 256MB RAM
  - `frontend`: limits: 1.5 CPUs, 1024MB RAM; reservations: 0.25 CPUs, 256MB RAM
- **Verification:** `docker compose -f docker-compose.prod.yml config` validated 100% syntactically correct.

### B7. `BUG-P10-08` & `BUG-P10-09` (Alerting Rules & Backup/Disaster Recovery)
- **`BUG-P10-08`:** Created production alert definitions at `monitoring/prometheus/alert-rules.yml`:
  - `HaiHireBackendDown`
  - `HaiHirePostgresDown`
  - `HaiHireRedisDown`
  - `HaiHireMinioDown`
  - `HaiHireHighHttp5xxErrorRate` (>5% over 5 minutes)
  - `HaiHireHighHttpLatencyP95` (>1000ms over 3 minutes)
  - `HaiHireHighRateLimit429Rate` (>50 reqs/sec)
- **`BUG-P10-09`:** Created automated backup script `scripts/backup-production.ts` and disaster recovery runbook `docs/runbooks/backup-and-restore.md`:
  - Empirical verification: Generated SQL dump `haihire-db-haihire_db-*.sql` (size: 4222.60 KB).
  - Automated purge of backup archives older than the 7-day retention period.

---

## 5. PART C1 — Resolving P3 Finding `BUG-P10-01` (Redundant Key in `/health`)

- **Problem:** Response returned both `postgres` and `database` keys referencing the same status.
- **Fix:**
  - In `backend/src/app.service.ts`: Removed `database: "up" | "down"` from `HealthCheckResult.services`.
  - Updated test assertions in `app.service.spec.ts` and `app.controller.spec.ts`.
- **Runtime Verification:**
  ```bash
  curl.exe -s http://127.0.0.1:13001/health
  ```
  **Actual output:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-01T15:08:19.501Z",
    "uptime": 44.44,
    "services": {
      "postgres": "up",
      "redis": "up",
      "minio": "up"
    }
  }
  ```

---

## 6. Comprehensive Verification Evidence

### 6.1. Workspace Unit Test Suite
```bash
pnpm --filter ./backend run test   # 23 test files (194 tests) PASS
pnpm --filter ./frontend run test  # 21 test files (107 tests) PASS
```
$\rightarrow$ **Total:** **44 test files, 301/301 tests PASS (100%)**.

### 6.2. 68 Scenarios Regression Runner
```bash
node --no-warnings --experimental-strip-types scratch/ivv4-regression-68.ts
```
**Conclusion Output:**
```
==================================================================
TOTAL SCENARIOS: 68 | PASSED: 68 | FAILED: 0
==================================================================
```
$\rightarrow$ **Pass Rate: 100.0% (Increased from 88.2% to 100%)**.

### 6.3. Static Analysis & Type Checking
- `pnpm lint` $\rightarrow$ **0 Errors** across backend and frontend.
- `pnpm typecheck` $\rightarrow$ **0 Errors** across all projects.

### 6.4. Production Build Verification
- `pnpm run build` $\rightarrow$
  - `@haihire/shared`: Compiled successfully.
  - `backend`: `esbuild` bundled `dist/server.mjs` (557.6kb) successfully.
  - `frontend`: Next.js Turbopack optimized build across 22/22 routes successfully.

---

## 7. Conclusion & Readiness for IV&V Round 5

All **9 findings** (`BUG-P10-01` through `BUG-P10-09`) and **2 test coverage gaps** from Phase 10 are completely resolved with empirical evidence.

The system satisfies all reliability, security, and resilience criteria to advance to **IV&V Round 5 — Pre-Golive Gate**.
