---
type: user
created: 2026-07-18
updated: 2026-09-17
---

# User Preferences

## Memory Language (MANDATORY)
- **Memory files must always be written in English**: All records in `.agents/memory/` must be written exclusively in English. Never use Vietnamese in memory files.

## Internationalization (i18n)
- **Zero hardcoded text**: All UI text, placeholders, labels, select values, tooltips, success/error messages must always be managed through the i18n system (`useI18n()` / `t(...)`). Never initialize or hardcode text directly in `.tsx` / `.ts` files.

## React Imports Convention
- **Always use named imports from `"react"`**: e.g., `import { useState, useEffect, type ReactNode } from "react"`.
- **Forbidden in application code**: Do NOT use default `import React from "react"`, wildcard `import * as React from "react"`, or namespace syntax like `React.useState`, `React.ReactNode`, etc.
- **Strict Exception**: The `frontend/src/components/ui/` directory is exclusively reserved for pristine Shadcn CLI primitives and must NEVER be modified.

## TypeScript Only (No JavaScript Files)
- **Zero `.js` files**: Never create `.js` files anywhere in the project (including scripts, utilities, configs, tools). Always use TypeScript (`.ts` or `.tsx`) exclusively.
