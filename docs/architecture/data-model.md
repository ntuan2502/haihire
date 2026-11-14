# Data Model & Database Schema

HaiHire uses **PostgreSQL 17.6** managed through **Prisma `7.10.1`** with the native `@prisma/adapter-pg` driver adapter (`pg.Pool`) configured via [apps/api/prisma.config.ts](../../apps/api/prisma.config.ts) and [apps/api/src/prisma/schema.prisma](../../apps/api/src/prisma/schema.prisma).

- **Models:** `22`
- **Enums:** `18`
- **Soft-Delete Models (`deletedAt`):** `Job`, `Candidate`, `TrackingLink` (`3` models)
- **Transaction Engine:** `AsyncLocalStorage`-backed `runInTransaction` / `PrismaService.transaction` (`apps/api/src/prisma/prisma.service.ts`)

---

## 1. Entity Relationship Overview

```text
Organization (tenant root, ownerId -> User)
 ├── OrganizationMember (organizationId, userId, role)
 ├── OrganizationRolePermission (organizationId, role, permission, granted)
 ├── InviteLink (organizationId, token, role, status)
 ├── OrganizationAuditLog (organizationId, actorId, action, resource)
 ├── Job (organizationId, deletedAt, status)
 │    ├── TrackingLink (organizationId, jobId?, token, deletedAt)
 │    │    └── TrackingClick (organizationId, trackingLinkId, referrerDomain, ipHash)
 │    └── Application (organizationId, candidateId, jobId, stage, trackingLinkId?)
 │         ├── Interview (organizationId, applicationId, interviewerId?, scheduledAt, type, format, scorecard)
 │         ├── ApplicationNote (organizationId, applicationId, authorId)
 │         ├── EmailLog (scope, organizationId?, candidateId?, applicationId?)
 │         └── ActivityLog (organizationId, candidateId, applicationId?)
 ├── Candidate (organizationId, unique [organizationId, email], deletedAt)
 │    ├── CandidateDocument (candidateId, organizationId, url)
 │    ├── CandidateNote (organizationId, candidateId, authorId)
 │    ├── EmailLog
 │    └── ActivityLog
 ├── EmailTemplate (organizationId, type, isSystem)
 ├── EmailFlowConfig (organizationId, flowKey, templateId?)
 ├── EmailSetting (organizationId unique, encrypted credentials)
 └── OrganizationWebhookSetting (organizationId, eventType, provider)

PlatformAuditLog (standalone platform-level audit trail)
User (email unique, tokenVersion, organizationId?, preferredLanguage?, preferredTimezone?)
```

---

## 2. Database Enums (`18`)

| Enum                  | Values                                                                                                                                                                                                  |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Role`                | `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`                                                                                                                                         |
| `JobType`             | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`                                                                                                                                                      |
| `JobStatus`           | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`                                                                                                                                                              |
| `ApplicationStage`    | `APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`                                                                                                                                       |
| `InterviewType`       | `HR_SCREENING`, `TECHNICAL`, `CULTURE_FIT`, `FINAL_ROUND`, `ASSESSMENT`                                                                                                                                 |
| `InterviewFormat`     | `MEET`, `ZOOM`, `TEAMS`, `OFFICE`                                                                                                                                                                       |
| `WorkplaceType`       | `ON_SITE`, `HYBRID`, `REMOTE`                                                                                                                                                                           |
| `ExperienceLevel`     | `ENTRY_LEVEL`, `MID_LEVEL`, `SENIOR_LEVEL`, `LEAD`, `EXECUTIVE`                                                                                                                                         |
| `Gender`              | `MALE`, `FEMALE`, `OTHER`                                                                                                                                                                               |
| `InviteStatus`        | `ACTIVE`, `EXPIRED`, `REVOKED`                                                                                                                                                                          |
| `EmailTemplateType`   | `APPLICATION_CONFIRMATION`, `INTERVIEW_INVITATION`, `REJECTION`, `OFFER`, `CUSTOM`                                                                                                                      |
| `EmailFlowKey`        | `APPLICATION_RECEIVED`, `INTERVIEW_SCHEDULED`, `APPLICATION_REJECTED`, `APPLICATION_OFFER`                                                                                                              |
| `EmailDeliveryStatus` | `SENT`, `SIMULATED`, `FAILED`                                                                                                                                                                           |
| `EmailScope`          | `SYSTEM`, `ORGANIZATION`                                                                                                                                                                                |
| `SourcingChannel`     | `LINKEDIN`, `INDEED`, `GOOGLE_JOBS`, `CAREER_SITE`, `REFERRAL`, `DIRECT`, `HANDSHAKE`, `EMAIL`, `WE_WORK_REMOTELY`, `STACK_OVERFLOW`, `TWITTER_X`, `REDDIT`, `GLASSDOOR`, `AGENCY`, `FACEBOOK`, `OTHER` |
| `ActivityType`        | `APPLIED`, `STAGE_CHANGED`, `EMAIL_SENT`, `INTERVIEW_SCHEDULED`, `INTERVIEW_UPDATED`, `SCORECARD_SUBMITTED`, `NOTE_ADDED`                                                                               |
| `WebhookEventType`    | `DLQ_ALERT`, `ORPHAN_SPIKE`, `JOB_POSTED`                                                                                                                                                               |
| `WebhookProviderType` | `TELEGRAM`, `DISCORD`, `GENERIC`                                                                                                                                                                        |

---

## 3. Prisma Models Inventory (`22`)

|  #  | Model                        | Table (`@@map`)                | Tenant Isolation Column / Rule                                                                                 |    Soft Delete    |
| :-: | :--------------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------------------- | :---------------: |
|  1  | `Organization`               | `organization`                 | Root entity (`id`, `slug` unique, `ownerId` `Restrict`)                                                        |        No         |
|  2  | `User`                       | `user`                         | Optional active `organizationId` + `OrganizationMember` join; `tokenVersion`                                   |        No         |
|  3  | `OrganizationMember`         | `organization_member`          | `organizationId` (Cascade), unique `[organizationId, userId]`                                                  |        No         |
|  4  | `OrganizationRolePermission` | `organization_role_permission` | `organizationId` (Cascade), unique `[organizationId, role, permission]`                                        |        No         |
|  5  | `InviteLink`                 | `invite_link`                  | `organizationId` (Cascade), `token` unique                                                                     |        No         |
|  6  | `Job`                        | `job`                          | `organizationId` (Cascade), indexed `[organizationId, deletedAt, status, createdAt]`                           | Yes (`deletedAt`) |
|  7  | `Candidate`                  | `candidate`                    | `organizationId` (Cascade), unique `[organizationId, email]`, indexed `[organizationId, deletedAt, createdAt]` | Yes (`deletedAt`) |
|  8  | `Application`                | `application`                  | Direct `organizationId` (Cascade) + relational parent scoping; unique `[candidateId, jobId]`                   |        No         |
|  9  | `Interview`                  | `interview`                    | Direct `organizationId` (Cascade) + `interviewerId` (`SetNull` -> `User`)                                      |        No         |
| 10  | `EmailTemplate`              | `email_template`               | `organizationId` (Cascade)                                                                                     |        No         |
| 11  | `EmailFlowConfig`            | `email_flow_config`            | `organizationId` (Cascade), unique `[organizationId, flowKey]`                                                 |        No         |
| 12  | `EmailSetting`               | `email_setting`                | `organizationId` unique (Cascade); holds AES-256 encrypted secrets                                             |        No         |
| 13  | `EmailLog`                   | `email_log`                    | `scope` (`SYSTEM` \| `ORGANIZATION`), optional `organizationId` (Cascade), `applicationId` (`SetNull`)         |        No         |
| 14  | `ActivityLog`                | `activity_log`                 | `organizationId` (Cascade), `candidateId` (Cascade), `applicationId` (`SetNull`)                               |        No         |
| 15  | `CandidateDocument`          | `candidate_document`           | `organizationId` (Cascade), `candidateId` (Cascade)                                                            |        No         |
| 16  | `TrackingLink`               | `tracking_link`                | `organizationId` (Cascade), `token` unique                                                                     | Yes (`deletedAt`) |
| 17  | `TrackingClick`              | `tracking_click`               | Direct `organizationId` (Cascade), indexed `[organizationId, createdAt]` & `[trackingLinkId, createdAt]`       |        No         |
| 18  | `OrganizationWebhookSetting` | `organization_webhook_setting` | `organizationId` (Cascade), unique `[organizationId, eventType, provider]`                                     |        No         |
| 19  | `OrganizationAuditLog`       | `organization_audit_log`       | `organizationId` (Cascade), `actorId` (`SetNull`)                                                              |        No         |
| 20  | `PlatformAuditLog`           | `platform_audit_log`           | Platform-wide security/admin event table (`organizationId`, `actorId`, `action`, `resource`)                   |        No         |
| 21  | `ApplicationNote`            | `application_note`             | `organizationId` (Cascade), `applicationId` (Cascade)                                                          |        No         |
| 22  | `CandidateNote`              | `candidate_note`               | `organizationId` (Cascade), `candidateId` (Cascade)                                                            |        No         |

---

## 4. Schema Evolution & Critical Query Invariants

- **PostgreSQL Datasource Configuration:** Since Prisma `7.10.1`, `datasource db` in `schema.prisma` omits inline `url`; database connections resolve from `apps/api/prisma.config.ts` (`env("DATABASE_URL")`) and `PrismaPg` at runtime.
- **Schema Synchronization:** Schema changes apply via `pnpm db:update` (`prisma db push`) + `pnpm db:generate` from `apps/api/src/prisma/schema.prisma`.
- **Unique Email + Soft Delete:** Because `Candidate` uses `@@unique([organizationId, email])` across all rows, re-application by email checks `deletedAt` and clears `deletedAt: null` inside the transaction rather than attempting a conflicting insert.
- **Strict Tenant Column Isolation:** `21` of `22` models carry `organizationId` directly (including `Application`, `Interview`, and `TrackingClick`), leaving only root `Organization` in `MODELS_WITHOUT_ORG_COLUMN`; service queries enforce direct `organizationId` filters/selects alongside parent ownership guards.
