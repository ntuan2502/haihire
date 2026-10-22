# Architecture Decisions — HaiHire

> Single source of truth for all architectural decisions.
> Each decision has: ID, date, decision, rationale, enforcement, history.
> New decisions are added as new sections. Do NOT create separate ADR files.

## D-001: Acceptance of 11 High CVEs from Prisma 8 RC / Alchemy as Known Limitation

- Date: 2026-10-02
- Decision: Adopted Prisma 8 RC (`@prisma/orm-postgres@8.0.0-rc.13`, `prisma@8.0.0-rc.19`, `effect@4.0.0-rc.118`) and accepted 11 High CVEs in transitive devDependencies.
- Rationale: Upgraded to Prisma 8 RC for contract-first PostgreSQL 17 features. 11 High CVEs in `@prisma/composer-prisma-cloud` (Hono dependency) are isolated to development and do not execute in production runtime.
- Evidence: CI vulnerability audit and build verification.
- Enforcement: CI Gate 12 (`lint:doc-sync`).
- History: Migrated from ADR-001 in Phase 4 IA refactor.
