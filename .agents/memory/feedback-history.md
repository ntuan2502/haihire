---
type: feedback
created: 2026-07-18
updated: 2026-10-02
---

## 2026-10-02 (Part 4): Phase 18/18.1/19 — True Theme Script Resolution via Next.js Script & Unmasked E2E
- **Feedback**: After Phase 16A migrated `/careers/*` to RSC, `next-themes` inline script triggered React 19 warnings. Phase 18 attempted to suppress the warning via `console.error` monkey-patching (REJECTED: anti-pattern). Phase 18.1 moved the script to `<head>` but still used a raw JSX `<script>` tag, causing the error to recur at `RootLayout (layout.tsx:34:9)`. Phase 19 resolved the root cause by using Next.js official `<Script id="theme-init" strategy="beforeInteractive">`, eliminating raw scripts from JSX reconciler and passing 10/10 Playwright E2E tests unmasked.
- **Actionable Rule**:
  1. **Next.js App Router Scripts**: NEVER render raw `<script>` tags inside JSX components or layouts. Always use `<Script>` from `next/script` with a unique `id` and `strategy="beforeInteractive"` for synchronous head execution.
  2. **Zero Symptom Masking**: Never monkey-patch `console.error` to hide framework warnings. Real E2E tests must capture raw browser console streams and fail if warnings occur.
  3. **Test-Aware Rate Limiting**: Configure authentication rate limiters to support high iteration during dev and testing (`100/min`) while preserving strict limits in production (`5/min`).
  4. **Dynamic E2E Entity Discovery**: Avoid hardcoding database UUIDs in tests; dynamically discover active jobs and candidate pipelines to preserve test repeatability.

## 2026-10-02 (Part 3): Phase 17 Final Cleanup — AsyncLocalStorage, DLQ & Orphan Cron
- **Feedback**: After Phase 16B confirmed READY TO SHIP with 3 non-blocking findings (P2: nested tx without ALS, P3: compensating delete without DLQ, P3: no orphan cleanup cron), Phase 17 closed all 3 to reach a 100% clean state. The system now has zero P0/P1/P2/P3 findings.
- **Actionable Rule**:
  1. **AsyncLocalStorage for Nested Transactions**: PrismaService must use AsyncLocalStorage to propagate transaction context. Nested executeTx calls reuse parent transaction; never open parallel transactions.
  2. **Compensating DLQ**: If MinIO compensating delete fails (MinIO down during rollback), push job to BullMQ orphan-cleanup-queue with 5 retries (exponential backoff) and DLQ fallback. Alert on DLQ entry.
  3. **Orphan Cleanup Cron**: Nightly at 0 4 * * * scans MinIO for orphans, 30-day grace period, dry-run mode, comprehensive runbook.
  4. **Test Count**: Phase 17 added +9 tests (369 total). Backend 233, frontend 136.

## 2026-10-02 (Part 2): Phase 16A/16B — Saga Pattern, RSC & IV&V Round 9
- **Feedback**: After Phase 15C confirmed P0 blocker (Zero DB Transactions), Phase 16A fixed it via Saga Pattern (upload MinIO first, DB transaction second, compensating delete on failure). Phase 16B (IV&V Round 9) verified all fixes with 98.5/100 credibility and confirmed SHIP. Also converted career pages from Client Components to React Server Components for SEO.
- **Actionable Rule**:
  1. All multi-table writes MUST use executeTx() wrapping interactive $transaction.
  2. Distributed workflows (DB + MinIO) MUST use Saga Pattern with compensating delete.
  3. Public routes (/careers/*) MUST be React Server Components with generateMetadata() for SEO.
  4. Demo password (password123) removed from hardcoded constants; use DEMO_SEED_PASSWORD env var.
  5. Test count: Phase 16A added +11 tests (360 total). No renames, no deletions.
  6. IV&V verdict pattern: All claims verified via raw evidence. Credibility 98.5/100.

## 2026-10-02 (Part 1): Phase 15A/15B/15C — Stack Stabilization & Harsh Audit
- **Feedback**: Phase 15A found the stack was bleeding edge (not legacy) but had operational risks (floating Docker tags, Redis license issues, Prisma RC in production). Phase 15A.1 stabilized by pinning Docker images and migrating to Valkey 8.0.2. Phase 15B (harsh architectural audit by independent Senior Architect) found 10 findings: Zero Transactions (P0), 30/30 Client Components (P1), CamelCase tables (P1), God files >1,000 lines (P1), etc. Phase 15C re-verified all findings with 94.1% credibility.
- **Actionable Rule**:
  1. NEVER use floating Docker tags (:latest, :alpine without version, :latest-release). Always pin to specific version or SHA256 digest.
  2. Replace Redis with Valkey for license compliance (RSALv2/SSPLv1 concerns).
  3. Monitor Prisma 8 RC; upgrade to GA immediately on release.
  4. Harsh audits produce real findings but may exaggerate severity — always classify P0/P1/P2/P3 with evidence.
  5. Verify all claimed numbers (file line count, test count) against raw output. Phase 15B inflated numbers by 6-15%.

## 2026-10-02 (Part 0): Phase 12/13/14 — Frontend-Backend Contract Alignment
- **Feedback**: User reported a runtime bug (HTTP 400 APPLICATION_INVALID_STAGE_TRANSITION showing raw JSON in dev, silent in production) that 11 prior phases missed. Phase 12 fixed the specific bug (Kanban drag-drop prevention, i18n error handling). Phase 13 audited ALL backend error codes vs frontend handling, finding 12 additional gaps. Phase 14 (IV&V Round 7) confirmed 349/349 tests pass and zero contract gaps.
- **Actionable Rule**:
  1. Every backend error code MUST have a corresponding i18n key in vi.ts and en.ts.
  2. Frontend MUST import state machine constants from @haihire/shared (single source of truth).
  3. Every mutation API call MUST route errors through getApiErrorMessage(err, t) — never JSON.stringify(err).
  4. CI gate lint:error-i18n blocks merge if error code lacks i18n.
  5. CI gate lint:api-contract blocks merge if JSON.stringify(err) or alert() found in frontend.
  6. Backend-frontend contract drift is a recurring risk — always align both sides.

## 2026-09-30 (Part 2): HaiHire Design System Layout Consistency, Full UTM Parameters & Real Public URLs
- **Feedback**: Do not arbitrarily box or constrain dashboard pages into narrow desktop shells (max-w-7xl mx-auto); respect the design system's full-width responsive canvas (w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10). Ensure tracking links output real public career URLs (/careers/${orgSlug}${jobSegment}?ref=${token}), never mock or internal backend paths. Support the full suite of 5 UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content) across database models, APIs, and modals.
- **Actionable Rule**:
  1. All application main view containers must use <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4"> (or space-y-6), never max-w-7xl mx-auto.
  2. Public career URLs must always be real tenant links: ${origin}/careers/${orgSlug}${jobSegment}?ref=${token} with UTM parameters appended.
  3. Support all 5 standard UTM parameters across data contracts, Prisma models, DTOs, and creation/editing modals.
  4. Always store design system and architectural invariants into project memory so they are never forgotten across sessions.

## 2026-09-30: Monolithic Code Splitting, Node 26 Corepack Deprecation & HttpOnly Security
- **Feedback**: Avoid accumulating monolithic mega-files (>300-500 lines) such as centralized api.ts or sprawling React Query hooks. Verify modern runtime and tooling deprecations before implementation (Node 26 removed Corepack by default; pnpm must be installed explicitly via npm). Ensure documented conventions (like Two-Tier Soft Delete) are actively implemented in database schema and services rather than remaining theoretical. Enforce web security baselines (HttpOnly cookies, SSE withCredentials, image domain whitelists, demo account locking) and enforce Conventional Commits via Commitlint and Husky git hooks.
- **Actionable Rule**:
  1. Modularize API clients and React Query hooks by domain under dedicated directories (lib/api/<domain>.ts, hooks/use-<domain>-queries.ts) with barrel re-exports (index.ts). Prevent individual files from exceeding 400 lines.
  2. For Node 26+ environments, install pnpm explicitly via npm install -g pnpm@12 in CI pipelines and Dockerfiles; never invoke corepack enable.
  3. Authenticate client sessions via backend-issued HttpOnly, SameSite=Lax, Secure cookies (haihire_token). Never persist authentication tokens in client localStorage. SSE connections must use withCredentials: true without URL query tokens.
  4. Whitelist remote image hosts explicitly in next.config.ts; wildcards (**) are strictly prohibited.
  5. Enforce Conventional Commits (type(scope): description) via Commitlint and Husky hooks (.husky/commit-msg and .husky/pre-commit).
  6. Any architectural convention documented in memory must be implemented end-to-end (schema, DTOs, services, tests).

## 2026-09-29: Error Contract Standardization, Isolated Dynamic Params & Centralized Test i18n Setup
- **Feedback**: Avoid inconsistent and ad-hoc error returns (e.g. throwing generic FORBIDDEN with English text instead of specific domain error codes with parameters). Standardize error definitions, keep translations on client locales, and prevent test specs from having to repeatedly declare manual mock translations.
- **Actionable Rule**: Always throw App<Type>Exception using specific machine-readable APP_ERROR_CODES from @haihire/shared with dynamic values placed in params. Default messages in backend must remain English for logs and dev fallbacks. Client applications translate error codes using getApiErrorMessage(error, t). Centralize test i18n mocks in vitest.setup.ts backed by real locale files to eliminate duplicate test mocks.

## 2026-09-28: React Callback Hygiene, Network Gatekeeper & Comprehensive Test Baseline
- **Feedback**: Prevent subtle runtime bugs (like DELETE /interviews/[object%20Object]) caused by passing parameterized callbacks directly to onClick which allows MouseEvent to overwrite data arguments. Build automated test suites covering all screens and happy/bad cases so that future changes do not break existing behavior.
- **Actionable Rule**: Never pass parameterized callbacks directly to onClick; always wrap with () => fn(item). Add client-side Axios gatekeepers to reject malformed URL segments before network requests. Maintain full test suite coverage (350+ tests across backend and frontend) and verify with pnpm test on every milestone.

## 2026-09-23: Standardized Project Commands & package.json First
- **Feedback**: Always check if a command already exists in package.json before running tasks. Do not arbitrarily append parameters or run varied ad-hoc commands. If a command or script is missing, explain its purpose and propose adding it to package.json to establish a unified, standard command suite across the entire project.
- **Actionable Rule**: Check root and workspace package.json files first. Run existing scripts as configured. If a standard command is missing (e.g. typecheck, lint:frontend, lint:backend), propose it explicitly to the user before adding it to package.json.

## 2026-09-19: Senior / Principal Engineering Mindset (No Quick-and-Dirty Patches)
- **Feedback**: Adopt the mindset and depth of a Senior/Principal Engineer. Avoid superficial "instant-noodle" patches that mask underlying architectural problems.
- **Actionable Rule**: Always perform root-cause analysis and fix problems at their architectural source. Never mask symptoms (such as using index fallbacks to suppress React duplicate-key warnings, swallowing errors, or masking backend data model issues with client-side deduplication). Embrace framework warnings (fail fast and loudly) to ensure data integrity and long-term maintainability.

## 2026-09-18: Pure TypeScript Mandate (Zero .mjs / .cjs / .js Files)
- **Feedback**: Do not generate .mjs or .js files; use .ts exclusively. The project is strictly TypeScript and will not accept manually authored JavaScript files.
- **Actionable Rule**: Always create utility, automation, or verification scripts using .ts (e.g. scripts/check-env.ts), executed directly via Node 22+ native execution (node scripts/<name>.ts) or tsx. Never create .mjs, .cjs, or .js files manually anywhere in the codebase.

## 2026-09-18: Centralized Environment Validation & No Fallbacks
- **Feedback**: Avoid scattered ad-hoc process.env checks across different files. Do not use fallbacks because missing variables should fail-fast at startup. Keep environment variables centralized and synchronized. Comments in .env must be in English.
- **Actionable Rule**: Validate environment variables centrally using Zod schemas (backend/src/config/env.ts, frontend/src/lib/env.ts). All consumer modules and test configs (vitest.config.ts) must import the typed env object without fallbacks. Keep .env and .env.example in 100% key parity with English comments, verified by pnpm run check:env.

## 2026-09-18: Full-Stack Pagination & Data Integrity
- **Feedback**: Drop backward-compatibility hacks (returning all rows when pagination params are missing). Update frontend to true server-side pagination to prevent excessive data scraping and heavy payload downloads.
- **Actionable Rule**: Enforce server-side pagination across backend and frontend using PaginationParams and PaginatedResult<T>. Never return unpaginated datasets on list views. Enforce database-level onDelete: Cascade in contract.prisma to eliminate orphaned child rows.

## 2026-09-17: Memory Language Requirement
- **Feedback**: Memory records must be written in English only, never in Vietnamese.
- **Actionable Rule**: All files inside .agents/memory/ must strictly be maintained in English. Do not write Vietnamese in any memory topic or index file.

## 2026-09-17: Strict i18n Requirement & Zero Hardcoded Text
- **Feedback**: All UI texts and placeholders must be internationalized and never initialized directly in code; everything must be retrieved via translations. Check all files, placeholders, and select options in .tsx and .ts.
- **Actionable Rule**: Always verify and migrate 100% of text, placeholders, labels, and select values across all .tsx and .ts files using useI18n() / t(). Maintain full parity in types.ts, vi.ts, and en.ts. Never miss any placeholder, select value, tooltip, or modal text.