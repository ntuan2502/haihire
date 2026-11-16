# Contributing to HaiHire

Thank you for contributing to HaiHire. All contributors and automated coding agents follow a unified engineering workflow backed by automated static, security, and regression gates.

---

## 1. Prerequisites & Branch Workflow

- **Node.js `26.x`** and **`pnpm@12.18.0`** (enabled via Corepack or global install matching [package.json](package.json)).
- Branch off `dev` using clean feature/fix branch naming (`feat/...`, `fix/...`, `chore/...`).
- Commit messages follow **Conventional Commits** enforced by `commitlint` + `husky` (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`).

See [Branch Protection Runbook](docs/runbooks/branch-protection.md) and [CI/CD Pipeline](docs/runbooks/ci-cd.md) for merge rules across `dev`, `staging`, and `main`.

---

## 2. Mandatory Coding Standards

Before submitting a PR, review [Engineering Conventions](docs/architecture/conventions.md) and [Definition of Done](docs/guides/definition-of-done.md):

1. **Strict TypeScript:** Avoid `any`; model external payloads with `unknown` and narrow with `@haihire/shared` Zod schemas.
2. **Backend Validation (`DtoPipe`):** Validate every controller input with `@Body(DtoPipe(...))` or `@Query(DtoPipe(...))` ([apps/api/src/common/dto-validation.pipe.ts](apps/api/src/common/dto-validation.pipe.ts)).
3. **Tenant Isolation:** Every database read/write in the 8 scoped backend modules must filter by `organizationId` (or verify ownership against a parent relation in the same method) and pass `pnpm lint:tenant-scope`.
4. **Two-Way Localization:** Keep all UI copy localized in both `en` and `vi` dictionaries (`apps/web/src/i18n/locales/en.ts` and `apps/web/src/i18n/locales/vi.ts`) and map all `APP_ERROR_CODES`.
5. **Shadcn `base-nova` UI & Next.js 16:** Keep authentication routing in [apps/web/src/proxy.ts](apps/web/src/proxy.ts) (never `middleware.ts`), build UI primitives with `@base-ui/react` and `cn` from `"cn"`, and use `oklch` design tokens in CSS variables.
6. **Testing & Anti-Regression:** Add Vitest unit/integration tests (including cross-tenant negative assertions for backend endpoints) and keep net test count non-decreasing (`pnpm test:diff`).

---

## 3. Pre-PR Verification Checklist

Run these commands from the repository root before pushing:

```bash
pnpm format               # Format files with Prettier
pnpm lint:env-sync        # Verify .env.example vs backend/frontend env schemas
pnpm lint:i18n            # Verify vi/en i18n parity & zero hardcoded UI strings
pnpm lint:error-i18n      # Verify 64 APP_ERROR_CODES localization parity
pnpm lint:dtopipe         # Verify DtoPipe coverage across all controllers
pnpm lint:tenant-scope    # Verify 100% tenant isolation across backend services
pnpm lint:doc-links       # Verify markdown relative links
pnpm lint:doc-sync        # Verify documentation synchronization
pnpm lint                 # Run ESLint across workspaces
pnpm typecheck            # Run TypeScript checks across workspaces
pnpm test                 # Run API + Web test suites
pnpm build                # Build shared, api (esbuild), and web (standalone)
```

For full verification including Playwright E2E tests (with local PostgreSQL, Valkey, and MinIO running):

```bash
pnpm check:all
```

---

## 4. Environment & Documentation Updates

- Any new environment variable MUST be added simultaneously to `.env.example`, `.env.production.example`, [apps/api/src/config/env.ts](apps/api/src/config/env.ts), and (if browser/SSR-relevant) `apps/web/src/lib/env.ts`.
- Update relevant architecture or API docs alongside code changes and regenerate embedded README/AGENTS stats blocks with `pnpm docs:stats:write`.
