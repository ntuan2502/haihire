# Finding F-017: Dedicated Organization Administrative Audit Log (OrganizationAuditLog)

**Severity:** P2 (Architecture / Security & Compliance Enhancement)  
**Target Release:** `v0.4.0`  
**Related Findings & ADRs:** [ADR-003: Dynamic Organization Ownership](../../adr/ADR-003-dynamic-org-ownership.md), F-016 (Ownership Transfer)  
**Status:** RECORDED (Deferred to v0.4.0)

---

## 1. Context & Problem Statement

During the Phase 3 Branch 2 review (Round 3), recording administrative audit events for critical tenant lifecycle operations (such as `OWNERSHIP_TRANSFERRED` when an organization owner transfers ownership via `POST /organizations/my/transfer-ownership`) was evaluated against the existing database schema.

An inspection of `backend/src/prisma/contract.prisma` revealed:

- `model ActivityLog` contains a non-nullable foreign key `candidateId String` referencing `Candidate`.
- `enum ActivityType` strictly contains candidate recruitment events (`APPLIED`, `STAGE_CHANGED`, `EMAIL_SENT`, `INTERVIEW_SCHEDULED`, `INTERVIEW_UPDATED`, `SCORECARD_SUBMITTED`, `NOTE_ADDED`).

Attempting to store organization-level administrative events (e.g. `OWNERSHIP_TRANSFERRED`, `ORG_DELETED`, `MEMBER_ROLE_CHANGED`, `BILLING_UPDATED`) inside `ActivityLog` would break domain boundaries by conflating candidate recruitment activity with enterprise tenant administration, or would require setting `candidateId` to nullable via a disruptive database migration in `v0.3.0`.

---

## 2. Technical Recommendation for v0.4.0

In `v0.4.0`, implement a dedicated `OrganizationAuditLog` entity providing comprehensive administrative audit trails for enterprise ATS compliance (SOC2, ISO27001):

```prisma
model OrganizationAuditLog {
  id             String   @id @default(uuid())
  organizationId String
  actorUserId    String?
  action         String   // e.g. "OWNERSHIP_TRANSFERRED", "ORG_NAME_UPDATED", "MEMBER_INVITED", "MEMBER_REMOVED"
  resourceType   String   // e.g. "ORGANIZATION", "MEMBER", "WEBHOOK"
  resourceId     String?
  metadata       Json?
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actor        User?        @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 3. Scope & Boundaries for v0.3.0

- **v0.3.0 Status:** Administrative ownership transfer events are safely and persistently logged via structured NestJS application logging (`this.logger.log(...)`).
- **Zero Database Migration in v0.3.0:** No modifications to `contract.prisma` or `ActivityLog` are performed in `v0.3.0`.
- **Roadmap:** Full database migration, API query endpoints (`GET /organizations/my/audit-logs`), and timeline UI integration will be delivered in `v0.4.0`.
