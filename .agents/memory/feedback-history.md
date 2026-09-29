---
type: feedback
created: 2026-07-18
updated: 2026-09-18
---

## 2026-09-28: React Callback Hygiene, Network Gatekeeper & Comprehensive Test Baseline
- **Feedback**: Prevent subtle runtime bugs (like `DELETE /interviews/[object%20Object]`) caused by passing parameterized callbacks directly to `onClick` which allows `MouseEvent` to overwrite data arguments. Build automated test suites covering all screens and happy/bad cases so that future changes do not break existing behavior.
- **Actionable Rule**: Never pass parameterized callbacks directly to `onClick`; always wrap with `() => fn(item)`. Add client-side Axios gatekeepers to reject malformed URL segments before network requests. Maintain full test suite coverage (200+ tests across backend and frontend) and verify with `pnpm test` on every milestone.

## 2026-09-23: Standardized Project Commands & package.json First
- **Feedback**: Always check if a command already exists in `package.json` before running tasks. Do not arbitrarily append parameters or run varied ad-hoc commands. If a command or script is missing, explain its purpose and propose adding it to `package.json` to establish a unified, standard command suite across the entire project.
- **Actionable Rule**: Check root and workspace `package.json` files first. Run existing scripts as configured. If a standard command is missing (e.g. `typecheck`, `lint:frontend`, `lint:backend`), propose it explicitly to the user before adding it to `package.json`.

## 2026-09-19: Senior / Principal Engineering Mindset (No Quick-and-Dirty Patches)
- **Feedback**: Adopt the mindset and depth of a Senior/Principal Engineer. Avoid superficial "instant-noodle" patches that mask underlying architectural problems.
- **Actionable Rule**: Always perform root-cause analysis and fix problems at their architectural source. Never mask symptoms (such as using index fallbacks to suppress React duplicate-key warnings, swallowing errors, or masking backend data model issues with client-side deduplication). Embrace framework warnings (fail fast and loudly) to ensure data integrity and long-term maintainability.

## 2026-09-18: Pure TypeScript Mandate (Zero .mjs / .cjs / .js Files)
- **Feedback**: Do not generate `.mjs` or `.js` files; use `.ts` exclusively. The project is strictly TypeScript and will not accept manually authored JavaScript files.
- **Actionable Rule**: Always create utility, automation, or verification scripts using `.ts` (e.g. `scripts/check-env.ts`), executed directly via Node 22+ native execution (`node scripts/<name>.ts`) or `tsx`. Never create `.mjs`, `.cjs`, or `.js` files manually anywhere in the codebase.

## 2026-09-18: Centralized Environment Validation & No Fallbacks
- **Feedback**: Avoid scattered ad-hoc `process.env` checks across different files. Do not use fallbacks because missing variables should fail-fast at startup. Keep environment variables centralized and synchronized. Comments in `.env` must be in English.
- **Actionable Rule**: Validate environment variables centrally using Zod schemas (`backend/src/config/env.ts`, `frontend/src/lib/env.ts`). All consumer modules and test configs (`vitest.config.ts`) must import the typed `env` object without fallbacks. Keep `.env` and `.env.example` in 100% key parity with English comments, verified by `pnpm run check:env`.

## 2026-09-18: Full-Stack Pagination & Data Integrity
- **Feedback**: Drop backward-compatibility hacks (returning all rows when pagination params are missing). Update frontend to true server-side pagination to prevent excessive data scraping and heavy payload downloads.
- **Actionable Rule**: Enforce server-side pagination across backend and frontend using `PaginationParams` and `PaginatedResult<T>`. Never return unpaginated datasets on list views. Enforce database-level `onDelete: Cascade` in `contract.prisma` to eliminate orphaned child rows.

## 2026-09-17: Memory Language Requirement
- **Feedback**: Memory records must be written in English only, never in Vietnamese.
- **Actionable Rule**: All files inside `.agents/memory/` must strictly be maintained in English. Do not write Vietnamese in any memory topic or index file.

## 2026-09-17: Strict i18n Requirement & Zero Hardcoded Text
- **Feedback**: All UI texts and placeholders must be internationalized and never initialized directly in code; everything must be retrieved via translations. Check all files, placeholders, and select options in .tsx and .ts.
- **Actionable Rule**: Always verify and migrate 100% of text, placeholders, labels, and select values across all `.tsx` and `.ts` files using `useI18n()` / `t()`. Maintain full parity in `types.ts`, `vi.ts`, and `en.ts`. Never miss any placeholder, select value, tooltip, or modal text.
