---
version: "1.0.0"
name: "HaiHire Design System"
description: "Unified B2B Recruitment & ATS design tokens, spacing scale, typography, iconography, and component contracts for HaiHire Web."
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  on-primary: "#FFFFFF"
  secondary: "#F1F5F9"
  on-secondary: "#0F172A"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#F8FAFC"
  on-surface: "#0F172A"
  on-surface-muted: "#64748B"
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  success: "#059669"
  warning: "#D97706"
  error: "#E11D48"
  info: "#2563EB"
  dark-background: "#020617"
  dark-surface: "#0F172A"
  dark-surface-muted: "#1E293B"
  dark-on-surface: "#F8FAFC"
  dark-on-surface-muted: "#94A3B8"
  dark-border: "#1E293B"
  dark-border-strong: "#334155"
typography:
  headline-lg:
    fontFamily: "Inter"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "Inter"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: "Inter"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  body-md:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label-lg:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  label-md:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
  label-sm:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 40px
components:
  page-container:
    backgroundColor: "{colors.background}"
    padding: 24px
  card-standard:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-compact:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  modal-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 36px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    height: 36px
  input-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    height: 36px
  toast-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 12px
---

# HaiHire Design System

> Single Source of Truth (SSOT) for visual tokens, spacing, typography, iconography, borders, and component contracts across the HaiHire web application (`apps/web`).
> Must be read before building net-new UI or refactoring existing screens (enforced by [conventions.md](docs/architecture/conventions.md)).

---

## Overview

HaiHire is a B2B Recruitment & Applicant Tracking System (ATS) built for high-frequency operational workflows: reviewing candidates, dragging pipeline stages, scheduling interviews, sending candidate emails, and configuring organization permissions.

- **Visual Direction:** Crisp, high-contrast Slate surfaces with Trust Blue primary actions, subtle `1px` structural borders, and restrained micro-shadows — optimized for long daily use in both **Light** and **Dark** themes.
- **Tech Stack Alignment:** Next.js 16 App Router, Tailwind CSS v4 (`apps/web/src/app/globals.css`), `shadcn/ui` + `@base-ui/react` primitives (`apps/web/src/components/ui/`), `lucide-react` icons, and `react-toastify` notifications (`D-017`).
- **i18n & Density Awareness:** Every component and container must expand cleanly for both English and Vietnamese strings (`min-w-0`, fluid height, wrapping allowed on narrow viewports) with zero hardcoded UI text (`pnpm lint:i18n`).

---

## Colors

HaiHire uses **Slate** (`slate-50` through `slate-950`) as the sole neutral scale and **Trust Blue (`#2563EB`)** as the primary interactive accent. Arbitrary neutral hex colors (such as `#fbfbfd`, `#1a1a1a`, or `#202020`) are deprecated and must converge to semantic Slate tokens.

### Surface & Border Hierarchy

| Token Role                      | Light Mode (Tailwind)                          | Dark Mode (Tailwind)            | Usage                                            |
| :------------------------------ | :--------------------------------------------- | :------------------------------ | :----------------------------------------------- |
| **App Canvas**                  | `bg-slate-50/70` (`#F8FAFC`)                   | `dark:bg-slate-950` (`#020617`) | Outer page shell background                      |
| **Primary Card / Panel**        | `bg-white` (`#FFFFFF`)                         | `dark:bg-slate-900` (`#0F172A`) | Cards, tables, modal bodies, drawers             |
| **Inset / Header / Muted Band** | `bg-slate-50/80` or `bg-slate-100/70`          | `dark:bg-slate-800/60`          | Table headers, modal headers, nested info panels |
| **Default Hairline Border**     | `border-slate-200/80` or `border-slate-200/90` | `dark:border-slate-800`         | Cards, panels, section dividers, headers         |
| **Interactive / Focus Border**  | `border-slate-300`                             | `dark:border-slate-700`         | Hovered cards, inputs, outlined controls         |

### Accent & Semantic Status Colors

| Semantic Role                  | Primary Fill / Text                            | Subtle Tinted Badge / Banner                                                                                 | Reserved Meaning                                      |
| :----------------------------- | :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **Primary CTA**                | `bg-blue-600 hover:bg-blue-700 text-white`     | `bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50` | Main page CTAs, active nav, Save buttons, links       |
| **Success / Hired / Active**   | `text-emerald-600 dark:text-emerald-400`       | `bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300`          | Published jobs, verified status, positive delta       |
| **Warning / Pending / Review** | `text-amber-600 dark:text-amber-400`           | `bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300`                    | Drafts, unsaved warning, lock notices                 |
| **Destructive / Rejected**     | `text-rose-600 dark:text-rose-400` (`#E11D48`) | `bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300`                         | Delete modals, rejected stage, form validation errors |
| **Neutral / Archived**         | `text-slate-600 dark:text-slate-400`           | `bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300`                      | Counts, metadata pills, secondary tags                |

> **Purple Ban:** Never use purple/violet as a default UI accent, active pill, or brand highlight unless explicitly demanded by a tenant branding spec.

---

## Typography

All web UI uses **Inter** (`--font-sans` configured once in `apps/web/src/app/layout.tsx`) with OpenType `rlig` and `calt` features enabled in `globals.css`.

### Type Scale & Weight Discipline

| Role                                 | Classes                                                                           | Usage                                                                                                                                                           |
| :----------------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page Title (`h1`)**                | `text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white`     | Standard top-of-page heading across all dashboard & settings views (via `PageHeader`)                                                                           |
| **Modal / Dialog Title (`h2`)**      | `text-base sm:text-lg font-bold leading-tight text-slate-900 dark:text-white`     | `CustomModal`, `SlideOver`, and confirmation dialogs                                                                                                            |
| **Section / Card Title (`h2`/`h3`)** | `text-sm sm:text-base font-semibold text-slate-900 dark:text-white`               | Card headers, panel titles, empty state headings                                                                                                                |
| **Body Copy & Table Cells**          | `text-sm text-slate-700 dark:text-slate-300 leading-relaxed`                      | Descriptions, notes, primary table columns                                                                                                                      |
| **Secondary Meta / Field Label**     | `text-xs font-medium text-slate-500 dark:text-slate-400`                          | Form labels (`font-semibold` when paired above inputs), timestamps, sublabels                                                                                   |
| **Micro Label / Column Header**      | `text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400`          | Table `<th>` labels, dense helper captions (avoid `< 12px` arbitrary `text-[10px]` / `text-[11px]` where readability suffers; floor interactive text at `12px`) |
| **Numeric KPI / Counters**           | Add `tabular-nums` (`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums`) | Metric numbers, row counts, pagination indices, dates                                                                                                           |
| **Technical Code / Tokens / IDs**    | `font-mono text-xs`                                                               | Template variables (`{{candidate_name}}`), webhooks, slugs                                                                                                      |

- **Heading Weight Cap:** Standardized page headings use `font-bold` (`700`), reserving `font-extrabold` / `font-black` exclusively for marketing Hero headlines in `components/landing/`.

---

## Layout

### Viewport Container & Page Padding

1. **Full-Workspace Dashboard Views** (Dashboard, Jobs, Candidates, Applications, Interviews, Sourcing):
   - `<main id="main-content" className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-6">`
2. **Focused Form / Detail Views** (e.g. standalone New Job / Detail screens inside dashboard):
   - Outer wrapper keeps `px-4 py-6 sm:px-6 lg:px-8` with inner focused column (`max-w-5xl mx-auto space-y-6` or `max-w-6xl mx-auto space-y-6`).
3. **Settings Shell Content** (`apps/web/src/app/dashboard/settings/layout.tsx`):
   - `<section className="w-full flex-1 min-w-0 md:h-full md:min-h-0 md:overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 space-y-6">`

### Spacing Scale (4px / 8px Grid)

Never invent ad-hoc margins (`mb-2.5`, `mt-3.5`, `my-5`); choose cleanly from this rhythm:

| Context                                   | Spacing Token / Class                                                                                  | Value                                |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------- |
| **Between Page Sections**                 | `space-y-6` / `gap-6`                                                                                  | `24px`                               |
| **Card Grid Gaps**                        | `gap-4 sm:gap-5` or `gap-6`                                                                            | `16px–24px`                          |
| **Standard Card / Section Panel Padding** | `p-5 sm:p-6`                                                                                           | `20px / 24px`                        |
| **Compact Metric / Stat Card Padding**    | `p-4 sm:p-5`                                                                                           | `16px / 20px`                        |
| **Modal Header / Footer Padding**         | `px-6 py-4`                                                                                            | `24px × 16px`                        |
| **Modal Body / Form Stack**               | `p-6` with `space-y-4` (sections) and `space-y-1.5` (label-to-input)                                   | `24px` / `16px` / `6px`              |
| **Toolbar / Button Group Gap**            | `gap-2` (`8px` minimum between clickable controls) or `gap-3` (`12px`)                                 | `8px / 12px`                         |
| **Table Wrapper & Overflow**              | Wrap tables inside bordered container with `overflow-x-auto`; cell padding `px-4 py-3` (`16px × 12px`) | Prevents horizontal viewport blowout |

---

## Elevation & Depth

HaiHire favors **subtle hairline borders + tonal surface contrast** over heavy drop shadows:

| Layer                           | Light Mode                                                                             | Dark Mode                                             | When to Use                                      |
| :------------------------------ | :------------------------------------------------------------------------------------- | :---------------------------------------------------- | :----------------------------------------------- |
| **Level 0 — Canvas**            | `bg-slate-50/70`                                                                       | `dark:bg-slate-950`                                   | Page background                                  |
| **Level 1 — Surface Card**      | `bg-white border border-slate-200/90 shadow-2xs`                                       | `dark:bg-slate-900 dark:border-slate-800`             | Default cards, tables, empty states              |
| **Level 2 — Interactive Hover** | `hover:border-slate-300 hover:shadow-xs`                                               | `dark:hover:border-slate-700`                         | Clickable metric cards, clickable list cards     |
| **Level 3 — Floating Controls** | `bg-white border border-slate-200 shadow-lg`                                           | `dark:bg-slate-900 dark:border-slate-800`             | Dropdown menus, select popovers, tooltips        |
| **Level 4 — Modal & Drawer**    | `bg-white border border-slate-200/90 shadow-2xl` on `bg-slate-900/50 backdrop-blur-xs` | `dark:bg-slate-900 dark:border-slate-800 bg-black/70` | `CustomModal`, `SlideOver`, confirmation dialogs |

---

## Shapes

Use **three strict corner radius tiers** — never mix `rounded-xl` and `rounded-2xl` on sibling elements of the same hierarchy:

| Tier                                        | Tailwind Class | Pixel Value | Components                                                                                                                                      |
| :------------------------------------------ | :------------- | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1 — Controls & Small Chips**         | `rounded-lg`   | `8px`       | Form `<Input>`, `<Select>`, `<Textarea>`, secondary/icon `<Button>`, sidebar nav icon chips (`h-8 w-8`), table action buttons                   |
| **Tier 2 — Primary CTAs, Headers & Toasts** | `rounded-xl`   | `12px`      | Primary page CTA buttons, `PageHeader` icon badge (`h-10 w-10`), segmented tab bars, dropdown menus, `react-toastify` cards, settings nav links |
| **Tier 3 — Content Containers**             | `rounded-2xl`  | `16px`      | Dashboard & settings surface cards (`MetricCard`, `Card`), empty states, `CustomModal` panels, data-table containers                            |
| **Pill — Badges & Avatars**                 | `rounded-full` | `9999px`    | Status badges (`StageBadge`, `JobStatusBadge`), user avatars, count pills                                                                       |

---

## Components

### 1. Page Header (`PageHeader`)

- Always reuse [page-header.tsx](apps/web/src/components/shared/page-header.tsx) at the top of dashboard & settings pages instead of writing ad-hoc `<div><h1>` headers.
- Structure: `pb-5 border-b border-slate-200/80 dark:border-slate-800`, icon badge `h-10 w-10 rounded-xl` (with `h-5 w-5` icon), `h1` `text-xl sm:text-2xl font-bold`, optional `1–2` line muted subtitle, and right-aligned action slot (`gap-2`).
- Keep header action zones uncluttered (no arbitrary decorative badges next to settings titles, per `b983b70`).

### 2. Iconography (`lucide-react` Exclusively)

- **Single Icon Family:** Use `lucide-react` everywhere. Do not introduce secondary icon packs or emojis in product UI.
- **Standard Icon Sizes:**
  - `h-3.5 w-3.5` (`14px`): Inline status badges, lock indicators, compact metadata icons next to `12px` text.
  - `h-4 w-4` (`16px`): Buttons (`size="sm"` / `default`), inputs/search icons, table row actions, sidebar nav items (`h-8 w-8 rounded-lg` container).
  - `h-5 w-5` (`20px`): `PageHeader` and `MetricCard` container icons, modal header icons.
  - `h-8 w-8 stroke-[1.5]` (`32px`): Empty state hero icon inside `h-16 w-16 rounded-2xl` container.
- **Accessibility:** Add `aria-hidden="true"` to decorative icons paired with visible labels; always provide translated `aria-label` on icon-only buttons.

### 3. Cards & Containers

- Standard card contract: `rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs` with `p-5 sm:p-6` (or `p-4 sm:p-5` for compact KPI/list items).
- Use `apps/web/src/components/ui/card.tsx` for composable cards or keep class parity (`rounded-2xl` + `border-slate-200/90 dark:border-slate-800`) when refactoring existing custom cards so cards across Dashboard, Jobs, Candidates, and Settings align identically.

### 4. Modals, Drawers & Notifications

- **Modals:** Always use `CustomModal` (`apps/web/src/components/shared/custom-modal.tsx`) or `ConfirmDestructiveModal`. Standardize surface to `bg-white dark:bg-slate-900` with header `bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800` and padding `px-6 py-4` header / `p-6` body.
- **Slide-Over Drawers:** Use `SlideOver` (`apps/web/src/components/shared/slide-over.tsx`) with consistent `p-5 sm:p-6` inner section spacing.
- **Transient Feedback:** Always route through `toast` in `apps/web/src/lib/toast.ts` (`react-toastify` at `bottom-right`, mobile offset clearing bottom bar) per `D-017` — never use `sonner` or ad-hoc temporary inline alerts for one-off action feedback.

### 5. Interactive Controls & States

- Buttons and links styled as buttons must include `cursor-pointer` (and `disabled:cursor-not-allowed disabled:opacity-50`).
- Every form control keeps standard height `h-9` (`36px`) for primary toolbars/modals or `h-8` (`32px`) for compact table/inline actions, with minimum `gap-2` (`8px`) between adjacent targets.
- Interactive transitions use crisp `transition-colors duration-150` or `transition-all duration-150`; respect `prefers-reduced-motion`.

---

## Do's and Don'ts

- **Do** reuse `apps/web/src/components/shared/` (`PageHeader`, `MetricCard`, `SearchInput`, `CustomModal`, `SlideOver`, `StatusState`, `ConfirmDestructiveModal`) before creating page-local markup.
- **Do** wrap all visible UI copy, placeholders, empty states, and `aria-label` strings in `t(...)` keys across both `vi.ts` and `en.ts`.
- **Do** keep `min-w-0` on flex children and `overflow-x-auto` on tables so long Vietnamese/English strings never overflow containers.
- **Don't** introduce arbitrary surface hex colors (`#fbfbfd`, `#1a1a1a`, `#202020`, `#fafafa`) — use `slate-*` or semantic CSS tokens.
- **Don't** mix `font-black` and `font-bold` across dashboard page headings (`PageHeader` always uses `font-bold`).
- **Don't** mix corner radii (`rounded-lg`, `rounded-xl`, `rounded-2xl`) within the same component group (e.g., sibling toolbar buttons or sibling cards).
- **Don't** stack icons without spacing or build clickable `<div>` elements without `role="button"`, keyboard handling, and visible focus rings (`focus-visible:ring-2`).
