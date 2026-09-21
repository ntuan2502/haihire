---
type: project
created: 2026-05-25
updated: 2026-09-18T20:53
---

# Project Conventions

## Documentation & Memory Language (MANDATORY)
- **All memory files (`.agents/memory/*`) must be written in English only.** Never write memory files in Vietnamese or any other language.
- **Comments in code, `.env`, and `.env.example` must be written in English only.** Vietnamese is reserved exclusively for conversational dialogue with the user.

## Pure TypeScript & Scripting Conventions (MANDATORY)
- **100% TypeScript Repository**: No manually written plain `.js`, `.mjs`, or `.cjs` files are allowed. All code must be in TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`).
- **TypeScript-Supported Formats**: `.mts` and `.cts` are recognized first-class TypeScript modules and are completely valid alongside `.ts` and `.tsx`.
- **Automatic Format Conversion**: If any external tool, generator, or scaffolding creates files in plain JavaScript formats without TypeScript support, convert them to their corresponding TypeScript equivalent (`.ts` / `.tsx` / `.mts` / `.cts`).
- **Scripts**: Any utility or maintenance scripts (e.g., `scripts/*.ts`) must be authored in TypeScript and executed via native Node 22+ execution (`node scripts/<script>.ts`) or `tsx`.

## Environment Variable & Configuration Conventions
- **Single Source of Truth**: All environment variables must be declared and validated using Zod in centralized schema files:
  - Backend: `backend/src/config/env.ts`
  - Frontend: `frontend/src/lib/env.ts`
- **Zero Fallback Policy**: Never provide fallback defaults for secrets, ports, database URLs, or required configuration keys.
- **Fail-Fast Startup**: The process must crash immediately (`process.exit(1)`) with a clean list of missing/invalid variables if `.env` does not conform to the schema.
- **Consumer Files**: Never call `process.env` directly in feature modules, services, or test configs. Always import the validated, type-safe `env` object.
- **Synchronization Verification**: Maintain 100% key parity between `.env` and `.env.example` across all packages. Verify parity via `pnpm run check:env`.

## Full-Stack Pagination Conventions
- **Zero Client-side Array Slicing**: Endpoints providing list views must execute true server-side pagination with database-level `skip` and `take`.
- **No Backward-Compatibility Hacks**: Do not fall back to returning the full dataset when pagination parameters are omitted. Both frontend and backend must strictly adhere to `PaginationParams` (`page`, `limit`, `search`) and `PaginatedResult<T>`.
- **Total Count Metadata**: Always return `{ data: T[], total: number, page: number, limit: number, totalPages: number }` to power client pagination controls.

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]` or `refactor/[task-slug]`.
- When committing, ALWAYS use `git add .` (do NOT add individual files separately). Run `git add .` as a separate command first, then `git commit -m "..."` as a separate command. Never chain them together.
- **Commit message format: Conventional Commits with scope** → `type(scope): description`.
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`.
  - Scope is mandatory. Use the affected module/area, e.g. `config`, `i18n`, `jobs`, `ui`, `auth`, `api`, `core`.
  - Message is in English, lowercase, no period at the end.
- Local commit only, do not `git push` unless explicitly requested.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.

## Brand Identity & Logos
- The official product brand name is **HaiHire** (monogram: **H**).
- Always use the centralized `BRAND_CONFIG` from `@haihire/shared` for brand names, monograms, legal names, and careers portals to support straightforward white-labeling and on-premise deployments.
- Reusable brand logo component lives in `frontend/src/components/shared/brand-logo.tsx` (`<BrandLogo />`).
- Whenever reference images or mockups contain placeholder logos/names (like Reqcore or ATS), ALWAYS replace with **HaiHire** (or "H" monogram) across all UI components, logos, and copy.

## Validation & Testing Conventions
- If only frontend UI is modified, only run frontend lint and build (`pnpm --filter frontend run build ; pnpm --filter frontend run lint`) without running backend tests or full test suites.
- Always execute commands individually or use `;` (not `&&`) in Windows PowerShell.
- Always use `pnpm` or `pnpx` (NEVER use `npx`).

## Database & Seed Conventions
- **NEVER run database seed (`pnpm run seed` or scripts that wipe data) automatically.** Always ask for explicit user confirmation before running seed, as it deletes all existing data in the database.
- **Cascade Deletion**: Schema relationships must define `onDelete: Cascade` in `contract.prisma` for child records (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) to guarantee relational data integrity.

## Internationalization (i18n) & Text Conventions (MANDATORY)
- **Zero hardcoded text**: No raw user-facing strings or placeholders may be initialized directly in source code. All text must be retrieved through the i18n translation system (`useI18n()` / `t()`).
- Applies 100% across all `.tsx` and `.ts` files on the frontend.
- Standard workflow when adding new strings:
  1. Declare the key and type in `frontend/src/i18n/types.ts`.
  2. Add the Vietnamese translation in `frontend/src/i18n/locales/vi.ts`.
  3. Add the English translation in `frontend/src/i18n/locales/en.ts`.
  4. Access via `t("key.path")` in the component or page.

## Component Organization & Directory Conventions (MANDATORY)
- **Shadcn Isolation (`frontend/src/components/ui/`)**: Reserved strictly for pristine Shadcn primitives added via `pnpx shadcn add`.
- **ATS Shared Components (`frontend/src/components/shared/`)**: Proprietary shared components, custom selects, spinners, badges.
- **Layout Components (`frontend/src/components/layout/`)**: Application shell and navigation.
- **Application Context Providers (`frontend/src/components/providers/`)**: App-level state providers.
- **Zero Loose Root Components**: Never place loose `.tsx` files directly at `frontend/src/components/` root.

## Strict Typing & Zero `any` Policy (MANDATORY)
- **Zero `any` in application code**: The use of `any` is strictly prohibited across backend, frontend, and shared packages.
- Always define clear types, interfaces, DTOs, or schema types.
- Utilize `@ats/types` as the canonical source for domain models.
