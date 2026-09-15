---
type: project
created: 2026-05-25
updated: 2026-07-12
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.
- When committing, always use `git add .` for speed. Run `git add .` as a separate command first, then `git commit -m "..."` as a separate command. Never chain them together.
- Local commit only, do not `git push` unless explicitly requested.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## Brand Identity & Logos
- Whenever reference images or mockups contain **Reqcore** (or other placeholder logos/names), ALWAYS replace with **ATS** (or "A" monogram / ATS logo) across all UI components, logos, and copy.

## Validation & Testing Conventions
- If only frontend UI is modified, only run frontend lint and build (`pnpm --filter frontend run build ; pnpm --filter frontend run lint`) without running backend tests or full test suites.
- Always use `;` (not `&&`) for chaining commands in PowerShell.
- Always use `pnpm` or `pnpx` (NEVER use `npx`).
