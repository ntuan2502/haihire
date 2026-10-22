# HaiHire Documentation Portal

> Central navigation portal, architectural specifications, engineering conventions, operational runbooks, API contracts, and decision records for the HaiHire Enterprise ATS platform.

---

## 🧭 Navigation Portal

| I want to find...                    | Document to Read                                   | Brief Description                                                       |
| :----------------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------- |
| **System Architecture Overview**     | [System Overview](architecture/system-overview.md) | Monorepo topology, core patterns, services, request flow                |
| **Data Model & Schema**              | [Data Model](architecture/data-model.md)           | Prisma 8 models, relationships, cascading & soft-delete grace periods   |
| **Security & RBAC Architecture**     | [Security & RBAC](architecture/security-rbac.md)   | Cookie-based JWT auth, dynamic org ownership, 5 roles, 41 permissions   |
| **Coding & Operational Conventions** | [Conventions](architecture/conventions.md)         | Pure TypeScript, zero-any, fail-fast env, DtoPipe, i18n, tenant scoping |
| **Architectural Decisions Log**      | [Decisions Log](decisions/DECISIONS.md)            | Consolidated ADRs and key decisions (D-001 through D-006)               |
| **REST API Contracts**               | [API Overview](api/overview.md)                    | 9 controllers, 86 endpoints, standard error envelope                    |
| **Site Reliability & Runbooks**      | [Runbooks Catalog](runbooks/alerts.md)             | Operations runbooks (alerts, backups, deployment, redis, queues)        |
| **Release History & Changelog**      | [Changelog](../CHANGELOG.md)                       | Version history, release milestones, migration notes                    |
| **Developer Onboarding**             | [Onboarding](onboarding.md)                        | Local environment setup, dependencies, quick start                      |
| **Definition of Done**               | [Definition of Done](DEFINITION_OF_DONE.md)        | Production readiness criteria, quality gates, PR standards              |
| **Project Metrics Baseline**         | [Project Metrics](PROJECT_METRICS.md)              | Test suite stats, CI quality gates, coverage, stack baseline            |

---

## 📂 Documentation Directory Structure

```
docs/
├── architecture/
│   ├── system-overview.md          # Monorepo topology, architecture diagrams, request flow
│   ├── data-model.md               # 16 Prisma models, relationships, indexes, soft-delete
│   ├── security-rbac.md            # JWT auth, dynamic ownership, 5 roles, 41 permissions
│   └── conventions.md              # Single source of truth for engineering conventions
├── decisions/
│   ├── DECISIONS.md                # Consolidated architectural decisions (D-001 to D-006)
│   └── phase4-refactor-evidence.md # Information architecture refactor audit trail
├── api/
│   └── overview.md                 # 9 controllers, 86 endpoints, auth, error envelope
├── runbooks/                       # Site reliability & operational SOPs (11 runbooks)
│   ├── alerts.md                   # Prometheus alerts catalog & emergency SOPs
│   ├── backup-and-restore.md       # PostgreSQL dumps, MinIO hot backup & restore drills
│   ├── branch-protection.md        # Branch protection rules, environments & security
│   ├── ci-cd.md                    # Layered CI/CD pipelines, test pyramid & gates
│   ├── dlq-recovery.md             # BullMQ dead-letter queue triage & retry SOP
│   ├── email-queue.md              # Resend/SendGrid queue backlog remediation
│   ├── env-management.md           # Fail-fast environment architecture & sync
│   ├── orphan-cleanup.md           # MinIO daily orphan file cleanup cron
│   ├── production-deployment-plan.md # 5-phase deployment protocol & rollback
│   ├── redis-recovery.md           # Valkey memory exhaustion & failover SOP
│   └── versioning.md               # Monorepo versioning, SemVer, GHCR & immutable release policy
├── releases/                       # Official release notes (v0.1.0 through v0.2.0)
├── onboarding.md                   # Step-by-step developer onboarding & quick start
├── DEFINITION_OF_DONE.md           # Production DoD Checklist
├── PROJECT_METRICS.md              # Project metrics baseline & test counts
├── ROADMAP.md                      # Strategic Horizon & v0.2.0 Release Status
└── TESTCASES.md                    # Verification test matrix across 10 domains
```

---

## 📝 Documentation Guidelines

1. **Single Source of Truth:** Every concept has exactly one authoritative location. Refer to other documents via relative links instead of duplicating text.
2. **Language Mandate:** All documentation is written strictly in **English** (zero exceptions outside of i18n localization resources).
3. **Integrity:** Never commit broken markdown links. All links are automatically validated by CI Gate 10 (`pnpm lint:doc-links`) and Gate 12 (`pnpm lint:doc-sync`).
