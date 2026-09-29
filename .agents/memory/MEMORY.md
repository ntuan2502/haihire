# Memory Index

## Project
- [project] All memory files must be written in English only → project-conventions.md
- [project] Comments in code, .env, and .env.example must be English only (Vietnamese strictly for user chat) → project-conventions.md
- [project] Pure TypeScript mandate: all files must use TypeScript formats (.ts, .tsx, .mts, .cts); convert non-TS files to TS equivalents → project-conventions.md
- [project] Centralized Zod-based environment schemas: zero fallbacks, fail-fast startup → project-conventions.md
- [project] Full-stack server-side pagination with zero backward-compatibility hacks → project-conventions.md
- [project] Database-level `onDelete: Cascade` in Prisma contract → tech-decisions.md
- [project] Always create a new dedicated branch for major code changes → project-conventions.md
- [project] Commit message format: Conventional Commits with scope — `type(scope): description`, English, lowercase, no trailing period → project-conventions.md
- [project] AG Kit only supports Gemini CLI and Google Antigravity (not other AI coding tools) → project-conventions.md
- [project] Component metadata uses SemVer while toolkit releases use CalVer → tech-decisions.md
- [project] Prisma 8 Contract-first architecture, scaffolding, and CLI conventions → tech-decisions.md
- [project] Modern package ecosystem baseline (Next 16, React 19, Prisma 8 / Composer 0.20 orm syntax) → tech-decisions.md
- [project] Internationalization (i18n): 100% text, placeholders, labels must use translations (`t()`), never hardcoded → project-conventions.md
- [project] Component Architecture: 5-layer modular structure (ui, shared, layout, providers, features) with zero loose root files → tech-decisions.md
- [project] React Import Convention: Always use named imports `{ useState, ReactNode } from "react"`, no `React.x` except inside `components/ui/` → tech-decisions.md
- [project] Shadcn `cn` Standard: Use official `"cn"` package directly (`from "cn"`), no `clsx` or `tailwind-merge` → tech-decisions.md
- [project] Strict Typing: Zero `any` policy across frontend, backend, and shared packages → project-conventions.md
- [project] React SyntheticEvent hygiene: always wrap parameterized callbacks in arrow functions → project-conventions.md
- [project] Client-side Axios gatekeeper: proactively reject malformed URLs with [object Object] → project-conventions.md
- [project] Multi-tenant isolation: strict organizationId scoping at DB and Guard layers → project-conventions.md
- [project] Form testing standard: trigger fireEvent.submit(form) for HTML5 validated inputs in jsdom → project-conventions.md
- [project] Database Driver Priority: evaluate env.DATABASE_URL before cloud composer instances → tech-decisions.md
- [project] Object Storage Security: strict tenant path isolation and buffer magic bytes verification → project-conventions.md
- [project] TanStack Query Factory: centralized QUERY_KEYS and mandatory mutation cache invalidation → project-conventions.md
- [project] Recruitment Stage State Machine: deterministic lifecycle transitions with precondition checks → project-conventions.md
- [project] Audit Trail Architecture: zero silent mutations, asynchronous ActivityLog emission with PII scrubbing → project-conventions.md
- [project] Unified Error Envelope & Client-Side i18n Architecture: machine-readable APP_ERROR_CODES, isolated params, English fallback, and getApiErrorMessage → tech-decisions.md
- [project] Background Job Idempotency: deterministic job IDs and Redis deduplication locks → project-conventions.md
- [project] Safe Email Template Engine: strict HTML escaping, context sanitization, and anti-XSS → project-conventions.md
- [project] Two-Tier Deletion Protocol: soft-delete on primary entities with 30-day purge cascade → project-conventions.md

## User Preferences
- [user] Memory files must always be written in English, never in Vietnamese → user-preferences.md
- [user] Vietnamese for chat and artifacts (implementation_plan.md, walkthrough.md); English for code, comments, env → user-preferences.md
- [user] Pure TypeScript: All files must be TypeScript (.ts, .tsx, .mts, .cts); convert generated non-TS files to TS equivalents → user-preferences.md
- [user] Centralized Environment Configuration: Zero fallbacks, fail-fast Zod validation, key sync via check:env → user-preferences.md
- [user] Full-Stack Pagination: Server-side pagination mandatory, no backward-compatibility hacks or client slicing → user-preferences.md
- [user] Zero hardcoded text: strictly enforce translation keys across all `.tsx` and `.ts` files → user-preferences.md
- [user] Named imports for React: never use `import React` or `React.x` (preserve `components/ui/` untouched) → user-preferences.md
- [user] Strict Typing: Strictly forbidden to use `any`; always declare explicit types or interfaces → user-preferences.md
- [user] Shell Execution: Never chain commands with `&&` in Windows PowerShell; execute each command individually → user-preferences.md
- [user] Senior Engineering Mindset: Zero "instant-noodle" patches, root-cause analysis first, fail fast & loudly → user-preferences.md
- [user] Standardized Project Commands: Check package.json first, avoid ad-hoc commands, maintain unified script suite → user-preferences.md
- [user] Zero raw parameterized callbacks in onClick: wrap in arrow function to avoid MouseEvent leakage → user-preferences.md
- [user] Client-Side Network Gatekeeper: catch stringification errors before HTTP dispatch → user-preferences.md
- [user] Continuous Automated Testing: run full test suites before reporting completion → user-preferences.md
- [user] Tenant Path Segregation: CVs and assets strictly stored under tenant paths with short-lived presigned URLs → user-preferences.md
- [user] Query Cache Invalidation: bind all state mutations to canonical query key invalidations → user-preferences.md
- [user] Audit Trail Integrity: capture all business entity modifications without logging raw PII → user-preferences.md
- [user] Queue & Job Idempotency: no duplicate email dispatches via deterministic jobId keys → user-preferences.md
- [user] Email Template Security: safe rendering and anti-XSS sanitization of candidate variables → user-preferences.md
- [user] Two-Tier Deletion: 30-day soft delete recovery window for Jobs and Candidates → user-preferences.md
- [user] Error Contract Discipline: throw domain APP_ERROR_CODES, isolate params, centralized test i18n setup → user-preferences.md

## Feedback
- [feedback] 2026-09-29: Error Contract Standardization, Isolated Dynamic Params & Centralized Test i18n Setup → feedback-history.md
- [feedback] 2026-09-28: React Callback Hygiene, Network Gatekeeper & Comprehensive Test Baseline → feedback-history.md
- [feedback] 2026-09-23: Standardized Project Commands & package.json First → feedback-history.md
- [feedback] 2026-09-19: Senior / Principal Engineering Mindset (No Quick-and-Dirty Patches) → feedback-history.md
- [feedback] 2026-09-18: Pure TypeScript Mandate (Zero .mjs / .cjs / .js files, use .ts only) → feedback-history.md
- [feedback] 2026-09-18: Centralized Environment Validation & No Fallbacks (English comments only) → feedback-history.md
- [feedback] 2026-09-18: Full-Stack Pagination & Database Cascade Integrity → feedback-history.md
- [feedback] 2026-09-17: Memory documentation must be in English → feedback-history.md
- [feedback] 2026-09-17: Strict i18n and placeholder completeness mandate → feedback-history.md


