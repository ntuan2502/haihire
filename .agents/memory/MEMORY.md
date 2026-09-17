# Memory Index

## Project
- [project] All memory files must be written in English only → project-conventions.md
- [project] Always create a new dedicated branch for major code changes → project-conventions.md
- [project] Commit message format: Conventional Commits with scope — `type(scope): description`, English, lowercase, no trailing period → project-conventions.md
- [project] AG Kit only supports Gemini CLI and Google Antigravity (not other AI coding tools) → project-conventions.md
- [project] Component metadata uses SemVer while toolkit releases use CalVer → tech-decisions.md
- [project] Prisma 8 Contract-first architecture, scaffolding, and CLI conventions → tech-decisions.md
- [project] Internationalization (i18n): 100% text, placeholders, labels must use translations (`t()`), never hardcoded → project-conventions.md
- [project] Component Architecture: 5-layer modular structure (ui, shared, layout, providers, features) with zero loose root files → tech-decisions.md
- [project] React Import Convention: Always use named imports `{ useState, ReactNode } from "react"`, no `React.x` except inside `components/ui/` → tech-decisions.md

## User Preferences
- [user] Memory files must always be written in English, never in Vietnamese → user-preferences.md
- [user] Zero hardcoded text: strictly enforce translation keys across all `.tsx` and `.ts` files → user-preferences.md
- [user] Named imports for React: never use `import React` or `React.x` (preserve `components/ui/` untouched) → user-preferences.md
- [user] TypeScript Only: Never create `.js` files, always use `.ts` or `.tsx` exclusively → user-preferences.md

## Feedback
- [feedback] 2026-09-17: Memory documentation must be in English → feedback-history.md
- [feedback] 2026-09-17: Strict i18n and placeholder completeness mandate → feedback-history.md
