# HaiHire Documentation Portal

> Central navigation portal, architectural specifications, engineering conventions, operational runbooks, API contracts, developer guides, and decision records for the HaiHire Enterprise ATS platform.

---

## 🧭 Navigation Portal

| I want to find...                                                          | Document to Read                                   | Brief Description                                                       |
| :------------------------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------- |
| **System Architecture Overview**                                           | [System Overview](architecture/system-overview.md) | Monorepo topology, core patterns, services, request flow                |
| **Data Model & Schema**                                                    | [Data Model](architecture/data-model.md)           | Prisma 8 models, relationships, cascading & soft-delete grace periods   |
| **Security & RBAC Architecture**                                           | [Security & RBAC](architecture/security-rbac.md)   | Cookie-based JWT auth, dynamic org ownership, 5 roles, 41 permissions   |
| **Coding & Operational Conventions**                                       | [Conventions](architecture/conventions.md)         | Pure TypeScript, zero-any, fail-fast env, DtoPipe, i18n, tenant scoping |
| │ └── DECISIONS.md # Consolidated architectural decisions (D-001 to D-009) |
| **REST API Contracts**                                                     | [API Overview](api/overview.md)                    | 9 controllers, 86 endpoints, standard error envelope                    |
| **Site Reliability & Runbooks**                                            | [Runbooks Catalog](runbooks/alerts.md)             | Operations runbooks (alerts, backups, deployment, redis, queues)        |
| **Release History & Changelog**                                            | [Changelog](../CHANGELOG.md)                       | Version history, release milestones, migration notes                    |
| **Developer Onboarding**                                                   | [Onboarding](guides/onboarding.md)                 | Local environment setup, dependencies, quick start                      |
| **Definition of Done**                                                     | [Definition of Done](guides/definition-of-done.md) | Production readiness criteria, quality gates, PR standards              |
| **QA Test Cases Matrix**                                                   | [Test Cases](guides/testcases.md)                  | Verification test matrix across 10 platform domains                     |
| **Deep System Context**                                                    | [Project Context](guides/project-context.md)       | Technical stack, services, runtime architecture                         |
| **Product Roadmap**                                                        | [Roadmap](guides/roadmap.md)                       | Strategic product roadmap across v0.1.0 to v0.4.0                       |
| **Project Metrics Baseline**                                               | [Project Metrics](PROJECT_METRICS.md)              | Test suite stats, CI quality gates, coverage, stack baseline            |

---

## 📂 Documentation Directory Structure

```
docs/
├── README.md                           # Central documentation portal index (this file)
├── PROJECT_METRICS.md                  # Project metrics baseline & test counts
├── architecture/
│   ├── system-overview.md              # Monorepo topology, architecture diagrams, request flow
│   ├── data-model.md                   # 16 Prisma models, relationships, indexes, soft-delete
│   ├── security-rbac.md                # JWT auth, dynamic ownership, 5 roles, 41 permissions
│   └── conventions.md                  # Single source of truth for engineering conventions
├── decisions/
│   └── DECISIONS.md                    # Consolidated architectural decisions (D-001 to D-009)
├── api/
│   └── overview.md                     # 9 controllers, 86 endpoints, auth, error envelope
├── guides/                             # Developer workflows, checklists, and specifications
│   ├── onboarding.md                   # Step-by-step developer onboarding & quick start
│   ├── definition-of-done.md           # Production DoD Checklist
│   ├── testcases.md                    # Verification test matrix across 10 domains
│   ├── project-context.md              # Deep technical stack and component specifications
│   └── roadmap.md                      # Strategic Horizon & v0.2.0 Release Status
├── runbooks/                           # Site reliability & operational SOPs (13 runbooks)
│   ├── alerts.md                       # Prometheus alerts catalog & emergency SOPs
│   ├── backup-and-restore.md           # PostgreSQL dumps, MinIO hot backup & restore drills
│   ├── branch-protection.md            # Branch protection rules, environments & security
│   ├── ci-cd.md                        # Layered CI/CD pipelines, test pyramid & gates
│   ├── dlq-recovery.md                 # BullMQ dead-letter queue triage & retry SOP
│   ├── email-queue.md                  # Resend/SendGrid queue backlog remediation
│   ├── env-management.md               # Fail-fast environment architecture & sync
│   ├── orphan-cleanup.md               # MinIO daily orphan file cleanup cron
│   ├── prisma-version-policy.md        # Prisma version upgrade policy & ADR coverage
│   ├── production-deployment-plan.md   # 5-phase deployment protocol & rollback
│   ├── redis-recovery.md               # Valkey memory exhaustion & failover SOP
│   ├── release-checklist.md            # Production release verification checklist
│   └── versioning.md                   # Monorepo versioning, SemVer, GHCR & immutable release policy
└── releases/                           # Official release notes (one file per version)
    ├── v0.1.0.md                       # Released on GitHub (2026-10-14)
    ├── v0.1.1.md                       # Released on GitHub (2026-10-14)
    ├── v0.1.2.md                       # Released on GitHub (2026-10-16)
    ├── v0.1.3.md                       # Released on GitHub (2026-10-16)
    ├── v0.1.4.md                       # Released on GitHub (2026-10-17)
    ├── v0.2.0.md                       # Released on GitHub (2026-10-19)
    └── v0.3.0.md                       # Local pre-release candidate (Current branch)
```

> **Note on Releases:** `docs/releases/` contains exactly one file per version. Only versions officially released on GitHub are listed here, alongside the active local pre-release candidate.

---

## 📝 Documentation Guidelines

1. **Single Source of Truth:** Every concept has exactly one authoritative location. Refer to other documents via relative links instead of duplicating text.
2. **Language Mandate:** All documentation is written strictly in **English** (zero exceptions outside of i18n localization resources).
3. **Integrity:** Never commit broken markdown links. All links are automatically validated by CI Gate 10 (`pnpm lint:doc-links`) and Gate 12 (`pnpm lint:doc-sync`).
