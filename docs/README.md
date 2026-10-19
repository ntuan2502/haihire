# HaiHire Documentation Center

> Central knowledge base, architectural specifications, operations runbooks, API contracts, hardening milestone reports, and verification archive for the HaiHire Enterprise ATS platform.

---

## 🧭 Documentation Map

```
docs/
├── PROJECT_CONTEXT.md              # Living Single Source of Truth (SSOT)
├── DEFINITION_OF_DONE.md           # Production DoD Checklist
├── ROADMAP.md                      # Strategic Horizon & v0.2.0 Release Status
├── TESTCASES.md                    # Verification test matrix across 10 domains
├── onboarding.md                   # Step-by-step developer onboarding & quick start
├── architecture/                   # System design & topology
│   └── system-overview.md          # Monorepo topology, Mermaid diagrams, core patterns
├── api/                            # REST API contracts & specifications
│   └── overview.md                 # 9 controllers, 84 endpoints, auth, error envelope
├── releases/                       # Official release notes & changelogs (6 versions)
│   ├── v0.1.0.md                   # Pre-release baseline notes
│   ├── v0.1.0-announcement.md      # Launch announcement
│   ├── v0.1.1.md                   # CI/CD stability patch
│   ├── v0.1.2.md                   # Wave 1-3 God Files refactor
│   ├── v0.1.3.md                   # CI/CD optimization & runbook consolidation
│   ├── v0.1.4.md                   # Accessibility campaign & coverage augmentation
│   └── v0.2.0.md                   # Wave 4 God Files refactor milestone
├── runbooks/                       # Site reliability & operational runbooks (11 SOPs)
│   ├── alerts.md                   # Prometheus alerts catalog & emergency SOPs
│   ├── backup-and-restore.md       # PostgreSQL dumps, MinIO hot backup & restore drills
│   ├── branch-protection.md        # Branch protection rules, environments & security
│   ├── ci-cd.md                    # Layered CI/CD pipelines, test pyramid & gates
│   ├── dlq-recovery.md             # BullMQ dead-letter queue triage & retry SOP
│   ├── email-queue.md              # Resend/SendGrid queue backlog remediation
│   ├── env-management.md           # 5-file environment architecture & sync
│   ├── orphan-cleanup.md           # MinIO daily orphan file cleanup cron
│   ├── production-deployment-plan.md # 5-phase deployment protocol & rollback
│   ├── redis-recovery.md           # Valkey memory exhaustion & failover SOP
│   └── versioning.md               # Monorepo versioning, SemVer, GHCR & immutable release policy
├── reports/                        # Milestone Completion Reports (79 reports)
│   ├── README.md                   # 5-phase structured milestone index
│   └── [79 milestone reports]      # Primary technical verification evidence
└── archive/                        # Consolidated Historical Archives
    ├── audits/                     # Historical verification logs (Phases 1 to 22.8)
    │   ├── README.md               # Registry of all 20 phases & verification milestones
    │   ├── SUMMARY.md              # Cross-phase synthesis, bug taxonomy & credibility curve
    │   ├── phase-01-to-10/         # Archived early foundation audits
    │   └── [phase-11 to 22]        # Modern phase audit reports
    ├── reports/                    # Historical transitional reports
    │   └── hardening-transitional/ # 7 kickoff surveys, inventories & audit tables
    └── runbooks-deprecated/        # Superseded & merged operational runbooks
```

---

## 🛡️ Hardening Summary (v1.0.0)

Between Task #1A and Task #8, the platform underwent a comprehensive hardening phase to reach production readiness:

| #   | Task                     | Focus                                     | Report                                                                   |
| --- | ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| 1A  | Multi-Channel Webhook    | Telegram, Discord, Generic webhooks       | [07](reports/07-task-01a-multi-channel-webhook-report.md)                |
| 1B  | Per-Org Webhook Settings | DB schema, encryption, UI                 | [09](reports/09-task-01b-per-org-webhook-settings-report.md)             |
| 2   | Dynamic BullMQ Metrics   | Real-time queue depth                     | [11](reports/11-task-02-dynamic-bullmq-metrics-report.md)                |
| 3   | Prometheus Alert Rules   | 4 BullMQ alerts + runbooks                | [12](reports/12-task-03-prometheus-alert-rules-report.md)                |
| 4   | E2E Cross-Tenant Test    | HTTP-level isolation tests                | [13](reports/13-task-04-e2e-cross-tenant-valkey-report.md)               |
| 5   | Tenant Scoping Static    | CI Gate for query isolation               | [15](reports/15-task-05-tenant-scoping-static-analysis-report.md)        |
| 6   | Cron Pushgateway         | Orphan cleanup metrics                    | [17](reports/17-task-06-cron-pushgateway-metrics-report.md)              |
| 7   | Cron Spike Alert         | 3 new alerts for cron                     | [18](reports/18-task-07-cron-spike-alert-report.md)                      |
| 7.5 | Language Standardization | English docs/comments/logs                | [20](reports/20-task-07.5-language-standardization-report.md)            |
| 8   | Frontend onError Hook    | Standardize 30 hooks (35 total)           | [22](reports/22-task-08-frontend-onerror-hook-standardization-report.md) |
| 9   | Repository Restructure   | Archive legacy audits, Gate 11 link check | [24](reports/24-task-09-repo-restructure-completion-report.md)           |
| 10  | Consistency Audit & Sync | Single Source of Truth & metrics sync     | [25](reports/25-task-10-memory-docs-consistency-audit-report.md)         |

**Results:** 656 tests passing, 11 CI architecture gates, zero critical issues.

---

## 📂 Quick Links by Role

### For New Developers

- 🚀 [**Developer Onboarding Guide**](onboarding.md): Get your local environment up and running in under 5 minutes.
- 🌿 [**Contributing Guidelines**](../CONTRIBUTING.md): Git branching conventions, Conventional Commits, and 11 CI quality gates.

### For Software Engineers & Architects

- 🏛️ [**System Architecture Overview**](architecture/system-overview.md): High-level system diagram, distributed Saga transactions, AsyncLocalStorage context, and React Server Components.
- 🔌 [**REST API Specifications**](api/overview.md): Endpoint inventory, HttpOnly JWT authentication, server-side pagination, and 51 standardized `APP_ERROR_CODES`.
- 📋 [**Hardening Reports Index**](reports/README.md): Detailed technical reports on the 10 post-Phase 22 hardening milestones.

### For DevOps & Site Reliability Engineers (SRE)

- 🚀 [**Production Deployment Runbook**](runbooks/production-deployment-plan.md): Safe 5-phase deployment workflow, smoke verification, and rollback procedures.
- 📦 [**Versioning & Container Publishing Runbook**](runbooks/versioning.md): SemVer rules, monorepo alignment, GHCR image publishing, and immutable tag policy.
- 💾 [**Backup & Disaster Recovery Runbook**](runbooks/backup-and-restore.md): Automated PostgreSQL dual-format dumps, MinIO volume snapshots, and automated restore verification drills.
- 🧹 [**MinIO Orphan File Cleanup Runbook**](runbooks/orphan-cleanup.md): Daily cron purging unreferenced resume files after a 30-day grace period.
- ⚙️ [**Environment Architecture Runbook**](runbooks/env-management.md): Segregated 5-file environment management, auto-sync checks, and build-time inlining rules.
- 🚨 [**Monitoring & Incident Response Runbook**](runbooks/alerts.md): Prometheus alert matrix, triage steps, and emergency remediation SOPs.

### For QA, Security & Verification Engineers

- 🛡️ [**Historical Audit Registry**](archive/audits/README.md): Complete phase-by-phase verification index across all 20 implementation phases.
- 📊 [**Audit Cross-Phase Synthesis**](archive/audits/SUMMARY.md): Credibility score evolution (94.1% -> 99.0%), root-cause lessons learned, and bug taxonomy.

---

## 📝 Documentation Guidelines

1. **Language:** All documentation must be written strictly in **English** (per Task #7.5 convention).
2. **Accuracy:** Keep all commands, port mappings, script names, and versions aligned with actual repository configuration.
3. **Integrity:** Never leave broken markdown links. Every link is validated by CI Gate 11 (`pnpm lint:doc-links`).
