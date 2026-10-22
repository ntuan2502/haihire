# HaiHire Platform — AI Coding Agent Operating Guide (AGENTS.md)

> This document is the primary architectural contract and operational entry point for all AI coding agents, contributors, and automated tooling operating within the HaiHire codebase. Every rule defined herein is strictly binding.

---

<!-- STATS:START -->

| Metric                           | Value                             | Reference / Notes                                   |
| :------------------------------- | :-------------------------------- | :-------------------------------------------------- |
| **Release Target**               | `v0.3.0`                          | Pre-tag feature branch `feat/v0.3.0-rbac-agents-ci` |
| **Commit Baseline**              | `a12ffa8` (2026-10-21)            | Author: Tún                                         |
| **Workspace Unit Tests**         | `963 passed`                      | Backend: 540, Frontend: 423                         |
| **E2E Playwright Specs**         | `23 specs`                        | End-to-end recruitment lifecycle                    |
| **CI Architecture Gates**        | `16/16 gates`                     | `pnpm check:all` mandatory gates                    |
| **Environment Configuration**    | `55 keys`                         | 100% key parity & codebase sync                     |
| **Pre-Release Dependencies**     | `3 packages (covered by ADR-001)` | Prisma 8 RC & effect override                       |
| **Documentation Link Integrity** | `100% valid`                      | Audited via `pnpm lint:doc-links`                   |

<!-- STATS:END -->

---

## 1. Operating Rules for AI Agents

All AI agents operating in this repository must strictly adhere to the following workflow:

1. **What to Read First (Mandatory):**
   - [**Conventions (SSOT)**](docs/architecture/conventions.md): Authoritative engineering rules covering pure TypeScript, zero-any typing, centralized fail-fast environment validation, DtoPipe coverage, 2-way i18n, and multi-tenant scoping.
   - [**Decisions Log**](docs/decisions/DECISIONS.md): Unified record of all architectural decisions (D-001 through D-006) superseding legacy ADRs.
2. **What to Write & Update:**
   - **Rules & Standards:** Any new persistent coding or architectural convention must be added directly to [docs/architecture/conventions.md](docs/architecture/conventions.md).
   - **Architectural Decisions:** Any significant design choice, trade-off, or pre-release package adoption must be recorded in [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md).
   - **Single Source of Truth:** Never duplicate documentation content across multiple files. Always reference existing specifications via relative markdown links.
3. **Prohibited Agent Behaviors:**
   - ❌ **No Transient Process Reports:** Do NOT create milestone, investigation, or progress report files in root or anywhere in `docs/`. Process history is maintained via git commit messages.
   - ❌ **No Writes to `.agents/memory/`:** The `.agents/memory/` folder is deprecated. Persistent project knowledge lives exclusively in `docs/architecture/conventions.md` and `docs/decisions/DECISIONS.md`.
4. **Conflict Resolution Hierarchy:**
   - If a conflict arises between documents: specifications in [docs/architecture/](docs/architecture/system-overview.md) and [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md) ALWAYS take precedence over any tool-generated rules or secondary documentation.

---

## 2. Documentation Map

| Area                          | Authoritative Document                                                       | Scope & Focus                                                         |
| :---------------------------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **System Overview**           | [docs/architecture/system-overview.md](docs/architecture/system-overview.md) | Topology diagram, modular NestJS backend, Next.js 16 frontend         |
| **Data Model & Schema**       | [docs/architecture/data-model.md](docs/architecture/data-model.md)           | 16 Prisma models, relations, cascading rules, soft-delete periods     |
| **Security & RBAC**           | [docs/architecture/security-rbac.md](docs/architecture/security-rbac.md)     | Cookie JWT auth, dynamic `ownerId`, 5 roles, 41 permissions matrix    |
| **Engineering Conventions**   | [docs/architecture/conventions.md](docs/architecture/conventions.md)         | Coding standards, fail-fast env, DtoPipe, i18n, tenant scoping        |
| **Architectural Decisions**   | [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md)                   | Consolidated ADRs and architectural decisions log                     |
| **REST API Contracts**        | [docs/api/overview.md](docs/api/overview.md)                                 | 9 controllers, 86 endpoints, standard error envelopes                 |
| **Site Reliability Runbooks** | [docs/runbooks/alerts.md](docs/runbooks/alerts.md)                           | Operational SOPs (alerts, backups, deployment, queues)                |
| **Releases & Changelog**      | [CHANGELOG.md](CHANGELOG.md)                                                 | Release milestones, migration logs, and version history               |
| **Documentation Portal**      | [docs/README.md](docs/README.md)                                             | Central search and navigation directory for all project documentation |

---

## 3. Note on AG Kit (`.agents/`)

- The `.agents/` directory is automatically provisioned and managed by the **AG Kit** agent framework (`ag-kit`).
- **DO NOT DELETE `.agents/`:** Deleting the directory will trigger automatic reinstallation by AG Kit tooling.
- **Rule Precedence:** Rules in `.agents/rules/` provide baseline assistant tooling behavior; however, HaiHire engineering rules defined in [docs/architecture/conventions.md](docs/architecture/conventions.md) are strictly supreme and override any conflicting baseline guidance.

---

## 4. Key Commands Reference

```bash
# Verification Gates (16/16 required before PR merge)
pnpm check:all           # Run all 16 CI architecture verification gates

# Testing
pnpm test                # Run complete unit & integration test suite (1,019 tests)
pnpm test:diff           # Verify test count delta against HEAD~1 (regression gate)

# Linting & Static Analysis
pnpm lint                # ESLint across backend and frontend workspaces
pnpm typecheck           # TypeScript compiler typecheck (tsc --noEmit)
pnpm lint:doc-links      # Verify zero broken relative markdown links (Gate 10)
pnpm lint:doc-sync       # Verify documentation, env parity, and decisions sync (Gate 11)
pnpm lint:tenant-scope   # Verify 100% of Prisma queries isolated by tenant organizationId (Gate 9)

# Development
pnpm dev                 # Start development servers (backend: 13001, frontend: 13000)
pnpm build               # Build all workspace packages and applications
```
