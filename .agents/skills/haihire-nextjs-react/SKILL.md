---
name: haihire-nextjs-react
description: Builds and reviews Next.js 16 App Router pages, React 19 UI components, Tailwind CSS v4 tokens, and shadcn base-nova primitives in apps/web. Use when creating routes, editing proxy.ts, styling with CSS variables, or working with forms, modals, and tables in HaiHire.
---

# HaiHire Next.js 16, React 19, Tailwind v4 & shadcn/ui Skill

Stack baselines verified in `apps/web/package.json` and `apps/web/components.json`:
- **Next.js**: `16.4.5` (`output: "standalone"`, Turbopack/App Router, `src/proxy.ts` exporting `proxy`)
- **React**: `19.3.1` (`react`, `react-dom`)
- **UI Primitives**: `shadcn@^4.23.0` (`style: "base-nova"`, `@base-ui/react@^1.9.0`, `lucide-react@^1.70.0`, `class-variance-authority@^0.7.1`)
- **Utility Merging**: standalone `cn@^0.5.2` re-exported from `apps/web/src/lib/utils.ts` (`export { cn } from "cn"`)
- **Styling**: Tailwind CSS `^4.3.5` CSS-first configuration (`@import "tailwindcss"`, `@theme inline`, `oklch(...)` tokens) with `tw-animate-css@^1.4.0`

---

## 1. Next.js 16 Routing & Proxy Boundary (`src/proxy.ts`)

Per Next.js 16 official documentation and `scripts/check-nextjs-conventions.ts` (`pnpm lint:nextjs-conventions`):
- **Never create `middleware.ts` or `src/middleware.ts`.** Next.js 16 replaces `middleware` with `src/proxy.ts` exporting `export async function proxy(request: NextRequest)`.
- Keep `middleware.ts` absent so CI Gate 14 and standalone tracing (`ƒ Proxy`) succeed without conflict errors.
- `apps/web/next.config.ts` sets `output: "standalone"`, `outputFileTracingRoot: repoRoot`, dynamic LAN `allowedDevOrigins`, and rewrites `/api/*` -> backend (`BACKEND_HOST`:`BACKEND_PORT` or `INTERNAL_API_URL`) and `/haihire-resumes/*` -> MinIO.
- Server vs. Client boundary in `apps/web/src/app/`:
  - Only **4 server files** exist (`layout.tsx`, `icon.tsx`, `careers/[orgSlug]/page.tsx`, `careers/[orgSlug]/[jobSlug]/page.tsx`).
  - Interactive workspace views (`35` files under `src/app/`) use `"use client"` with React Query hydration from `useAuth` and workspace hooks.
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

## 3. Tailwind CSS v4 (`globals.css`) & shadcn `base-nova`

Per Tailwind CSS v4 and `ui.shadcn.com` v4 documentation:
- **CSS-First Configuration:** Never reintroduce `tailwind.config.js` / `tailwind.config.ts`. Configure all theme tokens in `apps/web/src/app/globals.css`:
  - `@import "tailwindcss";`
  - `@import "tw-animate-css";`
  - `@import "shadcn/tailwind.css";`
  - `@custom-variant dark (&:is(.dark *));`
  - `@theme inline { ... }` pointing directly to live CSS custom properties (`var(--background)`, `var(--primary)`, etc.) so `.dark` switches apply dynamically at runtime.
- **Color Space:** Define semantic CSS variables (`:root` and `.dark`) using perceptual `oklch(...)` values instead of hardcoded hex or ad-hoc palette utilities.
- **Base UI (`base-nova`):**
  - `apps/web/components.json` specifies `"style": "base-nova"`. All primitives in `apps/web/src/components/ui/` are built on `@base-ui/react`, NOT `@radix-ui/react-*`.
  - Never install `@radix-ui/*` packages or replace `cn` from `"cn"` with manual `clsx` + `tailwind-merge`.
  - Prefer `render` prop composition or Base UI slot patterns per `base-nova` generated components rather than Radix `asChild`.

---

## 4. Accessibility & UI Conventions

- Preserve interactive table headers (`scope="col"`, `aria-sort`), keyboard activation via `useKeyboardClick`, decorative icon `aria-hidden="true"`, and a single `<main id="main-content">` skip-link target.
- Keep dialogs and destructive flows gated through shared confirmation modals (`ConfirmDestructiveModal`) and consistent status states (`403`/`404`).
- Respect user and organization localization (`vi` / `en`) and RTL/truncation resilience across narrow and wide viewports (`375px`, `1366px`, `1536px`, `1920px`).
