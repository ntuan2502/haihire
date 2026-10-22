# Phase 3 - Branch 2: Task 5 - Comprehensive @RequirePermission & RolesGuard Audit (Finding F-015)

## Executive Summary

Conducted an exhaustive security audit (Finding **F-015**) across all 12 NestJS controller classes and 85 endpoint handlers within `backend/src`.

### Clarification & Correction of Scanner False Positives (Round 2 Review)

1. **WebhookSettingsController False Positive Disproved**:
   - The initial Task 5 scanner inspected only method-level decorators, erroneously reporting 6 endpoints in `WebhookSettingsController` as "UNPROTECTED".
   - In NestJS, `RolesGuard` evaluates permissions using `Reflector.getAllAndOverride([context.getHandler(), context.getClass()])`.
   - `WebhookSettingsController` declares class-level `@UseGuards(AuthGuard("jwt"), TenantGuard, RolesGuard)` and `@RequirePermission("settings:manage_integrations")`.
   - Therefore, all 6 endpoints in `WebhookSettingsController` were always fully protected by class inheritance.
   - For defense-in-depth, explicit method-level `@RequirePermission("settings:manage_integrations")` decorators were also added in commit `bc1dda1`.
2. **Candidate Detail PII Protection Confirmed**:
   - `GET /candidates/:id` was confirmed protected by `@RequirePermission("candidate:view")` backed by `RolesGuard` and `AuthGuard("jwt")` in commit `bc1dda1`.
3. **Transfer Ownership Endpoint Added (F-016)**:
   - `POST /organizations/my/transfer-ownership` added in commit `59de5fa`, protected by `@RequirePermission("org:transfer_ownership")` and `RolesGuard`.
4. **Current Status**:
   - **0 Unprotected Endpoints**: 100% of sensitive operations are protected by granular permissions and `RolesGuard`.
   - **Zero Authorization Decorator Bypass**: Every route requiring permissions is actively guarded.

---

## 1. Audit Methodology & Scope

- **Total Controller Files Scanned**: 12
- **Total HTTP Endpoint Handlers Audited**: 85
- **Scanner Implementation**: [`scripts/audit-permissions.ts`](../../../scripts/audit-permissions.ts)
  - Inspects both class-level and method-level decorator trees (`@Controller`, `@UseGuards`, `@RequirePermission`).
  - Correctly evaluates NestJS reflector inheritance semantics across all route handlers.

---

## 2. Part A: Permission-Protected Endpoints (44 Endpoints)

Across all 12 controllers, exactly **44 endpoints** declare a required granular permission backed by `RolesGuard`:

| Controller Class            | File Path                                                     | Protected Endpoints | Effective Guard Coverage                                     |
| :-------------------------- | :------------------------------------------------------------ | :-----------------: | :----------------------------------------------------------- |
| `ApplicationsController`    | `backend/src/applications/applications.controller.ts`         |          6          | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`)   |
| `CandidatesController`      | `backend/src/candidates/candidates.controller.ts`             |          8          | ✅ 100% (Method/Class `@UseGuards(RolesGuard)`)              |
| `EmailController`           | `backend/src/email/email.controller.ts`                       |          8          | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`)   |
| `InterviewsController`      | `backend/src/interviews/interviews.controller.ts`             |          4          | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`)   |
| `JobsController`            | `backend/src/jobs/jobs.controller.ts`                         |          4          | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`)   |
| `OrganizationsController`   | `backend/src/organizations/organizations.controller.ts`       |          5          | ✅ 100% (Method `@UseGuards(JwtAuthGuard, RolesGuard)`)      |
| `SourcingController`        | `backend/src/sourcing/sourcing.controller.ts`                 |          3          | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`)   |
| `WebhookSettingsController` | `backend/src/webhook-settings/webhook-settings.controller.ts` |          6          | ✅ 100% (Class `@UseGuards(RolesGuard)` + Method Decorators) |

### Verification Findings:

- **Endpoints Missing `RolesGuard`**: **0** (100% compliant). Zero authorization decorator bypass vulnerabilities exist.
- **Endpoints Missing `JwtGuard`**: **0** (100% compliant). Zero unauthenticated permission evaluations exist.

---

## 3. Part B: Authenticated-Only Endpoints (No Permission Declared, 36 Endpoints)

A total of **36 endpoints** require authentication (`AuthGuard("jwt")`) but do not enforce a granular permission. These are classified by architectural intent:

| Category                           | Endpoint Examples                                                                                                     | Architectural Rationale                                                                |
| :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **Self-Service & Profile**         | `/auth/me`, `/auth/change-password`, `/auth/logout`                                                                   | Operates strictly on the caller's own account context; no role restriction applies.    |
| **Tenant Onboarding & Navigation** | `/organizations` (POST), `/organizations/join`, `/organizations/my`, `/organizations/my/all`, `/organizations/switch` | Essential bootstrap routes for creating workspaces or switching active tenant context. |
| **Shared Read Operations**         | `/jobs` (GET), `/jobs/:id` (GET), `/email/variables` (GET)                                                            | Broadly accessible read-only operational data needed across multiple roles.            |
| **Timeline Activity Tracking**     | `/activities/candidate/:id`, `/activities/application/:id`, `/activities`                                             | Internal timeline feeds scoped by tenant isolation guards.                             |

---

## 4. Part C: Public Endpoints (5 Endpoints)

Exactly **5 endpoints** are intentionally public and unauthenticated:

1. `POST /auth/register` — User account registration
2. `POST /auth/login` — Authentication & JWT credential issuance
3. `GET /organizations/invite-links/public/:token` — Public invitation preview metadata
4. `GET /organizations/public/:slug` — Public organization profile metadata
5. `GET /metrics` — Prometheus metrics scraping endpoint (network-isolated)

---

## 5. Conclusion & Verification

- **Scanner Script**: Executed `pnpm exec tsx scripts/audit-permissions.ts`.
- **Audit Result**:
  - Controllers Scanned: 12
  - Total Endpoints: 85
  - Permission-Protected: 44 (100% backed by `JwtAuthGuard` & `RolesGuard`)
  - Authenticated-Only: 36 (Intentional self-service/bootstrap/shared-read)
  - Public: 5 (Intentional unauthenticated)
  - **Violations: 0**
