---
type: user
created: 2026-07-18
updated: 2026-10-08
---

# User Preferences

## Memory Language (MANDATORY)
- **Memory files must always be written in English**: All records in .agents/memory/ must be written exclusively in English. Never use Vietnamese in memory files.

## Communication Language vs Code / Env Comments (MANDATORY)
- **Vietnamese for all user-facing communication & artifacts**: Chat responses, user-facing artifacts including implementation_plan.md and walkthrough.md, must be written in Vietnamese so the user can easily read and review them.
- **English exclusively for code, configuration, logs, and docs**: All code, code comments, docstrings, variable/function/class names, commit messages, comments inside .env/.env.example files, runtime logs, and documentation/reports/runbooks must be written exclusively in English. User prefers English for all docs, comments, and logs (Task #7.5 convention).

## Shell & Command Execution (Windows PowerShell)
- **Never use && chaining**: Windows PowerShell does not support or reliably handle && in all environments. Always execute shell commands individually (single command per execution) or use standard PowerShell constructs. Never chain commands with &&.

## Engineering Mindset: Senior / Principal Quality (Zero "Quick-and-Dirty" / "Instant-Noodle" Patches)
- **Root-Cause Analysis First**: Never patch symptoms on the surface (e.g., masking duplicate keys with index fallbacks, swallowing errors with try/catch, or hiding backend contract issues with client-side deduplication). Always trace the problem to its architectural root cause and fix it at the true source.
- **Fail Fast & Loudly**: Do not mask contract violations or data corruption with superficial defensive code (e.g., key={item.id || index}). Let framework mechanisms (like React reconciliation and TypeScript checks) surface inconsistencies immediately during development so that data integrity issues can be addressed cleanly.
- **Deep Domain & Invariant Comprehension**: Approach every problem with a Principal Engineer mindset. Understand the data model, domain entities (e.g., Application vs Interview vs Candidate), and system invariants before touching code. Prioritize clean architecture and long-term maintainability over superficial, hasty workarounds.

## Standardized Project Commands & package.json Consistency (MANDATORY)
- **Check package.json First**: Always check package.json (root and subpackages) to see if a command or script already exists for the task.
- **No Ad-Hoc Variations**: If a command exists, execute the existing script as defined rather than running one-off CLI commands with custom flags.
- **Never Use npx**: Strictly forbidden to invoke `npx`. Always use `pnpm dlx` or `pnpx` when executing one-off binaries, and always prioritize project commands defined in `package.json` (`pnpm <script>`).
- **Propose Standard Scripts**: If a necessary command (e.g., typecheck, lint:frontend, lint:backend) is missing, explain to the user why it is needed and propose adding it to package.json so the entire project maintains a clean, uniform command suite.

## Continuous Automated Testing & Zero Regression Mandate
- **Run Tests Before Reporting Completion**: Always verify code changes by executing the corresponding package.json scripts (`pnpm test:backend`, `pnpm test:frontend`, or `pnpm test`). Always prioritize package.json scripts over raw ad-hoc commands. Ensure 100% green pass rate and 0 lint warnings before declaring tasks done.

## Verified-Ship Mindset (MANDATORY, Post Phase 15-17)
- **No Self-Claim "READY"**: Every "READY TO SHIP" self-assessment requires independent IV&V verification before deployment. Every phase's claim must be backed by raw execution evidence, not summary text.
- **Number Honesty**: All claimed numbers (test count, file line count, endpoint count) must match raw grep/measure output. Number inflation (6-15%) is unacceptable.
- **Severity Classification**: Findings must be classified P0/P1/P2/P3 with clear justification. Not all findings are "CRITICAL".
- **Test Count Accuracy**: Test count increases must come from net-new test declarations (+it / -it), never from renamed tests.
- **Process Discipline**: When a false claim is caught (e.g., Phase 15B auditor inflated numbers), escalate as a process concern, not just fix the finding.