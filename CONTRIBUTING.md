# Contributing to HaiHire

Thank you for contributing to the HaiHire Enterprise ATS platform. To maintain enterprise-grade software standards, security, and stability, all contributors must adhere to the conventions and quality gates outlined below.

---

## 🌿 Branch Naming Conventions

Always branch off the primary integration branch (`feature/production-hardening` or `main` depending on current milestone). Use the following naming format:

| Type | Pattern | Example |
| :--- | :--- | :--- |
| **New Feature** | `feature/[task-slug]` | `feature/candidate-scorecards` |
| **Bug Fix** | `fix/[bug-slug]` | `fix/minio-upload-timeout` |
| **Refactoring** | `refactor/[task-slug]` | `refactor/modular-api-client` |
| **Performance** | `perf/[task-slug]` | `perf/rsc-job-queries` |
| **Documentation** | `docs/[task-slug]` | `docs/architecture-overview` |

---

## Branch Strategy

HaiHire uses a 3-branch environment flow:

- **dev**: Active development. Feature branches merge here.
- **staging**: Pre-production validation. QA and UAT happen here.
- **main**: Production-ready. Tag releases here.

### Feature Development Flow

1. Create feature branch from dev:
   ```bash
   git checkout dev
   git pull
   git checkout -b feat/your-feature
   ```

2. Make changes, commit, push.

3. Open PR: `feat/your-feature` -> `dev`.
   - Requires 1 review.
   - Requires `check:all:fast` pass.

4. After approval, merge to `dev`.

5. When ready for QA, PR `dev` -> `staging`.
   - Requires full CI pass.
   - Wait 3+ days after last merge.

6. After QA approval, PR `staging` -> `main`.
   - Requires 2 reviews.
   - Tag version: `git tag -a vX.Y.Z -m "..."`

### Hotfix Flow

For critical production bugs:

1. Create hotfix branch from main:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/fix-critical
   ```

2. Fix the bug, test locally.

3. Open PR: `hotfix/fix-critical` -> `main` (fast-track).
   - Requires 1 review (urgency).

4. Merge to `main`, tag patch version:
   ```bash
   git tag -a vX.Y.Z+1 -m "Hotfix: ..."
   ```

5. Also merge to dev to keep in sync:
   ```bash
   git checkout dev
   git merge hotfix/fix-critical
   ```

### Branch Protection Rules

| Branch | PR Required | Reviews | Status Checks |
|---|---|---|---|
| dev | Yes | 1 | check:all:fast |
| staging | Yes | 1 | check:all + E2E |
| main | Yes | 2 | check:all + E2E + Security |

---

## 📝 Commit Conventions

HaiHire enforces [Conventional Commits](https://www.conventionalcommits.org/) via Husky and Commitlint hooks:

### Commit Message Format
```
type(scope): description
```

### Commit Types
- **`feat`**: A new user-facing feature or capability
- **`fix`**: A bug fix
- **`refactor`**: Code restructuring without changing functionality
- **`perf`**: A performance optimization
- **`test`**: Adding or updating tests
- **`docs`**: Documentation updates only
- **`chore`**: Maintenance, build tooling, dependency updates
- **`style`**: Formatting or linting adjustments (no production code logic changes)

### Scope (Mandatory)
Scope must pinpoint the affected subsystem:
`auth`, `jobs`, `candidates`, `applications`, `interviews`, `email`, `sourcing`, `minio`, `prisma`, `i18n`, `config`, `ui`, `core`, `scripts`.

### Rules
- Description must be in **English only**, written in **lowercase**, with **no trailing period**.
- *Example (Correct):* `feat(auth): implement httponly cookie refresh rotation`
- *Example (Incorrect):* `Feat: Added auth cookie.` (uppercase, missing scope, trailing period)

### Staging Rules
When preparing commits, stage files completely:
```bash
git add .
git commit -m "feat(jobs): add multi-channel sourcing tracker"
```
*(Never chain `git add . && git commit` in Windows PowerShell; run commands individually).*

---

## 🛡️ The 11 CI Architecture Gates

Before submitting any Pull Request or merging code, all 11 automated CI verification gates must pass:

```bash
# Execute the complete quality pipeline:
pnpm check:all

# For quick static checks before running test suites:
pnpm check:all:fast

# To include Playwright E2E browser tests:
pnpm check:all:e2e
```

| Gate | Command | Description |
| :---: | :--- | :--- |
| **Gate 1** | `pnpm lint:env-sync` | Audits key parity across all 5 `.env` files and Docker Compose |
| **Gate 2** | `pnpm lint:i18n` | Asserts two-way i18n dictionary completeness & zero hardcoded strings |
| **Gate 3** | `pnpm lint` | ESLint rules & static checks across backend and frontend |
| **Gate 4** | `pnpm typecheck` | Strict TypeScript compiler check (`tsc --noEmit`) |
| **Gate 5** | `pnpm lint:dtopipe` | Verifies 100% `@Body()` controller parameters use `DtoPipe` validation |
| **Gate 6** | `pnpm lint:error-i18n` | Verifies 100% `APP_ERROR_CODES` (51 codes) are localized in `vi.ts` & `en.ts` |
| **Gate 7** | `pnpm lint:api-contract` | Audits 83 endpoints, zero `JSON.stringify(err)` leaks, zero `alert()` calls |
| **Gate 8** | `pnpm lint:prometheus-rules` | Verifies 14 Prometheus alert rules syntax, fields, and SRE labels |
| **Gate 9** | `pnpm lint:tenant-scope` | AST static analysis enforcing query isolation across tenant-scoped modules |
| **Gate 10** | `pnpm lint:doc-links` | Verifies zero broken markdown links across all documentation |
| **Gate 11** | `pnpm test:diff` | Audits test count changes against git history to detect test regression |

> **Unit & Integration Test Suite:** All 11 architecture gates are followed by the automated test suite (`pnpm test`), executing all 563 tests across backend and frontend packages.  
> Refer to [Project Metrics (Single Source of Truth)](docs/PROJECT_METRICS.md) for live metrics.

---

## 🏗️ Core Engineering Conventions

1. **100% Pure TypeScript:**
   - No manually written `.js` or `.mjs` files (except tooling configs like `eslint.config.mjs`).
   - Zero `any` policy across application code. Define explicit interfaces or Zod schemas.
2. **Environment Variable Hygiene:**
   - Never call `process.env` directly in feature modules. Always import the validated `env` singleton (`backend/src/config/env.ts` or `frontend/src/lib/env.ts`).
   - Zero fallback policy: Never provide fallback defaults for credentials, database URLs, or ports.
3. **Internationalization (i18n):**
   - Zero hardcoded text in frontend components. All UI copy must use `useI18n()` / `t("key.path")` with keys defined in `frontend/src/i18n/types.ts`.
4. **Security Baseline:**
   - Store JWT tokens exclusively in secure HttpOnly cookies (`SameSite=Lax`, `Path=/`, `Secure`).
   - Upload all CV files to isolated tenant paths: `tenants/{orgId}/candidates/{candId}/{uuid}-{fileName}`.
   - PII scrubbing: Never log raw passwords, tokens, or resume text in application logs.
5. **Database & Saga Transactions:**
   - Multi-step relational writes must use `prisma.$transaction` or `executeTx`.
   - Dual-resource workflows (PostgreSQL + MinIO) must implement Saga compensations with BullMQ DLQ fallback.
6. **Package Manager:**
   - Always use `pnpm` (version 12.x) or `pnpx`. Never use `npx` or `corepack enable`.

---

## 📦 Version Management & Release Process

HaiHire maintains lockstep version alignment across all packages (`package.json`, `backend`, `frontend`, `packages/shared`).

### Bumping Versions
Use the dedicated automation scripts to bump and synchronize versions:
```bash
# Preview SemVer bump
pnpm version:bump patch --dry-run
pnpm version:bump minor --dry-run
pnpm version:bump major --dry-run

# Execute SemVer bump across all 4 manifests
pnpm version:bump patch

# Synchronize manifests if version drift occurred
pnpm version:sync
```

### Creating Releases & Publishing Containers
1. Bump version and create Git tag:
   ```bash
   pnpm version:bump patch --tag
   ```
2. Update [`CHANGELOG.md`](CHANGELOG.md) with release notes.
3. Push commit and tag:
   ```bash
   git push origin main
   git push origin v1.0.1
   ```
4. GitHub Actions will automatically verify tests, build multi-stage Docker images, push immutable images to GitHub Container Registry (GHCR), and publish a GitHub Release.

For comprehensive details, refer to [`docs/runbooks/versioning.md`](docs/runbooks/versioning.md).

---

## 🚀 Pull Request Checklist

When opening a Pull Request:
- [ ] Created dedicated feature branch (`feature/*`, `fix/*`).
- [ ] Ran `pnpm check:all` locally and verified all 11 gates passed.
- [ ] All new features include unit/integration tests (`pnpm test`).
- [ ] No broken markdown links or outdated documentation.
- [ ] Verified non-leakage of secrets or `.env` files.

