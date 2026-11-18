# Engineering Conventions (Single Source of Truth)

This document defines mandatory code, validation, security, localization, UI, and repository standards enforced across `apps/api`, `apps/web`, and `packages/shared`.

---

## 1. TypeScript & Module Discipline

- **TypeScript 6 Strict Mode:** Avoid `any`; model external payloads with `unknown` and narrow with `@haihire/shared` Zod schemas or explicit type guards.
- **NestJS ESM & Explicit DI:** `apps/api` runs ESM and compiles to `dist/server.mjs` with `esbuild`. Annotate every constructor dependency with `@Inject(Token)` (and `@Optional() @Inject(Token)` when optional) so runtime injection never relies solely on emitted metadata.
- **Zero-Duplication Contracts:** Place shared enums, permission constants, event types, error codes, and validation schemas in `packages/shared/src/` rather than duplicating across frontend and backend.

---

## 2. Centralized Fail-Fast Environment Configuration

- All environment variables are declared in [.env.example](../../.env.example) (`56` keys) and validated via Zod at startup in [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) (`backendEnvSchema`) and [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts).
- Required core security and infrastructure keys include `DATABASE_URL`, `JWT_SECRET` (min `16` chars), `ENCRYPTION_SECRET` (min `32` chars for AES-256), `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `MINIO_ENDPOINT`, and `FRONTEND_URL` (backend CORS origin whitelist).
- Never bypass fail-fast schemas with scattered ad-hoc fallbacks for secrets; keep `.env.example`, `.env.production.example`, and TypeScript env schemas 100% synchronized (`pnpm lint:env-sync`).

---

## 3. Backend Validation, Error Envelopes & Tenant Isolation

- **`DtoPipe` Enforcement (`pnpm lint:dtopipe`):** Validate all incoming route payloads with `@Body(DtoPipe(DtoOrSchema))` or `@Query(DtoPipe(DtoOrSchema))` ([apps/api/src/common/dto-validation.pipe.ts](../../apps/api/src/common/dto-validation.pipe.ts)).
- **Typed Error Responses (`pnpm lint:error-i18n`):** Throw typed subclasses of `AppException` ([apps/api/src/common/app-exception.ts](../../apps/api/src/common/app-exception.ts)) parameterized with one of `64` `APP_ERROR_CODES` from [packages/shared/src/errors.ts](../../packages/shared/src/errors.ts); let `GlobalExceptionFilter` format consistent JSON envelopes.
- **Multi-Tenant Query Rule (`pnpm lint:tenant-scope`):** Every query in the `8` tenant-scoped modules must filter explicitly on `organizationId`, belong to `MODELS_WITHOUT_ORG_COLUMN` with relational parent enforcement, verify ownership inside the **same** method, or match an audited `SAFE_QUERY_PATTERNS` rule.
- **Prisma `AsyncLocalStorage` Transactions:** Wrap multi-step state + document + activity workflows inside `runInTransaction(this.prisma, async (tx) => ...)`. Always include `deletedAt: null` when querying `Job`, `Candidate`, or `TrackingLink`.
- **Distributed Caching & Throttling:** `ThrottlerStorageRedisService` provides distributed rate limiting backed by Valkey/Redis with memory fallback. `PermissionResolverService` resolves role permissions via a 2-tier cache (L1 Memory + L2 Redis) with multi-replica pub/sub invalidation (`haihire:permissions:invalidate`).

---

## 4. Next.js 16, Tailwind v4, Shadcn `base-nova` & Data Fetching

- **Next.js 16 Proxy Convention (`pnpm lint:nextjs-conventions`):** Use [apps/web/src/proxy.ts](../../apps/web/src/proxy.ts) exporting `proxy(request: NextRequest)`. Never reintroduce `middleware.ts`.
- **Shared Dashboard Layout (`apps/web/src/app/(workspace)/layout.tsx`):** Consolidate common navigation shell (`AppSidebar` and `DashboardHeader` via `DashboardFrame`) and authentication guard (`AuthGuard`) into the layout root; child dashboard views must not duplicate navigation headers or auth guards.
- **React Server Components (RSC):** Maintain landing shells, auth layouts, and careers directories as Server Components, delegating interactive UI to dedicated Client Component islands.
- **Modular Component Boundary:** Keep UI component files under `500` lines of code by decomposing complex views into single-responsibility subcomponents, fieldsets, and sidebars.
- **Tailwind CSS v4 CSS-First Tokens:** Define design variables using `oklch(...)` and `@theme inline` inside [apps/web/src/app/globals.css](../../apps/web/src/app/globals.css) — never add `tailwind.config.js` / `.ts` or scatter hardcoded color literals where semantic tokens apply.
- **Shadcn `base-nova` Primitives:** Use `@base-ui/react` primitives (`apps/web/components.json` -> `"style": "base-nova"`) and import `cn` from `@/lib/utils` (`export { cn } from "cn"`). Do not install `@radix-ui/*` packages.
- **TanStack Query v5 Multi-Tenant Isolation:** Manage query keys centrally in [apps/web/src/hooks/query-keys.ts](../../apps/web/src/hooks/query-keys.ts) with `orgId` scoped keys (`[domain, orgId, ...]`) to guarantee complete cross-tenant cache isolation. Proxy browser calls through [apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts) (`/api/*`), and invalidate via `createRealtimeInvalidator`.
- **Notifications & Controlled Forms:** Always import `{ toast } from "@/lib/toast"` (wrapping `react-toastify`), avoid `useEffect` state-mirroring, and validate controlled form state cleanly before submit.

---

## 5. Two-Way Localization (`pnpm lint:i18n`)

- Keep `apps/web/src/i18n/types.ts` (`TranslationSchema`), `apps/web/src/i18n/locales/en.ts`, and `apps/web/src/i18n/locales/vi.ts` 100% synchronized.
- Zero hardcoded user-facing strings in UI JSX and zero unlocalized error codes (`64` codes tested via `pnpm lint:error-i18n`).
- Dictionaries are loaded dynamically with zero FOUC: `RootLayout` passes the active server-resolved dictionary to `I18nProvider`, and alternate language chunks load on-demand.
- Follow 2-tier precedence (`user.preferredLanguage` -> cookie/storage -> `organization.defaultLanguage`, and `user.preferredTimezone` -> `organization.timezone`).

---

## 6. Documentation & Verification Discipline

- Never store temporary reports under root or `docs/`, never use `file://` or backslashes (`\`) in `.md` files, and never reference nonexistent repo file paths outside fenced code blocks (`pnpm lint:doc-links` & `pnpm lint:doc-sync`).
- Keep the Project Metrics inventory synchronized via `pnpm docs:stats:write` and ensure `pnpm check:all` passes before merge or release.
