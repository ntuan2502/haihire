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
- **Multi-Tenant Query Rule (`pnpm lint:tenant-scope`):** Every query in the `10` tenant-scoped modules must filter explicitly on `organizationId` (not merely project `organizationId` in `select`), belong to `MODELS_WITHOUT_ORG_COLUMN` with relational parent enforcement, verify ownership inside the **same** method (pre-query or post-query `AppForbiddenException`), or match an audited `SAFE_QUERY_PATTERNS` rule. The static scanner ([scripts/check-tenant-scoping.ts](../../scripts/check-tenant-scoping.ts)) strips `select: { ... }` projections before lookahead and ignores non-call `typeof` checks.
- **Prisma `AsyncLocalStorage` Transactions:** Wrap multi-step state + document + activity workflows inside `runInTransaction(this.prisma, async (tx) => ...)`. Always include `deletedAt: null` when querying `Job`, `Candidate`, or `TrackingLink`.
- **Distributed Caching & Throttling:** `ThrottlerStorageRedisService` provides distributed rate limiting backed by Valkey/Redis with memory fallback. `PermissionResolverService` resolves role permissions via a 2-tier cache (L1 Memory + L2 Redis) with multi-replica pub/sub invalidation (`haihire:permissions:invalidate`).

---

## 4. Next.js 16, Tailwind v4, Shadcn `new-york` & Data Fetching

- **Next.js 16 Proxy Convention (`pnpm lint:nextjs-conventions`):** Use [apps/web/src/proxy.ts](../../apps/web/src/proxy.ts) exporting `proxy(request: NextRequest)`. Never reintroduce `middleware.ts`.
- **Shared Dashboard Layout (`apps/web/src/app/(workspace)/layout.tsx`):** Consolidate common navigation shell (`AppSidebar` and `DashboardHeader` via `DashboardFrame`) and authentication guard (`AuthGuard`) into the layout root; child dashboard views must not duplicate navigation headers or auth guards.
- **React Server Components (RSC):** Maintain landing shells, auth layouts, and careers directories as Server Components, delegating interactive UI to dedicated Client Component islands.
- **Modular Component Boundary:** Keep UI component files under `500` lines of code by decomposing complex views into single-responsibility subcomponents, fieldsets, and sidebars.
- **Tailwind CSS v4 CSS-First Tokens:** Define design variables using `oklch(...)` and `@theme inline` inside [apps/web/src/app/globals.css](../../apps/web/src/app/globals.css) — never add `tailwind.config.js` / `.ts` or scatter hardcoded color literals where semantic tokens apply.
- **Shadcn `new-york` Primitives:** Use `radix-ui` primitives ([apps/web/components.json](../../apps/web/components.json) -> `"style": "new-york"`) under `apps/web/src/components/ui/` (`dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`, `sidebar.tsx`, `button.tsx`, `badge.tsx`, `input.tsx`) and import `cn` from `@/lib/utils` (`export { cn } from "cn"`). Never install `@base-ui/react` or legacy `@radix-ui/*` packages, write raw `createPortal(..., document.body)` overlays, or use manual `document.addEventListener("mousedown")` menus where `Popover` / `DropdownMenu` / `Dialog` / `Sheet` apply.
- **Standardized Shared Overlay Archetypes (`apps/web/src/components/shared/`):** Build all overlays atop the shared archetypes rather than rolling bespoke dialog/drawer markup:
  - Confirmation & destructive flows: `ConfirmDestructiveModal` / `ConfirmModal` ([apps/web/src/components/shared/confirm-destructive-modal.tsx](../../apps/web/src/components/shared/confirm-destructive-modal.tsx)) with pending close-lock and optional typed `confirmMatchText` safeguard.
  - Create/edit forms: `FormModal` ([apps/web/src/components/shared/form-modal.tsx](../../apps/web/src/components/shared/form-modal.tsx)) with `sm`/`md`/`lg`/`xl` size presets, sticky header/footer, scrollable body, inline `error` alert, and `isSubmitting` close-lock.
  - Document/HTML previews: `PreviewModal` ([apps/web/src/components/shared/preview-modal.tsx](../../apps/web/src/components/shared/preview-modal.tsx)) with `lg`/`xl`/`full` size presets and maximize toggle.
  - Read-only / multi-panel detail modals: `DetailModal` ([apps/web/src/components/shared/detail-modal.tsx](../../apps/web/src/components/shared/detail-modal.tsx)).
  - Slide-over detail panels: `SlideOver` / `DetailDrawer` ([apps/web/src/components/shared/slide-over.tsx](../../apps/web/src/components/shared/slide-over.tsx)) built on Radix `Sheet`.
  - Filter drawers & column pickers: `FilterDrawer` + `FilterPillGroup` ([apps/web/src/components/shared/filter-drawer.tsx](../../apps/web/src/components/shared/filter-drawer.tsx)) and `ColumnPicker` ([apps/web/src/components/shared/column-picker.tsx](../../apps/web/src/components/shared/column-picker.tsx)) backed by `DropdownMenu`.
  - Accessible select dropdowns: `CustomSelect` ([apps/web/src/components/shared/custom-select.tsx](../../apps/web/src/components/shared/custom-select.tsx)) backed by Radix `Popover` (`Popover`, `PopoverAnchor`, `PopoverContent`) so dropdown popups stay clickable, searchable, and scrollable inside modal `Dialog` and `Sheet` overlays.
- **Unified Workspace List Layout:** Keep the primary workspace list views (`jobs`, `candidates`, `applications`, `interviews`, `source-tracking`) aligned around `<PageHeader>` ([apps/web/src/components/shared/page-header.tsx](../../apps/web/src/components/shared/page-header.tsx)) with `font-bold` `<h1>`, `rounded-full` count pill, `h-9` primary CTA buttons, unified filter toolbars (`h-9` Filter button with active badge, `RotateCcw` Reset action, mobile wrapping, active filter chips), uppercase `<thead>` columns with active sort highlight, `h-8 w-8` row action buttons, and in-card `<Pagination>` ([apps/web/src/components/shared/pagination.tsx](../../apps/web/src/components/shared/pagination.tsx)) footers (`border-t border-border bg-muted/30`).
- **TanStack Query v5 Multi-Tenant Isolation:** Manage query keys centrally in [apps/web/src/hooks/query-keys.ts](../../apps/web/src/hooks/query-keys.ts) with `orgId` scoped keys (`[domain, orgId, ...]`) to guarantee complete cross-tenant cache isolation. Proxy browser calls through [apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts) (`/api/*`), and invalidate via `createRealtimeInvalidator`.
- **Notifications & Controlled Forms:** Always import `{ toast } from "@/lib/toast"` (backed by Shadcn `sonner` in [apps/web/src/components/ui/sonner.tsx](../../apps/web/src/components/ui/sonner.tsx)), avoid `useEffect` state-mirroring, and validate controlled form state cleanly before submit.

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

---

## 7. Anti-Regression Guardrails (Do Not Revert — See `D-018`)

To prevent recurring regressions across agent sessions, preserve these design choices and their underlying rationale (detailed in [DECISIONS.md](../decisions/DECISIONS.md)):

- **Prisma ALS Transaction Proxy & Cleanup Lifecycle:** Never remove the `Proxy` wrapper in [apps/api/src/prisma/prisma.service.ts](../../apps/api/src/prisma/prisma.service.ts) or remove `withSystemRlsBypass` / `finally { await prisma.$disconnect(); }` in [apps/api/src/common/orphan-cleanup.ts](../../apps/api/src/common/orphan-cleanup.ts). Existing services inject `this.prisma` rather than threading `tx` everywhere; without the proxy and RLS bypass, nested transactional queries silently bypass transaction rollback and orphan scans fail under `FORCE ROW LEVEL SECURITY`.
- **Shared Email Subject, Sourcing Domain & Scorecard Contracts:** Never replace `interpolateEmailSubject` with `interpolateEmail` on email subjects ([packages/shared/src/email-templates.ts](../../packages/shared/src/email-templates.ts)) — HTML-escaping turns `R&D` into `R&amp;D` and misses SMTP CR/LF header injection. Never revert `resolveChannelFromDomain` ([packages/shared/src/sourcing.ts](../../packages/shared/src/sourcing.ts)) back to `.includes()` (causes `dropbox.com`/`netflix.com` false hits on `x.com`; keep `joinhandshake.com` alongside `handshake.com`) or re-introduce permissive `z.record(z.string(), z.unknown())` into `submitScorecardSchema` ([packages/shared/src/schemas/interview.schema.ts](../../packages/shared/src/schemas/interview.schema.ts)).
- **Frontend SSR, Auth Refresh & Radix Accessible Labels:** Keep `typeof window === "undefined"` guards in `setActiveLocalization` ([apps/web/src/components/providers/localization-provider.tsx](../../apps/web/src/components/providers/localization-provider.tsx)) so Next.js Server Component renders do not leak locale state across requests. Keep transient error preservation (`5xx`/`429`/network timeouts) and `"haihire:auth-expired"` handling in [apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts) so temporary backend restarts do not force-logout users. Keep `htmlFor="...-trigger"` on labels paired with `CustomSelect` ([apps/web/src/components/shared/custom-select.tsx](../../apps/web/src/components/shared/custom-select.tsx)), because the Radix `PopoverTrigger` button renders with `id="${id}-trigger"`.
- **Tenant Guard Synchronization, Error Redaction & Prod Email Gate:** Never remove `req.user.role` / `req.user.isOwner` / `req.user.organization` synchronization in [apps/api/src/common/guards/tenant.guard.ts](../../apps/api/src/common/guards/tenant.guard.ts), never re-expose foreign `organizationId` values in cross-tenant `403` error payloads, and never allow `SYSTEM_EMAIL_PROVIDER=SIMULATED` when `NODE_ENV=production` in [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts).
- **Container Port Binding & Release Trivy Gate:** Keep explicit `BACKEND_PORT: 3001` in `docker-compose.yml` and `docker-compose.prod.yml` alongside `BACKEND_PORT || PORT || "3001"` in [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) so local `.env` overrides (`13001`) coexist safely with container port `3001`. Keep `.prisma` generated artifact copying in `apps/api/Dockerfile` and temporary `sha-<short>` -> `trivy-scan` -> tag promotion in `.github/workflows/cd-release.yml` so vulnerable images are never promoted.
- **Composer Mock Parity:** Preserve composite unique key (`organizationId_userId`) matching and populated nested relation filtering in [apps/api/src/test/helpers/prisma-composer-mock.ts](../../apps/api/src/test/helpers/prisma-composer-mock.ts) so unit tests exercise real Prisma `upsert`, `findUnique`, and soft-delete relational filters rather than silently no-oping.
