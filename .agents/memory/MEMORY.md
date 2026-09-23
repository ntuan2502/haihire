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

## Feedback
- [feedback] 2026-09-23: Standardized Project Commands & package.json First → feedback-history.md
- [feedback] 2026-09-19: Senior / Principal Engineering Mindset (No Quick-and-Dirty Patches) → feedback-history.md
- [feedback] 2026-09-18: Pure TypeScript Mandate (Zero .mjs / .cjs / .js files, use .ts only) → feedback-history.md
- [feedback] 2026-09-18: Centralized Environment Validation & No Fallbacks (English comments only) → feedback-history.md
- [feedback] 2026-09-18: Full-Stack Pagination & Database Cascade Integrity → feedback-history.md
- [feedback] 2026-09-17: Memory documentation must be in English → feedback-history.md
- [feedback] 2026-09-17: Strict i18n and placeholder completeness mandate → feedback-history.md

