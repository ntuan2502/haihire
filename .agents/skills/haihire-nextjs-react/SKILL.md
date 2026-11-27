---
name: haihire-nextjs-react
description: Builds and reviews Next.js 16 App Router pages, React 19 UI components, Tailwind CSS v4 tokens, and shadcn new-york primitives in apps/web. Use when creating routes, editing proxy.ts, styling with CSS variables, or working with forms, modals, and tables in HaiHire.
---

# HaiHire Next.js 16, React 19, Tailwind v4 & shadcn/ui Skill

Stack baselines verified in `apps/web/package.json` and `apps/web/components.json`:
- **Next.js**: `16.4.5` (`output: "standalone"`, Turbopack/App Router, `src/proxy.ts` exporting `proxy`)
- **React**: `19.3.1` (`react`, `react-dom`)
- **UI Primitives**: `shadcn@^4.23.0` (`style: "new-york"`, `radix-ui@^1.8.1`, `lucide-react@^1.70.0`, `class-variance-authority@^0.7.1`)
- **Utility Merging**: standalone `cn@^0.5.2` re-exported from `apps/web/src/lib/utils.ts` (`export { cn } from "cn"`)
- **Styling**: Tailwind CSS `^4.3.5` CSS-first configuration (`@import "tailwindcss"`, `@theme inline`, `oklch(...)` tokens) with `tw-animate-css@^1.4.0`

---

## 1. Next.js 16 Routing & Proxy Boundary (`src/proxy.ts`)

Per Next.js 16 official documentation and `scripts/check-nextjs-conventions.ts` (`pnpm lint:nextjs-conventions`):
- **Never create `middleware.ts` or `src/middleware.ts`.** Next.js 16 replaces `middleware` with `src/proxy.ts` exporting `export async function proxy(request: NextRequest)`.
- Keep `middleware.ts` absent so CI Gate 14 and standalone tracing (`ƒ Proxy`) succeed without conflict errors.
- `apps/web/next.config.ts` sets `output: "standalone"`, `outputFileTracingRoot: repoRoot`, and dynamic LAN `allowedDevOrigins` (supporting both `FRONTEND_PORT` and `GATEWAY_PORT`); HTTP API/SSE routing lives in `deploy/caddy/Caddyfile` rather than Next.js `rewrites()`.
- Server vs. Client boundary in `apps/web/src/app/`:
  - Keep landing and careers shells, root layouts, and the shared dashboard layout on the server where possible. Use Client Components for browser state, interactive controls, and client-side data hooks.
  - Keep root `layout.tsx` and server careers pages free of browser-only globals.

---

## 2. React 19 UI, Forms & URL State Discipline

Following React 19 official guidance ("You Might Not Need an Effect"):
- **Do not mirror props into `useState` via `useEffect`.** Derive computed values directly during render or reset component state with a `key` prop.
- **Controlled Forms (No `react-hook-form`):** HaiHire uses explicit controlled React state paired with `@haihire/shared` Zod schemas (`packages/shared/src/schemas/`). Validate fields explicitly before mutating and map backend errors via `getApiErrorMessage()`.
- **Table & Filter State (`apps/web/src/hooks/use-table-params.ts`):**
  - Use `useTableParams()` for URL-synchronized pagination, limit, and debounced search (`250ms` default) backed by a mutable `URLSearchParams` ref + `startTransition`.
  - Keep local `searchInput` responsive at 0ms while preserving in-progress typing drafts on URL sync.
  - Persist column visibility with `usePersistedColumns()` (`apps/web/src/hooks/use-persisted-columns.ts`).

---

## 3. Tailwind CSS v4 (`globals.css`) & shadcn `new-york`

Per Tailwind CSS v4 and `ui.shadcn.com` v4 documentation:
- **CSS-First Configuration:** Never reintroduce `tailwind.config.js` / `tailwind.config.ts`. Configure all theme tokens in `apps/web/src/app/globals.css`:
  - `@import "tailwindcss";`
  - `@import "tw-animate-css";`
  - `@import "shadcn/tailwind.css";`
  - `@custom-variant dark (&:is(.dark *));`
  - `@theme inline { ... }` pointing directly to live CSS custom properties (`var(--background)`, `var(--primary)`, etc.) so `.dark` switches apply dynamically at runtime.
- **Color Space:** Define semantic CSS variables (`:root` and `.dark`) using perceptual `oklch(...)` values instead of hardcoded hex or ad-hoc palette utilities.
- **Radix UI (`new-york`):**
  - `apps/web/components.json` specifies `"style": "new-york"`. All interactive Radix primitives in `apps/web/src/components/ui/` (`avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `collapsible.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `popover.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `sonner.tsx`, `textarea.tsx`, `tooltip.tsx`) are built on the unified `radix-ui` package (`radix-ui`, plus `sonner` for toasts), NOT `@base-ui/react` or legacy `@radix-ui/react-*` packages.
  - Never install `@base-ui/react` or replace `cn` from `"cn"` with manual `clsx` + `tailwind-merge`.
  - Use standard `asChild` / `Slot.Root` composition per `new-york` generated components rather than `render` prop patterns.
  - Never create raw `createPortal(..., document.body)` overlays or manual `document.addEventListener("mousedown")` menus; Radix `Dialog` / `Sheet` `FocusScope` + `DismissableLayer` + `RemoveScroll` lock non-Radix portals outside `radix-ui`.

---

## 4. Standardized Overlay Archetypes & Workspace List Layout

- **Shared Overlay Archetypes (`apps/web/src/components/shared/`):**
  - `ConfirmDestructiveModal` / `ConfirmModal` (`confirm-destructive-modal.tsx`): Destructive and confirmation dialogs with pending lock and optional `confirmMatchText` safeguard.
  - `FormModal` (`form-modal.tsx`): Modal forms with `sm`/`md`/`lg`/`xl` sizing, sticky header/footer, scrollable body, inline `error` alert, and `isSubmitting` close-lock (pair with `FlowEmailToggleField` from `apps/web/src/components/email/flow-email-toggle-field.tsx` when toggling automated stage emails).
  - `PreviewModal` (`preview-modal.tsx`): Full-height document/HTML previews (`lg`/`xl`/`full`) with maximize toggle.
  - `DetailModal` (`detail-modal.tsx`): Read-only / multi-panel detail inspection dialogs.
  - `SlideOver` / `DetailDrawer` (`slide-over.tsx`): Right-hand `Sheet` detail panels (`sm`..`2xl`).
  - `FilterDrawer` + `FilterPillGroup` (`filter-drawer.tsx`) & `ColumnPicker` (`column-picker.tsx`): Unified filter slide-overs and `DropdownMenu` column visibility selectors.
  - `CustomSelect` (`custom-select.tsx`): Searchable/grouped select dropdown backed by Radix `Popover` (`Popover`, `PopoverAnchor`, `PopoverContent`), ensuring full pointer, keyboard search, and wheel/touch scroll compatibility inside modal `Dialog` and `Sheet` overlays. External `<label htmlFor>` attributes MUST target `${id}-trigger` (matching the rendered Radix trigger button `id`).
- **Unified 5-Page Workspace List Contract (`jobs`, `candidates`, `applications`, `interviews`, `source-tracking`):**
  - Render titles with `<PageHeader>` (`apps/web/src/components/shared/page-header.tsx`: `text-xl sm:text-2xl font-bold`, `rounded-full` count pill, single-row compact alignment when `!Icon && !subtitle`, `h-9 px-3.5 sm:px-4 text-xs font-semibold` primary CTA buttons).
  - Keep filter toolbars uniform (`h-9 px-3.5 text-xs font-semibold` outline Filter button with active badge, `RotateCcw` Reset action, mobile wrapping, active filter chips), table `<thead>` headers uppercase with active sort highlight, row action icon buttons `h-8 w-8`, and `<Pagination>` inside the table card footer (`border-t border-border bg-muted/30`).

---

## 5. Accessibility & UI Conventions

- Preserve interactive table headers (`scope="col"`, `aria-sort`), keyboard activation via `useKeyboardClick`, decorative icon `aria-hidden="true"`, and a single `<main id="main-content">` skip-link target.
- Keep dialogs and destructive flows gated through `ConfirmDestructiveModal` and consistent status states (`403`/`404`).
- Use unified full-page `<LoadingSpinner />` (`apps/web/src/components/shared/loading-spinner.tsx`) with `common.loading` (`"Đang tải dữ liệu..."` / `"Loading..."`) for workspace loading states; do not add ad-hoc `animate-pulse` skeletons, extra padding wrappers (`p-12`/`p-24`/`py-12`), or `fullScreen` props on `<Suspense>` fallbacks inside `(workspace)`.
- Respect user and organization localization (`vi` / `en`) and RTL/truncation resilience across narrow and wide viewports (`375px`, `1366px`, `1536px`, `1920px`).
