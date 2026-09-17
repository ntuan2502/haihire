---
type: feedback
created: 2026-07-18
updated: 2026-09-17
---

# Feedback History

## 2026-09-17: Memory Language Requirement
- **Feedback**: Memory records must be written in English only, never in Vietnamese.
- **Actionable Rule**: All files inside `.agents/memory/` must strictly be maintained in English. Do not write Vietnamese in any memory topic or index file.

## 2026-09-17: Strict i18n Requirement & Zero Hardcoded Text
- **Feedback**: All UI texts and placeholders must be internationalized and never initialized directly in code; everything must be retrieved via translations. Check all files, placeholders, and select options in .tsx and .ts.
- **Actionable Rule**: Always verify and migrate 100% of text, placeholders, labels, and select values across all `.tsx` and `.ts` files using `useI18n()` / `t()`. Maintain full parity in `types.ts`, `vi.ts`, and `en.ts`. Never miss any placeholder, select value, tooltip, or modal text.
