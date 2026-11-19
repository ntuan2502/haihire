# HaiHire Web Application (`apps/web`)

Enterprise recruiter dashboard and public careers portal built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Shadcn (`new-york`)**.

---

## Stack Summary

- **Framework:** Next.js `16.4.5` (`output: "standalone"`, Turbopack, [next.config.ts](next.config.ts) API/MinIO rewrites, and Next.js 16 boundary proxy [src/proxy.ts](src/proxy.ts))
- **UI & Styling:** React `19.3.1`, Tailwind CSS `^4.3.5` CSS-first `@theme inline` with `oklch(...)` tokens in [src/app/globals.css](src/app/globals.css), `shadcn@^4.23.0` (`style: "new-york"` backed by `radix-ui@^1.8.1`), standalone `cn@^0.5.2` ([src/lib/utils.ts](src/lib/utils.ts)), `lucide-react@^1.70.0`
- **Data & Real-Time:** `@tanstack/react-query@^5.107.1` ([src/hooks/query-keys.ts](src/hooks/query-keys.ts)), `axios@^1.21.0` URL Gatekeeper + 401 refresh queue ([src/lib/api/client.ts](src/lib/api/client.ts)), debounced SSE `createRealtimeInvalidator` ([src/lib/realtime-sync.ts](src/lib/realtime-sync.ts))
- **Notifications & Localization:** `sonner@^2.0.8` via [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx) and [src/lib/toast.ts](src/lib/toast.ts) (`@/lib/toast`), 2-tier 2-way `vi` / `en` i18n (`I18nProvider` + `LocalizationProvider`)

---

## Architectural Conventions

- **No `middleware.ts`:** Route protection and JWT cookie session checks run inside `proxy()` exported by [src/proxy.ts](src/proxy.ts) (enforced by CI Gate 15).
- **Controlled Forms:** Interactive forms use explicit React state + `@haihire/shared` Zod schemas with localized server error mapping via `getApiErrorMessage()`.
- **Private Resume Downloads:** Document previews and downloads always proxy through tenant-authenticated backend endpoints (`/applications/:id/documents/download`, `/candidates/:id/documents/download`), never raw `/haihire-resumes/` paths.
- **Radix `new-york` Primitives & Overlay Archetypes:** Interactive overlays compose unified `radix-ui` primitives under `src/components/ui/` ([dialog.tsx](src/components/ui/dialog.tsx), [sheet.tsx](src/components/ui/sheet.tsx), [dropdown-menu.tsx](src/components/ui/dropdown-menu.tsx), [popover.tsx](src/components/ui/popover.tsx), [tooltip.tsx](src/components/ui/tooltip.tsx), [sidebar.tsx](src/components/ui/sidebar.tsx)) via standardized archetypes in `src/components/shared/`:
  - Dialogs & previews: [confirm-destructive-modal.tsx](src/components/shared/confirm-destructive-modal.tsx) (`ConfirmDestructiveModal` / `ConfirmModal`), [form-modal.tsx](src/components/shared/form-modal.tsx) (`FormModal`), [preview-modal.tsx](src/components/shared/preview-modal.tsx) (`PreviewModal`), [detail-modal.tsx](src/components/shared/detail-modal.tsx) (`DetailModal`), and [flow-email-toggle-field.tsx](src/components/email/flow-email-toggle-field.tsx).
  - Drawers, pickers & popovers: [slide-over.tsx](src/components/shared/slide-over.tsx) (`SlideOver` / `DetailDrawer`), [filter-drawer.tsx](src/components/shared/filter-drawer.tsx) (`FilterDrawer` + `FilterPillGroup`), [column-picker.tsx](src/components/shared/column-picker.tsx) (`ColumnPicker`), and [custom-select.tsx](src/components/shared/custom-select.tsx) (`CustomSelect` backed by Radix `Popover` for full `Dialog` / `Sheet` interaction support).
- **Unified Workspace List Layout:** Primary workspace views (`jobs`, `candidates`, `applications`, `interviews`, `source-tracking`) share [page-header.tsx](src/components/shared/page-header.tsx) (`PageHeader` with `font-bold` `<h1>` and `rounded-full` count pill), `h-9` CTA and filter toolbar buttons with mobile-friendly wrapping and active filter chips, uppercase `<thead>` sort headers, `h-8 w-8` row action icon buttons, and in-card [pagination.tsx](src/components/shared/pagination.tsx) footers (`bg-muted/30`).

---

## Scripts

Run from repository root using `pnpm --filter web <script>` (or from `apps/web/`):

```bash
pnpm --filter web dev        # Start Next.js development server
pnpm --filter web build      # Build standalone production output (.next/standalone)
pnpm --filter web start      # Serve production build
pnpm --filter web lint       # Run ESLint
pnpm --filter web lint:i18n  # Run two-way i18n key parity & hardcoded string check
pnpm --filter web typecheck  # Run tsc --noEmit
pnpm --filter web test       # Run Vitest + React Testing Library jsdom suite
```

Playwright end-to-end tests live in `apps/web/tests/e2e/` (`9` spec files) and run from the workspace root via `pnpm test:e2e`.
