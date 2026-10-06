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

## 🛡️ The 7 CI Quality Gates

Before submitting any Pull Request or merging code, all 7 automated CI verification gates must pass:

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
| **Gate 1** | `pnpm lint` | ESLint rules & static checks across backend and frontend |
| **Gate 2** | `pnpm typecheck` | Strict TypeScript compiler check (`tsc --noEmit`) |
| **Gate 3** | `pnpm lint:dtopipe` | Verifies 100% `@Body()` controller parameters use `DtoPipe` validation |
| **Gate 4** | `pnpm lint:error-i18n` | Verifies 100% `APP_ERROR_CODES` are localized in `vi.ts` & `en.ts` |
| **Gate 5** | `pnpm lint:api-contract` | Ensures zero `JSON.stringify(err)` leaks and zero `alert()` calls |
| **Gate 6** | `pnpm lint:env-sync` | Audits key parity across all 5 `.env` files and Docker Compose |
| **Gate 7** | `pnpm test` | Executes all 379 backend and frontend unit/integration tests |

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
2. Update [`CHANGELOG.md`](file:///c:/Workspaces/haihire/CHANGELOG.md) with release notes.
3. Push commit and tag:
   ```bash
   git push origin main
   git push origin v1.0.1
   ```
4. GitHub Actions will automatically verify tests, build multi-stage Docker images, push immutable images to GitHub Container Registry (GHCR), and publish a GitHub Release.

For comprehensive details, refer to [`docs/runbooks/versioning.md`](file:///c:/Workspaces/haihire/docs/runbooks/versioning.md).

---

## 🚀 Pull Request Checklist

When opening a Pull Request:
- [ ] Created dedicated feature branch (`feature/*`, `fix/*`).
- [ ] Ran `pnpm check:all` locally and verified all 7 gates passed.
- [ ] All new features include unit/integration tests (`pnpm test`).
- [ ] No broken markdown links or outdated documentation.
- [ ] Verified non-leakage of secrets or `.env` files.

