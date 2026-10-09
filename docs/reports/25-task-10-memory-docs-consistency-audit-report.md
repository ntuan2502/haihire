# Task #10 Phase 1: Memory & Documentation Consistency Audit Report

**Audit Date:** 2026-10-08  
**Scope:** Post-Hardening (Tasks #1A → #9) Workspace Integrity Scan  
**Status:** Audit Complete — Phase 1 (Zero-Modification Mode)  
**Evaluator:** Lead Technical Writer & Code Auditor  
**Target Branch:** `chore/task-10-memory-docs-consistency`  

---

## 1. Executive Summary

Following 10 hardening tasks (Tasks #1A through #8) and the repository restructuring in Task #9, the HaiHire Enterprise ATS platform codebase is technically solid (11/11 CI gates passing, 563/563 tests green, 0 broken markdown links across 98 files).

However, documentation and memory files have accumulated significant **metric drift**, **cross-file content duplication**, and **stale references** across multiple development sprints.

### High-Level Findings
1. **Test Count Fragmentation:** 4 different test count values exist simultaneously in active docs (`563`, `379`, `378`, `369`).
2. **CI Gate Count Drift:** Active documents claim `7 gates`, `8 gates`, and `11 gates` with conflicting gate ordering.
3. **Critical Outdated Files:** `CONTRIBUTING.md`, `docs/onboarding.md`, `docs/runbooks/ci-strategy.md`, and `docs/runbooks/production-deployment-plan.md` remain on Phase 21/22 metrics.
4. **Prometheus Alert Rules Gap:** `docs/runbooks/alerts.md` documents only 7 alerts, missing the 7 new BullMQ & Cron alerts added in Tasks #3 & #7 (total: 14 rules). Furthermore, annotations in `monitoring/prometheus/alert-rules.yml` contain Vietnamese text (`Xem runbook:`), violating Task #7.5 conventions.
5. **API & Controller Counts:** `docs/api/overview.md` lists 77 endpoints across 9 controllers, whereas CI Gate 5 verifies **83 endpoints across 13 controllers**.
6. **Massive Memory Duplication:** Over 80% of `.agents/memory/user-preferences.md` duplicates `.agents/memory/project-conventions.md` verbatim.
7. **Internal Contradictions in Conventions:** `.agents/memory/project-conventions.md` contains 3 conflicting test counts (Line 64: `369`, Line 212: `563`, Line 264: `378`).

---

## 2. Phần A: Inventory of Files Containing "Project Truth"

The following 24 files across the workspace store project metrics, architectural rules, operational runbooks, and developer guidelines:

### A.1 Root Documentation
| File | Metrics Contained | Stale Path References? | Health Status |
| :--- | :--- | :---: | :---: |
| [`README.md`](../../README.md) | 11 CI gates, 563 tests, 77 API endpoints (drift) | None (`docs/archive/audits/` updated) | ⚠️ Minor drift (77 vs 83 endpoints) |
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | 7 CI gates, 379 tests, old gate commands | None | 🔴 **Critically Outdated** |
| [`CHANGELOG.md`](../../CHANGELOG.md) | 379 tests (Phase 21 note); missing Tasks #1A–#9 | Yes (`docs/audits/` at L34, L35) | ⚠️ Needs milestone update & path sync |

### A.2 `docs/` Living Documentation
| File | Metrics Contained | Stale Path References? | Health Status |
| :--- | :--- | :---: | :---: |
| [`docs/PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) | 11 CI gates, 5 God files, 9 camelCase tables | None | 🟢 Clean & updated in Task #9 |
| [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) | Checklist gates (`check:all:fast`, etc.) | None | 🟢 Clean |
| [`docs/ROADMAP.md`](../ROADMAP.md) | v1.0.0, 563 tests, 11 CI gates | None | 🟢 Clean & updated in Task #9 |
| [`docs/TESTCASES.md`](../TESTCASES.md) | 276 tests across 10 domains (pre-hardening) | None | ⚠️ Stale test breakdown table |
| [`docs/onboarding.md`](../onboarding.md) | 7 CI gates, 379 tests | None | 🔴 **Critically Outdated** |
| [`docs/README.md`](../README.md) | 11 gates, 563 tests, 83 endpoints, 10 SOPs | None | 🟢 Clean & updated in Task #9 |
| [`docs/reports/README.md`](README.md) | Index of Tasks #1A to #9 reports | None | 🟢 Clean & updated in Task #9 |
| [`docs/architecture/system-overview.md`](../architecture/system-overview.md) | 9 controllers (diagram) | None | ⚠️ Minor drift (13 controllers in reality) |
| [`docs/api/overview.md`](../api/overview.md) | 77 endpoints across 9 controllers | None | ⚠️ Needs sync to 83 endpoints / 13 controllers |

### A.3 `docs/runbooks/` (SRE & Operations)
| File | Metrics Contained | Stale Path References? | Health Status |
| :--- | :--- | :---: | :---: |
| [`docs/runbooks/ci-strategy.md`](../runbooks/ci-strategy.md) | 378 unit tests, 8 static gates, 10 E2E journeys | None | 🔴 **Critically Outdated** |
| [`docs/runbooks/production-deployment-plan.md`](../runbooks/production-deployment-plan.md) | 379 tests (233 BE + 136 FE + 10 E2E), 7 CI gates | None | 🔴 **Critically Outdated** |
| [`docs/runbooks/alerts.md`](../runbooks/alerts.md) | 7 alert rules (missing 7 rules from Tasks #3 & #7) | None | ⚠️ Missing 7 new alerts in catalog table |
| [`docs/runbooks/backup-and-restore.md`](../runbooks/backup-and-restore.md) | Dual dump SOP, ports 15432 / 19000 | None | 🟢 Clean |
| [`docs/runbooks/dlq-recovery.md`](../runbooks/dlq-recovery.md) | BullMQ DLQ SOP, alert references | None | 🟢 Clean |
| [`docs/runbooks/email-queue.md`](../runbooks/email-queue.md) | BullMQ email queue backlog SOP | None | 🟢 Clean |
| [`docs/runbooks/env-management.md`](../runbooks/env-management.md) | 5-file environment architecture | None | 🟢 Clean |
| [`docs/runbooks/orphan-cleanup.md`](../runbooks/orphan-cleanup.md) | 0 4 * * * cron, 30-day grace period | None | 🟢 Clean |
| [`docs/runbooks/redis-recovery.md`](../runbooks/redis-recovery.md) | Valkey 8.0.2 recovery SOP, port 16379 | None | 🟢 Clean |
| [`docs/runbooks/versioning.md`](../runbooks/versioning.md) | SemVer bump & GHCR container protocol | None | 🟢 Clean |

### A.4 `.agents/memory/` (AI Persistence)
| File | Metrics Contained | Stale Path References? | Health Status |
| :--- | :--- | :---: | :---: |
| [`.agents/memory/MEMORY.md`](../../.agents/memory/MEMORY.md) | 11 gates, 563 tests baseline | None | 🟢 Updated in Task #9 |
| [`.agents/memory/project-conventions.md`](../../.agents/memory/project-conventions.md) | **Contradictory:** 369 (L64), 563 (L212), 378 (L264) | None | ⚠️ **Internal contradictions** |
| [`.agents/memory/tech-decisions.md`](../../.agents/memory/tech-decisions.md) | 379 tests (L72: Phase 21 baseline) | None | ⚠️ Outdated test baseline |
| [`.agents/memory/user-preferences.md`](../../.agents/memory/user-preferences.md) | High duplication of `project-conventions.md` | None | ⚠️ Needs deduplication |
| [`.agents/memory/feedback-history.md`](../../.agents/memory/feedback-history.md) | Historical logs (Phases 12–22.1) | None | 🟢 Historical log preserved |

---

## 3. Phần B: Audit Matrix — So Sánh Giá Trị

### B.1 Test Count
* **Verified True Value:** **`563`** (376 backend + 187 frontend), verified via `vitest run` on both projects.

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `CONTRIBUTING.md` | L82 | `379 backend and frontend unit/integration tests` | ❌ No | Update to `563` |
| `CHANGELOG.md` | L41 | `(379 tests)` | ⚠️ Hist. | In Phase 21 changelog entry; add v1.0.0 entry with 563 |
| `README.md` | L13, L98 | `563 verified automated tests` | ✅ Yes | Accurate |
| `docs/onboarding.md` | L110 | `(379 tests)` | ❌ No | Update to `563 tests` |
| `docs/README.md` | L64 | `563 tests passing` | ✅ Yes | Accurate |
| `docs/ROADMAP.md` | L6 | `563 tests` | ✅ Yes | Accurate |
| `docs/TESTCASES.md` | L22–34 | `276 tests` (sum across 10 domains) | ❌ No | Update domain test matrix to match 563 |
| `docs/runbooks/ci-strategy.md` | L24, L29 | `378 unit tests` | ❌ No | Update to `563 unit and integration tests` |
| `docs/runbooks/production-deployment-plan.md` | L24 | `379/379 tests passing (233 Backend + 136 Frontend + 10 E2E)` | ❌ No | Update to `563 (376 Backend + 187 Frontend)` |
| `.agents/memory/MEMORY.md` | L42 | `563 tests baseline` | ✅ Yes | Accurate |
| `.agents/memory/project-conventions.md` | L64 | `all 369 unit/integration tests` | ❌ No | Update to `563 tests` |
| `.agents/memory/project-conventions.md` | L212 | `Baseline: 563 automated unit/integration tests` | ✅ Yes | Accurate |
| `.agents/memory/project-conventions.md` | L264 | `(Vitest - 378 tests)` | ❌ No | Update to `563 tests` |
| `.agents/memory/tech-decisions.md` | L72 | `379 tests total (236 backend + 143 frontend)` | ❌ No | Update to `563 tests (376 backend + 187 frontend)` |

---

### B.2 CI Gate Count
* **Verified True Value:** **`11 gates`** (verified from `scripts/check-all.ts`).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `CONTRIBUTING.md` | L59, L61, L74–83, L148 | `The 7 CI Quality Gates` (Lists gates 1–7) | ❌ No | Overhaul to 11 CI Architecture Gates |
| `README.md` | L13, L96 | `11 comprehensive CI gates` | ✅ Yes | Accurate |
| `docs/onboarding.md` | L104 | `7-gate CI verification pipeline` | ❌ No | Update to `11-gate` |
| `docs/README.md` | L64, L72 | `11 CI architecture gates` | ✅ Yes | Accurate |
| `docs/ROADMAP.md` | L6 | `11 CI gates` | ✅ Yes | Accurate |
| `docs/runbooks/ci-strategy.md` | L30, L39, L187 | `8 Gates` / `Static Gates (1-6)` | ❌ No | Update to `11 Gates` reflecting `check-all.ts` |
| `docs/runbooks/production-deployment-plan.md` | L25 | `All 7 CI Architecture Gates` | ❌ No | Update to `11 CI Architecture Gates` |
| `.agents/memory/MEMORY.md` | L42 | `CI Architecture Gates (11 total)` | ✅ Yes | Accurate |
| `.agents/memory/project-conventions.md` | L200–212 | `CI Architecture Gates (11 Total)` | ✅ Yes | Accurate |

---

### B.3 Hardening Task Count
* **Verified True Value:** **`10 tasks`** (#1A through #8) + **Task #9** (restructure).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `docs/README.md` | L50–62 | Lists Tasks #1A, #1B, #2, #3, #4, #5, #6, #7, #7.5, #8, #9 | ✅ Yes | Accurate |
| `docs/reports/README.md` | L15–25 | Lists reports 07 to 24 (Tasks #1A to #9) | ✅ Yes | Accurate |
| `docs/ROADMAP.md` | L6 | `Tasks #1A-#8 Hardening & Task #9 Restructure complete` | ✅ Yes | Accurate |
| `CHANGELOG.md` | L8 | Ends at `[1.0.0] - Phase 22` (Tasks #1A–#9 unrecorded) | ❌ No | Add changelog release section for Tasks #1A–#9 |
| `.agents/memory/MEMORY.md` | L43 | `Tasks #1A through #8 complete ... restructured Task #9` | ✅ Yes | Accurate |

---

### B.4 Prometheus Alert Rule Count
* **Verified True Value:** **`14 rules`** (verified via `scripts/check-prometheus-rules.ts` & `monitoring/prometheus/alert-rules.yml`).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `monitoring/prometheus/alert-rules.yml` | L4–168 | 14 alert definitions | ✅ Yes | Accurate |
| `docs/runbooks/alerts.md` | L14–23 | 7 alert definitions in catalog table | ❌ No | Expand catalog to 14 alert rules |
| `.agents/memory/tech-decisions.md` | L186 | `Dedicated Prometheus alert rules (14 rules)` | ✅ Yes | Accurate |

---

### B.5 E2E Test Count
* **Verified True Value:** **`6 tests`** for Playwright cross-tenant security suite (`tenant-security.spec.ts`) / **`19 tests`** total across all 7 Playwright spec files (`frontend/tests/e2e/*.spec.ts`).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `frontend/tests/e2e/tenant-security.spec.ts` | L51–123 | 6 test assertions | ✅ Yes | Master security suite |
| `docs/runbooks/ci-strategy.md` | L16, L31 | `10 journeys` / `10 tests` | ⚠️ Approx. | Clarify: 10 critical user journeys, 19 total specs, 6 cross-tenant tests |
| `docs/runbooks/production-deployment-plan.md` | L24 | `10 E2E` | ⚠️ Approx. | Align with ci-strategy |

---

### B.6 API Endpoint Count
* **Verified True Value:** **`83 endpoints`** across **13 controllers** (verified via `pnpm lint:api-contract` / `scripts/check-api-contract-coverage.ts`).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `README.md` | L112 | `77 REST endpoints` | ❌ No | Update to `83 REST endpoints` |
| `docs/README.md` | L19 | `9 controllers, 83 endpoints` | ⚠️ Partial | 83 is right; controller count is 13 |
| `docs/api/overview.md` | L69 | `77 Endpoints Across 9 Controllers` | ❌ No | Update to `83 Endpoints across 13 Controllers` |
| `docs/architecture/system-overview.md` | L30 | `9 Core Domain Controllers` | ⚠️ Partial | Note: 9 core business domain + 4 infra/utility controllers = 13 total |

---

### B.7 Backend Module Count
* **Verified True Value:** **`18 modules/directories`** in `backend/src/` (14 imported in `AppModule` + 4 cross-cutting infrastructure folders).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `backend/src/app.module.ts` | L6–23 | 14 domain modules imported | ✅ Yes | Accurate |
| `docs/PROJECT_CONTEXT.md` | L72–88 | Lists core domain directories | ✅ Yes | Accurate |

---

### B.8 Frontend Mutation Hook Count
* **Verified True Value:** **`35 mutation hooks`** total in `frontend/src/hooks/` (30 updated with `onError` cache invalidation in Task #8 + 5 pre-existing).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `docs/reports/22-task-08-frontend-onerror-hook-standardization-report.md` | L17 | `35 mutation hooks across 8 files` | ✅ Yes | Accurate |
| `.agents/memory/tech-decisions.md` | L194 | `All 30 TanStack Query mutation hooks` | ⚠️ Inaccurate | Clarify: 35 total mutation hooks (30 standardized in Task #8) |
| `docs/README.md` | L61 | `30 mutation hooks` | ⚠️ Inaccurate | Clarify: 30 standardized / 35 total |

---

### B.9 DB Table / Model Count
* **Verified True Value:** **`16 models`** in `contract.prisma` (9 with legacy camelCase `@@map` + 7 with `snake_case` `@@map`).
*(Note: Prompt estimated ~30 tables; actual schema contains exactly 16 models/tables).*

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `backend/src/prisma/contract.prisma` | L132–469 | 16 `model` blocks | ✅ Yes | Master DB contract |
| `docs/PROJECT_CONTEXT.md` | L228 | `9 tables in contract.prisma retain legacy camelCase` | ✅ Yes | Accurate breakdown |
| `.agents/memory/project-conventions.md` | L198 | `9 tables currently use camelCase @@map` | ✅ Yes | Accurate |

---

### B.10 God Files Count (>400 LOC)
* **Verified True Value:** **`5 files`** exceeding modular threshold (>400 LOC), verified via line count inspection:
  1. `frontend/src/components/applications/applications-data-table.tsx` (1,706 LOC)
  2. `backend/src/organizations/organizations.service.ts` (1,359 LOC)
  3. `backend/src/applications/applications.service.ts` (1,188 LOC)
  4. `backend/src/sourcing/sourcing.service.ts` (1,091 LOC)
  5. `frontend/src/components/jobs/job-list.tsx` (956 LOC)

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `docs/PROJECT_CONTEXT.md` | L223–227 | Lists the exact 5 files (~900 to ~1.6k lines) | ✅ Yes | Accurate |
| `.agents/memory/project-conventions.md` | L154 | Lists the exact 5 files | ✅ Yes | Accurate |

---

### B.11 Version Number
* **Verified True Value:** **`1.0.0`** across all package manifests.

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `package.json` | L3 | `"version": "1.0.0"` | ✅ Yes | Accurate |
| `backend/package.json` | L3 | `"version": "1.0.0"` | ✅ Yes | Accurate |
| `frontend/package.json` | L3 | `"version": "1.0.0"` | ✅ Yes | Accurate |
| `packages/shared/package.json` | L3 | `"version": "1.0.0"` | ✅ Yes | Accurate |
| `CHANGELOG.md` | L8 | `[1.0.0] - Phase 22` | ⚠️ Stale date | Recorded at Phase 22; should reflect post-Task #9 release |

---

### B.12 Supported Languages
* **Verified True Value:** **`vi` + `en`** (2-way internationalization across all user-facing components).

| File | Line Number | Recorded Value | Correct? | Remediation Note |
| :--- | :---: | :--- | :---: | :--- |
| `frontend/src/i18n/locales/vi.ts` | - | Vietnamese dictionary | ✅ Yes | Accurate |
| `frontend/src/i18n/locales/en.ts` | - | English dictionary | ✅ Yes | Accurate |
| `docs/PROJECT_CONTEXT.md` | L268 | `vi.ts` / `en.ts` | ✅ Yes | Accurate |

---

## 4. Phần C: Paths & References Audit

Following Task #9, historical audits were archived to `docs/archive/audits/` and transitional reports to `docs/archive/reports/hardening-transitional/`.

### C.1 Stale Path References Found
1. **`CHANGELOG.md`:**
   - Line 34: References `docs/audits/README.md` and `docs/audits/SUMMARY.md` → **Needs update to `docs/archive/audits/README.md` and `docs/archive/audits/SUMMARY.md`**.
   - Line 35: References `docs/audits/archive/phase-01-to-10/` → **Needs update to `docs/archive/audits/phase-01-to-10/`**.
2. **Archived Diagnostic Scripts:**
   - References in `docs/reports/24-task-09-repo-restructure-completion-report.md` correctly refer to `scripts/archive/list-doc-inventory.ts` and `scripts/archive/test-valkey-bullmq.ts`.
   - Grep verification confirms zero active build or CI scripts reference the un-archived paths.
3. **Markdown Link Integrity:**
   - Ran `pnpm lint:doc-links` (CI Gate 10): Audited **98 markdown files** across repository with **0 broken markdown links**.

---

## 5. Phần D: Duplicate Content Audit

### D.1 `MEMORY.md` vs. `project-conventions.md`
`MEMORY.md` was intended to be an index file. However, lines 4–48 (`## Project`) and lines 50–76 (`## User Preferences`) contain long summary bullets duplicating the exact mandates from `project-conventions.md`:
- Pure TypeScript mandate (`.ts, .tsx, .mts, .cts`)
- Centralized Zod-based environment schemas & fail-fast
- Full-stack server-side pagination without hacks
- Zero hardcoded text / 100% translation mandate
- Multi-tenant isolation at DB and Guard layers
- Two-Tier Deletion Protocol (Soft-delete + 30-day cascade)

### D.2 `project-conventions.md` vs. `user-preferences.md` (High Duplication — >80%)
`user-preferences.md` duplicates nearly all architectural and coding rules from `project-conventions.md`:
1. "Memory Language: English only" (Both files L9–11)
2. "Communication Language: Vietnamese for chat, English for code/env" (Both files L12–15)
3. "Zero hardcoded text in frontend" (Both files)
4. "Named imports for React from 'react'" (Both files)
5. "Pure TypeScript mandate / No .js files" (Both files)
6. "Centralized Environment Validation (Zero fallback)" (Both files)
7. "Full-Stack Pagination & Data Integrity" (Both files)
8. "Strict Typing & Zero any" (Both files)
9. "Shell Execution: Never chain with && in Windows PowerShell" (Both files)
10. "Standardized Project Commands: Check package.json first" (Both files)
11. "React Callback Hygiene & SyntheticEvent Safety" (Both files)
12. "Client-Side Network Gatekeeper" (Both files)
13. "Continuous Automated Testing" (Both files)
14. "Object Storage Security & Asset Isolation" (Both files)
15. "TanStack Query Cache Discipline" (Both files)
16. "Zero Silent Mutations & Audit Logging" (Both files)
17. "Queue & Job Idempotency Mandate" (Both files)
18. "Email Template Security Discipline" (Both files)
19. "Two-Tier Deletion Protocol" (Both files)
20. "Error Contract & Localized Exception Discipline" (Both files)
21. "Anti-Monolith Modular Architecture" (Both files)
22. "Node 26+ Tooling Verification (No Corepack)" (Both files)
23. "Web Security & HttpOnly Cookie Baseline" (Both files)
24. "Conventional Commits & Quality Gates" (Both files)
25. "HaiHire Design System & Layout Mandate (Full-width canvas)" (Both files)
26. "Database Transaction & Saga Pattern Discipline" (Both files)

**Issue:** Having these 26 sections in both files guarantees that when a rule is modified, one file will drift and become contradictory.

### D.3 `tech-decisions.md` vs. `project-conventions.md`
`tech-decisions.md` records Architecture Decision Records (ADRs) with Context, Decision, and Rationale, while `project-conventions.md` records prescriptive rules. However, both files reproduce full configuration blocks and test counts, causing drift:
- `tech-decisions.md:L72` records `379 tests total (236 backend + 143 frontend)` as the baseline.
- `project-conventions.md:L212` records `563 automated unit/integration tests`.

### D.4 Contradictory Metrics Inside `project-conventions.md`
Three contradictory test counts exist inside `project-conventions.md` itself:
1. **Line 64:** `all 369 unit/integration tests` (from pre-Phase 20).
2. **Line 212:** `Baseline: 563 automated unit/integration tests` (Task #9 update).
3. **Line 264:** `unit tests (Vitest - 378 tests) run on 100% of pull requests and pushes` (Phase 22.4 legacy).

---

## 6. Phần E: Single Source of Truth Proposal

### Evaluation: Where should the SSOT file live?
- **Option 1: `.agents/memory/project-metrics.md` only:**
  - *Pros:* Directly loaded by AI agents.
  - *Cons:* Invisible to GitHub UI readers, SREs, and developers reading `docs/`.
- **Option 2 (RECOMMENDED): Primary file in `docs/PROJECT_METRICS.md` with pointer in `.agents/memory/project-metrics.md`:**
  - *Pros:* Fully visible in Git repository, integrated into `docs/README.md`, verified by `pnpm lint:doc-links`, and loaded by agents via memory pointer.
  - *Rule:* All other documents (`README.md`, `CONTRIBUTING.md`, runbooks, memory files) will **reference** this file rather than hardcoding numbers.

### Proposed Content Draft: `docs/PROJECT_METRICS.md`

```markdown
# Project Metrics (Single Source of Truth)

> Canonical metrics and architectural facts for the HaiHire Enterprise ATS platform.  
> All documentation, runbooks, and memory files MUST reference this file. DO NOT duplicate numbers across other files.

**Last Updated:** 2026-10-08  
**Platform Version:** v1.0.0 (Production-Ready)  

---

## 1. Quality & Verification Metrics
- **Automated Tests:** `563` total
  - Backend: `376` passing (Vitest, 38 test suites)
  - Frontend: `187` passing (Vitest + JSDOM, 30 test suites)
- **CI Architecture Gates:** `11 gates` (`scripts/check-all.ts`)
  1. `lint:env-sync` (Env Variables Synchronization & Parity)
  2. `check:i18n` (Two-Way i18n & Zero Hardcoded Strings)
  3. `lint` (ESLint Code Quality across Backend & Frontend)
  4. `typecheck` (Strict TypeScript Typecheck)
  5. `lint:dtopipe` (DtoPipe Validation Coverage on @Body)
  6. `lint:error-i18n` (Error Code i18n Localization for 51 error codes)
  7. `lint:api-contract` (API Contract & Leaks Audit across 83 endpoints)
  8. `lint:prometheus-rules` (Prometheus Alert Rules Audit across 14 rules)
  9. `lint:tenant-scope` (Tenant Scoping Static Analysis)
  10. `lint:doc-links` (Documentation Markdown Link Integrity)
  11. `test:diff` (Test Count Delta & Anti-Regression)
  - *Pipeline Execution Step:* `test` (Runs all 563 unit & integration tests)
- **Prometheus Alert Rules:** `14 active rules` (`monitoring/prometheus/alert-rules.yml`)
- **E2E Browser Tests:**
  - Cross-Tenant Security Suite: `6 tests` (`frontend/tests/e2e/tenant-security.spec.ts`)
  - Total E2E Scenarios: `19 tests` across 7 Playwright specs (10 critical user journeys)
- **Test Pass Rate:** `100%` (Zero skipped, zero flaky)

---

## 2. Architecture & Codebase Metrics
- **Monorepo Packages:** `3 core packages` (`backend`, `frontend`, `packages/shared`)
- **Backend Modules:** `18 domain & infra modules` in `backend/src/`
- **Backend Controllers:** `13 controllers`
- **REST API Endpoints:** `83 endpoints` (all covered by API contracts)
- **Frontend Mutation Hooks:** `35 hooks` across 8 files (30 standardized with `onError` cache invalidation)
- **Database Models / Tables:** `16 models` in `contract.prisma`
  - 9 tables with legacy camelCase `@@map` (scheduled post-v1.0.0 migration)
  - 7 tables with `snake_case` `@@map`
- **Technical Debt / God Files (>400 LOC):** `5 files` scheduled for post-v1.0.0 refactor
  - `applications-data-table.tsx` (1,706 LOC)
  - `organizations.service.ts` (1,359 LOC)
  - `applications.service.ts` (1,188 LOC)
  - `sourcing.service.ts` (1,091 LOC)
  - `job-list.tsx` (956 LOC)

---

## 3. Operations & Release Metrics
- **Hardening Milestones:** 10 tasks completed (Tasks #1A → #8 + Task #9 Restructure)
- **Supported Languages:** `2` (`vi` Vietnamese + `en` English)
- **Documentation Language:** 100% English (per Task #7.5 convention)
- **Container Infrastructure:**
  - PostgreSQL `17.6-alpine` (Port `15432` / `5432`)
  - Valkey `8.0.2-alpine` (Port `16379` / `6379`)
  - MinIO S3 (Port `19000` / `9000` API, `19001` / `9001` Console)
  - Caddy `2.8-alpine`
  - Node.js `26-alpine` LTS
```

---

## 7. Phần F: Rà Soát & Đề Xuất Sửa `CONTRIBUTING.md`

`CONTRIBUTING.md` is the most severely outdated document in the repository. It gives misleading guidance to contributors.

### F.1 Specific Issues in `CONTRIBUTING.md`
1. **Title at Line 59:** Claims `The 7 CI Quality Gates` (actually 11).
2. **Text at Line 61:** Claims `all 7 automated CI verification gates must pass`.
3. **Table at Lines 74–83:**
   - Mentions `pnpm lint` as Gate 1 (actually `pnpm lint:env-sync`).
   - Mentions Gate 6 as `pnpm lint:env-sync`.
   - Mentions Gate 7 as `pnpm test` (with `379 tests`).
   - Completely omits Gates 8, 9, 10, and 11 (`lint:prometheus-rules`, `lint:tenant-scope`, `lint:doc-links`, `test:diff`).
4. **Checklist at Line 148:** `- [ ] Ran pnpm check:all locally and verified all 7 gates passed.`
5. **No Reference to Metrics SSOT:** Contains hardcoded outdated counts.

### F.2 Proposed Remediation for `CONTRIBUTING.md` (To be applied in Phase 2)
1. Change Section Header to: `## 🛡️ The 11 CI Architecture Gates`.
2. Update the Gate Table to match `scripts/check-all.ts` exactly:
   ```markdown
   | Gate | Command | Description |
   | :---: | :--- | :--- |
   | **Gate 1** | `pnpm lint:env-sync` | Audits key parity across all 5 `.env` files and Docker Compose |
   | **Gate 2** | `pnpm check:i18n` | Asserts two-way i18n dictionary completeness & zero hardcoded strings |
   | **Gate 3** | `pnpm lint` | ESLint rules & static checks across backend and frontend |
   | **Gate 4** | `pnpm typecheck` | Strict TypeScript compiler check (`tsc --noEmit`) |
   | **Gate 5** | `pnpm lint:dtopipe` | Verifies 100% `@Body()` controller parameters use `DtoPipe` validation |
   | **Gate 6** | `pnpm lint:error-i18n` | Verifies 100% `APP_ERROR_CODES` (51 codes) are localized in `vi.ts` & `en.ts` |
   | **Gate 7** | `pnpm lint:api-contract` | Audits 83 endpoints, zero `JSON.stringify(err)` leaks, zero `alert()` calls |
   | **Gate 8** | `pnpm lint:prometheus-rules` | Verifies 14 Prometheus alert rules syntax, fields, and SRE labels |
   | **Gate 9** | `pnpm lint:tenant-scope` | AST static analysis enforcing query isolation across tenant-scoped modules |
   | **Gate 10** | `pnpm lint:doc-links` | Verifies zero broken markdown links across all documentation |
   | **Gate 11** | `pnpm test:diff` | Audits test count changes against git history to detect test regression |

   > **Unit & Integration Test Suite:** All 11 gates are followed by the automated test suite (`pnpm test`), executing all 563 tests.
   ```
3. Update Line 148 checklist to `verified all 11 gates passed`.
4. Add reference link: `Refer to docs/PROJECT_METRICS.md (proposed Single Source of Truth) for live metrics.`

---

## 8. Questions & Recommendations for DeepSeek Review

Before drafting the Phase 2 Execution Prompt, please confirm the following strategic decisions:

1. **Location of Single Source of Truth:**
   - *Recommendation:* Place the primary SSOT at `docs/PROJECT_METRICS.md`, and add a concise reference in `.agents/memory/MEMORY.md` and `.agents/memory/project-metrics.md`.
   - *Question for DeepSeek:* Do you approve this dual-presence strategy (human-readable `docs/` + agent memory reference)?

2. **Deduplication Strategy for `.agents/memory/`:**
   - Over 80% of `user-preferences.md` duplicates `project-conventions.md`.
   - *Recommendation:* Strip all technical and architectural rules out of `user-preferences.md`, leaving strictly user interaction preferences (language choices, Windows shell execution rules, Senior Engineer mindset, Verified-ship principle). All coding, framework, and security rules will reside exclusively in `project-conventions.md`.
   - *Question for DeepSeek:* Do you approve cleaning `user-preferences.md` to be purely user/workflow preferences?

3. **Prometheus Alert Rules Vietnamese Cleanup:**
   - Lines in `monitoring/prometheus/alert-rules.yml` (rules 1–7) contain `Xem runbook: docs/runbooks/...`.
   - *Recommendation:* Translate to `See runbook: docs/runbooks/...` to adhere 100% to the Task #7.5 English-only documentation mandate.
   - *Question for DeepSeek:* Should this translation be bundled into Task #10 Phase 2?

4. **Synchronizing `docs/runbooks/alerts.md`:**
   - Currently documents only 7 alert rules.
   - *Recommendation:* Expand the table and add triage runbook sections for the remaining 7 BullMQ & Cron alerts in Phase 2.
   - *Question for DeepSeek:* Should this expansion be executed in Phase 2?

---

> 🔒 **Phase 1 Verification Complete:** This audit report is recorded at `docs/reports/25-task-10-memory-docs-consistency-audit-report.md`. No existing files were modified. The branch `chore/task-10-memory-docs-consistency` is ready for DeepSeek review.
