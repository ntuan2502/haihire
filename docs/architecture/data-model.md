# Data Model & Database Schema

HaiHire uses **PostgreSQL 17.6** managed through **Prisma `7.10.1`** with the native `@prisma/adapter-pg` driver adapter (`pg.Pool`) configured via [apps/api/prisma.config.ts](../../apps/api/prisma.config.ts) and [apps/api/src/prisma/schema.prisma](../../apps/api/src/prisma/schema.prisma).

- **Models:** `34`
- **Enums:** `24`
- **Soft-Delete Models (`deletedAt`):** `Job`, `Candidate`, `TrackingLink` (`3` models)
- **PostgreSQL RLS:** `28` tenant-scoped tables enforced via `FORCE ROW LEVEL SECURITY` (`haihire_rls_user`) and `AsyncLocalStorage` transaction context
- **Transaction Engine:** `AsyncLocalStorage`-backed `runInTransaction` / `PrismaService.transaction` (`apps/api/src/prisma/prisma.service.ts`)

---

## 1. Entity Relationship Overview

```text
Organization (tenant root, ownerId -> User)
 ├── OrganizationMember (organizationId, userId, role, lastAccessedAt?)
 ├── OrganizationRolePermission (organizationId, role, permission, granted)
 ├── InviteLink (organizationId, token, role, status, invitedEmail?)
 │    └── InviteLinkUsage (organizationId, inviteLinkId, userId?, userEmailSnapshot, usedAt)
 ├── OrganizationAuditLog (organizationId, actorId, action, resource)
 ├── StoredFile (organizationId, objectKey, bucket, mimeType, sizeBytes)
 ├── OutboxEvent (organizationId, eventType, aggregateType, aggregateId, status)
 ├── NotificationPreference (organizationId, userId, applicationWebsite, interviewWebsite, ...)
 ├── Notification (organizationId, userId, kind, resourceId, readAt?)
 ├── OrganizationAiSetting (organizationId unique, isEnabled, autoScoreApplications, defaultRouteMode)
 ├── OrganizationAiConnection (organizationId, provider, defaultModelId, encryptedApiKey, lastStatus)
 ├── OrganizationAiFeatureRoute (organizationId, feature, isEnabled, mode, targets)
 ├── Job (organizationId, deletedAt, status, salaryMin?, salaryMax?, salaryCurrency?)
 │    ├── PipelineStage (organizationId, jobId?, name, category, orderIndex)
 │    ├── TrackingLink (organizationId, jobId?, token, deletedAt)
 │    │    └── TrackingClick (organizationId, trackingLinkId, referrerDomain, ipHash)
 │    └── Application (organizationId, candidateId, jobId, stage, stageId?, resumeFileId?, trackingLinkId?)
 │         ├── Interview (organizationId, applicationId, interviewerId?, scheduledAt, type, format, scorecard)
 │         ├── ApplicationNote (organizationId, applicationId, authorId)
 │         ├── ApplicationAiEvaluation (organizationId, applicationId unique, status, overallScore?, provider?, modelId?)
 │         ├── EmailLog (scope, organizationId?, candidateId?, applicationId?)
 │         └── ActivityLog (organizationId, candidateId, applicationId?)
 ├── Candidate (organizationId, resumeFileId?, deletedAt)
 │    ├── CandidateDocument (candidateId, organizationId, storedFileId?, url)
 │    ├── CandidateNote (organizationId, candidateId, authorId)
 │    ├── EmailLog
 │    └── ActivityLog
 ├── EmailTemplate (organizationId, type, isSystem)
 ├── EmailFlowConfig (organizationId, flowKey, templateId?)
 ├── EmailSetting (organizationId unique, encrypted credentials)
 └── OrganizationWebhookSetting (organizationId, eventType, provider)

PlatformAuditLog (standalone platform-level audit trail)
User (email unique, tokenVersion, avatarSource, preferredLanguage?, preferredTimezone?)
 ├── UserSession (userId, expiresAt, revokedAt?)
 └── UserSecurityLog (userId, action, status)
```

---

## 2. Database Enums (`24`)

| Enum                  | Values                                                                                                                                                                                                  |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Role`                | `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`                                                                                                                                         |
| `JobType`             | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `TEMPORARY`, `SEASONAL`, `FREELANCE`, `INTERNSHIP`, `APPRENTICESHIP`, `PER_DIEM`, `VOLUNTEER`                                                                     |
| `JobStatus`           | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`                                                                                                                                                              |
| `ApplicationStage`    | `APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`                                                                                                                                       |
| `InterviewType`       | `HR_SCREENING`, `TECHNICAL`, `CULTURE_FIT`, `FINAL_ROUND`, `ASSESSMENT`                                                                                                                                 |
| `InterviewFormat`     | `MEET`, `ZOOM`, `TEAMS`, `OFFICE`                                                                                                                                                                       |
| `WorkplaceType`       | `ON_SITE`, `HYBRID`, `REMOTE`, `FIELD`                                                                                                                                                                  |
| `ExperienceLevel`     | `INTERN`, `ENTRY_LEVEL`, `JUNIOR`, `MID_LEVEL`, `SENIOR_LEVEL`, `LEAD`, `MANAGER`, `DIRECTOR`, `EXECUTIVE`                                                                                              |
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
| `AiProvider`          | `OPENAI`, `ANTHROPIC`, `GEMINI`, `OPENROUTER`, `OPENAI_COMPATIBLE`                                                                                                                                      |
| `AiScoreStatus`       | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`                                                                                                                                                          |
| `AiFeatureKey`        | `APPLICATION_SCORING`, `SCREENING_QUESTIONS`, `SCORING_CRITERIA`                                                                                                                                        |
| `AiProxyMode`         | `SINGLE`, `FAILOVER`, `LOAD_BALANCE`                                                                                                                                                                    |
| `AiFeatureRouteMode`  | `INHERIT_DEFAULT`, `SINGLE`, `FAILOVER`, `LOAD_BALANCE`                                                                                                                                                 |
| `AiConnectionStatus`  | `UNTESTED`, `HEALTHY`, `ERROR`                                                                                                                                                                          |

---

## 3. Prisma Models Inventory (`34`)

|  #  | Model                        | Table (`@@map`)                 | Tenant Isolation Column / Rule                                                                                                |    Soft Delete    |
| :-: | :--------------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- | :---------------: |
|  1  | `Organization`               | `organization`                  | Root entity (`id`, `slug` unique, `ownerId` `Restrict`, optional `logoObjectKey` / `logoMimeType` / `logoUpdatedAt`)          |        No         |
|  2  | `User`                       | `user`                          | Global identity (`email` unique, `tokenVersion`, `avatarSource`, `OrganizationMember` join)                                   |        No         |
|  3  | `OrganizationMember`         | `organization_member`           | `organizationId` (Cascade), unique `[organizationId, userId]`, indexed `[userId, lastAccessedAt]`                             |        No         |
|  4  | `OrganizationRolePermission` | `organization_role_permission`  | `organizationId` (Cascade), unique `[organizationId, role, permission]`                                                       |        No         |
|  5  | `InviteLink`                 | `invite_link`                   | `organizationId` (Cascade), `token` unique, optional `invitedEmail`                                                           |        No         |
|  6  | `Job`                        | `job`                           | `organizationId` (Cascade), indexed `[organizationId, deletedAt, status, createdAt]`, `salaryMin`/`Max`/`Curr`                | Yes (`deletedAt`) |
|  7  | `Candidate`                  | `candidate`                     | `organizationId` (Cascade), partial unique `[organizationId, email] WHERE "deletedAt" IS NULL`                                | Yes (`deletedAt`) |
|  8  | `Application`                | `application`                   | Direct `organizationId` (Cascade) + `stageId` (`SetNull` -> `PipelineStage`); unique `[candidateId, jobId]`                   |        No         |
|  9  | `Interview`                  | `interview`                     | Direct `organizationId` (Cascade) + `interviewerId` (`SetNull` -> `User`)                                                     |        No         |
| 10  | `EmailTemplate`              | `email_template`                | `organizationId` (Cascade)                                                                                                    |        No         |
| 11  | `EmailFlowConfig`            | `email_flow_config`             | `organizationId` (Cascade), unique `[organizationId, flowKey]`                                                                |        No         |
| 12  | `EmailSetting`               | `email_setting`                 | `organizationId` unique (Cascade); holds AES-256 encrypted secrets                                                            |        No         |
| 13  | `EmailLog`                   | `email_log`                     | `scope` (`SYSTEM` \| `ORGANIZATION`), optional `organizationId` (Cascade), `applicationId` (`SetNull`)                        |        No         |
| 14  | `ActivityLog`                | `activity_log`                  | `organizationId` (Cascade), `candidateId` (Cascade), `applicationId` (`SetNull`)                                              |        No         |
| 15  | `CandidateDocument`          | `candidate_document`            | `organizationId` (Cascade), `candidateId` (Cascade), optional `storedFileId` (`SetNull`)                                      |        No         |
| 16  | `TrackingLink`               | `tracking_link`                 | `organizationId` (Cascade), partial unique `[token] WHERE "deletedAt" IS NULL`                                                | Yes (`deletedAt`) |
| 17  | `TrackingClick`              | `tracking_click`                | Direct `organizationId` (Cascade), indexed `[organizationId, createdAt]` & `[trackingLinkId, createdAt]`                      |        No         |
| 18  | `OrganizationWebhookSetting` | `organization_webhook_setting`  | `organizationId` (Cascade), unique `[organizationId, eventType, provider]`                                                    |        No         |
| 19  | `OrganizationAuditLog`       | `organization_audit_log`        | `organizationId` (`Restrict`), `actorId` (`SetNull`)                                                                          |        No         |
| 20  | `PlatformAuditLog`           | `platform_audit_log`            | Platform-wide security/admin event table (`organizationId`, `actorId`, `action`, `resource`)                                  |        No         |
| 21  | `ApplicationNote`            | `application_note`              | `organizationId` (Cascade), `applicationId` (Cascade)                                                                         |        No         |
| 22  | `CandidateNote`              | `candidate_note`                | `organizationId` (Cascade), `candidateId` (Cascade)                                                                           |        No         |
| 23  | `PipelineStage`              | `pipeline_stage`                | `organizationId` (Cascade), optional `jobId` (Cascade), ordered `[organizationId, jobId, orderIndex]`                         |        No         |
| 24  | `StoredFile`                 | `stored_file`                   | `organizationId` (Cascade), `objectKey` unique (`haihire-resumes` bucket metadata)                                            |        No         |
| 25  | `OutboxEvent`                | `outbox_event`                  | `organizationId` (Cascade), transactional outbox (`status`, `nextAttemptAt`)                                                  |        No         |
| 26  | `NotificationPreference`     | `notification_preference`       | Workspace and user form a composite primary key.                                                                              |        No         |
| 27  | `Notification`               | `notification`                  | Workspace and recipient scope the inbox.                                                                                      |        No         |
| 28  | `InviteLinkUsage`            | `invite_link_usage`             | `organizationId` (Cascade), `inviteLinkId` (Cascade), `userId` (`SetNull`), `userEmailSnapshot`, `usedAt`                     |        No         |
| 29  | `UserSession`                | `user_session`                  | User-scoped (`userId` Cascade), indexed `[userId, revokedAt, expiresAt]`                                                      |        No         |
| 30  | `UserSecurityLog`            | `user_security_log`             | User-scoped (`userId` Cascade), indexed `[userId, createdAt]` & `[userId, action]`                                            |        No         |
| 31  | `OrganizationAiSetting`      | `organization_ai_setting`       | `organizationId` unique (Cascade), workspace AI toggle, auto-score flag & default proxy route                                 |        No         |
| 32  | `OrganizationAiConnection`   | `organization_ai_connection`    | `organizationId` (Cascade), AES-256 encrypted API key, health status, indexed `[organizationId, isEnabled]`                   |        No         |
| 33  | `OrganizationAiFeatureRoute` | `organization_ai_feature_route` | `organizationId` (Cascade), unique `[organizationId, feature]`, per-feature proxy routing                                     |        No         |
| 34  | `ApplicationAiEvaluation`    | `application_ai_evaluation`     | `organizationId` (Cascade), `applicationId` unique (Cascade), AI score breakdown & status, indexed `[organizationId, status]` |        No         |

---

## 4. Schema Evolution & Critical Query Invariants

- **PostgreSQL Datasource Configuration:** Since Prisma `7.10.1`, `datasource db` in `schema.prisma` omits inline `url`; database connections resolve from `apps/api/prisma.config.ts` (`env("DATABASE_URL")`) and `PrismaPg` at runtime.
- **Schema Synchronization:** Versioned SQL migrations live in `apps/api/src/prisma/migrations/` and apply via `pnpm db:migrate` (`prisma migrate deploy`) + `pnpm db:generate`.
- **Unique Email + Soft Delete:** `Candidate` and `TrackingLink` use partial unique indexes (`WHERE "deletedAt" IS NULL`), allowing soft-deleted records to be re-applied cleanly without violating uniqueness.
- **Strict Tenant Column Isolation & RLS:** `30` of `34` models carry `organizationId` (only `Organization`, `User`, `UserSession`, and `UserSecurityLog` omit it), and `28` tenant-scoped tables enforce PostgreSQL `FORCE ROW LEVEL SECURITY` via `haihire_rls_user` (`SET LOCAL ROLE haihire_rls_user` inside `PrismaService.transaction()`).
