---
type: user
created: 2026-07-18
updated: 2026-09-18
---

# User Preferences

## Memory Language (MANDATORY)
- **Memory files must always be written in English**: All records in `.agents/memory/` must be written exclusively in English. Never use Vietnamese in memory files.

## Communication Language vs Code / Env Comments (MANDATORY)
- **Vietnamese for all user-facing communication & artifacts**: Chat responses, user-facing artifacts including `implementation_plan.md` and `walkthrough.md`, must be written in Vietnamese so the user can easily read and review them.
- **English exclusively for code & configuration**: All code, code comments, docstrings, variable/function/class names, commit messages, and comments inside `.env` and `.env.example` files must be written exclusively in English.

## Internationalization (i18n)
- **Zero hardcoded text**: All UI text, placeholders, labels, select values, tooltips, success/error messages must always be managed through the i18n system (`useI18n()` / `t(...)`). Never initialize or hardcode text directly in `.tsx` / `.ts` files.

## React Imports Convention
- **Always use named imports from `"react"`**: e.g., `import { useState, useEffect, type ReactNode } from "react"`.
- **Forbidden in application code**: Do NOT use default `import React from "react"`, wildcard `import * as React from "react"`, or namespace syntax like `React.useState`, `React.ReactNode`, etc.
- **Strict Exception**: The `frontend/src/components/ui/` directory is exclusively reserved for pristine Shadcn CLI primitives and must NEVER be modified.

## Pure TypeScript Mandate & Format Conversion (No Plain JavaScript Files)
- **Zero manually created plain JavaScript files (`.js`, `.mjs`, `.cjs`)**: The project is 100% TypeScript.
- **First-Class TypeScript Formats**: All TypeScript formats (`.ts`, `.tsx`, `.mts`, `.cts`) are first-class citizens and fully standard. `.mts` (Module TypeScript) and `.cts` (CommonJS TypeScript) are completely valid and type-checked.
- **Automatic Format Conversion**: If any tool, script, or scaffolding creates a file that does not use a TypeScript-supported format (e.g., plain `.js`, `.mjs`, `.cjs`), convert it to its equivalent TypeScript counterpart (`.ts`, `.tsx`, or `.mts`/`.cts`) to ensure full type-checking and project consistency.

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

## Engineering Mindset: Senior / Principal Quality (Zero "Quick-and-Dirty" / "Instant-Noodle" Patches)
- **Root-Cause Analysis First**: Never patch symptoms on the surface (e.g., masking duplicate keys with index fallbacks, swallowing errors with try/catch, or hiding backend contract issues with client-side deduplication). Always trace the problem to its architectural root cause and fix it at the true source.
- **Fail Fast & Loudly**: Do not mask contract violations or data corruption with superficial defensive code (e.g., `key={item.id || index}`). Let framework mechanisms (like React reconciliation and TypeScript checks) surface inconsistencies immediately during development so that data integrity issues can be addressed cleanly.
- **Deep Domain & Invariant Comprehension**: Approach every problem with a Principal Engineer mindset. Understand the data model, domain entities (e.g., Application vs Interview vs Candidate), and system invariants before touching code. Prioritize clean architecture and long-term maintainability over superficial, hasty workarounds.

## Standardized Project Commands & package.json Consistency (MANDATORY)
- **Check package.json First**: Always check `package.json` (root and subpackages) to see if a command or script already exists for the task.
- **No Ad-Hoc Variations**: If a command exists, execute the existing script as defined rather than running one-off CLI commands with custom flags.
- **Propose Standard Scripts**: If a necessary command (e.g., `typecheck`, `lint:frontend`, `lint:backend`) is missing, explain to the user why it is needed and propose adding it to `package.json` so the entire project maintains a clean, uniform command suite.

## React Callback Hygiene & SyntheticEvent Safety (MANDATORY)
- **Zero Raw Parameterized Callbacks in `onClick`**: Never write `onClick={fn}` when `fn` accepts an optional argument (e.g., `onCancel(id?: string)` or `onSelect(item?: Candidate)`). Always explicitly declare arrow wrappers: `onClick={() => fn(item)}` or `onClick={(e) => { e.stopPropagation(); fn(item); }}` to avoid passing `MouseEvent` into domain arguments.

## Client-Side Network Gatekeeper & Defensive URL Validation
- **Catch Stringification Errors Early**: Prevent malformed URLs like `/interviews/[object%20Object]` from ever hitting the network by enforcing client-side interceptor rejection before HTTP dispatch.

## Continuous Automated Testing & Zero Regression Mandate
- **Run Tests Before Reporting Completion**: Always verify code changes by executing the corresponding Vitest suites (`pnpm --filter frontend test`, `pnpm --filter backend test`, or `pnpm test`). Ensure 100% green pass rate and 0 lint warnings before declaring tasks done.

## Object Storage Security & Asset Isolation
- **Strict Tenant Pathing**: Uploaded candidate assets must always be segregated by tenant ID and accessed solely through short-lived presigned URLs.

## TanStack Query Cache Discipline
- **Consistent Invalidation**: Never rely on full page reloads to refresh data after mutations. Always bind mutations to specific query key invalidations.

## Zero Silent Mutations & Audit Logging
- **Traceability**: All meaningful business entity modifications must produce audit records without leaking confidential PII into application logs.

## Queue & Job Idempotency Mandate
- **No Duplicate Emails**: All background queues must utilize deterministic idempotency keys to prevent duplicate communications to candidates.

## Email Template Security Discipline
- **Safe Rendering**: All interpolated candidate variables must be sanitized to eliminate any possibility of XSS or phishing attacks.

## Two-Tier Deletion Protocol
- **Safety First**: Root records like Jobs and Candidates must support 30-day soft-delete recovery before permanently purging cascade relations.

## Error Contract & Localized Exception Discipline
- **Machine-Readable Codes**: Always throw `App<Type>Exception` with a specific `APP_ERROR_CODES` from `@haihire/shared`. Never use generic `FORBIDDEN` or NestJS raw `NotFoundException` when a specific domain code exists.
- **Isolated Parameters**: Always isolate variable arguments in `params: { ... }`. Never concatenate dynamic variables into error messages.
- **English Default Message**: Backend messages must be clean, professional English for logging and fallback.
- **Client Locale Isolation**: All translated strings remain in client dictionaries. Never bundle full multi-language translations into `@haihire/shared` or backend.
- **Centralized Test Setup**: Eliminate ad-hoc `mockTranslations` across test specs by using centralized `useI18n` mocks backed by real locale files.

## Anti-Monolith Modular Architecture
- **Proactive Modularization**: Never let API clients or hook files grow into monolithic files over 300-400 lines. Split by domain (`lib/api/<domain>.ts`, `hooks/use-<domain>-queries.ts`) with seamless barrel re-exports.

## Node 26+ Tooling Verification (No Corepack)
- **Tooling Awareness**: Node 26 removed Corepack by default. Always install `pnpm@12` explicitly via `npm install -g pnpm@12` in CI/Docker rather than calling `corepack enable`.

## Web Security & HttpOnly Cookie Baseline
- **Secure Token Handling**: No auth tokens in `localStorage`. Use HttpOnly cookies (`haihire_token`) with SameSite=Lax. SSE connections must use `withCredentials: true` with zero token leakage in URL query strings. Strict Next.js image domain whitelists and non-production demo account locks.

## Conventional Commits & Quality Gates
- **Enforced Standards**: Strict adherence to Conventional Commits with scope `type(scope): description`. Enforce automatically via Commitlint and Husky git hooks.
