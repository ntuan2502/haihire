# HaiHire Frontend Service

> Enterprise recruitment portal and applicant tracking interface built with Next.js 16 (App Router), React 19 Server Components (RSC), Tailwind CSS v4, and TanStack Query v5.

---

## 🛠️ Technology Stack & Architecture

- **Framework:** Next.js 16.3.8 / React 19.3.0 (App Router architecture)
- **Styling & Design System:** Tailwind CSS v4 (`@tailwindcss/postcss`), Radix UI / Base UI primitives, Lucide React icons
- **State & Data Fetching:** `@tanstack/react-query` v5 with centralized query key factories
- **Drag & Drop Pipeline:** `@dnd-kit/core` and `@dnd-kit/sortable` for interactive candidate Kanban boards
- **Internationalization (i18n):** Dual-language support (Vietnamese `vi` and English `en`) with strict zero-hardcoded-text enforcement
- **Theme & Anti-FOUC:** `next-themes` with synchronous `<Script id="theme-init" strategy="beforeInteractive">` header execution

---

## 🌐 Network & Port Allocation

- **Development Port:** `13000` (Managed via custom dev server `scripts/dev.ts`)
- **Backend Internal URL:** `http://127.0.0.1:13001` (SSR direct backend queries)
- **Production Port:** `3000` (Node standalone container)

---

## 📁 Source Code Organization

```
src/
├── app/             # Next.js App Router (layout, providers, root routes)
│   ├── (auth)/      # Authentication views (login, register, reset-password)
│   ├── (dashboard)/ # Authenticated recruiter views (jobs, candidates, pipeline, settings)
│   ├── careers/     # Public career portal powered by React Server Components (RSC)
│   └── api/         # Next.js route handlers & proxy rewrites
├── components/      # UI component hierarchy
│   ├── ui/          # Pristine Shadcn UI primitives (Button, Input, Dialog, etc.)
│   ├── shared/      # ATS components (BrandLogo, MetricCard, StageBadge, CustomSelect)
│   └── layout/      # AppShell, TopNav, Sidebar, ThemeToggle, LanguageSwitcher
├── hooks/           # Domain query hooks (use-jobs-queries, use-candidates-queries)
├── lib/             # API client (Axios gatekeeper), query-keys factory, Zod env
└── i18n/            # Localization dictionary (vi.ts, en.ts) and translation provider
```

---

## ⚡ Development & Scripts

All scripts can be run from the root repository or inside `frontend/`:

```bash
# Start frontend dev server on port 13000
pnpm run dev

# Compile Next.js production build (.next/)
pnpm run build

# Start production server (after build)
pnpm run start

# Run unit and component test suite (Vitest + Testing Library)
pnpm run test

# Type-check TypeScript without emitting output
pnpm run typecheck

# Lint source code with ESLint
pnpm run lint

# Audit two-way key parity between vi.ts and en.ts
pnpm run check:i18n
```

---

## 🎨 Design & Coding Conventions

1. **Zero Hardcoded Text:** All user-facing strings must use `useI18n()` / `t("key.path")` declared in `frontend/src/i18n/types.ts`.
2. **Full-Width Dashboard Layouts:** Container layouts must utilize responsive full-width classes (`px-4 sm:px-6 lg:px-8 xl:px-10 w-full`), avoiding fixed-width max-w shells.
3. **Defensive API Gatekeeper:** Axios request interceptors validate all request URLs and immediately abort if malformed tokens (like `[object Object]`) appear in path segments.
4. **React SyntheticEvent Hygiene:** Never pass parameterized callbacks directly to `onClick`; wrap in arrow functions (`() => onAction(id)`).
5. **No Monolithic Files:** Component files must remain modular and focused (< 400 lines).
