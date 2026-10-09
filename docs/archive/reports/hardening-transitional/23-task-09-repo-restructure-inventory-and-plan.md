# Technical Report: Task #9 Phase 1 — Repository Restructure Inventory & Plan

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Antigravity Agent  
**Date:** 2026-10-08  
**Status:** 📋 PHASE 1 INVENTORY & PLAN COMPLETE — PENDING DEEPSEEK & PROJECT OWNER APPROVAL  
**Branch:** `chore/task-09-repo-restructure`  
**Reference Documentation:** [`docs/PROJECT_CONTEXT.md`](../../../PROJECT_CONTEXT.md), [`docs/DEFINITION_OF_DONE.md`](../../../DEFINITION_OF_DONE.md), [`docs/README.md`](../../../README.md)

---

## 1. Executive Summary

Following the completion of the 10 post-Phase 22 hardening tasks (Task #1A through Task #8), the HaiHire repository has reached full production readiness (563 automated tests, 10/10 passing CI gates). Over these phases, substantial historical documentation has accumulated:
- **41 audit files** in `docs/audits/` (Phase 1 through Phase 22.8)
- **22 technical reports** in `docs/reports/` (Task #1A through Task #8)
- **19 maintenance & verification scripts** in `scripts/`
- Active living documents in `docs/` and memory indexes in `.agents/memory/`

To prepare the repository for clean `v1.0.0` tagging and long-term maintainability, this Phase 1 report provides a comprehensive inventory of all top-level and subsystem assets, classifies each file, proposes a streamlined target directory topology, and outlines the exact reference updates required for Phase 2 execution.

### High-Level Asset Classification Summary

| Area / Subsystem | Total Files Scanned | KEEP (Active) | MOVE / ARCHIVE | UPDATE Content | DELETE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Root Level** | 17 files | 14 | 0 | 3 (`README`, `CHANGELOG`, `package.json`) | 0 |
| **`docs/` Living Docs** | 6 files | 4 | 0 | 2 (`README.md`, `ROADMAP.md`) | 0 |
| **`docs/architecture/` & `api/`** | 2 files | 2 | 0 | 0 | 0 |
| **`docs/runbooks/`** | 10 files | 10 | 0 | 0 | 0 |
| **`docs/reports/`** | 22 files | 10 (milestone/arch) | 12 (transitional) | 0 | 0 |
| **`docs/audits/`** | 41 files | 0 | 41 (to `docs/archive/audits/`) | 0 | 0 |
| **`.agents/memory/`** | 5 files | 3 | 0 | 2 (`MEMORY.md`, `project-conventions.md`) | 0 |
| **`.agents/rules/` & `workflows/`** | 19 files | 19 | 0 | 0 | 0 |
| **`scripts/`** | 19 files | 17 | 2 (transitional) | 0 | 0 |
| **`monitoring/`** | 2 files | 2 | 0 | 0 | 0 |
| **`.github/workflows/`** | 4 files | 4 | 0 | 0 | 0 |
| **Backend & Frontend Src** | Verified Clean | All | 0 | 0 | 0 |
| **TOTAL** | **147 files** | **85** | **55 (Archived)** | **7** | **0** |

*Guiding Principle: Zero destructive deletions. All legacy audits and transitional task logs are cleanly preserved in `docs/archive/`.*

---

## 2. Section A: Root-Level Inventory

Inventory of all items directly at the repository root (`C:\Workspaces\haihire\`):

| Item Name | Type | Purpose / Description | Classification | Notes |
| :--- | :---: | :--- | :---: | :--- |
| `.dockerignore` | File | Docker build context filter | **KEEP** | Critical for GHCR image build |
| `.env` | File | Local infrastructure environment variables | **KEEP** | Gitignored, active dev config |
| `.env.example` | File | Infrastructure template for Postgres, Valkey, MinIO | **KEEP** | Validated by CI Gate 1 (`lint:env-sync`) |
| `.env.production.example` | File | Production cluster deployment blueprint | **KEEP** | Validated by CI Gate 1 |
| `.gitignore` | File | Monorepo git exclusion rules | **KEEP** | Ignores `.env`, data dirs, `scratch/`, `backups/` |
| `.npmrc` | File | pnpm workspace & resolution configuration | **KEEP** | Critical for pnpm v12 monorepo |
| `CHANGELOG.md` | File | Formal project version changelog | **UPDATE** | Present (7.7 KB). Update for v1.0.0 release notes |
| `commitlint.config.ts` | File | Commitlint configuration (Conventional Commits) | **KEEP** | Enforces lowercase commit subjects via Husky |
| `CONTRIBUTING.md` | File | Developer contribution guide | **KEEP** | Active standard for developers |
| `docker-compose.yml` | File | Local developer container orchestration | **KEEP** | Manages Postgres, Valkey, MinIO |
| `docker-compose.prod.yml` | File | Production immutable container topology | **KEEP** | Uses GHCR images and isolated network |
| `package.json` | File | Root workspace manifest and command hub | **UPDATE** | Add script aliases for backup and doc link checks |
| `playwright.config.ts` | File | E2E browser test configuration | **KEEP** | Configures Chromium testing on port 13000 |
| `pnpm-lock.yaml` | File | Deterministic dependency tree lockfile | **KEEP** | Required for lockstep CI installs |
| `pnpm-workspace.yaml` | File | Monorepo package directory mappings | **KEEP** | Maps `backend`, `frontend`, `packages/*` |
| `README.md` | File | Primary repository presentation portal | **UPDATE** | Update test metrics (379 -> 563) and CI gates (7 -> 10) |
| `tsconfig.json` | File | Root TypeScript project reference configuration | **KEEP** | Configures tsx and script compilation |
| `.agents/` | Dir | Antigravity AI Agent Kit, memory, and skills | **KEEP / UPDATE** | Standard AI toolkit (see Section C) |
| `.github/` | Dir | GitHub Actions workflows and issue configs | **KEEP** | 4 active workflows (see Section F) |
| `.husky/` | Dir | Git hooks (`pre-commit`, `commit-msg`) | **KEEP** | Enforces quality gates prior to commit |
| `.vscode/` | Dir | Recommended workspace IDE settings | **KEEP** | Editor formatting configuration |
| `backend/` | Dir | NestJS 12 backend application package | **KEEP** | Core backend service |
| `frontend/` | Dir | Next.js 16 frontend application package | **KEEP** | Core frontend web app |
| `packages/` | Dir | Shared monorepo packages (`@haihire/shared`) | **KEEP** | Domain contracts and error codes |
| `monitoring/` | Dir | Prometheus alert rules and telemetry configs | **KEEP** | Alert rules and specs (see Section E) |
| `scripts/` | Dir | Repository operational, CI, and audit scripts | **KEEP / REVIEW** | 19 scripts (see Section D) |
| `docs/` | Dir | Architecture, runbooks, reports, and living docs | **RESTRUCTURE** | Core documentation portal (see Section B) |
| `backups/` | Dir | Local Postgres/MinIO backup landing directory | **KEEP** | Gitignored empty folder used by `backup-production.ts` |
| `scratch/` | Dir | Local scratch exploration and temporary files | **KEEP** | Gitignored directory for dev scratchpads |

*Note: Neither `ROADMAP.md` nor `TESTCASES.md` exists at the root level; both are cleanly maintained inside `docs/`.*

---

## 3. Section B: `docs/` Inventory & Categorization

The `docs/` directory contains 63 total files. Below is the systematic classification:

### 3.1 Living Documentation (`docs/` Root & Domain Subdirectories)

| File Path | Purpose | Classification | Action in Phase 2 |
| :--- | :--- | :---: | :--- |
| `docs/PROJECT_CONTEXT.md` | Monorepo Single Source of Truth (SSOT) | **KEEP** | Living doc; update gate metrics and doc paths |
| `docs/DEFINITION_OF_DONE.md` | Production Release DoD Checklist | **KEEP** | Living doc; reference baseline |
| `docs/ROADMAP.md` | Strategic Product & Architecture Horizon | **UPDATE** | Living doc; update status to reflect Task #1-#8 completion |
| `docs/TESTCASES.md` | Test Cases & Verification Matrix | **KEEP** | Living doc; comprehensive 10-domain test matrix |
| `docs/onboarding.md` | Developer Onboarding Guide | **KEEP** | Living doc; developer setup instructions |
| `docs/README.md` | Documentation Portal Index | **UPDATE** | Realign index links to the new `docs/archive/` structure |
| `docs/api/overview.md` | REST API Contract Specification | **KEEP** | Living doc covering 83 endpoints |
| `docs/architecture/system-overview.md` | Architecture Blueprint & Saga Design | **KEEP** | Living doc; system topology reference |

### 3.2 Operational Runbooks (`docs/runbooks/` — 10 Files)

All 10 runbooks represent active, mission-critical operational and disaster-recovery SOPs:

| Runbook File | Focus / Scope | Classification |
| :--- | :--- | :---: |
| `docs/runbooks/alerts.md` | Prometheus Alerting & Incident Triage | **KEEP** |
| `docs/runbooks/backup-and-restore.md` | PostgreSQL & MinIO Hot Backup / Disaster Recovery | **KEEP** |
| `docs/runbooks/ci-strategy.md` | CI/CD Quality Gates & Conditional E2E Strategy | **KEEP** |
| `docs/runbooks/dlq-recovery.md` | BullMQ DLQ Inspection & Orphan Spike Resolution | **KEEP** |
| `docs/runbooks/email-queue.md` | Email Delivery Queue Failure Mitigation | **KEEP** |
| `docs/runbooks/env-management.md` | 5-File Segregated Environment Synchronization SOP | **KEEP** |
| `docs/runbooks/orphan-cleanup.md` | MinIO Orphan Object Nightly Cron & Manual Cleanup | **KEEP** |
| `docs/runbooks/production-deployment-plan.md` | Immutable Container Deployment & Rollback Playbook | **KEEP** |
| `docs/runbooks/redis-recovery.md` | Valkey 8 Memory Exhaustion & Connectivity Recovery | **KEEP** |
| `docs/runbooks/versioning.md` | Monorepo Lockstep SemVer & Container Tagging SOP | **KEEP** |

### 3.3 Historical Audits (`docs/audits/` — 41 Files)

- **Current State:** 25 files in `docs/audits/`, 2 registry files (`README.md`, `SUMMARY.md`), and 14 archived files in `docs/audits/archive/phase-01-to-10/`.
- **Classification:** **ARCHIVE ALL (41 files)** $\rightarrow$ Move directly into `docs/archive/audits/`.
- **Rationale:** Audits represent historical point-in-time verification logs (Phases 1 through 22.8). They have fulfilled their auditing objective and should not clutter the primary `docs/` navigation tree, but must remain preserved for SOC 2 / compliance auditability.

### 3.4 Technical Reports (`docs/reports/` — 22 Files)

The 22 reports in `docs/reports/` document the post-Phase 22 hardening tasks. They are categorized into **Milestone / Architectural Reference (KEEP in `docs/reports/`)** and **Transitional Survey / Kickoff (ARCHIVE in `docs/archive/reports/`)**:

| Report File | Topic / Task | Classification | Rationale |
| :--- | :--- | :---: | :--- |
| `01-technical-verification-report.md` | Phase 1-22 Deep Verification | **KEEP** | Foundational baseline verification evidence |
| `02-architecture-gap-verification-report.md` | Architectural Gap Analysis | **KEEP** | Primary justification for hardening tasks |
| `03-concurrency-and-cron-audit-report.md` | Cron & Concurrency Audit | **KEEP** | Documents concurrency & cron design |
| `04-frontend-409-conflict-handling-audit.md` | Frontend 409 Conflict Audit | **KEEP** | Primary architectural spec for Task #8 hook refactoring |
| `05-pipeline-kanban-optimistic-update-audit.md` | Kanban Optimistic Update Audit | **KEEP** | Core pipeline UI architecture specification |
| `07-task-01a-multi-channel-webhook-report.md` | Task #1A: Webhook Dispatcher | **KEEP** | Milestone completion report for multi-channel webhooks |
| `08-task-01a-followup-and-prep-01b-report.md` | Task #1A Followup / Prep 1B | **ARCHIVE** | Transitional kickoff survey |
| `09-task-01b-per-org-webhook-settings-report.md` | Task #1B: Per-Org Webhooks | **KEEP** | Milestone completion report for tenant webhooks |
| `10-task-01b-followup-and-prep-task-02-report.md` | Task #1B Followup / Prep #2 | **ARCHIVE** | Transitional kickoff survey |
| `11-task-02-dynamic-bullmq-metrics-report.md` | Task #2: Dynamic Queue Metrics | **KEEP** | Milestone completion report for BullMQ Prometheus metrics |
| `12-task-03-prometheus-alert-rules-report.md` | Task #3: Alert Rules | **KEEP** | Milestone completion report for 7 new Prometheus rules |
| `13-task-04-e2e-cross-tenant-valkey-report.md` | Task #4: Valkey Tenant Isolation | **KEEP** | Milestone completion report for cross-tenant E2E tests |
| `14-task-04-followup-and-task-05-kickoff-survey-report.md` | Task #4 Followup / Prep #5 | **ARCHIVE** | Transitional kickoff survey |
| `15-task-05-tenant-scoping-static-analysis-report.md` | Task #5: Tenant Scoping Gate | **KEEP** | Milestone completion report for CI Gate 10 |
| `16-task-05-followup-and-task-06-kickoff-report.md` | Task #5 Followup / Prep #6 | **ARCHIVE** | Transitional kickoff survey |
| `17-task-06-cron-pushgateway-metrics-report.md` | Task #6: Pushgateway Cron Metrics | **KEEP** | Milestone completion report for orphan cleanup metrics |
| `18-task-07-cron-spike-alert-report.md` | Task #7: Cron Spike Alerts | **KEEP** | Milestone completion report for orphan spike alerts |
| `19-task-07.5-documentation-language-inventory-report.md` | Task #7.5 Phase 1 Inventory | **ARCHIVE** | Transitional inventory report |
| `20-task-07.5-language-standardization-report.md` | Task #7.5 Language Standardization | **KEEP** | Milestone completion report for English language standards |
| `21-task-08-frontend-onerror-hook-audit-report.md` | Task #8 Phase 1 Hook Audit | **ARCHIVE** | Transitional audit table |
| `22-task-08-frontend-onerror-hook-standardization-report.md` | Task #8 Hook Standardization | **KEEP** | Milestone completion report for 30 mutation hooks |
| `23-task-09-repo-restructure-inventory-and-plan.md` | Task #9 Phase 1 Restructure Plan | **KEEP** | Active restructuring specification |

*Summary: 11 Milestone Reports KEPT in `docs/reports/` (with a unified index in `docs/reports/README.md`); 12 Transitional Reports ARCHIVED in `docs/archive/reports/hardening-transitional/`.*

---

## 4. Section C: `.agents/` Inventory

The `.agents/` directory houses the Google Antigravity and AG Kit AI agent definitions, rules, workflows, and memory systems:

| Directory | Item Count | Purpose | Status / Action |
| :--- | :---: | :--- | :---: |
| `.agents/memory/` | 5 files | Cross-session persistent project memory | **UPDATE 2 Files** |
| `.agents/rules/` | 6 files | Mandatory workspace AI behavior rules | **KEEP (All Active)** |
| `.agents/workflows/` | 13 files | Interactive slash command definitions | **KEEP (All Active)** |
| `.agents/agent/` | 20 files | Specialized persona definitions | **KEEP (All Active)** |
| `.agents/skills/` | 38 skills | Modular AI capability knowledge packs | **KEEP (All Active)** |
| `.agents/scripts/` | 9 files | Agent toolkit maintenance scripts | **KEEP** |
| `.agents/schemas/` | 4 files | Manifest and memory schema validators | **KEEP** |

### Memory Accuracy Audit (`.agents/memory/`):
1. **`.agents/memory/MEMORY.md`**:
   - *Status:* Outdated in Gate count and test metrics.
   - *Issue:* L42 lists "7 CI Architecture Gates (379 tests baseline)". Current repository has **10 CI Gates** and **563 tests**.
   - *Action:* Update to reflect the 10 gates and current test counts.
2. **`.agents/memory/project-conventions.md`**:
   - *Status:* Outdated in Gate list.
   - *Issue:* Section "CI Architecture Gates" (L199-208) lists only Gates 1 through 7. Lacks Gate 8 (Prometheus Alert Rules), Gate 9/10 (Tenant Scoping), and Gate 10 (Test Delta).
   - *Action:* Update to document the full suite of 10 automated CI gates.
3. **`.agents/memory/tech-decisions.md`**, **`user-preferences.md`**, **`feedback-history.md`**:
   - *Status:* 100% accurate, in English, adhering to project memory guidelines $\rightarrow$ **KEEP**.

---

## 5. Section D: `scripts/` Inventory

Inventory of all 19 scripts in `scripts/`:

| Script Name | Purpose | Referenced in `package.json`? | Referenced in CI Workflows? | Classification |
| :--- | :--- | :---: | :---: | :---: |
| `backup-production.ts` | Postgres & MinIO hot archival pipeline | Runbook only | No | **KEEP** (Add npm alias) |
| `bump-version.ts` | Monorepo SemVer bump automation | Yes (`version:bump`) | No | **KEEP** |
| `check-all.ts` | Unified CI quality runner (fast/full/e2e) | Yes (`check:all*`) | No | **KEEP** |
| `check-api-contract-coverage.ts` | CI Gate 7: Contract parity & leak audit | Yes (`lint:api-contract`) | Yes (via `check:all`) | **KEEP** |
| `check-dtopipe-coverage.ts` | CI Gate 5: DtoPipe validation checker | Yes (`lint:dtopipe`) | Yes (via `check:all`) | **KEEP** |
| `check-env-sync.ts` | CI Gate 1: 5-file environment sync checker | Yes (`lint:env-sync`) | Yes (via `check:all`) | **KEEP** |
| `check-error-code-i18n.ts` | CI Gate 6: Error code translation checker | Yes (`lint:error-i18n`) | Yes (via `check:all`) | **KEEP** |
| `check-prometheus-rules.ts` | CI Gate 8: Prometheus alert rule audit | Yes (`lint:prometheus-rules`)| Yes (via `check:all`) | **KEEP** |
| `check-tenant-scoping.ts` | CI Gate 9: Static tenant isolation analysis | Yes (`lint:tenant-scope`)| Yes (via `check:all`) | **KEEP** |
| `check-tenant-scoping.spec.ts`| Unit tests for tenant scoping analysis | Yes (via `test`) | Yes (via `ci-cd.yml`) | **KEEP** |
| `check-test-count.ts` | CI Gate 10: Anti-regression test diff | Yes (`test:diff`) | Yes (`ci-cd.yml:L196`)| **KEEP** |
| `cleanup-orphan-minio.ts` | MinIO orphan cleanup cron + Pushgateway | Production Cron | No | **KEEP** (Critical ops) |
| `cleanup-orphan-minio.spec.ts`| Unit tests for MinIO orphan cleanup | Yes (via `test`) | Yes (via `ci-cd.yml`) | **KEEP** |
| `list-doc-inventory.ts` | Documentation inventory scanner | No | No | **ARCHIVE** (Transitional) |
| `smoke-and-load-test.ts` | Runtime smoke & load verification tool | Yes (`test:verify`) | No | **KEEP** |
| `sync-version.ts` | Monorepo version alignment tool | Yes (`version:sync`) | No | **KEEP** |
| `tenant-scoping.config.ts` | Whitelist configuration for CI Gate 9 | Imported by checker | Yes (via `check:all`) | **KEEP** |
| `test-valkey-bullmq.ts` | Ad-hoc Valkey & BullMQ standalone probe | No | No | **ARCHIVE** (Transitional) |
| `verify-doc-links.ts` | Automated markdown link integrity audit | No | No | **KEEP** (Add npm alias) |

*Action:*
- Add `pnpm lint:doc-links`: `"tsx scripts/verify-doc-links.ts"` to `package.json`.
- Add `pnpm db:backup`: `"tsx scripts/backup-production.ts"` to `package.json`.
- Move `list-doc-inventory.ts` and `test-valkey-bullmq.ts` to `scripts/archive/` (or keep in `scripts/archive/`).

---

## 6. Section E: `monitoring/` Inventory

The `monitoring/` directory contains exactly 2 files:
1. `monitoring/prometheus/alert-rules.yml` (6.9 KB): 14 compliant Prometheus alert rules (BullMQ DLQ, Email queue backlog, Redis availability, Orphan cleanup spikes, Cron missing). Validated by CI Gate 8. $\rightarrow$ **KEEP**.
2. `monitoring/prometheus/alert-rules.spec.ts` (6.6 KB): Automated Vitest suite testing PromQL syntax, threshold values, and label conformity. $\rightarrow$ **KEEP**.

Zero redundant or orphaned files. Structure is clean and production-ready.

---

## 7. Section F: `.github/workflows/` Inventory

All 4 workflows in `.github/workflows/` are verified active with zero duplication:

| Workflow File | Trigger Conditions | Primary Responsibility | Classification |
| :--- | :--- | :--- | :---: |
| `ci-cd.yml` | Push & PR to `main`, `dev` | Static quality gates, Vitest tests, conditional Playwright E2E, Docker build | **KEEP** |
| `docker-publish.yml` | Tags `v*.*.*`, manual dispatch | Pre-release test gate, multi-platform buildx, GHCR publish, release draft | **KEEP** |
| `e2e-nightly.yml` | Schedule `0 3 * * *`, dispatch | Full scheduled nightly Playwright E2E browser journeys | **KEEP** |
| `release.yml` | Tags `v*.*.*`, manual dispatch | Release notes extraction, automated changelog generation | **KEEP** |

---

## 8. Section G: Backend & Frontend Top-Level Structure Verification

- **`backend/src/`**:
  - Divided into 18 domain/infra directories (`activities`, `applications`, `auth`, `candidates`, `common`, `config`, `email`, `events`, `interviews`, `jobs`, `metrics`, `minio`, `organizations`, `prisma`, `sourcing`, `test`, `users`, `webhook-settings`).
  - Contains exactly 6 standard NestJS root files (`app.controller.spec.ts`, `app.controller.ts`, `app.module.ts`, `app.service.spec.ts`, `app.service.ts`, `main.ts`).
  - **Verdict:** Highly cohesive, zero loose or misplaced files.
- **`frontend/src/`**:
  - Modularized into 9 standard directories (`app`, `components`, `constants`, `context`, `hooks`, `i18n`, `lib`, `test`, `types`).
  - Contains exactly 1 root file: `proxy.ts` (Next.js server edge proxy).
  - **Verdict:** Clean modular architecture with barrel exports, zero loose components at root.

No structural relocations recommended for application source code.

---

## 9. Section H: Proposed Target Directory Structure

The proposed restructure organizes `docs/` into active living documentation, active runbooks, curated milestone reports, and a dedicated `docs/archive/` tree for legacy audits and transitional task records.

```text
haihire/
├── .agents/
│   ├── memory/
│   │   ├── MEMORY.md                          [UPDATED: 10 CI gates, 563 tests]
│   │   ├── project-conventions.md             [UPDATED: 10 CI gates documented]
│   │   ├── feedback-history.md                [KEEP]
│   │   ├── tech-decisions.md                  [KEEP]
│   │   └── user-preferences.md                [KEEP]
│   ├── rules/                                 [KEEP - 6 rules]
│   ├── skills/                                [KEEP - 38 skills]
│   └── workflows/                             [KEEP - 13 workflows]
├── docs/
│   ├── README.md                              [UPDATED: Updated portal index]
│   ├── PROJECT_CONTEXT.md                     [UPDATED: SSOT living doc]
│   ├── DEFINITION_OF_DONE.md                  [KEEP: Production DoD checklist]
│   ├── ROADMAP.md                             [UPDATED: v1.0.0 status update]
│   ├── TESTCASES.md                           [KEEP: 10-domain verification matrix]
│   ├── onboarding.md                          [KEEP: Developer onboarding guide]
│   ├── api/
│   │   └── overview.md                        [KEEP: 83 REST API endpoints]
│   ├── architecture/
│   │   └── system-overview.md                 [KEEP: System architecture blueprint]
│   ├── releases/
│   │   └── v1.0.0.md                          [NEW: Formal v1.0.0 release notes]
│   ├── runbooks/                              [KEEP: 10 SRE & disaster recovery runbooks]
│   │   ├── alerts.md
│   │   ├── backup-and-restore.md
│   │   ├── ci-strategy.md
│   │   ├── dlq-recovery.md
│   │   ├── email-queue.md
│   │   ├── env-management.md
│   │   ├── orphan-cleanup.md
│   │   ├── production-deployment-plan.md
│   │   ├── redis-recovery.md
│   │   └── versioning.md
│   ├── reports/                               [KEEP: 11 Milestone & Architecture Reports]
│   │   ├── README.md                          [NEW: Curated index of hardening milestones]
│   │   ├── 01-technical-verification-report.md
│   │   ├── 02-architecture-gap-verification-report.md
│   │   ├── 03-concurrency-and-cron-audit-report.md
│   │   ├── 04-frontend-409-conflict-handling-audit.md
│   │   ├── 05-pipeline-kanban-optimistic-update-audit.md
│   │   ├── 07-task-01a-multi-channel-webhook-report.md
│   │   ├── 09-task-01b-per-org-webhook-settings-report.md
│   │   ├── 11-task-02-dynamic-bullmq-metrics-report.md
│   │   ├── 12-task-03-prometheus-alert-rules-report.md
│   │   ├── 13-task-04-e2e-cross-tenant-valkey-report.md
│   │   ├── 15-task-05-tenant-scoping-static-analysis-report.md
│   │   ├── 17-task-06-cron-pushgateway-metrics-report.md
│   │   ├── 18-task-07-cron-spike-alert-report.md
│   │   ├── 20-task-07.5-language-standardization-report.md
│   │   └── 22-task-08-frontend-onerror-hook-standardization-report.md
│   └── archive/                               [NEW: Consolidated Historical Archives]
│       ├── audits/                            [MOVED: All 41 Phase 1-22 audit reports]
│       │   ├── README.md                      (Original registry preserved)
│       │   ├── SUMMARY.md                     (Original synthesis preserved)
│       │   ├── phase-01-to-10/                (Consolidated early phases)
│       │   └── phase-11-to-22/                (Consolidated middle phases)
│       └── reports/                           [MOVED: 12 Transitional/Kickoff reports]
│           ├── 08-task-01a-followup-and-prep-01b-report.md
│           ├── 10-task-01b-followup-and-prep-task-02-report.md
│           ├── 14-task-04-followup-and-task-05-kickoff-survey-report.md
│           ├── 16-task-05-followup-and-task-06-kickoff-report.md
│           ├── 19-task-07.5-documentation-language-inventory-report.md
│           ├── 21-task-08-frontend-onerror-hook-audit-report.md
│           └── 23-task-09-repo-restructure-inventory-and-plan.md
├── scripts/
│   ├── (17 active scripts)                    [KEEP]
│   └── archive/                               [NEW: Transitional diagnostic scripts]
│       ├── list-doc-inventory.ts
│       └── test-valkey-bullmq.ts
├── monitoring/                                [KEEP: alert-rules.yml + spec]
├── .github/                                   [KEEP: 4 active workflows]
├── backend/                                   [KEEP: 100% untouched]
├── frontend/                                  [KEEP: 100% untouched]
└── packages/shared/                           [KEEP: 100% untouched]
```

---

## 10. Section I: Files Requiring Reference Updates

Moving `docs/audits/` to `docs/archive/audits/` and transitional reports to `docs/archive/reports/` requires updating path references in the following files:

| Target File | Current Reference | Updated Target Path |
| :--- | :--- | :--- |
| `README.md` (root, L120) | `docs/audits/README.md` | `docs/archive/audits/README.md` |
| `docs/README.md` (L12, L13, L45) | `docs/audits/README.md`, `docs/audits/SUMMARY.md` | `docs/archive/audits/README.md`, `docs/archive/audits/SUMMARY.md` |
| `docs/PROJECT_CONTEXT.md` (L274) | `docs/audits/*.md` | `docs/archive/audits/*.md` |
| `.agents/memory/feedback-history.md` | `docs/audits/` | `docs/archive/audits/` |
| `scripts/verify-doc-links.ts` | Automatically scans `docs/` | No path breakages (recursively resolves) |
| `docs/reports/22-task-08-frontend-onerror-hook-standardization-report.md` | Typo: `PROJECT_PROJECT_CONTEXT.md` | Fix typo: `PROJECT_CONTEXT.md` |

*Automated Verification Tool:* The `scripts/verify-doc-links.ts` script will be executed during Phase 2 to guarantee that **zero broken links** remain across all markdown files.

---

## 11. Section J: Proposed Deletions & Archival Matrix

In accordance with strict enterprise audit requirements, **NO files will be permanently deleted (`git rm` without backup)**. All files slated for retirement will be safely moved into `docs/archive/` or `scripts/archive/`.

| Candidate File / Group | Current Location | Proposed Destination | Rationale |
| :--- | :--- | :--- | :--- |
| **All Historical Audits** (41 files) | `docs/audits/*` | `docs/archive/audits/*` | Historical verification logs for Phases 1-22; preserved for compliance |
| **Transitional Hardening Reports** (6 files) | `docs/reports/08`, `10`, `14`, `16`, `19`, `21` | `docs/archive/reports/hardening-transitional/` | Intermediary kickoff/audit surveys superseded by final task reports |
| **Diagnostic Test Scripts** (2 files) | `scripts/list-doc-inventory.ts`, `scripts/test-valkey-bullmq.ts` | `scripts/archive/` | Ad-hoc Phase 15/21 tooling no longer tied to automated CI pipelines |

---

## 12. Risk Assessment & Mitigations

1. **Risk 1: Broken Markdown Hyperlinks**
   - *Threat:* Moving audit and report files breaks relative links in `README.md`, `docs/README.md`, and historical references.
   - *Mitigation:* Run `pnpm exec tsx scripts/verify-doc-links.ts` immediately after moving files. It scans 95+ markdown files and detects broken links in milliseconds with exit code 1 on failure.
2. **Risk 2: CI Pipeline Breakages**
   - *Threat:* A CI workflow or package script accidentally references a moved path.
   - *Mitigation:* Audited all `.github/workflows/` and `package.json`. The only script referenced in CI is `scripts/check-test-count.ts` (which remains in `scripts/`). Verified zero CI workflows reference `docs/audits/` or `docs/reports/`.
3. **Risk 3: Git History Disruption**
   - *Threat:* Relocating files causes git blame tracking loss.
   - *Mitigation:* Use atomic `git mv` operations so Git preserves full commit history across renames.

---

## 13. Questions for DeepSeek & Project Owner Confirmation

Before commencing Phase 2 execution, please review and confirm the following 3 points:

1. **Report Segmentation Preference:**
   - *Option A (Recommended):* Keep the 11 milestone completion reports (Tasks #1A, #1B, #2, #3, #4, #5, #6, #7, #7.5, #8) in `docs/reports/` with an updated `docs/reports/README.md` index, and archive only the 6 transitional kickoff/survey reports into `docs/archive/reports/`.
   - *Option B:* Archive all 22 reports into `docs/archive/reports/` and leave only a lightweight summary table in `docs/reports/`.
2. **`docs/audits/` Relocation:**
   - Confirm moving all 41 files from `docs/audits/` to `docs/archive/audits/`, updating portal links in `README.md` and `docs/README.md`.
3. **Addition of npm Script Aliases:**
   - Confirm adding `"lint:doc-links": "tsx scripts/verify-doc-links.ts"` and `"db:backup": "tsx scripts/backup-production.ts"` to `package.json`.

---

**Next Action:** Await review and approval of this plan before executing Phase 2.
