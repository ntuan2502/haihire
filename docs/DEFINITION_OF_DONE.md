# DEFINITION OF DONE (DoD) — Release v1.0.0

> Universal checklist for all pull requests during the v1.0.0 hardening phase.
> Every PR must satisfy ALL criteria below prior to merging.

---

## 1. HYGIENE — Code Cleanliness

- [ ] Branch name adheres to convention: `feat/task-NN-<slug>` or `chore/task-NN-<slug>`
- [ ] Commit messages follow Conventional Commits: `type(scope): description`
  - Lowercase, English, no trailing period
  - Example: `feat(observability): add DLQ slack webhook alert`
- [ ] Zero artifacts or noise: no debug `console.log`, commented-out code, or `*.bak` files
- [ ] No newly introduced TODO/FIXME comments (unless tied to an explicit ticket link)
- [ ] Clean diff: contains only necessary changes for the task, zero drive-by refactoring

---

## 2. TESTING — Quality & Coverage

- [ ] Unit test for all newly introduced logic (each new function/service method has $\ge 1$ test)
- [ ] Tests covering both happy path and error paths
- [ ] Tests for edge cases (empty input, null/undefined, boundary values)
- [ ] Integration test if task touches modules backed by integration suites
- [ ] Test names describe behavior, never implementation details
  - ✅ `should not throw when Slack webhook is down`
  - ❌ `test fetch call`
- [ ] Test coverage does not regress against baseline

---

## 3. TYPE SAFETY — Strict Typing

- [ ] Zero newly introduced `any` types (unless strictly justified via comment explaining technical limitation)
- [ ] Zero newly introduced `@ts-ignore` / `@ts-expect-error` directives
- [ ] `pnpm tsc --noEmit` passes cleanly across both `backend/` and `frontend/`
- [ ] Public interfaces documented with JSDoc for critical functions/services
- [ ] Explicit error types: throw `AppException` subclasses, never generic `new Error()`

---

## 4. SECURITY — Hardening & Scoping

- [ ] Zero hardcoded secrets — all configuration read via `env.ts`
- [ ] Zero PII logged — payloads must scrub email/phone/name before logging
- [ ] Zero internal error exposure — return `AppException`, never leak raw stack traces to clients
- [ ] Tenant scoping: database queries in tenant-scoped modules must include `organizationId` filter
- [ ] Input validation: all newly added `@Body()` parameters guarded by `DtoPipe(<Dto>)`

---

## 5. OBSERVABILITY — Telemetry & Metrics

- [ ] Structured logging for significant operations (using `this.logger.log/.warn/.error`)
- [ ] Prometheus metrics include `# HELP` and `# TYPE` comments; low-cardinality labels
- [ ] Prometheus alert rules specify `summary` + `description` + `severity` + `team` label
- [ ] Alert evaluation windows are appropriately tuned (`for: Xm`)

---

## 6. i18n — Localization (Frontend)

- [ ] Zero hardcoded strings in JSX — use `t("key.path")`
- [ ] New dictionary keys added synchronously to all 3 files: `types.ts`, `vi.ts`, and `en.ts`
- [ ] New domain error codes registered in `APP_ERROR_CODES` + `vi.ts` + `en.ts`
- [ ] `pnpm check:i18n` passes with 100% key parity and zero hardcoded text

---

## 7. DOCUMENTATION — Knowledge Integrity

- [ ] Update `PROJECT_CONTEXT.md` when introducing new modules, services, or dependencies
- [ ] Update runbooks in `docs/runbooks/` when adding alert rules or background jobs
- [ ] Comment the WHY, never the WHAT
  - ✅ `// Non-throwing: webhook fail must not crash DLQ flow`
  - ❌ `// Call fetch`

---

## 8. CI GATES — Automated Quality Verification

- [ ] `pnpm check:all:fast` passes (all static architecture gates)
- [ ] `pnpm test` passes
- [ ] `pnpm lint:env-sync` passes (when modifying environment variables)
- [ ] `pnpm lint:dtopipe` passes (when adding/modifying controllers)
- [ ] `pnpm lint:error-i18n` passes (when registering error codes)
- [ ] `pnpm test:e2e` passes locally (for E2E tasks)
- [ ] Cron scripts manually executed once to verify runtime output (for cron tasks)

---

## 9. ACCEPTANCE CRITERIA — Task Verification

- [ ] All acceptance criteria specified in the task prompt PASS
- [ ] Concrete evidence provided: screenshots / terminal logs / test output

---

## 10. REPORT — Submission Format for DeepSeek & Project Owner

Upon completion, provide the final technical report using the following standard template:

### Task #N: <task_title>

**1. Summary**
- Branch: `<name>`
- Files created/changed: `<list with line counts>`
- Total diff: `+X / -Y`

**2. Implementation Notes**
- Deviation from spec: `<yes/no>` — if yes, explain WHY
- Design decisions: `<notable architectural decisions>`

**3. Test Coverage**
- Unit tests: `<case count>`, file: `<path>`
- Integration tests: `<case count>`
- E2E tests: `<case count>` (if applicable)
- Coverage change: `X% → Y%`

**4. Verification Evidence**
- `pnpm check:all:fast`: `PASS / FAIL`
- `pnpm test`: `PASS / FAIL` (X passing, Y failing)
- Acceptance criteria: `<checklist with ✅/❌>`

**5. Open Questions**
- `<questions for DeepSeek if any>`
- `<points requiring project owner confirmation if any>`

**6. Files for Review**
- `<path to primary files requiring in-depth code review>`
