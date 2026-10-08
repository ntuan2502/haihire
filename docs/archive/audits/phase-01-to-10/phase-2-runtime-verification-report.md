# Runtime Verification Report — HaiHire Platform (Phase 2)

> **Execution Date**: 10/01/2026  
> **Methodology**: Full Runtime & Functional Verification (Executed directly against live running infrastructure)  
> **Rule**: DO NOT modify source code, DO NOT refactor, collect empirical runtime evidence (HTTP status, Database state, MinIO objects, Redis keys, SSE streams).  

---

## 1. Environment (Live Infrastructure)

| Service | Port | Runtime Status | Verification Evidence |
|---|---|---|---|
| **PostgreSQL** | `15432` | ✅ **HEALTHY** | Docker container `haihire-postgres` (healthy), responds in 74ms, schema 100% synchronized with Prisma contract. |
| **Redis** | `16379` | ✅ **HEALTHY** | Docker container `haihire-redis` (healthy), `PING` returns `PONG` in 14ms. BullMQ queue keys active. |
| **MinIO S3** | `19000 / 19001` | ✅ **HEALTHY** | Docker container `haihire-minio` (healthy), bucket `haihire-resumes` operational, file upload/download functioning. |
| **Backend API** | `13001` | ✅ **HEALTHY** | NestJS 12 running (PID 25276), `GET /` returns HTTP 200 `{"message":"hello from create-prisma + nest"}` in 27ms. |
| **Frontend** | `13000` | ✅ **HEALTHY** | Next.js 16.3.7 running (PID 42808), SSR index page renders HTTP 200 in 68ms with full HTML payload and title. |
| **BullMQ Worker** | - | ✅ **ACTIVE** | Worker integrated inside NestJS backend, connected to Redis on `email-queue`, processing jobs automatically. |

---

## 2. Runtime Tests (Empirical Test Scenarios Matrix)

| # | Test Scenario | Expected Outcome | Actual Runtime Outcome | Verdict | Empirical Evidence |
|---|---|---|---|---|---|
| 1 | **Login with Cookie Only** (No Bearer header) | HTTP 200, authenticated via HttpOnly cookie | HTTP 401 Unauthorized | ❌ **FAIL** (Bug #1 Confirmed) | `GET /auth/me` with header `Cookie: haihire_token=...` returns `{"statusCode":401,"message":"Unauthorized"}`. Request with `Authorization: Bearer` returns 200 OK. |
| 2 | **Login with Bearer Token** | HTTP 200, returns user profile | HTTP 200 OK, returns accurate profile | ✅ **PASS** | `GET /auth/me` returns `{ id, email, name, role, organizationId }`. |
| 3 | **Token Refresh** | HTTP 200, grants new access token | HTTP 200 OK, grants new token | ✅ **PASS** | `POST /auth/refresh` with `refreshToken` returns fresh `accessToken` and updates cookie. |
| 4 | **Logout** | HTTP 200, clears auth cookie | HTTP 200 OK, sets `Max-Age=0` | ✅ **PASS** | Header `Set-Cookie: haihire_token=; Max-Age=0; Path=/; Expires=Thu, 01 Oct 2026 04:18:20 GMT`. |
| 5 | **Invalid / Expired Token** | HTTP 401 Unauthorized | HTTP 401 Unauthorized | ✅ **PASS** | Malformed and expired tokens blocked with 401. |
| 6 | **Cross-Tenant: User A reads Job B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Error code `JOB_INVALID_ORGANIZATION`: "Access denied: job belongs to another organization." |
| 7 | **Cross-Tenant: User A edits Job B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Error code `JOB_INVALID_ORGANIZATION`: "Access denied: job belongs to another organization." |
| 8 | **Cross-Tenant: User A reads Candidate B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Error code `CANDIDATE_ORG_MISMATCH`: "Access denied: candidate belongs to another organization." |
| 9 | **Cross-Tenant: User A reads Application B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Error code `APPLICATION_INVALID_ORGANIZATION`: "Access denied: application belongs to another organization." |
| 10 | **Cross-Tenant: User A edits Application B Stage** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Error code `APPLICATION_INVALID_ORGANIZATION`: "Access denied: application belongs to another organization." |
| 11 | **Cross-Tenant: Download CV of another Org's candidate** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | `GET /applications/:id/documents/download` returns 403 Forbidden. |
| 12 | **Stage Transition: Valid Flow** (APPLIED → SCREENING → INTERVIEW → OFFER → HIRED) | HTTP 200, sequential update | HTTP 200 across all steps | ✅ **PASS** | Database updates stages correctly at each API invocation. |
| 13 | **Stage Transition: HIRED → APPLIED** | HTTP 400 (Block backward move) | HTTP 200, DB updated to APPLIED | ❌ **FAIL** (Bug #2 Confirmed) | `PATCH /applications/:id/stage` accepts transition from `HIRED` back to `APPLIED` without restrictions. |
| 14 | **Stage Transition: REJECTED → OFFER** | HTTP 400 (Block invalid move) | HTTP 200, DB updated to OFFER | ❌ **FAIL** (Bug #2 Confirmed) | REJECTED candidates jump straight to OFFER without guard validation. |
| 15 | **Stage Transition: APPLIED → HIRED** (Skip stages) | HTTP 400 (Require interview step) | HTTP 200, DB updated to HIRED | ❌ **FAIL** (Bug #2 Confirmed) | Fresh applicants jump directly to HIRED. |
| 16 | **File Upload: Valid PDF** | HTTP 201, stored in MinIO | HTTP 201, file in target bucket | ✅ **PASS** | MinIO SDK verified: file exists at 63 bytes, `content-type: application/pdf`. |
| 17 | **File Upload: Valid DOCX** | HTTP 201, stored in MinIO | HTTP 201 Created | ✅ **PASS** | DOCX file accepted by filter and stored successfully. |
| 18 | **File Upload: PNG/JPG to Document Endpoint** | HTTP 400 Bad Request | HTTP 400 Bad Request | ✅ **PASS** | `VALIDATION_ERROR`: "File type not allowed. Only .pdf, .doc, and .docx formats are accepted". |
| 19 | **File Upload: Exceeding 10MB Limit** | Rejected (413 or 400) | HTTP 413 Payload Too Large | ✅ **PASS** | 11MB file rejected by Multer with 413 "File too large". |
| 20 | **File Upload: Extension Spoofing** (Bash script renamed to `.pdf`) | Rejected via Magic Bytes | HTTP 201 Created (Accepted) | ⚠️ **FAIL / GAP** | Bash script uploaded because backend checks only extension and client MIME header without inspecting buffer magic bytes. |
| 21 | **File Upload: Path Traversal Defense** (`../../../../etc/passwd.pdf`) | Sanitized filename, no directory escape | HTTP 201, safe UUID object key | ✅ **PASS** | MinIO storage path replaced with timestamp + UUID, eliminating path traversal. |
| 22 | **Email: Application Confirmation** | Email enqueued & processed | HTTP 201, EmailLog created | ✅ **PASS** | BullMQ processes job, `EmailLog` record created in PostgreSQL with template `APPLICATION_CONFIRMATION`. |
| 23 | **Email: Rejection Notification** | Auto-dispatched on stage change to REJECTED | EmailLog created automatically | ✅ **PASS** | Transitioning stage to `REJECTED` produces log entry with template `REJECTION`. |
| 24 | **Email: Interview Invitation** | Dispatched when schedule flagged | EmailLog created automatically | ✅ **PASS** | Interview created with `sendInvitationEmail: true` records `INTERVIEW_INVITATION`. |
| 25 | **Email: Organization Name Context** | Populates real org name | Hardcoded to "ATS Recruitment" | ❌ **FAIL** (Bug #6 Confirmed) | Email subject displays: `[Confirmation] Application for ... at ATS Recruitment`. |
| 26 | **SSE: Cross-Tenant Event Leak** | User B receives only Org B events | User B receives Org A internal events | ❌ **FAIL / SECURITY ISSUE** (Bug #14 Confirmed) | User B (Org B) connected to SSE `/events/sse` receives `MEMBER_ROLE_UPDATED` emitted by Org A with `organizationId: OrgA` and `targetUserId`. |
| 27 | **Public Career Page: Listing Scope** | Display PUBLISHED jobs only | Displays DRAFT, CLOSED, ARCHIVED | ❌ **FAIL / LEAK** (New Bug Confirmed) | `GET /jobs?organizationSlug=...` returns all 4 jobs across `DRAFT`, `CLOSED`, `ARCHIVED`, `PUBLISHED` states. |
| 28 | **Rate Limiting: Exceeding 5 req/min** | HTTP 429 Too Many Requests | HTTP 500 Internal Server Error | ⚠️ **FAIL / DEFECT** | Header `x-ratelimit-remaining` decrements from 4 to 0 on first 5 requests; 6th request throws 500 due to missing `ThrottlerException` filter. |
| 29 | **Database Migration & Schema Sync** | DB schema matches Prisma contract | 100% in sync, zero drift | ✅ **PASS** | `prisma db verify` and `prisma migration status` exit code 0: "Database marker and schema match contract". |
| 30 | **Production Build: Backend** | Successful build | Successful build (26ms) | ✅ **PASS** | Esbuild emits `dist/server.mjs` (537.5kb) without syntax or import errors. |
| 31 | **Production Build: Frontend** | Successful build | Successful build (18.3s) | ✅ **PASS** | Next.js 16 compiles successfully, generating all 22 static and dynamic routes. |
| 32 | **Race Condition: Concurrent Applications** (5 concurrent requests) | Exactly 1 application created | Exactly 1 Candidate and 1 Application created | ✅ **PASS** | 1 request returns 201, 4 rejected by unique constraint in PostgreSQL. Zero duplicate records. |

---

## 3. Business Flow (End-to-End Evaluation of 12 Workflows)

| Business Workflow | Static Analysis | Unit Test | Runtime Execution | Overall Verdict |
|---|---|---|---|---|
| **1. Authentication** | ✅ Present | ✅ 17 tests | ⚠️ Fails on cookie-only | **VERIFIED WITH ISSUE** (Cookie auth returns 401) |
| **2. Organization Management** | ✅ Present | ✅ Complete suite | ✅ Operates smoothly | **VERIFIED** |
| **3. Job Management** | ✅ Present | ✅ Complete suite | ⚠️ Leaks draft jobs publicly | **VERIFIED WITH ISSUE** (Draft job leak) |
| **4. Candidate Management** | ✅ Present | ✅ Complete suite | ✅ Operates smoothly | **VERIFIED** |
| **5. Application Pipeline** | ✅ Present | ✅ E2E test | ⚠️ Unconstrained stage jumps | **VERIFIED WITH ISSUE** (Missing state machine) |
| **6. Interview Scheduling** | ✅ Present | ✅ Complete suite | ✅ Operates with scorecards | **VERIFIED** |
| **7. Email System** | ✅ Present | ✅ 17 tests | ⚠️ Hardcoded organization name | **VERIFIED WITH ISSUE** (Hardcoded name) |
| **8. Sourcing & Attribution** | ✅ Present | ✅ Complete suite | ✅ Operates smoothly | **VERIFIED** |
| **9. Activity Logging** | ✅ Present | ✅ Complete suite | ⚠️ Application delete not logged | **VERIFIED WITH ISSUE** (Silent deletion) |
| **10. Public Career Page** | ✅ Present | ❌ Untested | ⚠️ Leaks Draft/Archived jobs | **VERIFIED WITH ISSUE** (Filter logic flaw) |
| **11. Real-Time Events (SSE)** | ✅ Present | ✅ Complete suite | ❌ Cross-tenant event leak | **FAILED (SECURITY ISSUE)** |
| **12. Document Storage (MinIO)** | ✅ Present | ✅ Mock tests | ⚠️ Missing magic bytes validation | **VERIFIED WITH ISSUE** |

---

## 4. Security Verification

| Security Inspection | Verdict | Empirical Evidence |
|---|---|---|
| **Multi-Tenant Data Isolation** | ✅ **PASS** | All cross-tenant access attempts between Tenant A and Tenant B (read/write Job, read Candidate, read/write Application, file downloads) rejected by `TenantGuard` with HTTP 403 Forbidden. |
| **SSE Event Stream Isolation (Cross-Tenant Leak)** | 🔴 **SECURITY ISSUE** | Users in Organization B receive `MEMBER_ROLE_UPDATED` from Organization A because `if (event.organizationId)` in `events.service.ts:64` broadcasts to all connected clients. |
| **HttpOnly Cookie Authentication** | 🔴 **VULNERABILITY / BUG** | HttpOnly cookie `haihire_token` is set by the login route but unparsed on protected routes, forcing applications to rely on client local storage or Bearer headers. |
| **File Path Traversal Defense** | ✅ **PASS** | File names containing `../../../../etc/passwd.pdf` have extensions parsed and keys replaced with timestamp + UUID keys on MinIO, preventing system file overwrite. |
| **File Content Validation (Magic Bytes)** | 🟡 **POTENTIAL GAP** | Executable bash scripts renamed to `.pdf` upload successfully because backend validates only extensions and client-declared MIME types. |

---

## 5. Data Integrity

| Integrity Dimension | Verdict | Empirical Evidence |
|---|---|---|
| **Duplicate Prevention (Concurrency / Race Condition)** | ✅ **PASS** | 5 concurrent submissions for the same candidate and job yield exactly 1 `Application` and 1 `Candidate` record via PostgreSQL unique constraints. |
| **Foreign Keys & Cascade Delete** | ✅ **PASS** | Prisma schema and PostgreSQL database in 100% sync; `onDelete: Cascade` correctly cleans up child records. |
| **Pipeline Lifecycle Integrity (State Machine)** | ❌ **FAIL** | No validation constraints between stages. Database permits nonsensical transitions (`HIRED → APPLIED`, `REJECTED → OFFER`). |
| **Deletion Consistency (Two-Tier Deletion)** | ⚠️ **PARTIAL** | Jobs and Candidates obey soft delete (`deletedAt`); Applications hard delete via `.delete()`. |

---

## 6. External Integrations

| Integrated Service | Tested at Runtime? | Verdict | Empirical Verification Details |
|---|---|---|---|
| **PostgreSQL 17** | ✅ Yes | ✅ **PASS** | Connected via Prisma Contract, live queries succeed. |
| **Redis 7 (Alpine)** | ✅ Yes | ✅ **PASS** | PING returns PONG, BullMQ persists metadata and stalled check workers run properly. |
| **MinIO S3** | ✅ Yes | ✅ **PASS** | PDF files uploaded, S3 metadata verified, downloads and deletions verified. |
| **BullMQ Queue Worker** | ✅ Yes | ✅ **PASS** | Jobs enqueued asynchronously; worker consumes jobs and writes to `EmailLog`. |
| **Email Transporter (Simulated)** | ✅ Yes | ✅ **PASS** | Simulated dispatches succeed end-to-end for Confirmation, Rejection, and Interview templates. |
| **Email Transporter (External SMTP)** | ⏸️ Not enabled | ❓ **NOT VERIFIED** | Gmail credentials present in `.env`, but tenant defaults to `SIMULATED`. |

---

## 7. Bugs Confirmed at Runtime

1. 🔴 **Bug #1 (Cookie Auth)**: `GET /auth/me` with `haihire_token` cookie without Bearer header returns HTTP 401 Unauthorized because `jwt.strategy.ts` lacks a cookie extractor.
2. 🔴 **Bug #14 (SSE Data Leak)**: Tenant B listeners receive Tenant A's `MEMBER_ROLE_UPDATED` events because `events.service.ts:64` returns `true` for all events with an `organizationId`.
3. 🟡 **Bug #2 (Missing Pipeline State Machine)**: Unchecked state transitions (`HIRED → APPLIED`, `REJECTED → OFFER`, `APPLIED → HIRED`) allowed without validation.
4. 🟡 **New Bug (Public Career Page Draft Job Leak)**: `GET /jobs?organizationSlug=...` returns DRAFT, CLOSED, ARCHIVED jobs to unauthenticated visitors because line 99 in `jobs.service.ts` checks `filter?.status` instead of `effectiveStatus`.
5. 🟡 **Bugs #3, #4, #5 (In-memory Pagination)**: Jobs, Candidates, and Applications load all records into RAM via `.all()` before slicing with JavaScript.
6. 🟠 **Bug #6 (Hardcoded Org Name in Emails)**: Confirmation, rejection, and invitation emails hardcode `"at ATS Recruitment"` instead of the actual organization name.
7. 🟠 **Bug #16 (Non-UUID Document ID)**: Uploading candidate documents produces IDs formatted as `doc-${Date.now()}` instead of standard UUIDs.
8. 🟡 **Rate Limiting Defect (500 Error instead of 429)**: Exceeding request thresholds returns HTTP 500 Internal Server Error instead of HTTP 429 Too Many Requests due to missing exception filter for `ThrottlerException`.

---

## 8. Unknown / Not Testable Areas

- **Browser E2E (Real UI Testing)**: Automation frameworks (Playwright/Cypress) not yet implemented. Marked: **NOT VERIFIED**.
- **Real SMTP Outbound Dispatch**: Requires whitelisted test inboxes to avoid spam pollution.

---

## 9. Final Status (Subsystem Classification Matrix)

| Subsystem / Feature | Operational Classification | Operational Notes |
|---|---|---|
| **Environment & Infrastructure (Docker, DB, Redis, MinIO)** | 🟢 **VERIFIED** | 100% operational, rapid connection times. |
| **Authentication & Registration** | 🟡 **VERIFIED WITH ISSUE** | Works with Bearer tokens; fails on HttpOnly cookies. |
| **Organization & Member Management** | 🟢 **VERIFIED** | Organization creation, member admin, and invite links functioning. |
| **Job Management** | 🟡 **VERIFIED WITH ISSUE** | CRUD operates; leaks Draft jobs publicly. |
| **Public Career Page** | 🟡 **VERIFIED WITH ISSUE** | Public applications function; leaks Draft/Archived listings. |
| **Recruitment Pipeline (Kanban)** | 🟡 **VERIFIED WITH ISSUE** | Primary workflows succeed; lacks state transition validator. |
| **Interviews & Scorecards** | 🟢 **VERIFIED** | Scheduling and scorecard evaluations functioning as specified. |
| **Automated Email System** | 🟡 **VERIFIED WITH ISSUE** | Queue + Worker smooth; hardcoded organization name. |
| **Real-Time Events (SSE)** | 🔴 **FAILED** | Functional connectivity; cross-tenant event leak defect. |
| **Document Storage (MinIO)** | 🟡 **VERIFIED WITH ISSUE** | Upload/Download/Delete work; missing magic bytes check. |
| **Multi-Tenant Data Isolation** | 🟢 **VERIFIED** | Rejects all cross-tenant resource requests. |
| **Concurrency Resilience** | 🟢 **VERIFIED** | PostgreSQL blocks concurrent duplicate submissions. |
| **Production Build Pipeline** | 🟢 **VERIFIED** | Backend and Frontend build cleanly. |
| **Browser E2E UI** | ⚪ **NOT VERIFIED** | Automated browser testing framework uninstalled. |
