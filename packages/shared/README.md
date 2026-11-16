# HaiHire Shared Package (`@haihire/shared`)

Zero-duplication TypeScript domain contracts consumed directly by both `apps/api` and `apps/web`.

---

## Contents (`src/`)

- **Error Codes & Payloads (`src/errors.ts`):** `64` strongly-typed `APP_ERROR_CODES` (`AppErrorCode`, `ApiErrorPayload`, `ErrorLocaleDictionary`) shared by backend `AppException`s and frontend `getApiErrorMessage`.
- **RBAC Matrix (`src/permissions.ts`):** `5` roles (`ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `INTERVIEWER`, `MEMBER`), `41` `Permission` keys, default `PERMISSIONS` mapping, and `hasPermission(role, permission, isOwner)`.
- **Real-Time Events (`src/events.ts`):** `17` `APP_EVENT_TYPES` (`AppEventType`, `AppEvent`, `isAppEventType`).
- **Validation Schemas (`src/schemas/`):** Pure Zod schemas (`auth`, `job`, `candidate`, `application`) usable with backend `DtoPipe(...)` and frontend form validation.
- **Domain Modules:** `applications.ts`, `brand.ts`, `candidates.ts`, `common.ts`, `email-templates.ts`, `interviews.ts`, `jobs.ts`, `organizations.ts`, `person-name.ts`, `sourcing.ts`, `webhooks.ts` (including `16` `SourcingChannel` values, stage transition helpers, and localization defaults).

---

## Verification

```bash
pnpm --filter @haihire/shared build
pnpm --filter @haihire/shared typecheck
```
