---
name: haihire-devops-release
description: Governs HaiHire pnpm 12 monorepo tooling, Turborepo pipelines, Node 26 Docker standalone images, 18 CI architecture gates, documentation sync, and GitHub Actions release workflows. Use when editing CI workflows, Dockerfiles, root scripts, env vars, or docs in HaiHire.
---

# HaiHire DevOps, CI Gates & Release Engineering Skill

Stack baselines verified in `package.json`, `pnpm-workspace.yaml`, `scripts/check-all.ts`, and `.github/workflows/`:
- **Package Manager**: `pnpm@12.18.0` with workspace catalog (`typescript@^6.0.3`, `vitest@5.1.0`, `eslint@^10.14.0`, `prettier@^3.9.10`, `zod@^4.6.7`, `@types/node@^26.6.6`, `tsx@^4.23.15`) and `minimumReleaseAge: 1440`
- **Build Orchestrator**: `turbo@^2.11.10`, `node:26-alpine` containers (`apps/api/Dockerfile`, `apps/web/Dockerfile`)
- **Verification**: `pnpm check:all` (`scripts/check-all.ts` running **18 CI gates**)
- **Workflows**: `.github/workflows/{ci-feature,ci-dev,ci-staging,ci-main,cd-release,e2e-weekly,security-weekly}.yml`

---

## 1. Mandatory 18 CI Architecture Gates (`pnpm check:all`)

Never consider a non-trivial task complete until the applicable gates (and before release/PR merge, all gates in `scripts/check-all.ts`) pass:
1. `lint:env-sync`: 100% parity between `.env.example`, `apps/api/src/config/env.ts`, and `apps/web/src/lib/env.ts` (`55` env keys).
2. `lint:i18n`: 2-way `vi.ts` / `en.ts` dictionary parity + zero hardcoded JSX strings.
3. `lint`: ESLint across `api`, `web`, and `shared`.
4. `typecheck`: `tsc --noEmit` across workspaces.
5. `lint:dtopipe`: 100% `DtoPipe(...)` validation coverage on backend route params/bodies/queries.
6. `lint:error-i18n`: Every `APP_ERROR_CODES` key localized in both `en.ts` and `vi.ts`.
7. `lint:api-contract`: API endpoint contract & leak audit.
8. `lint:prometheus-rules`: Monitoring & Prometheus alert rule schema audit.
9. `lint:tenant-scope`: Static tenant isolation audit across all 8 tenant-scoped backend modules (`0` unsafe queries).
10. `lint:doc-links`: Markdown relative-link audit across `docs/`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and package `README.md` files (rejects `file://` links, `\`, and dead targets).
11. `lint:doc-sync`: Checks that all code-path references outside code blocks exist on disk, core env vars (`JWT_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_HOST`, `MINIO_ENDPOINT`, `CORS_ORIGIN`) are documented, and `README.md` + `AGENTS.md` `<!-- STATS:START -->` blocks match `collectRepoStats()`.
12. `check:prod-email-provider`: Rejects `SIMULATED` email provider in production configs.
13. `test:diff`: Fails if net test count shrinks (`netNew < 0`) unless `ALLOW_TEST_DELETION=true`.
14. `lint:nextjs-conventions`: Enforces Next.js 16 `src/proxy.ts` and forbids `middleware.ts`.
15. `lint:github-action-versions`: Enforces minimum pinned major versions on GitHub Actions (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/upload-artifact`, etc.).
16. `test`: Complete API + Web Vitest suites (`pnpm test`).
17. `build`: Production build for `@haihire/shared`, `apps/api` (`dist/server.mjs`), and `apps/web` (`.next/standalone`).
18. `test:e2e`: Playwright end-to-end suite (`apps/web/tests/e2e/`).

---

## 2. `pnpm` Catalog, Lockfile & Docker Standalone Discipline

- **Shared Dependency Versions:** Reference `catalog:` in workspace `package.json` for shared tools (`typescript`, `vitest`, `eslint`, `zod`, `@types/node`, `tsx`).
- **Release Age Quarantine:** `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (24 hours). When upgrading exempted packages in `minimumReleaseAgeExclude`, keep exact versions aligned with `apps/api/package.json` and `apps/web/package.json`.
- **Lean Node 26 Dockerfiles:**
  - `apps/api/Dockerfile` compiles `dist/server.mjs` and copies `packages/shared/src`, `apps/api/dist`, `apps/api/src/prisma`, `apps/api/src/common`, and `scripts`. Note port `3001` inside container (`13001` host mapping in Compose).
  - `apps/web/Dockerfile` builds `output: "standalone"` with build-time `BACKEND_HOST=api` / `MINIO_HOST=minio` and starts `node server.js` on internal port `3000` (`13000` host mapping in Compose).
- **CI/CD Container Scanning:** `.github/workflows/cd-release.yml` produces and archives `trivy-api-results.sarif` and `trivy-web-results.sarif`—ensure Trivy output filenames and `upload-artifact` paths stay aligned.

---

## 3. Documentation & Stats Hygiene

- Never commit transient reports inside `docs/reports/` or unverified metrics.
- Whenever tests, env keys, or CI gates change, run `pnpm docs:stats:write` (`scripts/generate-docs-stats.ts`) and verify `pnpm lint:doc-links` and `pnpm lint:doc-sync` exit `0`.
- Remember Windows PowerShell compatibility: avoid chaining `&&` in terminal commands; execute sequential steps individually or use `;` with `$LASTEXITCODE` checks.
