# Task #32 Prep: CI/CD Optimization File Content Report

**Date:** 2026-10-16  
**Status:** COMPLETE (Ready for Task #32 Architecture Planning)  
**Author:** AI Orchestrator  
**Target:** CI/CD Optimization Preparation & Audit

---

## Executive Summary

This report aggregates the exact file contents, structural analysis, and installed tooling configuration across HaiHire's GitHub Actions workflows, Dependabot settings, Husky Git hooks, and package scripts. It serves as the single reference artifact for diagnosing and designing the upcoming **Task #32 CI/CD Performance & Workflow Optimization**.

---

## File 1: `.github/workflows/ci-dev.yml`

### Full Content

```yaml
name: Integration CI (Dev Branch)

on:
  push:
    branches: [dev]
  pull_request:
    branches: [dev]
  workflow_dispatch:

concurrency:
  group: ci-dev-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read

jobs:
  # ============================================================================
  # 1. ARCHITECTURAL QUALITY GATES (THE 11 GATES)
  # ============================================================================
  ci-gates:
    name: 11 CI Architecture Gates
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: 1

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup CI Single Root Environment
        run: |
          cp .env.example .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:5432\/haihire_test_db/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Run 11 Architecture Quality Gates (Fast)
        run: pnpm check:all:fast

  # ============================================================================
  # 2. FULL UNIT TESTS & TEST ANTI-REGRESSION
  # ============================================================================
  unit-tests:
    name: Full Unit Tests & Anti-Regression
    needs: ci-gates
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: 1

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup CI Single Root Environment
        run: |
          cp .env.example .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:5432\/haihire_test_db/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Audit Test Count Delta (Anti-Regression)
        run: node --experimental-strip-types scripts/check-test-count.ts HEAD~1 HEAD || true

      - name: Run Full Unit & Integration Test Suite
        run: pnpm test
```

### Structural Analysis

- **Total Lines:** 170
- **Triggers:** `push: [dev]`, `pull_request: [dev]`, `workflow_dispatch`
- **Jobs:**
  1. `ci-gates` (`11 CI Architecture Gates`)
  2. `unit-tests` (`Full Unit Tests & Anti-Regression`, `needs: ci-gates`)
- **Path Filter (`dorny/paths-filter`):** No
- **Concurrency Group:** Yes (`ci-dev-${{ github.ref }}`, `cancel-in-progress: true`)

---

## File 2: `.github/workflows/ci-staging.yml`

### Full Content

```yaml
name: Pre-Production CI (Staging Branch)

on:
  push:
    branches: [staging]
  pull_request:
    branches: [staging]
  workflow_dispatch:

concurrency:
  group: ci-staging-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read

jobs:
  # ============================================================================
  # 1. ARCHITECTURAL QUALITY GATES
  # ============================================================================
  ci-gates:
    name: 11 CI Architecture Gates
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: 1

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup CI Single Root Environment
        run: |
          cp .env.example .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:5432\/haihire_test_db/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Run 11 Architecture Quality Gates (Fast)
        run: pnpm check:all:fast

  # ============================================================================
  # 2. UNIT TESTS WITH COVERAGE
  # ============================================================================
  unit-tests:
    name: Unit & Integration Tests (Coverage)
    needs: ci-gates
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: 1

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup CI Single Root Environment
        run: |
          cp .env.example .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:5432\/haihire_test_db/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Audit Test Differences
        run: node --experimental-strip-types scripts/check-test-count.ts HEAD~1 HEAD || true

      - name: Run Unit Tests with Coverage
        run: |
          pnpm --filter ./backend run test --coverage
          pnpm --filter ./frontend run test --coverage

  # ============================================================================
  # 3. PLAYWRIGHT END-TO-END TESTS
  # ============================================================================
  e2e:
    name: Playwright End-to-End Suite
    needs: ci-gates
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_TELEMETRY_DISABLED: 1
      CI: "true"
      PLAYWRIGHT_BASE_URL: "http://localhost:13000"

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 15432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 16379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Single Root Environment for E2E
        run: |
          cp .env.example .env
          sed -i 's/BACKEND_PORT=3001/BACKEND_PORT=13001/g' .env
          sed -i 's/FRONTEND_PORT=3000/FRONTEND_PORT=13000/g' .env
          sed -i 's/POSTGRES_PORT=5432/POSTGRES_PORT=15432/g' .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:15432\/haihire_test_db/g' .env
          sed -i 's/REDIS_PORT=6379/REDIS_PORT=16379/g' .env
          sed -i 's/MINIO_PORT=9000/MINIO_PORT=19000/g' .env
          sed -i 's/MINIO_CONSOLE_PORT=9001/MINIO_CONSOLE_PORT=19001/g' .env
          sed -i 's/http:\/\/localhost:9000/http:\/\/localhost:19000/g' .env
          sed -i 's/INTERNAL_API_URL=.*/INTERNAL_API_URL="http:\/\/localhost:13001"/g' .env
          sed -i 's/FRONTEND_URL=.*/FRONTEND_URL="http:\/\/localhost:13000"/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Start MinIO Object Storage & Wait for Readiness
        run: |
          docker run -d --name minio \
            --user 0:0 \
            -v minio_data:/data \
            -p 19000:9000 -p 19001:9001 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            alpine/minio@sha256:cf23643a6cf9ce159c57643ceb88279e431262282428c9e0bf3a7ef1a97e84b4 \
            server /data --console-address ":9001"

          timeout 60s bash -c '
            until curl -sf http://localhost:19000/minio/health/live > /dev/null; do
              if ! docker ps | grep -q minio; then
                echo "❌ MinIO container stopped unexpectedly!"
                docker logs minio
                exit 1
              fi
              sleep 2
            done
          '
          echo "MinIO ready on port 19000!"

      - name: Wait for Redis/Valkey Readiness
        run: |
          timeout 60s bash -c 'until (exec 3<>/dev/tcp/localhost/16379) 2>/dev/null; do sleep 1; done'
          echo "Redis ready on port 16379!"

      - name: Run Database Migrations & Seed
        run: |
          pnpm --filter ./backend run db:update
          pnpm --filter ./backend run db:seed
        env:
          DATABASE_URL: postgresql://haihire_test:haihire_test_password@localhost:15432/haihire_test_db?schema=public
          DEMO_SEED_PASSWORD: dev-seed-password-2026

      - name: Cache Playwright browsers
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            playwright-${{ runner.os }}-

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Pre-build application
        run: pnpm build

      - name: Pre-start services in background & wait for healthcheck
        run: |
          pnpm dev &
          timeout 180s bash -c '
            until curl -sf http://localhost:13000 > /dev/null && curl -sf http://localhost:13001/health > /dev/null; do
              sleep 3
            done
          '
          echo "Services ready!"

      - name: Run Playwright E2E Tests
        run: pnpm test:e2e

      - name: Upload Playwright test report on failure
        uses: actions/upload-artifact@v6
        if: failure()
        with:
          name: staging-playwright-report
          path: playwright-report/
          if-no-files-found: ignore

  # ============================================================================
  # 4. PRODUCTION BUILD VERIFICATION
  # ============================================================================
  build:
    name: Production Build Verification
    needs: ci-gates
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Next.js build
        uses: actions/cache@v5
        with:
          path: ${{ github.workspace }}/frontend/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('frontend/src/**', 'frontend/public/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-

      - name: Setup CI Environment
        run: cp .env.example .env

      - name: Compile Monorepo Production Build
        run: pnpm build
```

### Structural Analysis

- **Total Lines:** 372
- **Triggers:** `push: [staging]`, `pull_request: [staging]`, `workflow_dispatch`
- **Jobs:**
  1. `ci-gates` (`11 CI Architecture Gates`)
  2. `unit-tests` (`Unit & Integration Tests (Coverage)`, `needs: ci-gates`)
  3. `e2e` (`Playwright End-to-End Suite`, `needs: ci-gates`)
  4. `build` (`Production Build Verification`, `needs: ci-gates`)
- **Path Filter (`dorny/paths-filter`):** No
- **Concurrency Group:** Yes (`ci-staging-${{ github.ref }}`, `cancel-in-progress: true`)

---

## File 3: `.github/workflows/ci-main.yml`

### Full Content

```yaml
name: Production Gatekeeper CI (Main Branch)

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-main-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read

jobs:
  # ============================================================================
  # 1. FULL ARCHITECTURAL & UNIT TEST VERIFICATION
  # ============================================================================
  full-check:
    name: Full CI Quality Pipeline
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: 1

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup CI Single Root Environment
        run: |
          cp .env.example .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:5432\/haihire_test_db/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Run Full CI Architecture Checks & Tests
        run: pnpm check:all

  # ============================================================================
  # 2. SECURITY AUDIT: DIRECT DEPENDENCIES
  # ============================================================================
  security-audit:
    name: Dependency Security Audit
    needs: full-check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Audit Direct Production Dependencies
        run: |
          node -e "
            const cp = require('child_process');
            let output = '';
            try {
              output = cp.execSync('pnpm audit --audit-level=high --json', { encoding: 'utf8' });
            } catch (err) {
              output = err.stdout?.toString() || '';
            }
            if (!output) process.exit(0);
            try {
              const data = JSON.parse(output);
              const advisories = Object.values(data.advisories || {});
              const directIssues = advisories.filter(a =>
                (a.severity === 'high' || a.severity === 'critical') &&
                (a.findings || []).some(f => (f.paths || []).some(p => !p.includes('>')))
              );
              if (directIssues.length > 0) {
                console.error('❌ Direct dependency security violation:', directIssues);
                process.exit(1);
              }
              console.log('✅ Direct dependencies security audit PASSED. Zero Critical/High direct vulnerabilities.');
            } catch (e) {
              console.log('Audit output parse error, skipping', e);
            }
          "

  # ============================================================================
  # 3. PLAYWRIGHT END-TO-END GATE
  # ============================================================================
  e2e:
    name: Playwright End-to-End Suite
    needs: full-check
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_TELEMETRY_DISABLED: 1
      CI: "true"
      PLAYWRIGHT_BASE_URL: "http://localhost:13000"

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 15432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 16379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Single Root Environment for E2E
        run: |
          cp .env.example .env
          sed -i 's/BACKEND_PORT=3001/BACKEND_PORT=13001/g' .env
          sed -i 's/FRONTEND_PORT=3000/FRONTEND_PORT=13000/g' .env
          sed -i 's/POSTGRES_PORT=5432/POSTGRES_PORT=15432/g' .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:15432\/haihire_test_db/g' .env
          sed -i 's/REDIS_PORT=6379/REDIS_PORT=16379/g' .env
          sed -i 's/MINIO_PORT=9000/MINIO_PORT=19000/g' .env
          sed -i 's/MINIO_CONSOLE_PORT=9001/MINIO_CONSOLE_PORT=19001/g' .env
          sed -i 's/http:\/\/localhost:9000/http:\/\/localhost:19000/g' .env
          sed -i 's/INTERNAL_API_URL=.*/INTERNAL_API_URL="http:\/\/localhost:13001"/g' .env
          sed -i 's/FRONTEND_URL=.*/FRONTEND_URL="http:\/\/localhost:13000"/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Start MinIO Object Storage & Wait for Readiness
        run: |
          docker run -d --name minio \
            --user 0:0 \
            -v minio_data:/data \
            -p 19000:9000 -p 19001:9001 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            alpine/minio@sha256:cf23643a6cf9ce159c57643ceb88279e431262282428c9e0bf3a7ef1a97e84b4 \
            server /data --console-address ":9001"

          timeout 60s bash -c '
            until curl -sf http://localhost:19000/minio/health/live > /dev/null; do
              if ! docker ps | grep -q minio; then
                echo "❌ MinIO container stopped unexpectedly!"
                docker logs minio
                exit 1
              fi
              sleep 2
            done
          '
          echo "MinIO ready on port 19000!"

      - name: Wait for Redis/Valkey Readiness
        run: |
          timeout 60s bash -c 'until (exec 3<>/dev/tcp/localhost/16379) 2>/dev/null; do sleep 1; done'
          echo "Redis ready on port 16379!"

      - name: Run Database Migrations & Seed
        run: |
          pnpm --filter ./backend run db:update
          pnpm --filter ./backend run db:seed
        env:
          DATABASE_URL: postgresql://haihire_test:haihire_test_password@localhost:15432/haihire_test_db?schema=public
          DEMO_SEED_PASSWORD: dev-seed-password-2026

      - name: Cache Playwright browsers
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            playwright-${{ runner.os }}-

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Pre-build application
        run: pnpm build

      - name: Pre-start services in background & wait for healthcheck
        run: |
          pnpm dev &
          timeout 180s bash -c '
            until curl -sf http://localhost:13000 > /dev/null && curl -sf http://localhost:13001/health > /dev/null; do
              sleep 3
            done
          '
          echo "Services ready!"

      - name: Run Playwright E2E Tests
        run: pnpm test:e2e

      - name: Upload Playwright test report on failure
        uses: actions/upload-artifact@v6
        if: failure()
        with:
          name: main-playwright-report
          path: playwright-report/
          if-no-files-found: ignore

  # ============================================================================
  # 4. DOCKER BUILD DRY-RUN VERIFICATION (NO PUSH)
  # ============================================================================
  docker-verify:
    name: Docker Build Dry-Run Verification
    needs: full-check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Verify Backend Container Build
        uses: docker/build-push-action@v6
        with:
          context: .
          file: backend/Dockerfile
          push: false
          tags: test-backend:latest
          cache-from: type=gha

      - name: Verify Frontend Container Build
        uses: docker/build-push-action@v6
        with:
          context: .
          file: frontend/Dockerfile
          push: false
          tags: test-frontend:latest
          cache-from: type=gha
```

### Structural Analysis

- **Total Lines:** 322
- **Triggers:** `pull_request: [main]`, `workflow_dispatch` _(No direct `push` trigger on `main`)_
- **Jobs:**
  1. `full-check` (`Full CI Quality Pipeline`)
  2. `security-audit` (`Dependency Security Audit`, `needs: full-check`)
  3. `e2e` (`Playwright End-to-End Suite`, `needs: full-check`)
  4. `docker-verify` (`Docker Build Dry-Run Verification`, `needs: full-check`)
- **Path Filter (`dorny/paths-filter`):** No
- **Concurrency Group:** Yes (`ci-main-${{ github.ref }}`, `cancel-in-progress: true`)

---

## File 4: `.github/workflows/e2e-weekly.yml`

### Full Content

```yaml
name: E2E Weekly Verification

on:
  schedule:
    - cron: "0 3 * * 1" # Monday 3AM UTC (weekly)
  workflow_dispatch:

concurrency:
  group: e2e-weekly-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  e2e:
    name: Full Weekly Playwright E2E Suite
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      NEXT_TELEMETRY_DISABLED: 1
      CI: "true"
      PLAYWRIGHT_BASE_URL: "http://localhost:13000"

    services:
      postgres:
        image: postgres:17.6-alpine
        env:
          POSTGRES_USER: haihire_test
          POSTGRES_PASSWORD: haihire_test_password
          POSTGRES_DB: haihire_test_db
        ports:
          - 15432:5432
        options: >-
          --health-cmd "pg_isready -U haihire_test -d haihire_test_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: valkey/valkey:8.0.2-alpine
        ports:
          - 16379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm 12
        run: npm install -g pnpm@12

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v5
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Single Root Environment for Weekly E2E
        run: |
          cp .env.example .env
          sed -i 's/BACKEND_PORT=3001/BACKEND_PORT=13001/g' .env
          sed -i 's/FRONTEND_PORT=3000/FRONTEND_PORT=13000/g' .env
          sed -i 's/POSTGRES_PORT=5432/POSTGRES_PORT=15432/g' .env
          sed -i 's/POSTGRES_USER=haihire_user/POSTGRES_USER=haihire_test/g' .env
          sed -i 's/POSTGRES_PASSWORD=haihire_password/POSTGRES_PASSWORD=haihire_test_password/g' .env
          sed -i 's/POSTGRES_DB=haihire_db/POSTGRES_DB=haihire_test_db/g' .env
          sed -i 's/postgresql:\/\/haihire_user:haihire_password@localhost:5432\/haihire_db/postgresql:\/\/haihire_test:haihire_test_password@localhost:15432\/haihire_test_db/g' .env
          sed -i 's/REDIS_PORT=6379/REDIS_PORT=16379/g' .env
          sed -i 's/MINIO_PORT=9000/MINIO_PORT=19000/g' .env
          sed -i 's/MINIO_CONSOLE_PORT=9001/MINIO_CONSOLE_PORT=19001/g' .env
          sed -i 's/http:\/\/localhost:9000/http:\/\/localhost:19000/g' .env
          sed -i 's/INTERNAL_API_URL=.*/INTERNAL_API_URL="http:\/\/localhost:13001"/g' .env
          sed -i 's/FRONTEND_URL=.*/FRONTEND_URL="http:\/\/localhost:13000"/g' .env
          sed -i 's/NODE_ENV=development/NODE_ENV=test/g' .env

      - name: Start MinIO Object Storage & Wait for Readiness
        run: |
          docker run -d --name minio \
            --user 0:0 \
            -v minio_data:/data \
            -p 19000:9000 -p 19001:9001 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            alpine/minio@sha256:cf23643a6cf9ce159c57643ceb88279e431262282428c9e0bf3a7ef1a97e84b4 \
            server /data --console-address ":9001"

          timeout 60s bash -c '
            until curl -sf http://localhost:19000/minio/health/live > /dev/null; do
              if ! docker ps | grep -q minio; then
                echo "❌ MinIO container stopped unexpectedly!"
                docker logs minio
                exit 1
              fi
              sleep 2
            done
          '
          echo "MinIO ready on port 19000!"

      - name: Wait for Redis/Valkey Readiness
        run: |
          timeout 60s bash -c 'until (exec 3<>/dev/tcp/localhost/16379) 2>/dev/null; do sleep 1; done'
          echo "Redis ready on port 16379!"

      - name: Run Database Migrations & Seed
        run: |
          pnpm --filter ./backend run db:update
          pnpm --filter ./backend run db:seed
        env:
          DATABASE_URL: postgresql://haihire_test:haihire_test_password@localhost:15432/haihire_test_db?schema=public
          DEMO_SEED_PASSWORD: dev-seed-password-2026

      - name: Cache Playwright browsers
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            playwright-${{ runner.os }}-

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Pre-build application
        run: pnpm build

      - name: Pre-start services in background & wait for healthcheck
        run: |
          pnpm dev &
          timeout 180s bash -c '
            until curl -sf http://localhost:13000 > /dev/null && curl -sf http://localhost:13001/health > /dev/null; do
              sleep 3
            done
          '
          echo "Services ready!"

      - name: Run Playwright E2E Tests
        run: pnpm test:e2e

      - name: Upload Playwright test report
        uses: actions/upload-artifact@v6
        if: always()
        with:
          name: weekly-playwright-report
          path: playwright-report/
          if-no-files-found: ignore
```

### Structural Analysis

- **Total Lines:** 164
- **Triggers:** `schedule` (cron: `'0 3 * * 1'`), `workflow_dispatch`
- **Schedule Cron:** Monday at `03:00 UTC`
- **Target Ref:** Defaults to repository default branch (`main`)
- **Jobs:**
  1. `e2e` (`Full Weekly Playwright E2E Suite`)

---

## File 5: `.github/workflows/security-weekly.yml`

### Full Content

```yaml
name: Security & Vulnerability Sweep (Weekly)

on:
  schedule:
    - cron: "0 6 * * 1" # 06:00 UTC every Monday
  workflow_dispatch:

concurrency:
  group: security-weekly-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  # ============================================================================
  # 1. DEPENDENCY AUDIT (HIGH & MODERATE CVE SCAN)
  # ============================================================================
  audit:
    name: Dependency Vulnerability Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Run Moderate & High Vulnerability Audit
        run: |
          pnpm audit --audit-level=moderate --json > audit-report.json || true
          cat audit-report.json | head -n 30

      - name: Upload Audit Report Artifact
        uses: actions/upload-artifact@v6
        with:
          name: security-audit-report
          path: audit-report.json
          if-no-files-found: ignore

  # ============================================================================
  # 2. TENANT SCOPING STATIC ANALYSIS SWEEP
  # ============================================================================
  tenant-isolation:
    name: Tenant Scoping Static Analysis
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify 100% Tenant Isolation Coverage
        run: pnpm lint:tenant-scope

  # ============================================================================
  # 3. OUTDATED DEPENDENCIES INSPECTION
  # ============================================================================
  dependency-check:
    name: Outdated Dependencies Report
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js 26
        uses: actions/setup-node@v5
        with:
          node-version: 26

      - name: Install pnpm
        run: npm install -g pnpm@12

      - name: Inspect Outdated Packages
        run: |
          pnpm outdated > outdated-report.txt || true
          cat outdated-report.txt

      - name: Upload Outdated Dependencies Report
        uses: actions/upload-artifact@v6
        with:
          name: outdated-dependencies-report
          path: outdated-report.txt
          if-no-files-found: ignore

  # ============================================================================
  # 4. FAILURE NOTIFICATION (WEBHOOK)
  # ============================================================================
  notify-on-failure:
    name: Notify Security Team on Failure
    needs: [audit, tenant-isolation, dependency-check]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch Webhook Alert
        env:
          ALERT_WEBHOOK_URL: ${{ secrets.SLACK_DLQ_WEBHOOK_URL || secrets.WEBHOOK_URL }}
        run: |
          if [ -n "$ALERT_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-Type: application/json' \
              --data '{"text":"⚠️ [SECURITY ALERT] Weekly security or tenant-isolation sweep failed on HaiHire platform!"}' \
              "$ALERT_WEBHOOK_URL" || true
          else
            echo "No security alert webhook configured."
          fi
```

### Structural Analysis

- **Total Lines:** 120
- **Triggers:** `schedule` (cron: `'0 6 * * 1'`), `workflow_dispatch`
- **Schedule Cron:** Monday at `06:00 UTC`
- **Target Ref:** Defaults to repository default branch (`main`)
- **Jobs:**
  1. `audit` (`Dependency Vulnerability Audit`)
  2. `tenant-isolation` (`Tenant Scoping Static Analysis`)
  3. `dependency-check` (`Outdated Dependencies Report`)
  4. `notify-on-failure` (`Notify Security Team on Failure`, `needs: [audit, tenant-isolation, dependency-check]`, `if: failure()`)
- **Inspection Commands:**
  - `pnpm audit --audit-level=moderate --json > audit-report.json`
  - `pnpm lint:tenant-scope`
  - `pnpm outdated > outdated-report.txt`

---

## File 6: `.github/dependabot.yml`

### Full Content

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
      timezone: "UTC"
    open-pull-requests-limit: 5
    target-branch: "dev"
    labels:
      - "dependencies"
      - "security"
    ignore:
      - dependency-name: "prisma"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@prisma/*"
        update-types: ["version-update:semver-major"]
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types: ["minor", "patch"]
```

### Structural Analysis

- **Total Lines:** 24
- **Package Ecosystem:** `"npm"`
- **Directory:** `"/"`
- **Schedule Interval:** `"weekly"`
- **Schedule Day + Time:** Monday at `04:00 UTC`
- **Target Branch:** `"dev"`
- **Open PR Limit:** 5
- **Labels:** `["dependencies", "security"]`
- **Groups:** Yes (`dev-dependencies`)
- **Ignore Rules:** Yes (`prisma` & `@prisma/*` with `semver-major`)

---

## File 7: `.husky/pre-commit`

### Full Content

```bash
pnpm test

```

### Structural Analysis

- **Total Lines:** 2
- **Command Executed:** `pnpm test` (Full vitest execution across backend and frontend, 656 tests across 75 test files)
- **Estimated Runtime:** ~25 to 35 seconds per commit
- **Skip Condition:** None (unconditionally triggered on all commits)

---

## File 8: `.husky/pre-push`

### Status

**File not found** (`.husky/pre-push` does not exist in the repository).

---

## File 9: `package.json` (`scripts` section)

### Full Scripts Content

```json
  "scripts": {
    "// ===== DEV & START =====": "",
    "dev": "pnpm --filter ./backend --filter ./frontend --parallel run dev",
    "dev:backend": "pnpm --filter ./backend run dev",
    "dev:frontend": "pnpm --filter ./frontend run dev",
    "start": "pnpm --filter ./backend --filter ./frontend --parallel run start",
    "start:backend": "pnpm --filter ./backend run start",
    "start:frontend": "pnpm --filter ./frontend run start",
    "// ===== BUILD & COMPILE =====": "",
    "build": "pnpm run build:shared && pnpm run build:backend && pnpm run build:frontend",
    "build:shared": "pnpm --filter @haihire/shared run build",
    "build:backend": "pnpm --filter ./backend run build",
    "build:frontend": "pnpm --filter ./frontend run build",
    "// ===== QUALITY & CI GATES =====": "",
    "lint": "pnpm --filter ./backend --filter ./frontend --parallel run lint",
    "typecheck": "pnpm run typecheck:backend && pnpm run typecheck:frontend",
    "typecheck:backend": "pnpm --filter ./backend run typecheck",
    "typecheck:frontend": "pnpm --filter ./frontend run typecheck",
    "lint:env-sync": "tsx scripts/check-env-sync.ts",
    "lint:i18n": "pnpm --filter ./frontend run lint:i18n",
    "lint:dtopipe": "node --no-warnings --experimental-strip-types scripts/check-dtopipe-coverage.ts",
    "lint:error-i18n": "tsx scripts/check-error-code-i18n.ts",
    "lint:api-contract": "tsx scripts/check-api-contract-coverage.ts",
    "lint:prometheus-rules": "tsx scripts/check-prometheus-rules.ts",
    "lint:tenant-scope": "tsx scripts/check-tenant-scoping.ts",
    "lint:doc-links": "tsx scripts/verify-doc-links.ts",
    "check:all": "tsx scripts/check-all.ts",
    "check:all:fast": "tsx scripts/check-all.ts --fast",
    "check:all:e2e": "tsx scripts/check-all.ts --e2e",
    "// ===== TESTING =====": "",
    "test": "pnpm --filter ./backend --filter ./frontend --parallel run test",
    "test:backend": "pnpm --filter ./backend run test",
    "test:frontend": "pnpm --filter ./frontend run test",
    "test:coverage": "pnpm --filter ./backend --filter ./frontend run test --coverage",
    "test:diff": "node --no-warnings --experimental-strip-types scripts/check-test-count.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "// ===== DATABASE & ORM =====": "",
    "db:setup": "pnpm --filter ./backend run db:update && pnpm --filter ./backend run db:seed",
    "db:update": "pnpm --filter ./backend run db:update",
    "db:seed": "node --import tsx src/prisma/seed.ts",
    "db:verify": "prisma db verify",
    "db:status": "prisma migration status",
    "contract:emit": "pnpm --filter ./backend run contract:emit",
    "// ===== DOCKER CONTAINERS =====": "",
    "docker:infra:up": "docker compose up -d",
    "docker:infra:down": "docker compose down",
    "docker:infra:logs": "docker compose logs -f",
    "docker:prod:up": "docker compose --env-file .env.production -f docker-compose.prod.yml up -d",
    "docker:prod:down": "docker compose --env-file .env.production -f docker-compose.prod.yml down",
    "docker:prod:config": "docker compose --env-file .env.production -f docker-compose.prod.yml config",
    "// ===== REPO UTILITIES =====": "",
    "version:sync": "tsx scripts/sync-version.ts",
    "version:bump": "tsx scripts/bump-version.ts",
    "prepare": "husky"
  }
```

---

## Tools Verification

- **`lint-staged`:** **Not installed** (0 matches found across root `package.json`, `backend/package.json`, and `frontend/package.json`).
- **`husky` version:** `^9.1.7` (Specified in root `devDependencies` line 66: `"husky": "^9.1.7"`).
- **`.husky/` files:**
  - `.husky/_/` (Husky internal directory)
  - `.husky/commit-msg` (Contains `pnpm exec commitlint --edit "$1"`)
  - `.husky/pre-commit` (Contains `pnpm test`)

---

## Questions & Architectural Observations for DeepSeek

1. **Duplicate Workflow Triggers (`push` + `pull_request`):**
   - In `ci-dev.yml` and `ci-staging.yml`, both `push` and `pull_request` triggers are enabled on the target branch.
   - When a PR to `dev` is merged, GitHub Actions executes both the closing pull request CI job and the newly pushed commit CI job.
   - Furthermore, `ci-feature.yml` already runs on PRs. Should `ci-dev.yml` trigger exclusively on `push: [dev]` (post-merge integration), leaving pre-merge gating to `ci-feature.yml`?

2. **Absence of Path Filtering in Branch CI Workflows:**
   - None of `ci-dev.yml`, `ci-staging.yml`, or `ci-main.yml` include `paths-ignore` or conditional filtering for docs-only changes (`docs/**`, `*.md`).
   - Pure documentation updates currently trigger the full 11 gates, spinning up PostgreSQL and Valkey containers, running E2E suites, and executing Docker build dry-runs.
   - Should `paths-ignore: ['docs/**', '**.md']` be configured, or should a lightweight path filter run Gate 10 (`pnpm lint:doc-links`) when only docs are modified?

3. **Pre-commit Performance Bottleneck vs. Pre-push:**
   - `.husky/pre-commit` runs `pnpm test` (656 tests, taking 25–35s per commit).
   - Should `lint-staged` be introduced to run fast linting on staged files in `pre-commit`, moving the full `pnpm test` or `pnpm check:all:fast` to `.husky/pre-push`?

4. **Monday UTC Scheduling Overlaps:**
   - `03:00 UTC`: `e2e-weekly.yml`
   - `04:00 UTC`: `dependabot.yml` opens PRs targeting `dev`
   - `06:00 UTC`: `security-weekly.yml` runs audit on `main`
   - Should the schedules be staggered and synchronized so security reports reflect the post-dependency update state?

5. **Branch Scope for Weekly E2E:**
   - `e2e-weekly.yml` executes against the default branch (`main`) only.
   - Should a matrix run across `dev`, `staging`, and `main` to catch regressions earlier on pre-release branches?
