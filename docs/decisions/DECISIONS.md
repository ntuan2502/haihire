# Architecture Decisions — HaiHire

> Single source of truth for all architectural decisions.  
> Each decision has: ID, Date, Decision, Rationale, Evidence, Enforcement, History.  
> New decisions are added as new sections. Do NOT create separate ADR files.

---

## D-001: Acceptance of 11 High CVEs from Prisma 8 RC / Alchemy as Known Limitation

- **Date:** 2026-10-02
- **Decision:** Adopted Prisma 8 RC (`@prisma/orm-postgres@8.0.0-rc.13`, `prisma@8.0.0-rc.19`, `effect@4.0.0-rc.118`) and accepted 11 transitive High CVEs in devDependencies via `@prisma/composer-prisma-cloud` (Hono dependency) as a formally documented Known Limitation for release `v0.3.0`.
- **Rationale:** Upgraded to Prisma 8 RC to leverage contract-first PostgreSQL 17 features, schema compilation (`contract.prisma`), and modern TypeScript types. The 11 High CVEs originate in transitive dependencies of build/composer tooling and do not execute within the production runtime container. Full exit from this limitation will occur upon Prisma 8 GA release.
- **Evidence:** Audit reports in `package.json`, `.github/workflows/ci-feature.yml` lines 136-137, and `scripts/check-doc-sync.ts`.
- **Enforcement:** CI Gate 12 (`pnpm lint:doc-sync`) Check 4 verifies that all pre-release packages are covered by decisions in this file. Security audit gates in CI (`trivy-action`, `pnpm audit`) block on Critical vulnerabilities while allowing documented High build-time CVEs.
- **History:** Formally documented in `ADR-001-prisma-8-rc.md` (superseded by this entry in Phase 4 IA refactor).

---

## D-002: Next.js Proxy Rewrites without /api Prefix and v0.4.0 Standardization

- **Date:** 2026-10-21
- **Decision:** Retain legacy direct path rewrites (`/organizations/*`, `/jobs/*`, `/applications/*`, `/users/*`, `/events/*`, `/haihire-resumes/*`) alongside `/api/*` in `frontend/next.config.ts` for release `v0.3.0`. Standardize all API routes under unified `/api/v1/*` in release `v0.4.0`.
- **Rationale:** Multiple legacy frontend client modules make relative calls without `/api` prefixes (e.g. `axios.get('/jobs')`). Modifying all route prefixes right before the `v0.3.0` release risked introducing regressions across 963+ tests and 23 E2E specs. Retaining proxy rewrites stabilizes `v0.3.0` while scheduling full prefix alignment (`/api/v1`) for `v0.4.0`.
- **Evidence:** Configuration in `frontend/next.config.ts` lines 14-24.
- **Enforcement:** Verified via automated Next.js rewrites unit tests in `frontend/src/lib/api/client.spec.ts` and E2E Playwright specs.
- **History:** Formally documented in `ADR-002-frontend-rewrite-path.md` (superseded by this entry in Phase 4 IA refactor).

---

## D-003: Dynamic Organization Ownership via Organization.ownerId and Deprecation of Role.OWNER

- **Date:** 2026-10-21
- **Decision:** Deprecated and completely removed the static `Role.OWNER` enum value across the database schema, Prisma contract, `@haihire/shared` RBAC permissions, and frontend types. Established `Organization.ownerId` (`String`, Foreign Key referencing `User(id)` with `onDelete: Restrict`) as the dynamic, single source of truth for organization ownership.
- **Rationale:** A static `OWNER` role attached to a user violated multi-tenant relational integrity: a user can own Tenant A but be an interviewer or member in Tenant B. Furthermore, the dual source of truth caused defect F-003 where tenant creators assigned role `ADMIN` were blocked with HTTP 403 when trying to delete their own organization. Resolving ownership dynamically at runtime (`user.isOwner = (user.id === currentOrg.ownerId)`) eliminates dual-source state collisions.
- **Evidence:** Prisma migration in `backend/migrations/app/`, permission definitions in `packages/shared/src/permissions.ts`, and guard implementation in `backend/src/auth/roles.guard.ts`.
- **Enforcement:** Enforced at runtime by `JwtStrategy` (injecting `isOwner`), `RolesGuard` (granting dynamic owner super-admin bypass), and tenant ownership transfer endpoint `POST /organizations/my/transfer-ownership`.
- **History:** Initially, Branch 1 temporarily band-aided `"org:delete"` by adding `Role.ADMIN` to permissions. Branch 2 superseded this with the root-cause fix via `ADR-003-dynamic-org-ownership.md` and removed `Role.OWNER` from the codebase.

---

## D-004: Next.js 16 Proxy Convention Adoption (proxy.ts Replaces middleware.ts)

- **Date:** 2026-10-22
- **Decision:** Use `frontend/src/proxy.ts` and `export function proxy(request: NextRequest)` for Edge route interception and authentication redirects, following the official Next.js 16 file convention. Deprecate and prohibit `middleware.ts`.
- **Rationale:** Next.js 16 formally deprecated the `middleware.ts` file convention and `middleware` function export, emitting build warnings (`⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`). Adopting `proxy.ts` aligns with the modern Next.js 16 Turbopack compiler architecture and eliminates build-time deprecation warnings.
- **Evidence:** Implementation in `frontend/src/proxy.ts` and automated audit gate `scripts/check-nextjs-conventions.ts`.
- **Enforcement:** CI Gate 15 (`pnpm lint:nextjs-conventions`) prohibits any `middleware.ts` or `middleware.js` in `frontend/` and asserts the existence of `frontend/src/proxy.ts`.
- **History:** In commit `6593328` (September 3, 2026), `proxy.ts` was originally authored. In Phase 1 audit finding F-004, an AI agent with outdated pre-Next.js 16 training incorrectly flagged `proxy.ts` as an inactive misconfiguration and renamed it to `middleware.ts` in commit `c6c805b`. Finding F-004-R1 identified the error; commit `be46651` restored `proxy.ts` and commit `9142e05` instituted CI Gate 15 to enforce the rule permanently.

---

## D-005: GitHub Actions dorny/paths-filter@v4 Upgrade and Node 24 Action Baseline

- **Date:** 2026-10-22
- **Decision:** Pinned all GitHub Actions workflows to modern action versions running on Node 24 runtime baseline, specifically requiring `dorny/paths-filter@v4`, `actions/checkout@v5`, `actions/setup-node@v5`, `actions/cache@v5`, and `actions/upload-artifact@v6`.
- **Rationale:** GitHub Actions announced the deprecation and planned sunset of the Node.js 20 runner baseline. `dorny/paths-filter@v3` triggers deprecation annotations on every workflow run. Upgrading to `@v4` ensures clean CI logs, long-term compatibility, and compliance with enterprise security requirements.
- **Evidence:** Workflows in `.github/workflows/ci-dev.yml`, `ci-feature.yml`, `ci-staging.yml`, `ci-main.yml`, and `cd-release.yml`.
- **Enforcement:** CI Gate 16 (`pnpm lint:github-action-versions`) scans all workflow YAML files to enforce minimum action versions and prohibit deprecated actions.
- **History:** Upgraded to `@v4` by project lead in commit `b969b13` (October 6, 2026) within `ci-cd.yml`. When layered workflows were split in commit `5f32495`, an older template with `@v3` was accidentally referenced, and subsequent deletion of `ci-cd.yml` in commit `54fc5b0` orphaned the upgrade. Re-upgraded and locked via CI Gate 16 in commit `92aeedf`.

---

## D-006: Separation of Recruitment ActivityLog from Enterprise Tenant Administration

- **Date:** 2026-10-22
- **Decision:** Retain `model ActivityLog` in Prisma strictly for candidate recruitment lifecycle events (`APPLIED`, `STAGE_CHANGED`, `EMAIL_SENT`, `INTERVIEW_SCHEDULED`, etc.). Administrative tenant operations (such as `OWNERSHIP_TRANSFERRED`, `ORG_DELETED`, `MEMBER_ROLE_CHANGED`) are logged via structured backend application logs in `v0.3.0`, and deferred to a dedicated `OrganizationAuditLog` database entity in `v0.4.0` (Finding F-017).
- **Rationale:** In `contract.prisma`, `ActivityLog` has a non-nullable Foreign Key `candidateId String` referencing `Candidate`. Attempting to store tenant-level administrative events inside `ActivityLog` would break domain boundaries by conflating recruitment activity with tenant administration, or would require altering `candidateId` to nullable via an unnecessary breaking database migration right before `v0.3.0` release.
- **Evidence:** Schema in `backend/src/prisma/contract.prisma` and finding report `docs/reports/active/finding-F-017-organization-audit-log.md`.
- **Enforcement:** Code review gate; verified in `backend/src/organizations/organizations.service.ts` where ownership transfers emit structured application logs instead of touching `ActivityLog`.
- **History:** Raised during Phase 3 Branch 2 code review (Round 3) regarding ownership transfer auditing; formally resolved as architectural finding F-017 and scheduled for `v0.4.0` implementation.
