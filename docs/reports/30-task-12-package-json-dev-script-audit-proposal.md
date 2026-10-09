# Task #12 Phase 1: package.json & Dev Script Audit and Refactoring Proposal

**Date:** 2026-10-09  
**Status:** Completed (Audit & Proposal Only — No Files Modified)  
**Task Type:** Diagnostic Audit, Tooling Standardization & Deprecation Analysis  
**Target Files Inspected:**
- [`frontend/scripts/dev.ts`](../../frontend/scripts/dev.ts)
- [`package.json`](../../package.json) (Root)
- [`backend/package.json`](../../backend/package.json)
- [`frontend/package.json`](../../frontend/package.json)
- [`packages/shared/package.json`](../../packages/shared/package.json)

---

## 1. Executive Summary

Following 12 consecutive hardening milestones, an audit of the developer workflow identified two key operational issues:
1. **Node.js `DEP0190` Runtime Deprecation Warning:** Emitted during `pnpm dev` when [`frontend/scripts/dev.ts`](../../frontend/scripts/dev.ts) spawns Next.js with `shell: true` and an array of arguments.
2. **`package.json` Script Sprawl and Inconsistency:** Across the 3 workspace `package.json` files, a total of **88 script declarations** (58 root, 23 backend, 7 frontend) have accumulated. Multiple dead scripts from obsolete experiments (e.g. Prisma Composer, Alchemy), duplicate aliases (`seed` vs `db:seed`), and inconsistent naming prefixes (`check:` vs `lint:`) add maintenance overhead.

This audit provides evidence-based analysis of the warning, a complete inventory of workspace scripts, an evaluation of fix options, and a structured migration proposal for Phase 2. **In accordance with Phase 1 constraints, no workspace code or configuration has been modified.**

---

## 2. Part A: Dev Script Warning Analysis (`DEP0190`)

### 2.1 Code Inspection ([`frontend/scripts/dev.ts`](../../frontend/scripts/dev.ts))

- **File Length:** 66 lines.
- **Child Process Invocations:** Exactly **1** invocation of `spawn` across the file. Zero instances of `exec`, `execSync`, or `fork`.
- **Location & Code Snippet:**
  - File: [`frontend/scripts/dev.ts:55-58`](../../frontend/scripts/dev.ts#L55-L58)
  ```typescript
  const child = spawn("pnpm", ["exec", "next", "dev", "-H", "0.0.0.0", "-p", String(frontendPort)], {
    stdio: "inherit",
    shell: true,
  });
  ```
- **Configuration Details:**
  - `shell`: `true` is explicitly set.
  - `args`: Passed as an array of 7 elements: `["exec", "next", "dev", "-H", "0.0.0.0", "-p", String(frontendPort)]`.

### 2.2 Call Site Risk Analysis & Argument Breakdown

| Argument Index | Value | Type / Origin | Untrusted Input? |
| :--- | :--- | :--- | :--- |
| `0` | `"exec"` | String literal | No |
| `1` | `"next"` | String literal | No |
| `2` | `"dev"` | String literal | No |
| `3` | `"-H"` | String literal | No |
| `4` | `"0.0.0.0"` | String literal | No |
| `5` | `"-p"` | String literal | No |
| `6` | `String(frontendPort)` | Number parsed via `Number(process.env.FRONTEND_PORT) \|\| 3000` | No |

**Security Risk Assessment:**
- **Real-World Security Threat in HaiHire Codebase: ZERO.**
  Every argument is either a hardcoded string literal or a validated numeric port. There is zero user input or externally controlled text reaching this invocation.
- **Nature of the Warning:**
  The warning is purely **best-practice enforcement and diagnostic noise** by the Node.js runtime. When `shell: true` is enabled, Node.js delegates string concatenation to an internal routine without contextual escaping for shell metacharacters. If untrusted input were passed, this pattern could lead to command injection. In this script, it merely clutters the developer console.

### 2.3 Official Node.js Documentation on `DEP0190`

Based on official Node.js documentation (`node:child_process` deprecation index):
- **Official Deprecation Title:** `DEP0190: Passing args to node:child_process execFile / spawn with shell option`
- **Classification:** `Runtime deprecation`.
- **History & Version Introduction:**
  - *Documentation-only deprecation:* Introduced in Node.js **v23.11.0** and **v22.15.0**.
  - *Runtime deprecation (emitting `process.emitWarning`):* Introduced in Node.js **v24.0.0**.
- **Removal Timeline:**
  - **Status: Unclear / No official End-of-Life date.** The Node.js core documentation does not specify a target major version for removal. It is currently categorized strictly as a runtime deprecation, not an End-of-Life breaking change.
- **Official Recommendation:**
  Avoid combining `shell: true` with an array of arguments. If shell functionality is required, pass the full command as a single formatted string. If arguments must be handled as discrete tokens, disable `shell: true`.

### 2.4 Fix Options Evaluation

| Option | Implementation Mechanism | Cross-Platform Compatibility | Streaming Output | Complexity | Security & Best Practice |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A: `shell: false` with Platform Binary Resolver** | `const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";`<br>`spawn(cmd, ["exec", "next", "dev", "-H", "0.0.0.0", "-p", String(frontendPort)], { stdio: "inherit", shell: false });` | High (requires `.cmd` extension on Windows because Windows cannot spawn `.cmd` batch scripts directly without shell or explicit extension) | Preserved | Low | Excellent (No shell invocation, discrete argument array) |
| **Option B: Single String Command with `shell: true`** | `spawn(\`pnpm exec next dev -H 0.0.0.0 -p \${frontendPort}\`, { stdio: "inherit", shell: true });` | High (Windows `cmd.exe` and Unix `/bin/sh` resolve `pnpm` natively via PATH) | Preserved | Minimal | Clean (Eliminates `DEP0190` warning because arguments array is omitted) |
| **Option C: Direct Node Execution via `process.execPath`** | `const nextBin = path.resolve(__dirname, "../node_modules/next/dist/bin/next");`<br>`spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0", "-p", String(frontendPort)], { stdio: "inherit", shell: false });` | Maximum (Directly runs `node.exe` or `node`, completely bypassing shell and package manager wrappers) | Preserved | Medium | Maximum performance, zero shell overhead, zero warnings |
| **Option D: `execSync`** | `execSync(\`pnpm exec next dev -H 0.0.0.0 -p \${frontendPort}\`, { stdio: "inherit" });` | High | Blocking (synchronous) | Minimal | Unacceptable (Blocks event loop, poor signal handling for watch mode) |

### 2.5 Recommended Fix

- **Primary Recommendation: Option B (Single String Command with `shell: true`)**
  - **Rationale:** It instantly eliminates the `DEP0190` warning with a single line change, preserves existing cross-platform PATH resolution across Windows/macOS/Linux, retains TTY output streaming, and introduces zero behavioral differences. Because `frontendPort` is strictly validated as a number, there is zero risk of shell metacharacter injection.
- **Secondary / Future-Proof Recommendation: Option A (`pnpm.cmd` on Windows + `shell: false`)**
  - **Rationale:** Adheres strictly to the architectural ideal of avoiding shell wrappers entirely when discrete argument lists are used.

---

## 3. Part B: Workspace `package.json` Scripts Inventory

### 3.1 Root [`package.json`](../../package.json) (58 Scripts)

| # | Script Name | Command | Purpose | Reference Sources |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `dev` | `pnpm --filter ./backend --filter ./frontend --parallel run dev` | Start full local dev environment | CI, Docs, User Workflow |
| 2 | `dev:backend` | `pnpm --filter ./backend run dev` | Start backend dev server only | Docs (Isolated Dev) |
| 3 | `dev:frontend` | `pnpm --filter ./frontend run dev` | Start frontend dev server only | Docs (Isolated Dev) |
| 4 | `start` | `pnpm --filter ./backend --filter ./frontend --parallel run start` | Start built production servers locally | Docs |
| 5 | `start:backend` | `pnpm --filter ./backend run start` | Start built backend server | Internal alias |
| 6 | `start:frontend` | `pnpm --filter ./frontend run start` | Start built frontend server | Internal alias |
| 7 | `build` | `pnpm run build:shared && pnpm run build:backend && pnpm run build:frontend` | Compile all packages in order | CI, Docs, README |
| 8 | `build:shared` | `pnpm --filter @haihire/shared run build` | Build shared TypeScript package | Called by `build` |
| 9 | `build:backend` | `pnpm --filter ./backend run build` | Build backend esbuild bundle | Called by `build`, Docs |
| 10 | `build:frontend` | `pnpm --filter ./frontend run build` | Build Next.js standalone application | Called by `build`, Docs |
| 11 | `lint` | `pnpm --filter ./backend --filter ./frontend --parallel run lint` | Run ESLint across packages | CI, README, Docs, `check-all.ts` |
| 12 | `lint:dtopipe` | `node --no-warnings --experimental-strip-types scripts/check-dtopipe-coverage.ts` | CI Gate 3: Validate DtoPipe coverage | CI, Docs, `check-all.ts` |
| 13 | `lint:error-i18n` | `tsx scripts/check-error-code-i18n.ts` | CI Gate 4: Validate error code translations | CI, Docs, `check-all.ts` |
| 14 | `lint:api-contract` | `tsx scripts/check-api-contract-coverage.ts` | CI Gate 5: Validate API contracts & zero leaks | CI, Docs, `check-all.ts` |
| 15 | `lint:prometheus-rules` | `tsx scripts/check-prometheus-rules.ts` | CI Gate 6: Validate Prometheus alert rules | CI, Docs, `check-all.ts` |
| 16 | `lint:tenant-scope` | `tsx scripts/check-tenant-scoping.ts` | CI Gate 10: Validate tenant query isolation | CI, Docs, `check-all.ts` |
| 17 | `lint:doc-links` | `tsx scripts/verify-doc-links.ts` | CI Gate 11: Validate markdown link integrity | CI, Docs, `check-all.ts` |
| 18 | `typecheck` | `pnpm run typecheck:backend && pnpm run typecheck:frontend` | Run TypeScript checking without emit | README, Docs, `check-all.ts` |
| 19 | `typecheck:backend` | `pnpm --filter ./backend run typecheck` | Backend TypeScript checking | Called by `typecheck` |
| 20 | `typecheck:frontend` | `pnpm --filter ./frontend run typecheck` | Frontend TypeScript checking | Called by `typecheck` |
| 21 | `test` | `pnpm --filter ./backend --filter ./frontend --parallel run test` | Run full test suite (563 tests) | CI, Husky, README, Docs |
| 22 | `test:coverage` | `pnpm --filter ./backend --filter ./frontend run test --coverage` | Run tests with coverage reports | Docs, CI references |
| 23 | `test:diff` | `node --no-warnings --experimental-strip-types scripts/check-test-count.ts` | Anti-regression test count audit | CI, Docs, `check-all.ts` |
| 24 | `test:verify` | `node --no-warnings --experimental-strip-types scripts/smoke-and-load-test.ts` | Smoke and load test runner | Docs |
| 25 | `test:backend` | `pnpm --filter ./backend run test` | Run backend tests only | Docs |
| 26 | `test:frontend` | `pnpm --filter ./frontend run test` | Run frontend tests only | Docs |
| 27 | `test:e2e` | `playwright test` | Run Playwright end-to-end tests | CI, README, Docs |
| 28 | `test:e2e:ui` | `playwright test --ui` | Run Playwright test runner with UI | Docs |
| 29 | `seed` | `pnpm --filter ./backend run seed` | Seed database with demo data | CI, README, Docs (Duplicate alias of `db:seed`) |
| 30 | `db:seed` | `pnpm --filter ./backend run seed` | Seed database | CI, Docs, canonical DB command |
| 31 | `db:update` | `pnpm --filter ./backend run db:update` | Apply schema updates via Prisma | CI, Docs, `db:setup` |
| 32 | `db:verify` | `pnpm --filter ./backend run db:verify` | Verify DB connectivity and schema | Docs |
| 33 | `db:backup` | `tsx scripts/backup-production.ts` | Production backup script | Docs |
| 34 | `db:setup` | `pnpm --filter ./backend run db:update && pnpm --filter ./backend run seed` | Update schema and seed demo data | README, Docs |
| 35 | `migration:status` | `pnpm --filter ./backend run migration:status` | Check Prisma migration status | Docs |
| 36 | `migration:plan` | `pnpm --filter ./backend run migration:plan` | Plan Prisma migration | **Zero references (Candidate dead script)** |
| 37 | `migrate` | `pnpm --filter ./backend run migrate` | Run Prisma database migration | Docs |
| 38 | `contract:emit` | `pnpm --filter ./backend run contract:emit` | Emit Prisma client contract | Docs |
| 39 | `check:i18n` | `pnpm --filter ./frontend run check:i18n` | Two-way i18n & zero hardcoded strings check | CI, Docs, `check-all.ts` |
| 40 | `check:env` | `node --no-warnings packages/shared/scripts/check-env.ts` | Legacy env key validator | **Superceded by `lint:env-sync`** |
| 41 | `lint:env-sync` | `tsx scripts/check-env-sync.ts` | CI Gate 1: Check environment synchronization | CI, Docs, `check-all.ts` |
| 42 | `check:all` | `tsx scripts/check-all.ts` | Run all CI architecture gates + tests | README, Docs |
| 43 | `check:all:fast` | `tsx scripts/check-all.ts --fast` | Run 11 CI architecture gates without tests | README, Docs, User Workflow |
| 44 | `check:all:e2e` | `tsx scripts/check-all.ts --e2e` | Run all gates + Playwright E2E | Docs |
| 45 | `docker:up` | `docker compose --profile app up -d` | Start full app via Docker Compose | **Redundant with `docker:infra:up`** |
| 46 | `docker:up:build` | `docker compose --profile app up -d --build` | Build and start Docker containers | **Zero references (Candidate dead script)** |
| 47 | `docker:down` | `docker compose --profile app down` | Stop app containers | **Redundant with `docker:infra:down`** |
| 48 | `docker:logs` | `docker compose --profile app logs -f` | Tail app container logs | **Redundant with `docker:infra:logs`** |
| 49 | `docker:prod:up` | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` | Start production stack | CI, README, Docs |
| 50 | `docker:prod:down` | `docker compose --env-file .env.production -f docker-compose.prod.yml down` | Stop production stack | Docs |
| 51 | `docker:prod:config` | `docker compose --env-file .env.production -f docker-compose.prod.yml config` | Validate production Compose file | README, Docs |
| 52 | `docker:infra:up` | `docker compose up -d` | Start local dev backing services | README, Docs |
| 53 | `docker:infra:down` | `docker compose down` | Stop local dev backing services | Docs |
| 54 | `docker:infra:logs` | `docker compose logs -f` | Tail dev backing service logs | Docs |
| 55 | `version:sync` | `tsx scripts/sync-version.ts` | Synchronize versions across packages | Docs |
| 56 | `version:bump` | `tsx scripts/bump-version.ts` | Bump platform release version | Docs |
| 57 | `prepare` | `husky` | Initialize Husky git hooks | Standard NPM lifecycle hook |

### 3.2 Backend [`backend/package.json`](../../backend/package.json) (22 Scripts)

| # | Script Name | Command | Purpose | Reference Sources |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `build` | `esbuild src/main.ts --bundle ...` | Bundle NestJS server | Called by root `build:backend` |
| 2 | `composer:deploy` | `prisma deploy module.ts` | Legacy Prisma Composer deploy | **Zero external references (Dead script)** |
| 3 | `composer:dev` | `prisma dev module.ts` | Legacy Prisma Composer dev | **Zero external references (Dead script)** |
| 4 | `contract:emit` | `prisma contract emit` | Emit Prisma schema contract | Root `contract:emit` |
| 5 | `db:init` | `prisma db init` | Initialize Prisma DB | **Zero external references (Dead script)** |
| 6 | `db:update` | `prisma db update` | Update database schema | Root `db:update`, CI |
| 7 | `db:verify` | `prisma db verify` | Verify database schema | Root `db:verify` |
| 8 | `deploy` | `pnpm run build && pnpm run composer:deploy` | Deploy command | **Zero external references (Dead script)** |
| 9 | `dev` | `node --import tsx --watch --watch-path=src src/main.ts` | Run NestJS in watch mode | Root `dev` |
| 10 | `seed` | `node --import tsx src/prisma/seed.ts` | Seed database | Root `seed`, root `db:seed` |
| 11 | `db:seed` | `node --import tsx src/prisma/seed.ts` | Seed database | Root `db:seed` (Duplicate alias) |
| 12 | `dev:composer` | `pnpm run build && pnpm run composer:dev` | Legacy Composer development | **Zero external references (Dead script)** |
| 13 | `lint` | `eslint . && tsc --noEmit` | Lint and typecheck backend | Root `lint` |
| 14 | `typecheck` | `tsc --noEmit` | Typecheck backend | Root `typecheck:backend` |
| 15 | `migrate` | `prisma db migrate` | Run Prisma migrations | Root `migrate` |
| 16 | `migration:plan` | `prisma migration plan` | Plan Prisma migrations | Root `migration:plan` |
| 17 | `migration:show` | `prisma migration show` | Show Prisma migrations | **Zero external references (Dead script)** |
| 18 | `migration:status` | `prisma migration status` | Show migration status | Root `migration:status` |
| 19 | `skills:sync` | `prisma skills sync \|\| exit 0` | Sync Prisma skills | **Zero external references (Dead script)** |
| 20 | `start` | `node dist/server.mjs` | Run compiled backend server | Root `start:backend` |
| 21 | `test` | `vitest run` | Run Vitest backend tests | Root `test` |
| 22 | `postinstall` | `prisma skills sync \|\| exit 0` | Postinstall hook | Lifecycle hook (Safe to prune if obsolete) |

### 3.3 Frontend [`frontend/package.json`](../../frontend/package.json) (7 Scripts)

| # | Script Name | Command | Purpose | Reference Sources |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `dev` | `node scripts/dev.ts` | Start dev orchestrator (wait for backend + Next.js) | Root `dev` |
| 2 | `build` | `next build` | Next.js production build | Root `build:frontend` |
| 3 | `start` | `next start` | Run Next.js production server | Root `start:frontend` |
| 4 | `lint` | `eslint .` | Lint frontend codebase | Root `lint` |
| 5 | `typecheck` | `tsc --noEmit` | Typecheck frontend codebase | Root `typecheck:frontend` |
| 6 | `test` | `vitest run` | Run Vitest frontend tests | Root `test` |
| 7 | `check:i18n` | `node scripts/check-i18n.ts` | Validate translation dictionaries | Root `check:i18n`, CI Gate |

---

### 3.4 Cross-File Duplicate & Delegation Analysis

| Script Name | Root | Backend | Frontend | Delegation Architecture & Assessment |
| :--- | :---: | :---: | :---: | :--- |
| `dev` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root delegates to both packages in parallel (`--parallel run dev`). |
| `build` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root coordinates topological sequence (`build:shared` -> `build:backend` -> `build:frontend`). |
| `start` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root delegates to both servers in parallel. |
| `lint` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root runs linter concurrently across workspaces. |
| `typecheck` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root calls individual package typechecks. |
| `test` | ✅ | ✅ | ✅ | **Standard Monorepo Pattern:** Root delegates to both test suites. |
| `seed` & `db:seed` | ✅ | ✅ | ❌ | **Duplicate Alias:** `seed` and `db:seed` are identical in root and backend. Root should standardize on `db:seed` and provide `seed` as a backward-compatible alias. |
| `db:update` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `db:verify` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `migrate` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `migration:status` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `migration:plan` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `contract:emit` | ✅ | ✅ | ❌ | Root delegates to backend Prisma command. |
| `check:i18n` | ✅ | ❌ | ✅ | Root delegates to frontend verification script. |

---

### 3.5 Dead & Obsolete Scripts Inventory

Scripts that have zero references in CI workflows, Husky hooks, active documentation, or other scripts, representing dead technical debt:

| Script Name | Location | Root Cause / Reason for Obsolescence | Recommended Action |
| :--- | :--- | :--- | :--- |
| `composer:deploy` | `backend/package.json` | Leftover from early Prisma Composer / Cloud prototype. | **Remove in Phase 2** |
| `composer:dev` | `backend/package.json` | Leftover from early Prisma Composer prototype. | **Remove in Phase 2** |
| `dev:composer` | `backend/package.json` | Leftover from early Prisma Composer prototype. | **Remove in Phase 2** |
| `deploy` | `backend/package.json` | Calls `composer:deploy` which is obsolete. | **Remove in Phase 2** |
| `db:init` | `backend/package.json` | Replaced by `db:update` / `db:setup`. | **Remove in Phase 2** |
| `migration:show` | `backend/package.json` | Unused Prisma CLI shortcut. | **Remove in Phase 2** |
| `skills:sync` | `backend/package.json` | Experimental Prisma feature, no longer part of workflow. | **Remove in Phase 2** |
| `postinstall` | `backend/package.json` | Calls `prisma skills sync \|\| exit 0`. Redundant overhead on every install. | **Remove in Phase 2** |
| `migration:plan` | `package.json` & `backend/package.json` | Never used in CI or dev runbooks. | **Retain or prune** |
| `check:env` | `package.json` | Legacy shared script replaced by `lint:env-sync` in Task #11. | **Deprecate / Remove** |
| `docker:up:build` | `package.json` | Rarely used; conflicts with `docker:infra:up`. | **Consolidate** |

---

### 3.6 Inconsistent Naming Conventions

1. **Prefix Inconsistency (`check:` vs `lint:`):**
   - CI Gate 1 is named `lint:env-sync` (in `package.json`), but CI Gate 2 is named `check:i18n`.
   - CI Gates 3, 4, 5, 6, 10, 11 use the `lint:*` prefix (`lint:dtopipe`, `lint:error-i18n`, `lint:api-contract`, `lint:prometheus-rules`, `lint:tenant-scope`, `lint:doc-links`).
   - Meta-verifiers use `check:*` (`check:all`, `check:all:fast`, `check:all:e2e`).
   - *Inconsistency:* `check:i18n` breaks the pattern of specific static verification gates using `lint:*`.
2. **Database Command Inconsistency:**
   - Database operations use mixed prefixes: `seed` vs `db:seed`, `db:update` vs `migrate`, `migration:status` vs `db:verify`.
3. **Docker Environment Inconsistency:**
   - `docker:up`, `docker:down`, `docker:logs` (use `--profile app`) vs `docker:infra:up`, `docker:infra:down` (use infra only) vs `docker:prod:up` (use production compose).
   - Having both `docker:up` and `docker:infra:up` causes developer confusion regarding whether application containers or only backing services are being started.

---

## 4. Part C: Naming Convention & Grouping Proposal

### 4.1 Industry Standard Naming Convention

Format: `<category>:<subcategory>:<variant>`
- **Categories:** `dev`, `build`, `start`, `test`, `lint`, `typecheck`, `check`, `db`, `docker`, `version`, `clean`
- **Subcategories:** `backend`, `frontend`, `shared`, `infra`, `prod`, `all`
- **Variants:** `fast`, `full`, `e2e`, `coverage`, `watch`, `ui`

**Standardization Rules:**
1. **No CamelCase or Underscores:** Use strict kebab-case for words within segments.
2. **Colon Delimiter:** Separate category hierarchy exclusively with `:`.
3. **Category First:** The functional category (`test:`, `lint:`, `db:`) must always appear in the leading position.

### 4.2 Grouping Syntax Proposal

Because standard JSON does not support comments, scripts will be organized using category separator keys:
```json
{
  "scripts": {
    "// ===== DEV & START =====": "",
    "dev": "...",
    "dev:backend": "...",
    "// ===== BUILD & COMPILE =====": "",
    "build": "...",
    "// ===== QUALITY & CI GATES =====": "",
    "lint": "...",
    "// ===== TESTING =====": "",
    "test": "...",
    "// ===== DATABASE =====": "",
    "db:setup": "...",
    "// ===== DOCKER & INFRA =====": "",
    "docker:infra:up": "...",
    "// ===== REPO UTILITIES =====": "",
    "version:sync": "..."
  }
}
```

---

## 5. Part D: Target Scripts List Proposal

### 5.1 Root [`package.json`](../../package.json) Target (Streamlined to 42 Scripts)

```json
{
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
    "db:seed": "pnpm --filter ./backend run db:seed",
    "db:verify": "pnpm --filter ./backend run db:verify",
    "db:backup": "tsx scripts/backup-production.ts",
    "db:status": "pnpm --filter ./backend run db:status",

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
    "prepare": "husky",

    "// ===== BACKWARD-COMPATIBILITY ALIASES (DEPRECATED) =====": "",
    "check:i18n": "pnpm run lint:i18n",
    "seed": "pnpm run db:seed",
    "migrate": "pnpm run db:update"
  }
}
```

### 5.2 Backend [`backend/package.json`](../../backend/package.json) Target (Streamlined to 11 Scripts)

```json
{
  "scripts": {
    "dev": "node --import tsx --watch --watch-path=src src/main.ts",
    "build": "esbuild src/main.ts --bundle --platform=node --format=esm --outfile=dist/server.mjs --banner:js=\"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);\" --packages=external --alias:@haihire/shared=../packages/shared/src/index.ts",
    "start": "node dist/server.mjs",
    "lint": "eslint . && tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:update": "prisma db update",
    "db:seed": "node --import tsx src/prisma/seed.ts",
    "db:verify": "prisma db verify",
    "db:status": "prisma migration status",
    "seed": "pnpm run db:seed"
  }
}
```

### 5.3 Frontend [`frontend/package.json`](../../frontend/package.json) Target (Streamlined to 7 Scripts)

```json
{
  "scripts": {
    "dev": "node scripts/dev.ts",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint:i18n": "node scripts/check-i18n.ts",
    "check:i18n": "node scripts/check-i18n.ts"
  }
}
```

---

## 6. Part E: Migration Strategy

### 6.1 Breaking Change Impact Matrix

If script names are renamed or deprecated, the following locations will be affected:

| Renamed / Deprecated Script | Replacement | Affected Reference Locations |
| :--- | :--- | :--- |
| `check:i18n` | `lint:i18n` | `.github/workflows/ci-cd.yml:131`, `scripts/check-all.ts:50`, `docs/PROJECT_METRICS.md`, `README.md` |
| `seed` | `db:seed` | `.github/workflows/ci-cd.yml:368`, `README.md`, `docs/onboarding.md` |
| `migrate` | `db:update` | `docs/onboarding.md`, `docs/runbooks/env-management.md` |
| `migration:status` | `db:status` | `docs/runbooks/env-management.md` |
| `check:env` | *(Removed)* | `docs/runbooks/env-management.md` (Already superseded by `lint:env-sync`) |
| `docker:up` | `docker:infra:up` | `docs/runbooks/` |

### 6.2 Migration Approach: Deprecation Path (Recommended)

Rather than a "Big Bang" breaking change, a **two-phase Deprecation Path** is strongly recommended:
1. **Phase 2 Implementation:**
   - Remove strictly dead scripts (`composer:*`, `deploy`, `skills:sync`, `postinstall`, `db:init`).
   - Standardize target scripts in backend, frontend, and root `package.json`.
   - Maintain backward-compatible aliases in root `package.json` (`check:i18n`, `seed`, `migrate`).
   - Update CI workflow ([`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)), [`scripts/check-all.ts`](../../scripts/check-all.ts), and [`README.md`](../../README.md) to use the new canonical names.
2. **Post-Release / Sprint v1.1.0:**
   - Remove the deprecated aliases after developer habits adapt.

### 6.3 Verification Plan for Phase 2

1. Verify `DEP0190` elimination: Run `pnpm dev` and ensure zero deprecation warnings appear in console output.
2. Run `pnpm lint:env-sync` to verify root script synchronization.
3. Run `pnpm check:all:fast` to confirm 11/11 architecture gates pass.
4. Run `pnpm test` to verify 563/563 tests pass.
5. Run `pnpm build` to verify clean compilation across shared, backend, and frontend.
6. Verify Husky pre-commit hook runs smoothly with standardized commands.

---

## 7. Part F: Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **CI workflow breaks due to missing script** | Medium | Critical | Retain backward-compatible aliases (`check:i18n`, `seed`) and update CI workflow in the exact same commit. |
| **Husky hook failure** | Low | High | `.husky/pre-commit` calls `pnpm test`, which remains identical and unchanged. |
| **Developer workflow disruption** | Medium | Medium | Aliases allow developers to continue running `pnpm seed` or `pnpm check:all:fast` without retraining. |
| **Next.js dev server startup regression on Windows** | Low | High | Validate Option B with explicit smoke testing on local Windows PowerShell environment before committing. |
| **Prisma schema migration failure after dead script removal** | Low | Critical | Retain `db:update` (`prisma db update`), `db:verify`, and `db:seed`. Only remove unused `composer:*` and `skills:sync` artifacts. |

---

## 8. Questions for DeepSeek & Project Lead

1. **DEP0190 Fix Strategy:** Do you approve **Option B** (Single String Command with `shell: true`), or do you prefer **Option A** (`process.platform === "win32" ? "pnpm.cmd" : "pnpm"` with `shell: false`)?
2. **CI Gate Naming Alignment:** Should Gate 2 be officially renamed from `check:i18n` to `lint:i18n` to match the `lint:*` convention of all other static gates (with `check:i18n` retained as an alias)?
3. **Dead Script Purge:** Do you approve immediate deletion of obsolete Prisma Composer/Alchemy scripts (`composer:deploy`, `composer:dev`, `dev:composer`, `deploy`, `skills:sync`, `postinstall`, `db:init`) from `backend/package.json`?
4. **Database Command Consolidation:** Do you approve consolidating database operations under the `db:*` prefix (`db:setup`, `db:update`, `db:seed`, `db:verify`, `db:status`), deprecating loose root scripts like `seed` and `migrate`?
