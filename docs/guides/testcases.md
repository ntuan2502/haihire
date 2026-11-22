# QA & Automated Test Matrix

HaiHire verifies application correctness across **unit**, **integration**, **static architecture**, and **browser end-to-end** layers.

---

## 1. Unit & Integration Suites (`Vitest 5.1.0`)

| Workspace Command | Included Test Roots                                                           |       Verified Scope       | Coverage Thresholds (`L / F / B / S`) |
| :---------------- | :---------------------------------------------------------------------------- | :------------------------: | :------------------------------------ |
| `pnpm test:api`   | `apps/api/src`, `apps/api/test`, `scripts/__tests__`, `monitoring/prometheus` | `93` files / `1,084` tests | `83%` / `82%` / `66%` / `83%`         |
| `pnpm test:web`   | `apps/web/src` (RTL + `jsdom` on `vmThreads`)                                 | `105` files / `699` tests  | `65%` / `56%` / `59%` / `65%`         |
| `pnpm test`       | Both workspaces via Turborepo                                                 | Unit and integration tests | Enforced via `pnpm test:coverage`     |

### Key Backend Test Harnesses

- **Prisma Composer Mock ([apps/api/src/test/helpers/prisma-composer-mock.ts](../../apps/api/src/test/helpers/prisma-composer-mock.ts)):** Mirrors relational queries, `deletedAt: null` equality semantics, `$transaction`, `select`, ordering, and pagination.
- **Cross-Tenant Isolation Integration Spec (`apps/api/test/e2e/cross-tenant-isolation.e2e-spec.ts`):** Verifies org boundary separation across service layers.
- **CI Script Specs (`scripts/__tests__/`):** Covers tenant-scoping static analysis (`Test 1..10`), permission auditing, orphan cleanup metrics, email provider guardrails, Next.js 16 conventions, and GitHub Action version pins.

---

## 2. Playwright E2E Suite (`apps/web/tests/e2e/` — `13` Files / `67` Tests)

Configured in [playwright.config.ts](../../playwright.config.ts) (`baseURL`: `http://localhost:13000`, Chromium Desktop, `trace: "on-first-retry"`, `retries: 2` on CI, `workers: 1` on CI):

| Spec File                                                                                           | Covered End-to-End Flow                                        |
| :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| [apply-form.spec.ts](../../apps/web/tests/e2e/apply-form.spec.ts)                                   | Public candidate job application & resume upload submission    |
| [careers-job-closed.spec.ts](../../apps/web/tests/e2e/careers-job-closed.spec.ts)                   | Closed requisition handling on public careers portal           |
| [careers-page.spec.ts](../../apps/web/tests/e2e/careers-page.spec.ts)                               | Branded public careers listing & job detail rendering          |
| [kanban-drag-drop.spec.ts](../../apps/web/tests/e2e/kanban-drag-drop.spec.ts)                       | Pipeline Kanban drag-and-drop stage transition persistence     |
| [login-flow.spec.ts](../../apps/web/tests/e2e/login-flow.spec.ts)                                   | Sign-in, cookie session persistence, proxy protection, logout  |
| [ownership-transfer.spec.ts](../../apps/web/tests/e2e/ownership-transfer.spec.ts)                   | Dynamic organization ownership transfer & privilege update     |
| [tenant-security.spec.ts](../../apps/web/tests/e2e/tenant-security.spec.ts)                         | Browser cross-tenant access denial and workspace isolation     |
| [theme-toggle.spec.ts](../../apps/web/tests/e2e/theme-toggle.spec.ts)                               | Light/dark theme switching (`oklch` `.dark` class persistence) |
| [tier1-feature-coverage.spec.ts](../../apps/web/tests/e2e/tier1-feature-coverage.spec.ts)           | Core feature E2E suite across dashboard and workspaces         |
| [tier2-boundary-corners.spec.ts](../../apps/web/tests/e2e/tier2-boundary-corners.spec.ts)           | Edge cases, authorization guards, and form validation          |
| [tier3-pairwise-combinations.spec.ts](../../apps/web/tests/e2e/tier3-pairwise-combinations.spec.ts) | Cross-feature pairwise workflows and state transitions         |
| [tier4-recruitment-lifecycle.spec.ts](../../apps/web/tests/e2e/tier4-recruitment-lifecycle.spec.ts) | End-to-end hiring lifecycle from job publish to hire           |
| [webhook-settings.spec.ts](../../apps/web/tests/e2e/webhook-settings.spec.ts)                       | Webhook provider configuration & test alert dispatch           |

---

## 3. Anti-Regression & Static Gates

- `pnpm test:diff`: Compares test declarations between `HEAD~1` and `HEAD` ([scripts/check-test-count.ts](../../scripts/check-test-count.ts)) and fails if `netNew < 0` unless `ALLOW_TEST_DELETION=true`.
- `pnpm check:all`: Runs all `18` automated architecture, lint, typecheck, test, build, and E2E gates (`pnpm check:all:fast` skips heavy build/test steps when iterating quickly on static docs and lint gates).
