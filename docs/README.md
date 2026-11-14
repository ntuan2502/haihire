# HaiHire Documentation Portal

Central index for **HaiHire Platform** architecture, API contracts, engineering conventions, architectural decisions, developer onboarding, and site reliability runbooks.

---

## Architecture & API Contracts

| Document                                               | Scope                                                                                       |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| [System Overview](architecture/system-overview.md)     | Monorepo topology, Next.js 16 + NestJS 12 request flow, Valkey/BullMQ, MinIO                |
| [Data Model & Schema](architecture/data-model.md)      | `22` Prisma models, `18` PostgreSQL enums, cascading deletes, `deletedAt` soft deletes      |
| [Security & RBAC](architecture/security-rbac.md)       | Cookie JWT + `tokenVersion`, `TenantGuard`, dynamic `ownerId`, `5` roles / `41` permissions |
| [Engineering Conventions](architecture/conventions.md) | TypeScript strictness, Zod env, `DtoPipe`, 2-way i18n, Shadcn `base-nova` + `"cn"`          |
| [REST & SSE API Overview](api/overview.md)             | `12` controllers, `107` endpoints, `GlobalExceptionFilter`, `64` `APP_ERROR_CODES`          |
| [Architectural Decisions](decisions/DECISIONS.md)      | Decisions `D-001` through `D-016` (including Prisma `7.10.1` Stable GA)                     |
| [Project Metrics](PROJECT_METRICS.md)                  | Verified codebase inventory, test totals, env keys, and CI gates                            |

---

## Developer Guides

| Guide                                              | Topic                                                                   |
| :------------------------------------------------- | :---------------------------------------------------------------------- |
| [Onboarding Guide](guides/onboarding.md)           | Local Docker setup, env configuration, database workflow, and dev ports |
| [Project Context](guides/project-context.md)       | Product domains, multi-tenant workspace model, and recruiting lifecycle |
| [Definition of Done](guides/definition-of-done.md) | Mandatory code, test, security, i18n, and CI gate checks before merge   |
| [QA Testcases Matrix](guides/testcases.md)         | Unit, cross-tenant, static gate, and Playwright E2E coverage overview   |
| [Platform Roadmap](guides/roadmap.md)              | Post-baseline hardening and release engineering milestones              |

---

## Site Reliability & Operations Runbooks

| Runbook                                                              | Operational Scope                                                                                      |
| :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| [Alerts & Incident Triage](runbooks/alerts.md)                       | Response SOPs for Prometheus alert rules in `monitoring/prometheus/alert-rules.yml`                    |
| [Backup & Restore](runbooks/backup-and-restore.md)                   | PostgreSQL + MinIO backup locks, retention, and verification drills                                    |
| [Dead-Letter Queue Recovery](runbooks/dlq-recovery.md)               | Inspecting and replaying `email-dlq-queue` and `orphan-cleanup-dlq`                                    |
| [Email Queue Operations](runbooks/email-queue.md)                    | BullMQ `email-queue` delivery, SMTP/Resend/SendGrid transporters, backlog handling                     |
| [Orphan MinIO Cleanup](runbooks/orphan-cleanup.md)                   | Manual CLI sweep ([scripts/cleanup-orphan-minio.ts](../scripts/cleanup-orphan-minio.ts)) & Pushgateway |
| [Valkey / Redis Recovery](runbooks/redis-recovery.md)                | Handling `noeviction` memory pressure, AOF persistence, and BullMQ recovery                            |
| [Environment Management](runbooks/env-management.md)                 | `.env.example` / `.env.production.example` sync and rotation (`56` keys)                               |
| [CI/CD Pipelines](runbooks/ci-cd.md)                                 | GitHub Actions feature/dev/staging/main gates and Trivy SARIF release flow                             |
| [Branch Protection](runbooks/branch-protection.md)                   | Rules across `feature/*`, `dev`, `staging`, and `main`                                                 |
| [Prisma Version Policy](runbooks/prisma-version-policy.md)           | Prisma `7.10.1` GA lock, `@prisma/adapter-pg`, and `pnpm` catalog policy                               |
| [Production Deployment Plan](runbooks/production-deployment-plan.md) | `docker-compose.prod.yml` rollout, TLS/proxy checklist, and smoke tests                                |
| [Versioning & Release Policy](runbooks/versioning.md)                | SemVer tags (`v0.1.0` baseline), `CHANGELOG.md`, and version sync scripts                              |
