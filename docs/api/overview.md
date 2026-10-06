# HaiHire RESTful API Overview & Specification

> **Base URL:** `http://localhost:13001` (Dev) \| `https://api.yourdomain.com` (Prod)  
> **Global Prefix:** All endpoints are exposed at root (e.g. `/auth/login`, `/jobs`).

---

## 1. Authentication & Security Architecture

### 1.1 Authentication Mechanism
- **Primary Auth:** HttpOnly Cookie (`haihire_token`).
  - Flags: `HttpOnly: true`, `SameSite: Lax`, `Path: /`, `Secure: true` (in production).
  - Auth cookies prevent client-side XSS token theft.
- **Fallback Auth:** Standard HTTP Authorization Header:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Token Payload:** Contains `sub` (userId), `email`, `role`, and `organizationId`.

### 1.2 Multi-Tenant Context
Every authenticated business endpoint automatically extracts the tenant identity:
- Scoped to `req.user.organizationId`.
- Super-administrators can switch tenant context via `POST /organizations/switch`.

---

## 2. Standard Request & Response Envelopes

### 2.1 Success Response Envelope
Single resource response:
```json
{
  "id": "11e87ea9-2edc-4186-ad0d-d322ab2f1095",
  "name": "Acme Corp",
  "createdAt": "2026-10-03T07:14:17.135Z"
}
```

### 2.2 Standard Paginated Result Format
All list endpoints require query parameters `page` (default 1) and `limit` (default 20, max 100), and optionally `search`:
```json
{
  "data": [ ... ],
  "total": 384,
  "page": 1,
  "limit": 20,
  "totalPages": 20
}
```

### 2.3 Unified Error Response Envelope
When an operation fails, the backend returns a standardized machine-readable envelope:
```json
{
  "statusCode": 404,
  "code": "JOB_NOT_FOUND",
  "message": "Job with ID 'a213d5f1' was not found",
  "params": {
    "jobId": "a213d5f1"
  },
  "timestamp": "2026-10-03T07:14:17.135Z",
  "path": "/jobs/a213d5f1"
}
```
All client applications translate `code` through localized dictionaries (`vi.ts` / `en.ts`), falling back to `message` if offline.

---

## 3. Core Domain Controller Map (77 Endpoints Across 9 Controllers)

| Controller | Base Route | Core Capabilities |
| :--- | :--- | :--- |
| **AuthController** | `/auth` | Authentication, registration, refresh token rotation, HttpOnly cookie emission, and current user profile (`/auth/me`). Rate limited to 5 req/min in prod. |
| **OrganizationsController** | `/organizations` | Multi-tenant organization CRUD, tenant switching, invite links creation/join, member role management. |
| **JobsController** | `/jobs` | Job postings lifecycle (Draft $\rightarrow$ Published $\rightarrow$ Closed), public career listings, and RSC job details (`/jobs/careers/:orgSlug/:jobSlug`). |
| **ApplicationsController** | `/applications` | Candidate job applications, resume upload saga, Kanban stage updates with state machine validation, download presigned URLs. |
| **CandidatesController** | `/candidates` | Candidate profiles, talent pool search, document attachments, activity history. |
| **InterviewsController** | `/interviews` | Interview scheduling, Google/Outlook calendar invites, interviewer scorecards, evaluation criteria. |
| **EmailController** | `/email` | System email settings (SMTP / Resend / SendGrid), template customization, async BullMQ email dispatch, delivery logs. |
| **SourcingController** | `/sourcing` | Multi-channel tracking link generator (5 UTM parameters), deduplicated click analytics, source attribution logs. |
| **ActivitiesController** | `/activities` | Comprehensive audit trail logs for candidate and application mutations (PII-scrubbed). |

---

## 4. Rate Limiting Policy

Rate limiting is enforced at the controller and route level using `@nestjs/throttler`:
- **Sensitive Auth Routes (`/auth/login`, `/auth/register`):**
  - Production: Strict limit of **5 requests per 60 seconds** per client IP.
  - Development / Test: Limit of **100 requests per 60 seconds** to facilitate concurrent automated E2E test suites.
- **Public Sourcing Clicks (`/sourcing/public/click`):**
  - Limit of 60 clicks per minute per IP to prevent click flooding.
- **General API Endpoints:**
  - 100 requests per 60 seconds.
