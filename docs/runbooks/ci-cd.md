# CI/CD Workflows & Architecture Gates

All continuous integration and delivery pipelines reside in `.github/workflows/` (backed by shared composite actions under `.github/actions/`) and delegate quality enforcement to [scripts/check-all.ts](../../scripts/check-all.ts).

---

## 1. GitHub Actions Inventory (`5` Workflows + `2` Composite Actions)

| Workflow / Action Path                  | Trigger / Scope                       | Core Responsibilities                                                                                                    |
| :-------------------------------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci-dev.yml`          | PRs & pushes to `dev`                 | 15 fast architecture gates, Postgres/Valkey unit & integration tests, conditional Dockerfile dry-run, docs-only checks   |
| `.github/workflows/ci-main.yml`         | PRs to `main` (production gatekeeper) | Full `check:all`, Playwright E2E suite, `pnpm audit`, and backend/frontend Docker dry-run verification                   |
| `.github/workflows/cd-release.yml`      | Version tags (`v*.*.*`) / manual      | Builds Docker images (`api` & `web`), runs Trivy scans uploading `trivy-api-results.sarif` and `trivy-web-results.sarif` |
| `.github/workflows/e2e-weekly.yml`      | Weekly schedule (`dev`) / manual      | Runs Playwright Chromium E2E suite (`apps/web/tests/e2e/`)                                                               |
| `.github/workflows/security-weekly.yml` | Weekly schedule / manual              | Dependency & tenant-isolation security posture sweeps                                                                    |
| `.github/actions/setup-workspace`       | Shared composite action               | Installs Node 26 + pinned `pnpm@12.18.0`, caches pnpm store, and runs `pnpm install --frozen-lockfile`                   |
| `.github/actions/setup-e2e`             | Shared composite action               | Configures test env, boots MinIO/Valkey, migrates & seeds DB, installs Chromium, builds apps, and starts services        |

---

## 2. Local Execution of All 18 CI Gates

```bash
pnpm check:all       # Runs 17 static/unit/build gates + configured E2E gate
pnpm check:all:fast  # Static architecture gates (env, i18n, dtopipe, tenant-scope, doc-sync, etc.)
pnpm check:all:e2e   # Explicitly enables Playwright E2E step
```

Every GitHub Action version in `.github/workflows/` is audited automatically by [scripts/check-github-action-versions.ts](../../scripts/check-github-action-versions.ts) (`pnpm lint:github-action-versions`).

---

## 3. Troubleshooting Failed CI Runs

- **`lint:doc-sync` / `lint:doc-links`:** Run locally after editing markdown files; verify no nonexistent `apps/...` or `docs/...` paths exist outside fenced code blocks and run `pnpm docs:stats:write`.
- **`test:diff`:** Ensure CI checkout uses `fetch-depth: 0` and verify tests were not accidentally removed without `ALLOW_TEST_DELETION=true`.
- **`check:prod-email-provider`:** Never configure `SYSTEM_EMAIL_PROVIDER=SIMULATED` in `.env.production.example` or production manifests.
