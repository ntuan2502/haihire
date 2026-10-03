# CI/CD Test & Execution Strategy

**Version:** 1.0.0  
**Effective Date:** 2026-10-03 (Phase 22.4)  
**Target Platform:** GitHub Actions & Local Developer Workstations  

---

## 1. Test Pyramid for HaiHire

HaiHire adopts a strictly stratified Testing Pyramid to ensure rapid developer feedback loops, high regression coverage, and cost-effective runner utilization:

```
          / \
         /   \       End-to-End (E2E) UI Tests
        / E2E \      Playwright Chromium • 10 journeys
       /───────\     Critical Paths Only • Nightly • Pre-release
      /         \
     /Integration\   Integration & Contract Tests
    /  & Contract \  Saga DB Transactions • MinIO DLQ • API Contracts
   /───────────────\ DtoPipe Protection • i18n Dictionary Parity
  /                 \
 /    Unit Tests     \ Unit Test Matrix
/  (Backend+Frontend) \ Vitest • 378 unit tests • 51 suites • <15s
/─────────────────────\ 100% PR execution • Fast fail
```

### Layer Rationale
1. **Unit Tests (Vitest - 378 tests):** Fast execution (<15 seconds), zero external service dependencies (pure mock/in-memory), execute on **100% of pull requests and commits**.
2. **Static Architecture Gates (8 Gates):** Lint, typecheck, DtoPipe coverage, error code i18n localization, API contract sync, environment parity, test count diff. Total runtime ~20s.
3. **End-to-End (E2E) Tests (Playwright - 10 tests):** Real browser journeys (Careers SEO & themes, candidate applications, multi-step ATS login, Kanban drag-and-drop). Heavyweight requirement with PostgreSQL, Valkey, and MinIO services. Triggered **smartly & conditionally**.

---

## 2. Where Each Test Runs (Execution Matrix)

| Test Layer | Local Dev (`check:all`) | Pull Request (Docs/Typo) | Pull Request (Critical Path) | Push to `main`/`develop` | Nightly (`03:00 UTC`) | Tagged Release (GHCR) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Static Gates (1-6)** | ✅ Runs | ✅ Runs | ✅ Runs | ✅ Runs | — | ✅ Runs |
| **Unit Tests (Gate 7)** | ✅ Runs | ✅ Runs | ✅ Runs | ✅ Runs | — | ✅ Runs |
| **Next.js Package Build** | ✅ Runs | ✅ Runs | ✅ Runs | ✅ Runs | — | ✅ Runs |
| **Playwright E2E Tests** | Optional (`test:e2e`) | ⏭️ **SKIPPED** | 🟢 **RUNS** | 🟢 **RUNS** | 🟢 **RUNS (Full)** | 🟢 **MANDATORY GATE** |
| **Docker Build & Push** | Optional | ⏭️ Skipped | ⏭️ Skipped | 🟢 Runs | ⏭️ Skipped | 🟢 Runs |

---

## 3. Critical Paths List

A pull request triggers the `e2e` job if and only if any of the following paths are modified:

### Frontend Critical Paths
- `frontend/src/app/**`: Core App Router routes (e.g. `/auth/login`, `/careers/*`, `/dashboard/*`).
- `frontend/src/components/providers/**`: Context providers, theme providers, React Query factory.
- `frontend/src/lib/api/**`: Client-side HTTP client, error handlers, and endpoint wrappers.
- `frontend/src/i18n/**`: Translation dictionaries and locale selectors.
- `frontend/tests/e2e/**`: Changes or additions to E2E test specifications.

### Backend Critical Paths
- `backend/src/auth/**`: Authentication controllers, JWT guards, password hashing, and login endpoints.
- `backend/src/applications/**`: Job application processing, resume uploads, stage transitions.
- `backend/src/candidates/**`: Candidate profile management and document storage.
- `backend/src/jobs/**`: Job requisition CRUD, public careers endpoints, pipeline definitions.
- `backend/src/common/upload-utils.ts`: Magic bytes, MIME filters, cross-platform filename sanitization.
- `backend/src/common/dto-validation.pipe.ts`: Body validation pipelines and security guards.
- `backend/src/prisma/**`: Database schema, seed data, and migration scripts.

### Monorepo & Configuration Critical Paths
- `packages/**`: Shared contracts, domain models, error code definitions.
- `package.json`, `pnpm-lock.yaml`: Dependency upgrades and tool modifications.
- `tsconfig.json`, `next.config.ts`, `playwright.config.ts`: Runtime and build configurations.

---

## 4. E2E Trigger Conditions & Architecture

### 4.1 Path Filter Automation (`dorny/paths-filter@v3`)
In `.github/workflows/ci-cd.yml`, job `changes` parses the Git diff using `paths-filter`:
```yaml
jobs:
  changes:
    name: Detect Changed Paths
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    outputs:
      e2e-critical: ${{ steps.filter.outputs.e2e-critical }}
      docker-critical: ${{ steps.filter.outputs.docker-critical }}
    steps:
      - uses: actions/checkout@v5
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            e2e-critical:
              - 'frontend/src/app/**'
              - 'frontend/src/components/providers/**'
              # ... additional critical paths
```

### 4.2 Conditional Job Execution
The `e2e` job executes when:
```yaml
if: github.event_name == 'push' || needs.changes.outputs.e2e-critical == 'true'
```
- If a developer opens a PR updating documentation (`docs/**`), runbooks, or non-critical components, `e2e` is **gracefully skipped**, saving runner minutes and finishing CI in under 2 minutes.
- If a developer modifies a route, auth logic, or shared contract, `e2e` executes automatically.

### 4.3 Service Pre-Start & Healthcheck
To avoid `webServer` timeout crashes in CI runners:
1. Postgres and Valkey start via GitHub Actions `services:` containers with healthchecks.
2. Database schema is migrated and seeded (`pnpm run db:update && pnpm run seed`).
3. Services start in background (`pnpm dev &`) and wait for health confirmation via curl:
   ```bash
   timeout 120s bash -c 'until curl -sf http://localhost:13000 > /dev/null; do sleep 2; done'
   ```
4. Playwright runs with `reuseExistingServer: !process.env.CI` (true in CI), instantly connecting without double-spawning servers.

---

## 5. Cost & Time Analysis

### Runner Time Savings per Pull Request
- **Static Gates Only (Docs / Minor Fixes):**
  - Before: ~6-8 minutes (ran full setup, DB, Next dev, and Playwright).
  - After: **~1.5 - 2.0 minutes** (static lint, typecheck, unit tests).
  - **Time Saved:** **75% reduction** in CI turnaround time.
- **Critical Path PRs:**
  - Before: 8-10 minutes (with frequent 120s timeout failures).
  - After: **~4-5 minutes** (pre-started services, 300s timeout margin, zero webServer timeout).
  - **Reliability:** 100% deterministic green runs.

### Monthly GitHub Actions Compute Savings
- Estimating an average of 120 PRs/month (40 docs/formatting/tests, 80 feature/bugfix):
  - 40 non-critical PRs $\times$ 6 min saved = **240 runner minutes saved**.
  - Elimination of flaky timeout reruns (approx. 20 reruns $\times$ 8 min) = **160 runner minutes saved**.
  - **Total Monthly Savings:** $\approx$ **400+ runner minutes saved per month**, staying comfortably within free and team tier budgets.

---

## 6. Developer Workflow Guidelines

### Running Tests Locally
```powershell
# 1. Run quick static checks (8 gates, unit tests skipped)
pnpm check:all:fast

# 2. Run unit tests only
pnpm test

# 3. Seed database locally before E2E testing
pnpm --filter backend run seed

# 4. Run Playwright E2E tests
pnpm test:e2e

# 5. Run full local gate suite including E2E
pnpm check:all:e2e
```

---

## 7. GitHub Actions Permissions Setup

### 7.1 Required Workflow Permissions
When jobs utilize `dorny/paths-filter@v3` on `pull_request` triggers, GitHub Actions queries the Pull Request File API (`GET /repos/{owner}/{repo}/pulls/{number}/files`). This requires explicit read permissions for both contents and pull-requests:

```yaml
permissions:
  contents: read
  pull-requests: read
```

Without `pull-requests: read`, the GitHub API rejects the request with:
```
HttpError: Resource not accessible by integration
```

### 7.2 Action Version Baseline (Node 24 Runtime)
To prevent Node 20 runtime deprecation warnings and benefit from performance improvements, all primary actions are pinned to modern releases:
- `actions/checkout@v5`: Native Node 24 runtime, faster shallow clones.
- `actions/setup-node@v5`: High-performance Node version management and caching.
- `docker/build-push-action@v6`: Container buildkit with GitHub Actions cache backend.
- `dorny/paths-filter@v3`: Standardized path detection with explicit token authorization.

### 7.3 Repository-Level Settings Configuration
If workflows continue to encounter `Resource not accessible by integration`, the repository default permissions must be verified:

1. Open the GitHub repository in a browser: `https://github.com/<owner>/<repo>/settings/actions`.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions** (or ensure read permissions include Pull Requests).
4. Check **Allow GitHub Actions to create and approve pull requests** (if PR automation is active).
5. Click **Save**.

