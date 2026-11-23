# Branch Protection & Promotion Policy

HaiHire enforces progressive verification gates across branches before production tagged releases.

---

## 1. Branch Topology

- `feature/*` / `fix/*` -> **PR into `dev`** (gated by `.github/workflows/ci-dev.yml`)
- `dev` -> **PR into `main`** (gated by `.github/workflows/ci-main.yml`; optional short-lived `release/v*` branch when a release freeze is needed)
- Tagged releases `v*.*.*` on `main` -> `.github/workflows/cd-release.yml`

---

## 2. Required Rules for `dev` and `main`

1. **Disallow Direct Pushes & Force Pushes:** All changes enter via Pull Requests.
2. **Require Required Status Checks:**
   - **`dev` (`.github/workflows/ci-dev.yml`):** `15 CI Architecture Gates`, `Full Unit Tests & Anti-Regression`
   - **`main` (`.github/workflows/ci-main.yml`):** `Full CI Quality Pipeline`, `Playwright End-to-End Suite`, `Dependency Security Audit`, `Docker Build Dry-Run Verification`
   - Coverage includes environment/secret template parity (`pnpm lint:env-sync`), two-way i18n and error code localization (`pnpm lint:i18n`, `pnpm lint:error-i18n`), multi-tenant query isolation & DTO pipe gates (`pnpm lint:tenant-scope`, `pnpm lint:dtopipe`), documentation link & sync checks (`pnpm lint:doc-links`, `pnpm lint:doc-sync`), ESLint, TypeScript 6, Vitest suites, anti-regression test count check (`pnpm test:diff`), Playwright E2E, and production container builds (`dist/server.mjs` & `.next/standalone`)
3. **Commit Discipline:** Conventional Commits validated locally by Husky `commit-msg` hook (`commitlint`).
4. **Action Pinning Compliance:** Workflows must keep pinned action major versions compliant with [scripts/check-github-action-versions.ts](../../scripts/check-github-action-versions.ts).
