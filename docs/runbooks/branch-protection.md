# Branch Protection & Promotion Policy

HaiHire enforces progressive verification gates across branches before production tagged releases.

---

## 1. Branch Topology

- `feature/*` / `fix/*` -> **PR into `dev`** (gated by `.github/workflows/ci-feature.yml` and `.github/workflows/ci-dev.yml`)
- `dev` -> **PR into `staging`** (gated by `.github/workflows/ci-staging.yml`)
- `staging` -> **PR into `main`** (gated by `.github/workflows/ci-main.yml`)
- Tagged releases `v*.*.*` on `main` -> `.github/workflows/cd-release.yml`

---

## 2. Required Rules for `dev`, `staging`, and `main`

1. **Disallow Direct Pushes & Force Pushes:** All changes enter via Pull Requests.
2. **Require Up-to-Date Status Checks (`ci-main.yml` / `ci-staging.yml` / `ci-dev.yml`):**
   - Environment & secret template parity (`pnpm lint:env-sync`)
   - Two-way i18n and error code localization (`pnpm lint:i18n`, `pnpm lint:error-i18n`)
   - Multi-tenant query isolation & DTO pipe gates (`pnpm lint:tenant-scope`, `pnpm lint:dtopipe`)
   - Documentation link & sync checks (`pnpm lint:doc-links`, `pnpm lint:doc-sync`)
   - ESLint, TypeScript 6, Vitest suites, anti-regression test count check (`pnpm test:diff`), and full production builds (`dist/server.mjs` & `.next/standalone`)
3. **Commit Discipline:** Conventional Commits validated locally by Husky `commit-msg` hook (`commitlint`).
4. **Action Pinning Compliance:** Workflows must keep pinned action major versions compliant with [scripts/check-github-action-versions.ts](../../scripts/check-github-action-versions.ts).
