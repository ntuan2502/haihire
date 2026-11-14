# Definition of Done (DoD)

A task, bugfix, feature, or refactor in HaiHire is complete only when all engineering, security, localization, testing, documentation, and CI gates below are satisfied.

---

## 1. Code & Architecture Standards

- TypeScript strictness maintained across `apps/api`, `apps/web`, and `packages/shared` (zero introduced `any` leaks).
- Backend constructor dependencies annotated explicitly with `@Inject(...)` / `@Optional()` and request DTOs validated with `DtoPipe(...)` ([apps/api/src/common/dto-validation.pipe.ts](../../apps/api/src/common/dto-validation.pipe.ts)).
- Domain constants, Zod schemas, permissions, event names, and `APP_ERROR_CODES` reused from `@haihire/shared` with zero duplication.
- Frontend adheres to Next.js 16 `src/proxy.ts` (zero `middleware.ts`), Tailwind CSS v4 `oklch` CSS tokens, Shadcn `base-nova` (`@base-ui/react` + standalone `"cn"`), and `@/lib/toast`.

---

## 2. Multi-Tenancy & Security Verification

- All queries inside the `8` tenant-scoped backend modules enforce explicit `organizationId` filtering or same-method parent ownership checks (`pnpm lint:tenant-scope` passes with `0` violations).
- Cross-tenant negative tests added/updated for any modified or new API query or endpoint.
- Private MinIO resume objects scoped to `tenants/<orgId>/...` and served only via authenticated download routes.
- New environment variables registered identically across `.env.example`, `.env.production.example`, [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts), and [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts) (`pnpm lint:env-sync` exits `0`).

---

## 3. Localization & Testing

- UI copy localized cleanly in both `en` and `vi` with zero hardcoded JSX copy (`pnpm lint:i18n` and `pnpm lint:error-i18n` exit `0`).
- Relevant Vitest unit/component specs written and passing (`pnpm test`).
- Playwright E2E specs added or updated for cross-page/browser flows (`apps/web/tests/e2e/`).
- Net test count is non-decreasing (`pnpm test:diff` passes).

---

## 4. Documentation & Final Verification

- Affected architecture/API/runbook documentation updated in sync with code changes, with zero broken relative links (`pnpm lint:doc-links`), zero drifted paths (`pnpm lint:doc-sync`), and updated `<!-- STATS:START -->` blocks (`pnpm docs:stats:write`).
- Production builds succeed across all packages (`pnpm build`), formatting passes (`pnpm format`), ESLint + TypeScript pass (`pnpm lint`, `pnpm typecheck`), and the automated gate runner passes (`pnpm check:all`).
