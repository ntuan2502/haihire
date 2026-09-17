---
type: project
created: 2026-05-25
updated: 2026-09-17T11:22
---

# Project Conventions

## Documentation & Memory Language (MANDATORY)
- **All memory files (`.agents/memory/*`) must be written in English only.** Never write memory files in Vietnamese or any other language.

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.
- When committing, ALWAYS use `git add .` (do NOT add individual files separately). Run `git add .` as a separate command first, then `git commit -m "..."` as a separate command. Never chain them together.
- **Commit message format: Conventional Commits with scope** → `type(scope): description`.
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`.
  - Scope is mandatory. Use the affected module/area, e.g. `i18n`, `navigation`, `jobs`, `ui`, `auth`, `api`.
  - Examples: `feat(i18n): add missing Vietnamese keys`, `refactor(jobs): remove legacy popup`, `fix(auth): handle token expiry`.
  - Message is in English, lowercase, no period at the end.
- Local commit only, do not `git push` unless explicitly requested.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## Brand Identity & Logos
- Whenever reference images or mockups contain **Reqcore** (or other placeholder logos/names), ALWAYS replace with **ATS** (or "A" monogram / ATS logo) across all UI components, logos, and copy.

## Validation & Testing Conventions
- If only frontend UI is modified, only run frontend lint and build (`pnpm --filter frontend run build ; pnpm --filter frontend run lint`) without running backend tests or full test suites.
- Always use `;` (not `&&`) for chaining commands in PowerShell.
- Always use `pnpm` or `pnpx` (NEVER use `npx`).

## Database & Seed Conventions
- **NEVER run database seed (`pnpm run seed` or scripts that wipe data) automatically.** Always ask for explicit user confirmation before running seed, as it deletes all existing data in the database.

## Internationalization (i18n) & Text Conventions (MANDATORY)
- **Zero hardcoded text**: No raw user-facing strings or placeholders may be initialized directly in source code. All text must be retrieved through the i18n translation system (`useI18n()` / `t()`).
- Applies 100% across all `.tsx` and `.ts` files on the frontend (including UI components, pages, hooks, forms, modals, tooltips, dialogs, toast/alert messages, and error states).
- Thoroughly check and translate **placeholders** (`<Input placeholder={t(...)}>`, `<Textarea placeholder={t(...)}>`, `<SelectValue placeholder={t(...)}>`), field labels, headings, empty states, and auxiliary descriptions.
- Standard workflow when adding new strings:
  1. Declare the key and type in `frontend/src/i18n/types.ts`.
  2. Add the Vietnamese translation in `frontend/src/i18n/locales/vi.ts`.
  3. Add the English translation in `frontend/src/i18n/locales/en.ts`.
  4. Access via `t("key.path")` in the component or page. Direct text hardcoding is strictly forbidden.

## Component Organization & Directory Conventions (MANDATORY)
- **Shadcn Isolation (`frontend/src/components/ui/`)**:
  - Reserved strictly for pristine Shadcn primitives added via `pnpx shadcn add`.
  - Never add custom, domain, or proprietary components into `components/ui/`.
- **ATS Shared Components (`frontend/src/components/shared/`)**:
  - All proprietary shared components, wrappers, custom selects, spinners, badges, and controls must reside in `frontend/src/components/shared/`.
  - If a Shadcn primitive requires deep customization, wrap or extend it inside `components/shared/` instead of directly modifying the pristine registry file in `components/ui/`.
- **Layout Components (`frontend/src/components/layout/`)**:
  - Application shell and navigation components (`navbar.tsx`, headers, footers, sidebars).
- **Application Context Providers (`frontend/src/components/providers/`)**:
  - App-level providers (`query-provider.tsx`, `theme-provider.tsx`).
- **Zero Loose Root Components**:
  - Never place loose `.tsx` files directly at `frontend/src/components/` root. Every component belongs in `ui/`, `shared/`, `layout/`, `providers/`, or a domain feature folder.
- **Dropdown & Select Conventions**:
  - Zero native HTML `<select>` elements. Use `CustomSelect` (`@/components/shared/custom-select`) or styled Base-UI/Shadcn primitives with `rounded-xl` trigger, rotating chevron, and `rounded-2xl backdrop-blur-xl` popup.


