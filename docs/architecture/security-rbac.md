# Security Architecture & Dynamic RBAC

HaiHire implements defense-in-depth security across network boundaries, authentication cookies, tenant isolation, role/permission resolution, object storage, and outbound integrations.

---

## 1. Authentication & Session Lifecycle (`apps/api/src/auth/`)

- **HttpOnly Cookie JWT + Bearer Fallback:** `AuthController` (`POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`) issues signed JWT access/refresh tokens (`haihire_token`, `haihire_refresh_token`) alongside a client-readable org-membership hint cookie (`haihire_has_org`) evaluated by [apps/web/src/proxy.ts](../../apps/web/src/proxy.ts).
- **Immediate Session Revocation (`tokenVersion`):** `User.tokenVersion` increments on logout-all and `POST /auth/change-password`; `JwtStrategy` validates `payload.tokenVersion === user.tokenVersion` against PostgreSQL on authenticated requests.
- **Frontend Silent Refresh Queue:** Axios interceptors ([apps/web/src/lib/api/client.ts](../../apps/web/src/lib/api/client.ts)) queue concurrent `401` failures behind a single `POST /auth/refresh` exchange before replaying or logging out cleanly.
- **SSE Authentication (`GET /events/sse`):** Accepts cookie/Bearer/query JWT token via `EventsService.subscribeWithToken`, rejecting invalid streams with `APP_ERROR_CODES.SSE_UNAUTHORIZED`.

---

## 2. Multi-Tenant Data Isolation

- **Global Request Boundary (`TenantGuard`):** [apps/api/src/common/guards/tenant.guard.ts](../../apps/api/src/common/guards/tenant.guard.ts) inspects `req.query.organizationId`, `req.body.organizationId`, and `req.params.organizationId` (rejecting conflicting or non-string inputs), validates active membership, and synchronizes `req.user.organizationId`, `req.user.role`, `req.user.isOwner`, and `req.user.organization` before `RolesGuard` executes, throwing `AppForbiddenException(ORG_FORBIDDEN_ACTION)` on unauthorized cross-tenant targets.
- **Service-Layer `organizationId` Scoping:** All **10 tenant-scoped backend modules** (`applications`, `candidates`, `jobs`, `interviews`, `sourcing`, `activities`, `organizations`, `webhook-settings`, `email`, `notifications`) enforce `organizationId` filtering in Prisma `where` clauses or parent relation verification.
- **Automated Static Gate (`pnpm lint:tenant-scope`):** [scripts/check-tenant-scoping.ts](../../scripts/check-tenant-scoping.ts) audits `321` Prisma queries across `34` service files, stripping `select: { ... }` projections before lookahead, ignoring non-call `typeof` checks, and isolating function boundaries per method so guards in earlier methods never mask later queries.

---

## 3. Dynamic Owner & 5-Role / 41-Permission RBAC

Definitions live in [packages/shared/src/permissions.ts](../../packages/shared/src/permissions.ts) and resolve dynamically via [apps/api/src/auth/permission-resolver.service.ts](../../apps/api/src/auth/permission-resolver.service.ts) and [apps/api/src/auth/roles.guard.ts](../../apps/api/src/auth/roles.guard.ts):

### 5 Roles

- `ADMIN` (full organizational access; immutable in `OrganizationRolePermission`)
- `RECRUITER` (requisitions, candidates, applications, documents, sourcing, email send)
- `HIRING_MANAGER` (pipeline stage moves, interviews, scorecards, read-only sourcing/candidates)
- `INTERVIEWER` (application/interview visibility, scorecard submission, read-only resume downloads)
- `MEMBER` (read-only baseline view across core entities)

### Resolution Precedence

1. **Dynamic Owner Bypass (`Organization.ownerId`):** If `user.isOwner` or `user.organization?.ownerId === user.id`, `RolesGuard` grants full privileges unconditionally; ownership transfers atomically via `POST /organizations/my/transfer-ownership`.
2. **`ADMIN` Immutability:** `ADMIN` always resolves `true` for all `41` permissions (`ORG_ADMIN_PERMISSIONS_IMMUTABLE` blocks overrides).
3. **Per-Org Overrides (`OrganizationRolePermission`):** `PermissionResolverService` resolves role permissions using a 2-tier cache: L1 in-memory LRU (`60s` TTL) and L2 Valkey/Redis cache (`300s` TTL). When an admin updates or resets permissions (`POST /organizations/my/roles/permissions`), Redis pub/sub invalidation (`haihire:permissions:invalidate`) purges L1 and L2 caches instantly across all horizontal API replicas before falling back to `PERMISSIONS` defaults in `@haihire/shared`.
4. **`candidate:view` PII Masking:** When a caller holds `job:view` or `application:view` (such as baseline `MEMBER`) without `candidate:view`, `GET /jobs/:id`, `GET /applications`, `GET /applications/job/:jobId`, and `GET /applications/:id` resolve `PermissionResolverService` (`"candidate:view"`) and redact candidate names to `"[Masked]"` while stripping email, phone, resume metadata, interviews, and candidate search matching.
5. **PostgreSQL RLS & Cross-Org Invites:** All `30` tenant-scoped tables (including `organization_member` and `platform_audit_log`) enforce PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY` under `haihire_rls_user`). Cross-organization invite acceptance (`OrganizationsInvitesService.join` / `joinByToken`) enters `withSystemRlsBypass` so authenticated users belonging to Org A can resolve and accept pending `InviteLink` tokens issued by Org B cleanly, and initial organization creation scopes its transaction via `withTenantRls(organizationId)`.

### 41 Permissions Inventory

- **Organization (`8`):** `org:view`, `org:update`, `org:delete`, `org:manage_members`, `org:manage_roles`, `org:manage_billing`, `org:transfer_ownership`, `org:view_audit_log`
- **Jobs (`4`):** `job:view`, `job:create`, `job:update`, `job:delete`
- **Candidates (`7`):** `candidate:view`, `candidate:create`, `candidate:update`, `candidate:delete`, `candidate:document_upload`, `candidate:document_download`, `candidate:document_delete`
- **Applications (`8`):** `application:view`, `application:create`, `application:update`, `application:update_stage`, `application:delete`, `application:document_upload`, `application:document_download`, `application:document_delete`
- **Interviews (`5`):** `interview:view`, `interview:create`, `interview:update`, `interview:delete`, `interview:scorecard_submit`
- **Sourcing (`4`):** `sourcing:view`, `sourcing:create`, `sourcing:update`, `sourcing:delete`
- **Email (`4`):** `email:view`, `email:send`, `email:manage_templates`, `email:manage_settings`
- **Settings (`1`):** `settings:manage_integrations`

---

## 4. Infrastructure, Cryptography & Edge Controls

- **HTTP Hardening & Distributed Rate Limiting (`apps/api/src/main.ts`):** `ThrottlerModule` backed by `ThrottlerStorageRedisService` (`100` req / `60s` window) enforces distributed rate limiting across horizontal API replicas via atomic Redis operations (`haihire:throttler:*`), with automatic in-memory fallback during Redis degradation. Strict comma-separated CORS (`FRONTEND_URL`, `credentials: true`), CSP (`default-src 'self'; frame-ancestors 'none'`), `nosniff`, `DENY` framing, and production HTTPS redirect (exempting health/metrics probes and loopback).
- **Secrets at Rest:** Tenant SMTP passwords and Resend/SendGrid keys in `EmailSetting` as well as webhook tokens in `OrganizationWebhookSetting` are encrypted using AES-256 derived from `ENCRYPTION_SECRET` (minimum `32` chars enforced on startup).
- **Private Storage (`MinIO`):** `haihire-resumes` bucket enforces private access with `tenants/<orgId>/...` path isolation, magic-byte upload checks, sanitized filenames, and authenticated download streaming.
- **Metrics & SSRF Protection:** `GET /metrics` checks `METRICS_TOKEN` via `crypto.timingSafeEqual` (returning `404` in production if unset); outbound webhook and custom SMTP destinations block private/loopback DNS targets against SSRF.
