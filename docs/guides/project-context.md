# Project Context & Domain Model

HaiHire is an enterprise multi-tenant Applicant Tracking System designed around isolated organization workspaces, public branded career portals, and collaborative recruiting pipelines.

---

## 1. Core Product Domains

- **Organizations & Workspace Membership:** Each tenant is modeled by `Organization` (`slug` unique, `ownerId` mutable FK to `User`). Users can belong to multiple organizations via `OrganizationMember`, switch active context (`POST /organizations/switch`), invite teammates via expiring `InviteLink`s, customize per-role access via `OrganizationRolePermission`, and audit actions in `OrganizationAuditLog`.
- **Job Requisitions & Public Careers Portal:** Recruiters draft, publish, close, and archive `Job` records (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`). Published/closed listings render via server-side public pages under `apps/web/src/app/careers/` and support public applications (`POST /applications/apply`).
- **Candidates & Document Vault:** Each candidate profile (`Candidate`, soft-deleted via `deletedAt`) belongs to one `Organization` with uniqueness on `(organizationId, email)`. Supporting resumes upload directly to private MinIO S3 prefixes (`tenants/<orgId>/...`) tracked via `CandidateDocument` and shared securely across `Application`s.
- **Pipeline Stage Machine & Kanban Board:** `Application` connects a `Candidate` and `Job` (`APPLIED` -> `SCREENING` -> `INTERVIEW` -> `OFFER` -> `HIRED` / `REJECTED`), recording ordered Kanban positions (`orderIndex`), match scores, rejection timestamps/reasons, notes (`ApplicationNote`, `CandidateNote`), and unified `ActivityLog` timelines.
- **Interview Scheduling & Scorecards:** `Interview` records (`HR_SCREENING`, `TECHNICAL`, `CULTURE_FIT`, `FINAL_ROUND`, `ASSESSMENT`) across formats (`MEET`, `ZOOM`, `TEAMS`, `OFFICE`) track interview rounds, interviewer assignment, and structured scorecard feedback.
- **Sourcing & Attribution Analytics:** Recruiter-generated `TrackingLink`s across `16` `SourcingChannel`s record privacy-hashed clicks (`TrackingClick`) and attribute submitted `Application`s cleanly to UTM parameters and referrer domains.
- **Communication & Alert Webhooks:** Configurable `EmailTemplate`s, stage-triggered `EmailFlowConfig`s, encrypted `EmailSetting`s (`SIMULATED` in dev, `SMTP` / `RESEND` / `SENDGRID` in prod), `EmailLog` audit records, and `OrganizationWebhookSetting` alerts (`Telegram`, `Discord`, `Generic`) for DLQ alerts, orphan spikes, and job posts.

---

## 2. Collaborative Real-Time & Localization Experience

- **Real-Time Workspace Sync:** Backend services publish typed `AppEvent` payloads over Redis/Valkey (`17` `AppEventType`s), streamed to connected dashboards via `GET /events/sse` and debounced into TanStack Query cache invalidation.
- **Two-Tier Localization:** Organizations configure defaults (`defaultLanguage`, `timezone`, `dateFormat`, `timeFormat`, `nameDisplayOrder`, `defaultCurrency`), while individual users can override UI language (`vi` / `en`) and IANA timezone in account settings.
