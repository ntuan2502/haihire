# Auto-Commit After Verified Completion

- After completing an implementation or bugfix task and confirming all required verification checks pass (typecheck, lint, tests, and any applicable repo gates), automatically create a local git commit for the task's changes without waiting for an extra commit prompt.
- Before committing, check `git status --short` and stage only the files belonging to the current task (never stage unrelated modifications or untracked scratch files).
- Use Conventional Commits with a lowercase subject line (e.g. `fix(web): ...`, `feat(account): ...`) to comply with `commitlint` (`subject-case`).
- Do **not** run `git push`, amend published commits, or open/update pull requests unless the user explicitly asks.
- Skip auto-committing if the user only asked a question, requested a plan for review first, or explicitly asked not to commit yet.
