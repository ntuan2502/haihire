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
