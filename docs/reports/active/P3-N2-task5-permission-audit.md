# Phase 3 - Branch 2: Task 5 - Comprehensive @RequirePermission & RolesGuard Audit (Finding F-015)

## Executive Summary

Conducted an exhaustive security audit (Finding **F-015**) across all 12 NestJS controller classes and 84 endpoint handlers within `backend/src`. The objective was twofold:

1. Verify that 100% of endpoints decorated with `@RequirePermission(...)` are actively protected by `RolesGuard` (either class-level or method-level) and authenticated by `AuthGuard("jwt")`.
2. Systematically inspect all endpoints protected by `AuthGuard("jwt")` that currently lack `@RequirePermission(...)`, evaluating authorization granularity, data exposure risk, and actionable recommendations for milestone `v0.4.0`.

---

## 1. Audit Methodology & Scope

- **Total Controller Files Scanned**: 12
- **Total HTTP Endpoint Handlers Audited**: 84
- **Automated AST & Decorator Scanner**: Custom AST inspector analyzing class-level and method-level decorator trees (`@UseGuards`, `@RequirePermission`, `@Roles`, `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`).

---

## 2. Part A: Verification of Endpoints with `@RequirePermission`

Across all 12 controllers, exactly **36 endpoints** declare a required granular permission.

| Controller Class          | File Path                                               | Total Decorated Endpoints |                   Guard Coverage Status                    |
| :------------------------ | :------------------------------------------------------ | :-----------------------: | :--------------------------------------------------------: |
| `ApplicationsController`  | `backend/src/applications/applications.controller.ts`   |             6             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |
| `CandidatesController`    | `backend/src/candidates/candidates.controller.ts`       |             7             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |
| `EmailController`         | `backend/src/email/email.controller.ts`                 |             8             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |
| `InterviewsController`    | `backend/src/interviews/interviews.controller.ts`       |             4             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |
| `JobsController`          | `backend/src/jobs/jobs.controller.ts`                   |             4             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |
| `OrganizationsController` | `backend/src/organizations/organizations.controller.ts` |             4             |      ✅ 100% (Method/Class `@UseGuards(RolesGuard)`)       |
| `SourcingController`      | `backend/src/sourcing/sourcing.controller.ts`           |             3             | ✅ 100% (Class `@UseGuards(AuthGuard("jwt"), RolesGuard)`) |

### Verification Findings:

- **Endpoints Missing `RolesGuard`**: **0** (100% compliant). Zero authorization decorator bypass vulnerabilities exist.
- **Endpoints Missing `JwtGuard`**: **0** (100% compliant). Zero unauthenticated permission evaluations exist.

---

## 3. Part B: Audit of Endpoints with `JwtGuard` Lacking `@RequirePermission`

A total of **37 endpoints** are protected by `AuthGuard("jwt")` but do not currently declare an explicit `@RequirePermission(...)`. Per protocol, these are classified into **Architectural Intent** vs **Recommended Granular Scoping for v0.4.0**:

### Table: Gap Analysis & Recommendations

| Endpoint                                  | HTTP Method | Current State      | Risk / Behavior Evaluation                                                                                                                         | Proposed Permission                                  |  Severity  |
| :---------------------------------------- | :---------: | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- | :--------: |
| `/candidates`                             |    `GET`    | Authenticated only | Lists all tenant candidates. Currently all tenant users (including `INTERVIEWER` and `MEMBER`) can list candidate records.                         | `@RequirePermission("candidate:view_basic")`         | **MEDIUM** |
| `/candidates/:id`                         |    `GET`    | Authenticated only | Retrieves full candidate details. Candidates contain encrypted PII (phone, email, notes). An `INTERVIEWER` or `MEMBER` should only see basic info. | `@RequirePermission("candidate:view")`               |  **HIGH**  |
| `/applications`                           |    `GET`    | Authenticated only | Lists all applications across the tenant.                                                                                                          | `@RequirePermission("application:view")`             | **MEDIUM** |
| `/applications/job/:jobId`                |    `GET`    | Authenticated only | Lists all applications for a specific job requisition.                                                                                             | `@RequirePermission("application:view")`             | **MEDIUM** |
| `/applications/:id`                       |    `GET`    | Authenticated only | Retrieves detailed application profile and pipeline status.                                                                                        | `@RequirePermission("application:view")`             | **MEDIUM** |
| `/jobs`                                   |    `GET`    | Authenticated only | Lists active and draft jobs within the tenant. Regular members need to view jobs.                                                                  | `@RequirePermission("job:view")`                     |  **LOW**   |
| `/jobs/:id`                               |    `GET`    | Authenticated only | Retrieves single job requisition details.                                                                                                          | `@RequirePermission("job:view")`                     |  **LOW**   |
| `/interviews`                             |    `GET`    | Authenticated only | Lists scheduled interviews across the tenant.                                                                                                      | `@RequirePermission("interview:view")`               | **MEDIUM** |
| `/interviews/:id`                         |    `GET`    | Authenticated only | Retrieves single interview session details.                                                                                                        | `@RequirePermission("interview:view")`               | **MEDIUM** |
| `/activities/candidate/:id`               |    `GET`    | Authenticated only | Timeline events for candidate.                                                                                                                     | `@RequirePermission("candidate:view")`               |  **LOW**   |
| `/activities/application/:id`             |    `GET`    | Authenticated only | Timeline events for application stage changes.                                                                                                     | `@RequirePermission("application:view")`             |  **LOW**   |
| `/activities`                             |   `POST`    | Authenticated only | Creates internal notes or timeline records.                                                                                                        | `@RequirePermission("application:update")`           |  **LOW**   |
| `/email/variables`                        |    `GET`    | Authenticated only | Static dictionary of available template placeholders. Safe read-only metadata.                                                                     | _None (Safe metadata)_                               |  **INFO**  |
| `/email/templates`                        |    `GET`    | Authenticated only | Lists configured tenant email templates.                                                                                                           | `@RequirePermission("email:view")`                   | **MEDIUM** |
| `/email/settings`                         |    `GET`    | Authenticated only | Lists configured tenant email transport settings.                                                                                                  | `@RequirePermission("email:view")`                   | **MEDIUM** |
| `/email/logs`                             |    `GET`    | Authenticated only | Lists delivery audit logs for outbound emails.                                                                                                     | `@RequirePermission("email:view")`                   | **MEDIUM** |
| `/sourcing/stats`                         |    `GET`    | Authenticated only | Sourcing analytics dashboard metrics.                                                                                                              | `@RequirePermission("sourcing:view")`                | **MEDIUM** |
| `/sourcing/links`                         |    `GET`    | Authenticated only | Lists all sourcing tracking links.                                                                                                                 | `@RequirePermission("sourcing:view")`                | **MEDIUM** |
| `/sourcing/links/:id`                     |    `GET`    | Authenticated only | Retrieves detailed click and attribution stats for tracking link.                                                                                  | `@RequirePermission("sourcing:view")`                | **MEDIUM** |
| `/sourcing/attribution-log`               |    `GET`    | Authenticated only | Audit trail of sourcing link clicks.                                                                                                               | `@RequirePermission("sourcing:view")`                |  **LOW**   |
| `/webhook-settings`                       |    `GET`    | Authenticated only | Lists active third-party webhook integrations (Telegram, Discord, Generic).                                                                        | `@RequirePermission("settings:manage_integrations")` |  **HIGH**  |
| `/webhook-settings/:id`                   |    `GET`    | Authenticated only | Inspects webhook destination URLs and secrets.                                                                                                     | `@RequirePermission("settings:manage_integrations")` |  **HIGH**  |
| `/webhook-settings`                       |   `POST`    | Authenticated only | Registers a new webhook subscription.                                                                                                              | `@RequirePermission("settings:manage_integrations")` |  **HIGH**  |
| `/webhook-settings/:id`                   |   `PATCH`   | Authenticated only | Updates webhook configuration and signature secret.                                                                                                | `@RequirePermission("settings:manage_integrations")` |  **HIGH**  |
| `/webhook-settings/:id`                   |  `DELETE`   | Authenticated only | Removes webhook integration.                                                                                                                       | `@RequirePermission("settings:manage_integrations")` |  **HIGH**  |
| `/webhook-settings/test`                  |   `POST`    | Authenticated only | Dispatches test payload to configured external endpoint.                                                                                           | `@RequirePermission("settings:manage_integrations")` | **MEDIUM** |
| `/organizations`                          |   `POST`    | Authenticated only | Provisions a new tenant. By design, the caller does not belong to any tenant yet.                                                                  | _None (Intentional Onboarding Flow)_                 |  **INFO**  |
| `/organizations/join`                     |   `POST`    | Authenticated only | Joins a tenant using an invite code. By design, caller is joining prior to role assignment.                                                        | _None (Intentional Onboarding Flow)_                 |  **INFO**  |
| `/organizations/my`                       |    `GET`    | Authenticated only | Fetches active tenant profile. All authenticated tenant members must access.                                                                       | _None (Core tenant context)_                         |  **INFO**  |
| `/organizations/my/all`                   |    `GET`    | Authenticated only | Lists all organizations where user has membership (tenant switcher).                                                                               | _None (Core multi-tenant navigation)_                |  **INFO**  |
| `/organizations/switch`                   |   `POST`    | Authenticated only | Switches user active context to another tenant they belong to.                                                                                     | _None (Core multi-tenant navigation)_                |  **INFO**  |
| `/organizations/my/members`               |    `GET`    | Authenticated only | Lists all users and assigned roles in the current organization.                                                                                    | `@RequirePermission("org:manage_members")`           | **MEDIUM** |
| `/organizations/my/invite-links`          |    `GET`    | Authenticated only | Lists outstanding active invitation tokens.                                                                                                        | `@RequirePermission("org:manage_members")`           | **MEDIUM** |
| `/organizations/invite-links/join/:token` |   `POST`    | Authenticated only | Redundant join endpoint via token.                                                                                                                 | _None (Intentional Onboarding Flow)_                 |  **INFO**  |
| `/auth/logout`                            |   `POST`    | Authenticated only | Revokes active user JWT / session.                                                                                                                 | _None (Self-service auth)_                           |  **INFO**  |
| `/auth/change-password`                   |   `POST`    | Authenticated only | Allows authenticated user to update their own credentials.                                                                                         | _None (Self-service profile action)_                 |  **INFO**  |
| `/auth/me`                                |    `GET`    | Authenticated only | Returns current authenticated user profile and permissions.                                                                                        | _None (Core auth bootstrap)_                         |  **INFO**  |

---

## 4. Key Takeaways & Recommendations

1. **Zero Critical Vulnerabilities in Existing Guards**:
   - Every existing `@RequirePermission` has active, enforceable `RolesGuard` backing. No decorator is dead or bypassing validation.
2. **Webhook Settings Exposure (HIGH)**:
   - The entire `WebhookSettingsController` relies exclusively on `AuthGuard("jwt")` at the class level without `@RequirePermission("settings:manage_integrations")`. Any member of an organization could potentially view or alter webhooks and webhook signing secrets.
   - **Recommendation**: Add `@UseGuards(AuthGuard("jwt"), RolesGuard)` and `@RequirePermission("settings:manage_integrations")` in milestone `v0.4.0`.
3. **Candidate PII Read Exposure (HIGH)**:
   - `GET /candidates/:id` lacks `@RequirePermission("candidate:view")`. While download is guarded (F-001), candidate PII in JSON payload is currently viewable by all roles.
   - **Recommendation**: Add `@RequirePermission("candidate:view")` to `GET /candidates/:id` in `v0.4.0`.
4. **Onboarding & Self-Service Endpoints (INFO)**:
   - The 8 endpoints marked `INFO` (e.g. `/auth/me`, `/auth/logout`, `/organizations` creation/switch) MUST remain without `@RequirePermission`, as they constitute user-level self-service and tenant bootstrapping.

---

## 5. Rollback Plan

- Revert the Task 5 commit:
  `git revert HEAD`
- Removes audit artifact `docs/reports/active/P3-N2-task5-permission-audit.md`.
