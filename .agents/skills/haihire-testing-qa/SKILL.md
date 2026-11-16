---
name: haihire-testing-qa
description: Guides Vitest 5 unit/integration testing, Prisma composer mocks, React Testing Library tests, Playwright E2E specs, and anti-regression test gates in HaiHire. Use when writing specs, mocking Prisma/BullMQ/MinIO/Axios, or debugging test failures across api, web, and scripts.
---

# HaiHire Testing & QA Skill (Vitest 5 & Playwright)

Stack baselines verified in `apps/api/vitest.config.ts`, `apps/web/vitest.config.mts`, and `playwright.config.ts`:
- **Unit & Integration**: `vitest@5.1.0` + `@vitest/coverage-v8@5.1.0`
  - **Backend Workspace (`pnpm test:api`)**: runs `apps/api` (`src/**/*.spec.ts`, `test/**/*.spec.ts`, `test/e2e/cross-tenant-isolation.e2e-spec.ts`), `scripts/__tests__/*.spec.ts`, and `monitoring/**/*.spec.ts` in `node` environment (`85` files, `936` tests; coverage thresholds: lines `83`, functions `82`, branches `66`, statements `83`).
  - **Frontend Workspace (`pnpm test:web`)**: runs `apps/web/src/**/*.{spec,test}.{ts,tsx}` in `jsdom` with `@testing-library/react@^16.3.3` and `@testing-library/jest-dom@^7.0.1` on `vmThreads` pool (`86` files, `591` tests; coverage thresholds: lines `65`, functions `56`, branches `59`, statements `65`).
- **E2E Suite**: `@playwright/test@^1.65.0` (`apps/web/tests/e2e/`, `9` spec files / `34` test blocks) targeting `http://localhost:13000`.

---

## 1. Vitest 5 ESM & Hoisting Patterns

Per Vitest official documentation:
- **`vi.hoisted()` for Mock Factories:** `vi.mock()` is hoisted before top-level imports. Always declare shared mock functions/objects inside `vi.hoisted(() => ({ ... }))` when referencing them inside `vi.mock()`.
- **Partial Module Mocks:** Use `async (importActual) => { const actual = await importActual<typeof import(...)>(); return { ...actual, ...overrides }; }` cleanly rather than dropping unrelated exports.
- **DI Injection in NestJS Specs:** Because backend runs in ESM without Nest's runtime DI container overhead inside unit specs, instantiate services via helpers in `apps/api/src/test/helpers/service-factories.ts` or pass mock dependencies explicitly to constructors.
- **Prisma Mock Fidelity (`apps/api/src/test/helpers/prisma-composer-mock.ts`):**
  - Use `createMockPrismaService()` so `where` matching (`deletedAt: null` matches both `null` and `undefined`), interactive `$transaction`, `select`, `orderBy`, and `skip`/`take` mirror real Prisma behavior.
  - Remember Vitest spy ordering (`mockResolvedValueOnce` / `mockRejectedValueOnce`): verify how existing specs chain mocks before adding extra DB pre-queries in hot paths.

---

## 2. Security, Tenant Isolation & Functional Regression Testing

- **Cross-Tenant Tests Mandatory:** Every new query or endpoint on a tenant-owned or child resource (`Job`, `Candidate`, `Application`, `Interview`, `TrackingLink`, `EmailTemplate`, `WebhookSetting`, `Activity`) must include a cross-tenant negative test asserting `AppForbiddenException` / `AppNotFoundException` or filtered-out empty results when queried by Org B's token/user.
- **Static Gate Unit Tests:** Changes to CI architecture scripts (`scripts/check-tenant-scoping.ts`, `scripts/check-nextjs-conventions.ts`, etc.) MUST have corresponding regression specs in `scripts/__tests__/*.spec.ts`.

---

## 3. Frontend Unit & Playwright E2E Conventions

- **RTL (`jsdom`) Discipline:** Mock `@/lib/api/client` (`api`), `@/lib/toast`, or React Query wrappers via `src/test/` utilities, wrap UI components with `QueryClientProvider` (`retry: false`) + `I18nProvider`, and assert accessible roles (`getByRole`, `getByLabelText`) instead of CSS class selectors.
- **Playwright E2E (`playwright.config.ts`):**
  - Prefer accessibility-first locators (`page.getByRole(...)`, `page.getByLabel(...)`) and auto-retrying web-first assertions (`await expect(locator).toBeVisible()`, `await expect(locator).toHaveText(...)`). Never use arbitrary `waitForTimeout` or non-retrying `await locator.isVisible()` assertions.
  - CI runs with `workers: 1`, `retries: 2`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`.

---

## 4. Anti-Regression Test Gate (`pnpm test:diff`)

- `scripts/check-test-count.ts` diffs `HEAD~1..HEAD` for `+it`/`+test` vs `-it`/`-test` declarations and exits non-zero whenever `netNew < 0` unless `ALLOW_TEST_DELETION=true` is explicitly set.
- Never delete or skip failing assertions to turn a build green; fix the root bug or update stale expectations only alongside verified behavioral changes.
