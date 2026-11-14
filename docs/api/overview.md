# REST & SSE API Overview (`12` Controllers / `107` Endpoints)

HaiHire exposes a REST API plus one Server-Sent Events (SSE) stream from `apps/api` (`PORT=3001` default, proxied by Next.js `/api/*` rewrites in `apps/web/next.config.ts`).

---

## 1. Common Request & Error Contract

- **Authentication:** `JwtAuthGuard` accepts `haihire_token` HttpOnly cookie or `Authorization: Bearer <token>` header; `TenantGuard` enforces `organizationId` access on scoped queries/bodies/params.
- **Validation:** Controllers validate inputs via `@Body(DtoPipe(...))` and `@Query(DtoPipe(...))`.
- **Standard Error Envelope (`GlobalExceptionFilter`):**

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": ["email must be an email"],
  "params": {}
}
```

Every `APP_ERROR_CODES` key (`64` codes in [packages/shared/src/errors.ts](../../packages/shared/src/errors.ts)) maps to localized English and Vietnamese messages via `getApiErrorMessage()` on the frontend.

---

## 2. Endpoint Surface Summary (`107` Total)

| Controller                  | Prefix              | Endpoints | Highlights & Primary Auth                                                                                                                                                                                                             |
| :-------------------------- | :------------------ | :-------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppController`             | `/`                 |    `3`    | `GET /`, `GET /health` (Postgres/Redis/MinIO probes), `GET /metrics` (`METRICS_TOKEN` Bearer)                                                                                                                                         |
| `AuthController`            | `/auth`             |    `9`    | `POST login/register/refresh/logout/change-password`, `GET me`, `PATCH me/profile`, `PATCH me/preferences`, `GET me/permissions`                                                                                                      |
| `OrganizationsController`   | `/organizations`    |   `23`    | `POST /`, `POST /join`, `GET my`, `GET my/all`, `POST switch`, members CRUD, role permission overrides/resets, `GET my/audit-log`, `PATCH/DELETE my`, `POST my/transfer-ownership`, invite links CRUD/public/join, `GET public/:slug` |
| `JobsController`            | `/jobs`             |    `7`    | `GET /`, `GET public`, `GET careers/:orgSlug/:jobSlug`, `GET :id`, `POST /`, `PATCH :id`, `DELETE :id`                                                                                                                                |
| `CandidatesController`      | `/candidates`       |   `12`    | `GET /`, `GET :id`, `POST /`, `PATCH :id`, `DELETE :id`, documents upload/download/delete (`3`), notes CRUD (`4`)                                                                                                                     |
| `ApplicationsController`    | `/applications`     |   `15`    | `GET /`, `GET stats`, `GET job/:jobId`, `GET :id`, `POST apply`, `PATCH :id/stage`, `PATCH :id`, `DELETE :id`, documents upload/download/delete (`3`), notes CRUD (`4`)                                                               |
| `InterviewsController`      | `/interviews`       |    `6`    | `GET /`, `GET :id`, `POST /`, `PATCH :id/scorecard`, `PATCH :id`, `DELETE :id`                                                                                                                                                        |
| `ActivitiesController`      | `/activities`       |    `3`    | `GET candidate/:candidateId`, `GET application/:applicationId`, `POST /`                                                                                                                                                              |
| `EmailController`           | `/email`            |   `14`    | `GET variables`, templates CRUD + duplicate + `by-type/:type` (`6`), `GET flows`, `PUT flows/:flowKey`, `GET/PUT settings`, `POST send`, `POST test`, `GET logs`                                                                      |
| `SourcingController`        | `/sourcing`         |    `8`    | `GET stats`, `GET links`, `GET links/:id`, `POST links`, `PATCH links/:id`, `DELETE links/:id`, `GET attribution-log`, `POST public/click`                                                                                            |
| `WebhookSettingsController` | `/webhook-settings` |    `6`    | `GET /`, `GET :id`, `POST /`, `PATCH :id`, `DELETE :id`, `POST test`                                                                                                                                                                  |
| `EventsController`          | `/events`           |    `1`    | `@Sse("sse")` (`GET /events/sse`) real-time workspace event stream                                                                                                                                                                    |

---

## 3. Domain Error Codes Catalog (`64` `APP_ERROR_CODES`)

- **Organizations (`19`):** `ORG_SLUG_ALREADY_EXISTS`, `ORG_NOT_FOUND`, `ORG_NAME_REQUIRED`, `ORG_SLUG_REQUIRED`, `ORG_MEMBER_ALREADY_EXISTS`, `ORG_INVITE_INVALID`, `ORG_INVITE_EXPIRED`, `ORG_INVITE_REVOKED`, `ORG_USER_NO_ORG`, `ORG_CANNOT_CHANGE_OWNER_ROLE`, `ORG_CANNOT_CHANGE_SELF_ROLE`, `ORG_CANNOT_REMOVE_SELF`, `ORG_CANNOT_REMOVE_OWNER`, `ORG_CANNOT_TRANSFER_TO_SELF`, `ORG_TRANSFER_TARGET_NOT_MEMBER`, `ORG_NOT_OWNER`, `ORG_MEMBER_NOT_FOUND`, `ORG_FORBIDDEN_ACTION`, `ORG_ADMIN_PERMISSIONS_IMMUTABLE`
- **Jobs (`4`):** `JOB_NOT_FOUND`, `JOB_ID_REQUIRED`, `JOB_NOT_ACCEPTING_APPLICATIONS`, `JOB_INVALID_ORGANIZATION`
- **Applications & Uploads (`13`):** `APPLICATION_NOT_FOUND`, `APPLICATION_INVALID_ORGANIZATION`, `APPLICATION_INVALID_STAGE_TRANSITION`, `APPLICATION_STAGE_CONFLICT`, `CANDIDATE_INFO_REQUIRED`, `CANDIDATE_ORG_MISMATCH`, `CANDIDATE_ALREADY_APPLIED`, `DOCUMENT_FILE_REQUIRED`, `DOCUMENT_UPLOAD_FAILED`, `DOCUMENT_NOT_FOUND`, `DOCUMENT_RETRIEVE_FAILED`, `UPLOAD_TRUNCATED_FILE`, `TENANT_ID_REQUIRED_FOR_UPLOAD`
- **Candidates (`3`):** `CANDIDATE_NOT_FOUND`, `CANDIDATE_EMAIL_EXISTS`, `CANDIDATE_ORG_REQUIRED`
- **Interviews (`3`):** `INTERVIEW_NOT_FOUND`, `INTERVIEW_APP_NOT_FOUND`, `INTERVIEW_INVALID_ORGANIZATION`
- **Email Settings & Templates (`6`):** `EMAIL_TEMPLATE_NOT_FOUND`, `EMAIL_TEMPLATE_SYSTEM_PROTECTED`, `EMAIL_FLOW_NOT_FOUND`, `EMAIL_SETTINGS_NOT_FOUND`, `EMAIL_SETTINGS_INVALID`, `EMAIL_ORG_REQUIRED`
- **Auth & Permissions (`8`):** `INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`, `USER_EMAIL_EXISTS`, `USER_SESSION_EXPIRED`, `UNAUTHORIZED`, `FORBIDDEN`, `FORBIDDEN_READ_ONLY`, `SSE_UNAUTHORIZED`
- **Sourcing (`1`):** `TRACKING_LINK_NOT_FOUND`
- **Webhook Settings (`3`):** `WEBHOOK_SETTING_NOT_FOUND`, `WEBHOOK_TEST_FAILED`, `WEBHOOK_PROVIDER_MISMATCH`
- **Common & Resources (`4`):** `GENERIC_ERROR`, `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `NETWORK_ERROR`
