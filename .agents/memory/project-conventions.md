---
type: project
created: 2026-05-25
updated: 2026-09-17
---

# Project Conventions

## Documentation & Memory Language (MANDATORY)
- **All memory files (`.agents/memory/*`) must be written in English only.** Never write memory files in Vietnamese or any other language.

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.
- When committing, ALWAYS use `git add .` (do NOT add individual files separately). Run `git add .` as a separate command first, then `git commit -m "..."` as a separate command. Never chain them together.
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
