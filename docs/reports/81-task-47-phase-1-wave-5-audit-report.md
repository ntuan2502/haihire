# Task #47 Phase 1: Wave 5 Audit Report (6 P1 Core Flow Files)

**Date**: 2026-10-19T15:30:00+07:00  
**Author**: Antigravity (AI Senior Full-Stack Architect & Refactoring Specialist)  
**Agent**: `project-planner`  
**Skills Active**: `@clean-code`, `@plan-writing`  
**Status**: AUDIT COMPLETE (Zero Code Modified, Evidence-Based AST & Test Coverage Analysis)  
**Next Phase**: Task #47 Phase 2 (Wave 5.1 Execution upon Architectural Approval)

---

## 1. Executive Summary

Following Task #46 Phase 2 (post-v0.2.0 cleanup and archive, 871 passing tests, 10/10 God Files refactored across Waves 1–4), **Wave 5** audits and plans the refactoring of **6 Priority 1 (P1) files** representing core candidate, interview, pipeline, member management, and email flows across the stack:

1. `frontend/src/components/candidates/candidate-drawer.tsx` (778 non-blank LOC / 825 total lines, Frontend, Medium)
2. `frontend/src/app/dashboard/settings/members/page.tsx` (747 non-blank LOC / 805 total lines, Frontend, Medium)
3. `frontend/src/app/dashboard/interviews/page.tsx` (716 non-blank LOC / 764 total lines, Frontend, Medium)
4. `frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx` (678 non-blank LOC / 736 total lines, Frontend, High - Kanban)
5. `backend/src/candidates/candidates.service.ts` (630 non-blank LOC / 693 total lines, Backend, Medium)
6. `backend/src/email/email.service.ts` (622 non-blank LOC / 697 total lines, Backend, High - 3 providers + BullMQ)

### Key Audit Metrics

- **Total Combined Codebase Volume**: **4,123 non-blank LOC** / **4,520 raw file lines** (174.8 KB).
- **Baseline Test Coverage**:
  - **3 of 6 files have 0.00% direct unit test coverage** (`candidates.service.ts`, `interviews/page.tsx`, `pipeline/page.tsx`).
  - `email.service.ts` has 17 passing unit tests (61.42% stmts, 65.02% lines).
  - `candidate-drawer.tsx` has 4 unit tests (47.36% stmts, 44.85% lines).
  - `settings/members/page.tsx` has 3 unit tests (54.90% stmts, 56.16% lines).
- **Characterization Test Mandate**: **4 files strictly require new characterization tests** before decomposition to guarantee zero behavioral regressions.
- **Decomposition Target**: 33 focused sub-files ($\le 220$ LOC, well below the project's strict 400 LOC anti-monolith threshold), maintaining 100% backward compatibility.
- **Estimated Decomposition Effort**: **22 – 27 engineering hours** across 6 sequential sub-waves (5.1 to 5.6).

---

## 2. Phase A: Measurement & Dependency Inventory

### 2.1 Exact LOC Verification

Measured in PowerShell on Windows using `Measure-Object -Line` (non-blank code lines) and `Get-Content -LiteralPath` (raw physical lines):

```powershell
Path                                                     Non-Blank LOC   Total Lines   File Size
-------------------------------------------------------  -------------   -----------   ---------
frontend/src/components/candidates/candidate-drawer.tsx            778           825     37.9 KB
frontend/src/app/dashboard/settings/members/page.tsx               747           805     33.0 KB
frontend/src/app/dashboard/interviews/page.tsx                     716           764     31.4 KB
frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx             678           736     26.1 KB
backend/src/candidates/candidates.service.ts                       630           693     22.8 KB
backend/src/email/email.service.ts                                 622           697     23.6 KB
-------------------------------------------------------  -------------   -----------   ---------
TOTAL                                                            4,123         4,520    174.8 KB
```

> **Note on LOC Variance:** The baseline prompt noted 724 LOC for `settings/members/page.tsx`. Current measured non-blank LOC is 747 (+23 LOC) due to enhanced accessible dialog triggers and clipboard notification states added during accessibility audits.

---

### 2.2 Test Coverage Analysis (Vitest v8 Engine)

Measured by executing `pnpm --filter backend test:coverage` and `pnpm --filter frontend test:coverage`:

```
+------------------------------------+------------+----------+----------+---------+---------+-------------------+
| Target File                        | Spec File  | Stmts %  | Branch % | Funcs % | Lines % | Status            |
+------------------------------------+------------+----------+----------+---------+---------+-------------------+
| backend/candidates.service.ts      | (None)     |     0.00 |     0.00 |    0.00 |    0.00 | ❌ CRITICAL GAP   |
| backend/email.service.ts           | 17 tests   |    61.42 |    47.43 |   43.18 |   65.02 | ⚠️ Moderate       |
| frontend/candidate-drawer.tsx      | 4 tests    |    47.36 |    49.26 |   30.30 |   44.85 | ⚠️ Low (<50%)     |
| frontend/settings/members/page.tsx | 3 tests    |    54.90 |    60.65 |   45.94 |   56.16 | ⚠️ Moderate       |
| frontend/interviews/page.tsx       | 0 (direct) |     0.00 |     0.00 |    0.00 |    0.00 | ❌ NO DIRECT TEST |
| frontend/jobs/[id]/pipeline/page   | 0 (direct) |     0.00 |     0.00 |    0.00 |    0.00 | ❌ NO DIRECT TEST |
+------------------------------------+------------+----------+----------+---------+---------+-------------------+
```

- **Backend Candidates Service**: 0 unit tests exist anywhere in `backend/src/candidates`. The entire candidate domain logic (deduplication, soft-delete, file upload, SSRF protection) currently relies solely on indirect E2E tests.
- **Backend Email Service**: Covered by 17 unit tests in `email.service.spec.ts`, testing Simulated, SMTP, and system dispatch.
- **Frontend Candidate Drawer**: 4 unit tests in `candidate-drawer.spec.tsx` covering basic render and initial tab display, but lacking coverage for document upload, document deletion, and interview action triggers.
- **Frontend Members Page**: 3 unit tests in `members.spec.tsx` covering initial table render and email invite modal opening.
- **Frontend Interviews Page**: 0 direct unit tests for `page.tsx`. However, its subcomponents have **45 passing unit tests** (`interviews-calendar-view.spec.tsx` has 20 tests, `schedule-interview-modal.spec.tsx` has 5 tests, calendar hooks have 20 tests).
- **Frontend Pipeline Page**: 0 direct unit tests for `page.tsx`. Its subcomponents have **18 passing unit tests** (`pipeline-candidate-card`, `pipeline-stage-selector`, `stage-selector`, `pipeline-drag-drop`), and 1 Playwright E2E spec (`kanban-drag-drop.spec.ts`).

---

### 2.3 Import Categorization

```
+-------------------------------------------------------+----------+----------+-------+-------+
| File                                                  | External | Internal | Types | Total |
+-------------------------------------------------------+----------+----------+-------+-------+
| backend/src/candidates/candidates.service.ts          |        3 |       10 |     2 |    13 |
| backend/src/email/email.service.ts                    |        5 |       12 |     3 |    17 |
| frontend/src/components/candidates/candidate-drawer   |        5 |       12 |     5 |    17 |
| frontend/src/app/dashboard/settings/members/page.tsx  |        3 |        9 |     2 |    12 |
| frontend/src/app/dashboard/interviews/page.tsx        |        3 |       22 |     2 |    25 |
| frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx|        5 |       19 |     4 |    24 |
+-------------------------------------------------------+----------+----------+-------+-------+
```

#### Detailed Dependencies by File:

1. **`candidates.service.ts` (13 imports)**:
   - _External_: `@nestjs/common` (Inject, Injectable, Optional), `node:crypto`, `@haihire/shared` (APP_ERROR_CODES, CandidateDocument).
   - _Internal_: `../prisma/prisma.service`, `../minio/minio.service`, `../activities/activities.service`, `../common/app-exception`, `../common/doc-utils`, `../common/upload-utils`, `../common/date.util`, `../interviews/constants`, `./dto/create-candidate.dto`, `./dto/update-candidate.dto`.
   - _Type Imports_: `CandidateDocument`, `Express.Multer.File`.
2. **`email.service.ts` (17 imports)**:
   - _External_: `@nestjs/common`, `@nestjs/bullmq`, `bullmq` (Queue), `node:crypto`, `@haihire/shared` (APP_ERROR_CODES, DEFAULT_TEMPLATES, interpolateEmail).
   - _Internal_: `../prisma/prisma.service`, `../activities/activities.service`, `../common/encryption.service`, `../common/date.util`, `../config/env`, `./transporters/transporter.factory`, `./dto/update-template.dto`, `./dto/update-setting.dto`, `./dto/send-email.dto`, `./dto/send-system-email.dto`.
   - _Type Imports_: `EmailTemplateType`, `TemplateDefinition`, `Queue`.
3. **`candidate-drawer.tsx` (17 imports)**:
   - _External_: `react`, `next/navigation`, `next/link`, `sonner`, `lucide-react` (17 icons).
   - _Internal_: `@/components/shared/slide-over`, `@/components/shared/custom-select`, `@/components/shared/stage-badge`, `@/components/interviews/candidate-interviews-list`, `@/components/candidates/delete-document-modal`, `@/lib/api`, `@/lib/utils`, `@/lib/interviews`, `@/lib/api-error`, `@/i18n`.
   - _Type Imports_: `CandidateDocument`, `Application`, `Job`, `CandidateItem`, `ScheduledInterviewInfo`.
4. **`settings/members/page.tsx` (12 imports)**:
   - _External_: `react`, `sonner`, `lucide-react` (16 icons).
   - _Internal_: `@/context/auth-context`, `@/hooks/use-queries`, `@/components/ui/input`, `@/components/ui/button`, `@/components/shared/custom-select`, `@/components/shared` (ConfirmDestructiveModal), `@/i18n`, `@/lib/api-error`.
   - _Type Imports_: `InviteLink`, `FormEvent`.
5. **`interviews/page.tsx` (25 imports)**:
   - _External_: `react`, `next/navigation`, `lucide-react` (9 icons).
   - _Internal_: `@/components/shared/auth-guard`, `@/components/layout` (Navbar), `@/context/auth-context`, `@/components/ui/button`, `@/components/shared/custom-select`, `@/components/shared/pagination`, `@/components/shared/search-input`, `@/components/shared/segmented-tabs`, `@/components/shared/slide-over`, `@/components/shared/loading-spinner`, `@/hooks/use-persisted-columns`, `@/hooks/use-table-params`, `@/hooks/use-queries`, `@/lib/interviews`, `@/lib/utils`, `@/components/interviews/interviews-calendar-view`, `@/components/interviews/interviews-table-view`, `@/components/interviews/schedule-interview-modal`, `@/components/interviews/interview-scorecard-modal`, `@/components/interviews/cancel-interview-modal`, `@/i18n`.
   - _Type Imports_: `ScheduledInterviewInfo`, `Application`.
6. **`pipeline/page.tsx` (24 imports)**:
   - _External_: `react`, `next/navigation`, `@tanstack/react-query`, `sonner`, `lucide-react` (4 icons).
   - _Internal_: `@/hooks/use-queries`, `@/components/shared/loading-spinner`, `@/components/ui/input`, `@/components/shared/custom-select`, `@/components/applications/delete-application-modal`, `@/components/applications/document-preview-modal`, `@/components/interviews/schedule-interview-modal`, `@/lib/api-error`, `@/components/applications/overview-sections-popover`, `@/lib/stages`, `@/lib/interviews`, `@/lib/api`, `@/i18n`, `@/lib/utils`, `@/context/auth-context`, `@/components/jobs/pipeline/pipeline-stage-selector`, `@/components/jobs/pipeline/pipeline-candidate-card`, `@/components/jobs/pipeline/pipeline-candidate-detail`.
   - _Type Imports_: `OverviewSectionsState`, `ApplicationStage`, `CandidateDocument`, `ScheduledInterviewInfo`.

---

### 2.4 Consumer Analysis (Production Code Only)

Identified via AST-based pattern search across `backend/src` and `frontend/src` (excluding spec files):

```
[Consumers Graph]

  candidates.controller.ts ----> candidates.service.ts
  candidates.module.ts     ----> candidates.service.ts

  email.controller.ts      ----> email.service.ts
  email.processor.ts       ----> email.service.ts (BullMQ worker)
  email.module.ts          ----> email.service.ts
  applications.service.ts  ----> email.service.ts
  applications-saga.service.ts-> email.service.ts
  applications-stage.service.ts> email.service.ts
  interviews.service.ts    ----> email.service.ts

  candidates-view.tsx      ----> candidate-drawer.tsx

  App Router Navigation    ----> settings/members/page.tsx
  App Router Navigation    ----> interviews/page.tsx
  App Router Navigation    ----> jobs/[id]/pipeline/page.tsx
```

- **`candidates.service.ts`**:
  - `backend/src/candidates/candidates.controller.ts` (injects `CandidatesService`)
  - `backend/src/candidates/candidates.module.ts` (declares and exports `CandidatesService`)
  - _Consumer Impact_: Minimal. 0 cross-module service dependencies.
- **`email.service.ts`**:
  - `backend/src/email/email.controller.ts`
  - `backend/src/email/email.processor.ts` (BullMQ worker task processing)
  - `backend/src/email/email.module.ts`
  - `backend/src/applications/applications.service.ts`
  - `backend/src/applications/services/applications-saga.service.ts`
  - `backend/src/applications/services/applications-stage.service.ts`
  - `backend/src/interviews/interviews.service.ts`
  - _Consumer Impact_: **CRITICAL**. `EmailService` is injected across 4 independent backend domains. Preserving its exact class name, method signatures, and NestJS provider injection token via the Facade pattern is mandatory.
- **`candidate-drawer.tsx`**:
  - `frontend/src/app/dashboard/candidates/candidates-view.tsx`
  - _Consumer Impact_: Low. 1 consumer component.
- **`settings/members/page.tsx`**, **`interviews/page.tsx`**, **`pipeline/page.tsx`**:
  - Direct Next.js App Router route entry points. 0 direct TypeScript file imports. They receive incoming traffic via Next.js navigation (`router.push` and `<Link href="...">` across navbar, dashboard widgets, and job tables).

---

## 3. Phase B: Per-File Deep Analysis

### B.1: File #1: `candidates.service.ts` (630 LOC / 693 Lines)

- **Responsibilities (6 distinct concerns)**:
  1. _Candidate Query & In-Memory Filtering (`findAll`)_: Multi-tenant scoping (`organizationId`), soft-delete filter (`!deletedAt`), search across name/email/phone/notes, in-memory slicing pagination, and application count aggregation.
  2. _Candidate Profile Aggregation (`findOne`)_: Cross-table queries against `Application`, `Job`, and `Interview` tables; `formatInterviewRecord` transformation; document collation; and PII read audit logging (`activitiesService.createActivity` with `action: VIEW_PROFILE`).
  3. _Candidate CRUD Mutations (`create`, `update`, `remove`)_: Tenant email deduplication check (409 Conflict); name parsing into first/last; `Temporal.Instant` parsing for DOB; Two-Tier Deletion Protocol (atomic soft delete updating `deletedAt` inside `executeTx`).
  4. _Document Upload & Primary Resume Sync (`uploadDocument`)_: MIME validation, MinIO tenant path isolation upload, `CandidateDocument` database creation, and primary `resumeUrl` fallback synchronization.
  5. _SSRF-Safe Document Download Streaming (`prepareDocumentDownload`)_: SSRF prevention verifying requested URL belongs to the candidate's allowed document array; MinIO stream retrieval; RFC 5987 utf-8/ASCII content disposition filename headers; and download audit logging (`action: DOWNLOAD_DOCUMENT`).
  6. _Document Deletion & Re-sync (`deleteDocument`)_: Removes document record; promotes next available document to candidate's primary resume or nullifies fields.
- **Public Methods List**:
  - `findAll(organizationId?, options?, tenantOrgId?)`
  - `findOne(id, tenantOrgId?, currentUser?)`
  - `create(dto, file?, defaultOrgId?)`
  - `update(id, dto, tenantOrgId?)`
  - `uploadDocument(id, file, documentType?, tenantOrgId?)`
  - `prepareDocumentDownload(id, targetUrl?, targetName?, tenantOrgId?, currentUser?)`
  - `deleteDocument(id, opts?, tenantOrgId?)`
  - `remove(id, tenantOrgId?)`
- **Dependencies**: `PrismaService`, `MinioService`, `ActivitiesService`, `crypto`, `@haihire/shared`.
- **Existing Tests**: 0 unit tests.
- **Proposed Decomposition Plan**:
  ```
  backend/src/candidates/
  ├── candidates.service.ts               [Facade ~90 LOC]
  └── services/
      ├── candidates-crud.service.ts      [~220 LOC: findAll, create, update, remove]
      ├── candidates-documents.service.ts [~200 LOC: uploadDocument, prepareDocumentDownload, deleteDocument]
      └── candidates-profile.service.ts   [~120 LOC: findOne aggregation, PII audit logging]
  ```

---

### B.2: File #2: `email.service.ts` (622 LOC / 697 Lines)

- **Responsibilities (6 distinct concerns)**:
  1. _Organization Email Settings & Credential Encryption_: Manages per-org email settings; encrypts, decrypts, and masks SMTP passwords, Resend API keys, and SendGrid API keys using AES-256-GCM via `EncryptionService`.
  2. _Email Template System_: Custom template CRUD, automatic `DEFAULT_TEMPLATES` seeding, and JSON schema variable interpolation.
  3. _Per-Tenant Queue & Email Dispatch_: Idempotent BullMQ dispatch with deterministic Redis job ID deduplication locks (`email:${targetOrgId}:${templateKey}:${candidateKey}:${appKey}:${timeBucket}`) and fallback to synchronous execution.
  4. _Email Transporter Execution_: Multi-provider integration (`EmailTransporterFactory` for SMTP, Resend, SendGrid, Simulated), variable rendering, `EmailLog` creation, and `ActivityLog` candidate timeline emission.
  5. _System-Level Email Configuration & Dispatch_: Global `.env` system transporter configuration, system test emails, and separate system BullMQ jobs.
  6. _Email Logs & Audit Trail_: Querying per-org logs and system logs with status filtering, search, date sorting, and pagination.
- **Public Methods List**:
  - `resolveOrgId`, `getTemplates`, `seedDefaultTemplates`, `getTemplateByType`, `updateTemplate`
  - `getSettings`, `getRawSettings`, `updateSettings`
  - `sendEmail`, `queueEmail`, `executeSendEmail`, `sendTestEmail`
  - `getLogs`, `getSystemLogs`
  - `getSystemEmailConfig`, `getRawSystemEmailConfig`, `sendSystemEmail`, `executeSendSystemEmail`, `sendSystemTestEmail`
- **Dependencies**: `PrismaService`, `ActivitiesService`, `EncryptionService`, `Queue` (`@InjectQueue("email-queue")`), `EmailTransporterFactory`, `@haihire/shared`, `env`.
- **Existing Tests**: 17 tests in `email.service.spec.ts` (61.42% stmts, 65.02% lines).
- **Proposed Decomposition Plan**:
  ```
  backend/src/email/
  ├── email.service.ts                    [Facade ~110 LOC]
  └── services/
      ├── email-dispatch.service.ts       [~210 LOC: sendEmail, queueEmail, executeSendEmail, sendTestEmail, BullMQ]
      ├── email-templates.service.ts      [~130 LOC: getTemplates, seedDefaultTemplates, getTemplateByType, updateTemplate]
      ├── email-settings.service.ts       [~140 LOC: getSettings, getRawSettings, updateSettings, encryption]
      └── email-system.service.ts         [~160 LOC: system config, system email dispatch, email logs]
  ```

---

### B.3: File #3: `candidate-drawer.tsx` (778 LOC / 825 Lines)

- **Responsibilities (5 distinct concerns)**:
  1. _SlideOver Shell & Action Bar_: SlideOver layout, title, Edit button, Open Full Page button, and dismiss handling.
  2. _Candidate Details Card_: Candidate identity, contact information (email, phone), DOB, gender, timestamps, and parsed custom notes.
  3. _Applications Tab_: Stage filtering dropdown (`drawerStageFilter`), "Apply to Job" CTA, application cards, stage badges, and integrated `CandidateInterviewsList` with rescheduling/cancelling actions.
  4. _Documents Tab_: Document type filtering, hidden file upload input with TanStack mutation, authenticated document downloading, inline iframe document previewer, and delete document trigger.
  5. _Modal Coordination_: State and handlers for `DeleteDocumentModal` (supporting both candidate documents and application documents).
- **Dependencies**: `SlideOver`, `CustomSelect`, `StageBadge`, `CandidateInterviewsList`, `DeleteDocumentModal`, `@/lib/api`, `@/lib/utils`, `@/lib/interviews`.
- **Existing Tests**: 4 tests in `candidate-drawer.spec.tsx` (47.36% stmts, 44.85% lines).
- **Proposed Decomposition Plan**:
  ```
  frontend/src/components/candidates/
  ├── candidate-drawer.tsx                    [Container ~120 LOC]
  └── drawer/
      ├── candidate-drawer-header.tsx         [~80 LOC]
      ├── candidate-drawer-details.tsx        [~110 LOC]
      ├── candidate-drawer-applications-tab.tsx [~180 LOC]
      ├── candidate-drawer-documents-tab.tsx  [~190 LOC]
      └── use-candidate-drawer-state.ts       [~100 LOC]
  ```

---

### B.4: File #4: `settings/members/page.tsx` (747 LOC / 805 Lines)

- **Responsibilities (5 distinct concerns)**:
  1. _Header & Feedback Notifications_: Page title, description, and temporary success/error toast alerts.
  2. _Email Invitation Card_: Collapsible invitation card with email input, role selection (MEMBER/ADMIN), and submit handler.
  3. _Shareable Invite Links Management_: Create link accordion (role, expiration: 1d/7d/30d/Never, max uses: 1/5/10/Unlimited), links list with usage metrics and expiration calculation, copy-to-clipboard action with feedback.
  4. _Team Members Directory_: Avatar rendering with image fallback to initials, user metadata, owner badge (`Crown`), role badge (`Shield`/`User`), current user marker (`(You)`).
  5. _RBAC Actions & Modals_: Member action menu (Admin/Member toggle, Remove Member), `ConfirmDestructiveModal` for member removal and invite link revocation.
- **Dependencies**: `useAuth`, `useOrgMembers`, `useInviteLinks`, `useCreateInviteLinkMutation`, `useRevokeInviteLinkMutation`, `useUpdateMemberRoleMutation`, `useRemoveMemberMutation`, `CustomSelect`, `ConfirmDestructiveModal`.
- **Existing Tests**: 3 tests in `members.spec.tsx` (54.90% stmts, 56.16% lines).
- **Proposed Decomposition Plan**:
  ```
  frontend/src/app/dashboard/settings/members/
  ├── page.tsx                                [Thin Wrapper ~90 LOC]
  ├── components/
  │   ├── invite-member-card.tsx              [~90 LOC]
  │   ├── invite-links-card.tsx               [~170 LOC]
  │   ├── members-table-card.tsx              [~180 LOC]
  │   └── member-modals.tsx                   [~80 LOC]
  └── hooks/
      └── use-members-page-state.ts           [~100 LOC]
  ```

---

### B.5: File #5: `interviews/page.tsx` (716 LOC / 764 Lines)

- **Responsibilities (6 distinct concerns)**:
  1. _Route Container & Guard_: `AuthGuard` container with `Suspense` and fallback loading spinner.
  2. _Header & Toolbar_: Main title with total count badge, "+ Schedule new" button, `SegmentedTabs` for KPIs (ALL, UPCOMING, AWAITING with server counts).
  3. _View Mode Switching_: Table view vs Calendar view switcher synced to URL search parameters.
  4. _Table Controls & Column Visibility_: `SearchInput`, column customization dropdown (`usePersistedColumns`: candidate, job, schedule, interviewer, status, rating), and active filter badges.
  5. _Filter SlideOver Drawer_: Job filter, status tab pills, and sort order dropdown (Upcoming, Newest, Name).
  6. _View Rendering & Modal Coordination_:
     - Table view: renders `InterviewsTableView` with `Pagination`.
     - Calendar view: fetches up to 1000 items and renders `InterviewsCalendarView`.
     - Coordinates `ScheduleInterviewModal`, `InterviewScorecardModal`, and `CancelInterviewModal`.
- **Dependencies**: `Navbar`, `SegmentedTabs`, `SearchInput`, `CustomSelect`, `Pagination`, `SlideOver`, `InterviewsTableView`, `InterviewsCalendarView`, `ScheduleInterviewModal`, `InterviewScorecardModal`, `CancelInterviewModal`, `useTableParams`, `usePersistedColumns`, `useInterviews`.
- **Existing Tests**: 0 direct unit tests for `page.tsx` (subcomponents have 45 passing tests).
- **Proposed Decomposition Plan**:
  ```
  frontend/src/app/dashboard/interviews/
  ├── page.tsx                                [Thin Wrapper ~100 LOC]
  └── components/
      ├── interviews-toolbar.tsx              [~140 LOC]
      ├── interviews-filter-drawer.tsx        [~130 LOC]
      ├── interviews-active-filters.tsx       [~70 LOC]
      ├── interviews-view-container.tsx       [~150 LOC]
      └── interviews-modals-container.tsx     [~90 LOC]
  ```

---

### B.6: File #6: `jobs/[id]/pipeline/page.tsx` (678 LOC / 736 Lines)

- **Responsibilities (6 distinct concerns)**:
  1. _Pipeline Header & Stage Selector_: Renders `PipelineStageSelector` with real-time stage counts, collapse/expand toggle, and fullscreen mode.
  2. _Kanban State Machine Validation_: Integrates `canTransition(fromStage, toStage)` and `getTransitionDisabledReason` before allowing card drop or stage change, preventing invalid transitions.
  3. _Candidate List Sidebar (Left Column)_: Search input, sort dropdown (score, newest, oldest, name), candidate count indicator, and candidate card mapping (`PipelineCandidateCard`).
  4. _Auto-Selection & URL Sync_: Synchronizes `stage` and `applicationId` to URL query parameters via `window.history.replaceState` and `router.replace`, auto-scrolling to selected candidate card.
  5. _Candidate Detail View (Right Column)_: Delegates to `PipelineCandidateDetail` with candidate navigation (next/previous), candidate tab switching, overview sections popover, candidate notes creation, and documents list.
  6. _Modals Management_: `DocumentPreviewModal`, `DeleteApplicationModal`, and `ScheduleInterviewModal`.
- **Dependencies**: `useJob`, `useJobApplications`, `useUpdateStageMutation`, `useDeleteApplicationMutation`, `useUpdateCandidateMutation`, `PipelineStageSelector`, `PipelineCandidateCard`, `PipelineCandidateDetail`, `DocumentPreviewModal`, `DeleteApplicationModal`, `ScheduleInterviewModal`, `canTransition`, `getTransitionDisabledReason`.
- **Existing Tests**: 0 direct unit tests for `page.tsx` (subcomponents have 18 tests; E2E has `kanban-drag-drop.spec.ts`).
- **Proposed Decomposition Plan**:
  ```
  frontend/src/app/dashboard/jobs/[id]/pipeline/
  ├── page.tsx                                [Thin Wrapper ~110 LOC]
  ├── components/
  │   ├── pipeline-sidebar.tsx                [~160 LOC]
  │   └── pipeline-modals.tsx                 [~90 LOC]
  └── hooks/
      ├── use-pipeline-navigation.ts          [~100 LOC]
      ├── use-pipeline-stage-actions.ts       [~90 LOC]
      └── use-pipeline-notes.ts               [~80 LOC]
  ```

---

## 4. Phase C: Test Coverage Gaps & Characterization Tests

### C.1: Existing Test Coverage Summary

```
+---------------------------+---------------+-------------------------+--------------------+
| File                      | Line Coverage | Existing Tests          | Characterization?  |
+---------------------------+---------------+-------------------------+--------------------+
| candidates.service.ts     | 0.00%         | 0 tests                 | YES (Mandatory)    |
| email.service.ts          | 65.02%        | 17 unit tests           | Partially (Edge)   |
| candidate-drawer.tsx      | 44.85%        | 4 tests in spec.tsx     | YES (Critical tabs)|
| settings/members/page.tsx | 56.16%        | 3 tests in spec.tsx     | YES (Actions)      |
| interviews/page.tsx       | 0.00% (direct)| 45 subcomponent tests   | YES (Page shell)   |
| pipeline/page.tsx         | 0.00% (direct)| 18 sub + 1 E2E tests    | YES (State machine)|
+---------------------------+---------------+-------------------------+--------------------+
```

### C.2: Characterization Tests Strategy

To prevent regressions, the following characterization tests must be created **before** performing the decomposition for any file with <50% or 0% direct coverage:

1. **`candidates.service.spec.ts` (8 – 10 tests needed)**:
   - `findAll`: verify organization ID tenant isolation, soft-delete filtering, search string filtering, and pagination slicing.
   - `findOne`: verify 404 on deleted candidate, 403 on cross-tenant candidate, aggregation of applications, interviews, and documents, and `PII_READ` activity logging.
   - `create`: verify email uniqueness within same org (409 Conflict), name parsing into first/last, and `Temporal.Instant` DOB parsing.
   - `prepareDocumentDownload`: verify SSRF protection rejects URLs not in candidate's document set (403 Forbidden), returns correct RFC 5987 content-disposition filenames.
   - `remove`: verify soft-delete sets `deletedAt` in database transaction.
2. **`candidate-drawer.spec.tsx` (4 – 5 additional tests needed)**:
   - Switching between "applications" and "documents" tabs.
   - Filtering applications by stage (`drawerStageFilter`).
   - Clicking "Schedule Interview" and "Cancel Interview".
   - Document upload trigger and delete document confirmation modal.
3. **`members.spec.tsx` (3 additional tests needed)**:
   - Creating shareable invite link with expiration and max uses.
   - Toggling member role between ADMIN and MEMBER.
   - Opening remove member confirmation modal and verifying name matching validation.
4. **`interviews/page.spec.tsx` (4 – 5 tests needed)**:
   - Rendering page shell with KPIs and title.
   - Switching between Table view and Calendar view.
   - Filtering by search query and job ID.
   - Opening Schedule Interview modal and Scorecard modal.
5. **`pipeline/page.spec.tsx` (4 – 5 tests needed)**:
   - Initializing selected stage and candidate from URL query parameters.
   - Enforcing `canTransition` guard when attempting invalid stage drag-and-drop.
   - Moving candidate between valid stages and verifying query invalidation.
   - Adding a candidate note and verifying mutation call.

---

## 5. Phase D: Decomposition Plan

```
Wave 5 Architecture Tree:

backend/src/
├── candidates/
│   ├── candidates.service.ts                 [Facade ~90 LOC]
│   └── services/
│       ├── candidates-crud.service.ts        [~220 LOC]
│       ├── candidates-documents.service.ts   [~200 LOC]
│       └── candidates-profile.service.ts     [~120 LOC]
└── email/
    ├── email.service.ts                      [Facade ~110 LOC]
    └── services/
        ├── email-dispatch.service.ts         [~210 LOC]
        ├── email-templates.service.ts        [~130 LOC]
        ├── email-settings.service.ts         [~140 LOC]
        └── email-system.service.ts           [~160 LOC]

frontend/src/
├── components/candidates/
│   ├── candidate-drawer.tsx                  [Container ~120 LOC]
│   └── drawer/
│       ├── candidate-drawer-header.tsx       [~80 LOC]
│       ├── candidate-drawer-details.tsx      [~110 LOC]
│       ├── candidate-drawer-applications.tsx [~180 LOC]
│       ├── candidate-drawer-documents.tsx    [~190 LOC]
│       └── use-candidate-drawer-state.ts     [~100 LOC]
├── app/dashboard/settings/members/
│   ├── page.tsx                              [Page Wrapper ~90 LOC]
│   ├── components/
│   │   ├── invite-member-card.tsx            [~90 LOC]
│   │   ├── invite-links-card.tsx             [~170 LOC]
│   │   ├── members-table-card.tsx            [~180 LOC]
│   │   └── member-modals.tsx                 [~80 LOC]
│   └── hooks/
│       └── use-members-page-state.ts         [~100 LOC]
├── app/dashboard/interviews/
│   ├── page.tsx                              [Page Wrapper ~100 LOC]
│   └── components/
│       ├── interviews-toolbar.tsx            [~140 LOC]
│       ├── interviews-filter-drawer.tsx      [~130 LOC]
│       ├── interviews-active-filters.tsx     [~70 LOC]
│       ├── interviews-view-container.tsx     [~150 LOC]
│       └── interviews-modals-container.tsx   [~90 LOC]
└── app/dashboard/jobs/[id]/pipeline/
    ├── page.tsx                              [Page Wrapper ~110 LOC]
    ├── components/
    │   ├── pipeline-sidebar.tsx              [~160 LOC]
    │   └── pipeline-modals.tsx               [~90 LOC]
    └── hooks/
        ├── use-pipeline-navigation.ts        [~100 LOC]
        ├── use-pipeline-stage-actions.ts     [~90 LOC]
        └── use-pipeline-notes.ts             [~80 LOC]
```

### Detailed Sub-File Specifications & Effort Estimates

| File                          | Target Sub-files                                                                                                                                | Strategy                                   | Est. LOC per File | Effort Estimate                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------- | ------------------------------------------- |
| **candidates.service.ts**     | 4 files (`candidates.service.ts`, `candidates-crud.service.ts`, `candidates-documents.service.ts`, `candidates-profile.service.ts`)             | NestJS Injectable Facade                   | 90 to 220 LOC     | **4.5 hours** (inc. characterization tests) |
| **email.service.ts**          | 5 files (`email.service.ts`, `email-dispatch.service.ts`, `email-templates.service.ts`, `email-settings.service.ts`, `email-system.service.ts`) | NestJS Injectable Facade                   | 110 to 210 LOC    | **4.5 hours**                               |
| **candidate-drawer.tsx**      | 6 files (`candidate-drawer.tsx`, `header`, `details`, `applications`, `documents`, `use-candidate-drawer-state`)                                | Barrel Container + Subcomponents           | 80 to 190 LOC     | **3.5 hours**                               |
| **settings/members/page.tsx** | 6 files (`page.tsx`, `invite-member-card`, `invite-links-card`, `members-table-card`, `member-modals`, `use-members-page-state`)                | Thin Page Wrapper + Domain Cards           | 80 to 180 LOC     | **3.5 hours**                               |
| **interviews/page.tsx**       | 6 files (`page.tsx`, `toolbar`, `filter-drawer`, `active-filters`, `view-container`, `modals-container`)                                        | Thin Page Wrapper + Toolbar/View Modules   | 70 to 150 LOC     | **3.5 hours**                               |
| **pipeline/page.tsx**         | 6 files (`page.tsx`, `pipeline-sidebar`, `pipeline-modals`, `use-pipeline-navigation`, `use-pipeline-stage-actions`, `use-pipeline-notes`)      | Thin Page Wrapper + Custom Hooks + Sidebar | 80 to 160 LOC     | **4.5 hours**                               |
| **Total**                     | **33 Sub-files** (all < 250 LOC)                                                                                                                | —                                          | —                 | **24.0 hours**                              |

---

## 6. Phase E: Risk Assessment Matrix

| File                          | LOC | Complexity | Test Coverage             | Consumers              | Risk Level | Priority     | Key Risk Drivers                                                                   |
| ----------------------------- | --- | ---------- | ------------------------- | ---------------------- | ---------- | ------------ | ---------------------------------------------------------------------------------- |
| **candidates.service.ts**     | 630 | Medium     | 0.0% (0 tests)            | 2 (Controller, Module) | **Medium** | **Wave 5.1** | Zero existing tests; SSRF check on MinIO object stream; Two-Tier soft delete.      |
| **email.service.ts**          | 622 | High       | 65.0% (17 tests)          | 7 production locations | **High**   | **Wave 5.2** | 3 provider transporters; BullMQ queue locks; AES-256-GCM encryption; used in Saga. |
| **candidate-drawer.tsx**      | 778 | Medium     | 44.8% (4 tests)           | 1 (CandidatesView)     | **Medium** | **Wave 5.3** | Complex multi-tab state (doc upload, inline preview iframe, interview listing).    |
| **settings/members/page.tsx** | 747 | Medium     | 56.1% (3 tests)           | Route entry point      | **Medium** | **Wave 5.4** | Multi-step invite link creation; RBAC role switching; double-confirmation modals.  |
| **interviews/page.tsx**       | 716 | Medium     | 0% direct (45 subs)       | Route entry point      | **Medium** | **Wave 5.5** | View switcher (Calendar vs Table); URL param sync; multiple active modal dialogs.  |
| **pipeline/page.tsx**         | 678 | High       | 0% direct (18 subs + E2E) | Route entry point      | **High**   | **Wave 5.6** | Kanban drag-and-drop state machine; optimistic updates; dual sync with URL params. |

---

## 7. Phase F: Recommended Refactoring Order & Rationale

We have reviewed the proposed order from DeepSeek:

1. **Wave 5.1:** `candidates.service.ts` (Backend, Medium)
2. **Wave 5.2:** `email.service.ts` (Backend, High)
3. **Wave 5.3:** `candidate-drawer.tsx` (Frontend, Medium)
4. **Wave 5.4:** `settings/members/page.tsx` (Frontend, Medium)
5. **Wave 5.5:** `interviews/page.tsx` (Frontend, Medium)
6. **Wave 5.6:** `pipeline/page.tsx` (Frontend, High)

### Order Evaluation & Justification:

- **Backend First (Wave 5.1 & 5.2)**:
  - Both backend services establish the foundational data contracts and storage models that `candidate-drawer` and `pipeline` depend on (specifically document uploads, SSRF-safe downloads, and activity/email notifications).
  - `candidates.service.ts` has isolated consumers (controller only), making it the lowest-risk backend file to start with once characterization tests are in place.
  - `email.service.ts` has existing tests (17 passing tests) which provide an immediate regression safety net for its high complexity.
- **Frontend Component First (Wave 5.3)**:
  - `candidate-drawer.tsx` is an isolated UI drawer consumed only by `candidates-view.tsx`. Refactoring it decouples candidate document handling and interview lists before touching the complex dashboard pages.
- **Settings Page (Wave 5.4)**:
  - `settings/members/page.tsx` is self-contained with no URL query param complexity, serving as a clean transition to page-level decomposition.
- **Complex Dashboard Pages (Wave 5.5 & 5.6)**:
  - `interviews/page.tsx` introduces URL sync (`useTableParams`), view mode toggling, and multi-modal handling.
  - `pipeline/page.tsx` is saved for last because it has the highest state complexity (Kanban DnD, stage state machine, URL sync, master-detail responsiveness, and multiple modals).

### Execution Recommendation:

- **Strict 1 PR / 1 Sub-Wave per file.** Never batch multiple files into a single PR.
- Write characterization tests first for each file before modifying production code.
- Verify `pnpm --filter backend test` and `pnpm --filter frontend test` after every sub-wave.

---

## 8. Questions for DeepSeek Review

Before starting Wave 5.1, please review and provide feedback on the following 4 strategic points:

1. **Facade Injection Pattern for NestJS Services**:
   - For `candidates.service.ts` and `email.service.ts`, do you approve keeping the original service classes as thin delegating **Facades** registered in the module providers, or would you prefer registering the sub-services directly in `candidates.module.ts` / `email.module.ts` and injecting them into the controllers?
   - _Our recommendation:_ Keep the Facade class so all 7 external consumers (especially `applications-saga.service.ts` and BullMQ processor) require zero import or injection changes.
2. **Characterization Tests Threshold**:
   - Do you approve adding `candidates.service.spec.ts` (8-10 tests) and augmenting `candidate-drawer.spec.tsx` (+4 tests) as mandatory Step 1 of Waves 5.1 and 5.3 before touching the implementations?
3. **Frontend Sub-component Directory Structure**:
   - For the frontend pages (`interviews`, `settings/members`, `pipeline`), do you prefer co-locating the extracted components in local `components/` subdirectories adjacent to `page.tsx` (e.g. `frontend/src/app/dashboard/interviews/components/`), or placing them under `frontend/src/components/` (e.g. `frontend/src/components/interviews/page/`)?
   - _Our recommendation:_ Local subdirectories next to `page.tsx` for page-specific UI (`interviews/components/`), and `src/components/candidates/drawer/` for `candidate-drawer`.
4. **Approval to Proceed**:
   - Do you approve the proposed order (Wave 5.1 -> 5.6) and decomposition boundaries to proceed with **Task #47 Phase 2: Wave 5.1 (`candidates.service.ts`)**?
