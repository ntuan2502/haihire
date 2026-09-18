---
type: user
created: 2026-07-18
updated: 2026-09-18
---

# User Preferences

## Memory Language (MANDATORY)
- **Memory files must always be written in English**: All records in `.agents/memory/` must be written exclusively in English. Never use Vietnamese in memory files.

## Communication Language vs Code / Env Comments
- **Vietnamese is strictly for chatting with the user**: All code comments, docstrings, variable names, and comments inside `.env` and `.env.example` files must be written exclusively in English.

## Internationalization (i18n)
- **Zero hardcoded text**: All UI text, placeholders, labels, select values, tooltips, success/error messages must always be managed through the i18n system (`useI18n()` / `t(...)`). Never initialize or hardcode text directly in `.tsx` / `.ts` files.

## React Imports Convention
- **Always use named imports from `"react"`**: e.g., `import { useState, useEffect, type ReactNode } from "react"`.
- **Forbidden in application code**: Do NOT use default `import React from "react"`, wildcard `import * as React from "react"`, or namespace syntax like `React.useState`, `React.ReactNode`, etc.
- **Strict Exception**: The `frontend/src/components/ui/` directory is exclusively reserved for pristine Shadcn CLI primitives and must NEVER be modified.

## Pure TypeScript Only (No JavaScript Files, No .mjs / .cjs)
- **Zero manually created `.js`, `.mjs`, or `.cjs` files**: The project is 100% TypeScript. Never create `.js`, `.mjs`, or `.cjs` files anywhere in the project (including scripts, utilities, configs, tools). Always use TypeScript (`.ts` or `.tsx`) exclusively, executed via Node's native TypeScript support (Node 22+) or `tsx`.

## Centralized Environment Validation (Zero Fallback / Single Source of Truth)
- **No ad-hoc environment checking in individual files**: Never scatter `if (!process.env.XYZ) throw ...` or `process.env.XYZ || "default"` across random service files or configs.
- **Strictly forbidden to use silent fallbacks**: Never provide hardcoded fallback strings for secrets, ports, or critical endpoints.
- **Centralized Zod validation**: Always validate environment variables centrally using Zod schemas (`backend/src/config/env.ts` and `frontend/src/lib/env.ts`) and export type-safe `env` objects with auto-casting (e.g., `PORT` as `number`, `MINIO_USE_SSL` as `boolean`).
- **Vitest integration**: Test configs (`vitest.config.ts`) must import the centralized schema (`./src/config/env.ts`) at startup to fail-fast on missing keys rather than falling back to mock secrets.
- **Automatic synchronization check**: Keep `.env` and `.env.example` 100% in sync key-for-key across backend, frontend, and root, verified by `pnpm run check:env`.

## Full-Stack Pagination & Data Integrity
- **Server-side pagination is mandatory**: Never implement backward-compatibility hacks (returning all records if page/limit are omitted). Always require `PaginationParams` (`page`, `limit`, `search`) and return standardized `PaginatedResult<T>`.
- **Frontend binding**: The frontend must bind its UI pagination controls directly to API query parameters rather than fetching full arrays and slicing in memory.
- **Database Cascade Integrity**: Always declare `onDelete: Cascade` in Prisma contracts for dependent relationships (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) to prevent orphaned records at the database level.

## Strict Typing & Zero `any` (MANDATORY)
- **Strictly Forbidden to use `any`**: Never use `any` in TypeScript code (including function parameters, return types, variables, generics, or component props).
- **Explicit declarations required**: Always declare explicit types, interfaces, or utility types (`Partial`, `Pick`, `Omit`, `Record`), or use `unknown` with type guards/narrowing where data structure is uncertain.
- **Shared Types**: Always import and reuse shared domain models from `@ats/types` (`packages/types`) across both frontend and backend.

## Shell & Command Execution (Windows PowerShell)
- **Never use `&&` chaining**: Windows PowerShell does not support or reliably handle `&&` in all environments. Always execute shell commands individually (single command per execution) or use standard PowerShell constructs. Never chain commands with `&&`.
