# CI/CD Workflows & Architecture Gates

All continuous integration and delivery pipelines reside in `.github/workflows/` and delegate quality enforcement to [scripts/check-all.ts](../../scripts/check-all.ts).

---

## 1. GitHub Actions Inventory (`7` Workflows)

| Workflow File                           | Trigger Scope                         | Core Responsibilities                                                                                                    |
| :-------------------------------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci-feature.yml`      | PRs & pushes on feature branches      | Fast lint, typecheck, unit tests, static gates                                                                           |
| `.github/workflows/ci-dev.yml`          | Merges / PRs to `dev`                 | Workspace static checks, unit tests, build verification                                                                  |
| `.github/workflows/ci-staging.yml`      | PRs to `staging`                      | Full static suite, Postgres/Valkey service integration, build                                                            |
| `.github/workflows/ci-main.yml`         | PRs to `main` (production gatekeeper) | Full architectural, security, test, and build gate (`fetch-depth: 0` for `test:diff`)                                    |
| `.github/workflows/cd-release.yml`      | Version tags / release triggers       | Builds Docker images (`api` & `web`), runs Trivy scans uploading `trivy-api-results.sarif` and `trivy-web-results.sarif` |
| `.github/workflows/e2e-weekly.yml`      | Weekly schedule / manual              | Runs Playwright Chromium E2E suite (`apps/web/tests/e2e/`)                                                               |
| `.github/workflows/security-weekly.yml` | Weekly schedule / manual              | Dependency & security posture audits                                                                                     |

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
