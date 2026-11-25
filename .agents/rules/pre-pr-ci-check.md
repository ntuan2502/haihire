# Pre-PR & Pre-Push CI/CD Verification

- Whenever the user asks to push a branch or create/update a Pull Request, **always** run the full local CI architecture verification suite (`pnpm check:all:fast`) and affected tests (`scripts/__tests__`, plus impacted `api`/`web` suites) **before** running `git push` or `gh pr create`.
- Verify all 15 CI Architecture Gates pass locally (especially `lint:doc-sync`, `lint:doc-links`, `lint:i18n`, `lint:dtopipe`, `lint:tenant-scope`, `lint`, `typecheck`, `test:diff`, and `lint:nextjs-conventions`).
- If `lint:doc-sync` reports that `docs/PROJECT_METRICS.md` is out of date, run `pnpm docs:stats:write`, re-verify `pnpm check:all:fast` passes `15/15`, and commit cleanly before pushing.
- Never push to remote or open a PR while any local CI gate or test fails.
