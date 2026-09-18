---
type: feedback
created: 2026-07-18
updated: 2026-09-18
---

# Feedback History

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
