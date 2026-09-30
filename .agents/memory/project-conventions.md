---
type: project
created: 2026-05-25
updated: 2026-09-18T20:53
---

# Project Conventions

## Documentation & Memory Language (MANDATORY)
- **All memory files (`.agents/memory/*`) must be written in English only.** Never write memory files in Vietnamese or any other language.
- **Comments in code, `.env`, and `.env.example` must be written in English only.** Vietnamese is reserved exclusively for conversational dialogue with the user.

## Pure TypeScript & Scripting Conventions (MANDATORY)
- **100% TypeScript Repository**: No manually written plain `.js`, `.mjs`, or `.cjs` files are allowed. All code must be in TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`).
- **TypeScript-Supported Formats**: `.mts` and `.cts` are recognized first-class TypeScript modules and are completely valid alongside `.ts` and `.tsx`.
- **Automatic Format Conversion**: If any external tool, generator, or scaffolding creates files in plain JavaScript formats without TypeScript support, convert them to their corresponding TypeScript equivalent (`.ts` / `.tsx` / `.mts` / `.cts`).
- **Config File Exception**: `eslint.config.mjs`, `postcss.config.mjs`, and `vitest.config.mts` are acceptable as tooling requires ESM config files. These are build/tooling configuration files and do not violate the application code TypeScript mandate.
- **Scripts**: Any utility or maintenance scripts (e.g., `scripts/*.ts`) must be authored in TypeScript and executed via native Node 22+ execution (`node scripts/<script>.ts`) or `tsx`.

## Environment Variable & Configuration Conventions
- **Single Source of Truth**: All environment variables must be declared and validated using Zod in centralized schema files:
  - Backend: `backend/src/config/env.ts`
  - Frontend: `frontend/src/lib/env.ts`
- **Zero Fallback Policy**: Never provide fallback defaults for secrets, ports, database URLs, or required configuration keys.
- **Fail-Fast Startup**: The process must crash immediately (`process.exit(1)`) with a clean list of missing/invalid variables if `.env` does not conform to the schema.
- **Consumer Files**: Never call `process.env` directly in feature modules, services, or test configs. Always import the validated, type-safe `env` object.
- **Synchronization Verification**: Maintain 100% key parity between `.env` and `.env.example` across all packages. Verify parity via `pnpm run check:env`.

## Full-Stack Pagination Conventions
- **Zero Client-side Array Slicing**: Endpoints providing list views must execute true server-side pagination with database-level `skip` and `take`.
- **No Backward-Compatibility Hacks**: Do not fall back to returning the full dataset when pagination parameters are omitted. Both frontend and backend must strictly adhere to `PaginationParams` (`page`, `limit`, `search`) and `PaginatedResult<T>`.
- **Total Count Metadata**: Always return `{ data: T[], total: number, page: number, limit: number, totalPages: number }` to power client pagination controls.

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]` or `refactor/[task-slug]`.
- When committing, ALWAYS use `git add .` (do NOT add individual files separately). Run `git add .` as a separate command first, then `git commit -m "..."` as a separate command. Never chain them together.
- **Commit message format: Conventional Commits with scope** → `type(scope): description`.
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`.
  - Scope is mandatory. Use the affected module/area, e.g. `config`, `i18n`, `jobs`, `ui`, `auth`, `api`, `core`.
  - Message is in English, lowercase, no period at the end.
- Local commit only, do not `git push` unless explicitly requested.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.

## Brand Identity & Logos
- The official product brand name is **HaiHire** (monogram: **H**).
- Always use the centralized `BRAND_CONFIG` from `@haihire/shared` for brand names, monograms, legal names, and careers portals to support straightforward white-labeling and on-premise deployments.
- Reusable brand logo component lives in `frontend/src/components/shared/brand-logo.tsx` (`<BrandLogo />`).
- Whenever reference images or mockups contain placeholder logos/names (like Reqcore or ATS), ALWAYS replace with **HaiHire** (or "H" monogram) across all UI components, logos, and copy.

## Validation & Testing Conventions
- If only frontend UI is modified, only run frontend lint and build (`pnpm --filter frontend run build ; pnpm --filter frontend run lint`) without running backend tests or full test suites.
- Always execute commands individually or use `;` (not `&&`) in Windows PowerShell.
- Always use `pnpm` or `pnpx` (NEVER use `npx`).

## Database & Seed Conventions
- **NEVER run database seed (`pnpm run seed` or scripts that wipe data) automatically.** Always ask for explicit user confirmation before running seed, as it deletes all existing data in the database.
- **Cascade Deletion**: Schema relationships must define `onDelete: Cascade` in `contract.prisma` for child records (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) to guarantee relational data integrity.

## Internationalization (i18n) & Text Conventions (MANDATORY)
- **Zero hardcoded text**: No raw user-facing strings or placeholders may be initialized directly in source code. All text must be retrieved through the i18n translation system (`useI18n()` / `t()`).
- Applies 100% across all `.tsx` and `.ts` files on the frontend.
- Standard workflow when adding new strings:
  1. Declare the key and type in `frontend/src/i18n/types.ts`.
  2. Add the Vietnamese translation in `frontend/src/i18n/locales/vi.ts`.
  3. Add the English translation in `frontend/src/i18n/locales/en.ts`.
  4. Access via `t("key.path")` in the component or page.

## Component Organization & Directory Conventions (MANDATORY)
- **Shadcn Isolation (`frontend/src/components/ui/`)**: Reserved strictly for pristine Shadcn primitives added via `pnpx shadcn add`.
- **ATS Shared Components (`frontend/src/components/shared/`)**: Proprietary shared components, custom selects, spinners, badges.
- **Layout Components (`frontend/src/components/layout/`)**: Application shell and navigation.
- **Application Context Providers (`frontend/src/components/providers/`)**: App-level state providers.
- **Zero Loose Root Components**: Never place loose `.tsx` files directly at `frontend/src/components/` root.

## Strict Typing & Zero `any` Policy (MANDATORY)
- **Zero `any` in application code**: The use of `any` is strictly prohibited across backend, frontend, and shared packages.
- Always define clear types, interfaces, DTOs, or schema types.
- Utilize `@ats/types` as the canonical source for domain models.

## React SyntheticEvent & Callback Hygiene (MANDATORY)
- **Never pass parameterized callbacks directly to `onClick`**: If a function accepts an optional parameter (such as `id?: string` or `item?: ScheduledInterviewInfo`), passing it directly as `onClick={onCancelInterview}` causes React to pass the native `MouseEvent` into the parameter. String interpolation or coercion turns this into `"[object Object]"`, leading to critical URL routing and API deletion errors (e.g. `/interviews/[object%20Object]`).
- **Explicit Arrow Function Wrapper**: Always explicitly wrap event handlers:
  - When no event is needed: `onClick={() => onCancelInterview(item)}` or `onClick={() => onSelect(candidate.id)}`.
  - When event propagation must be stopped: `onClick={(e) => { e.stopPropagation(); onCancel(item); }}`.

## Client-Side Network Gatekeeper & Defensive API Calls (MANDATORY)
- **Fail-Fast URL Inspection**: All Axios and HTTP request clients must implement an active request interceptor (Gatekeeper) that validates request URLs before network dispatch.
- **Reject Malformed Segment Strings**: If any URL contains `[object%20Object]`, `[object Object]`, `undefined`, or `null` within path segments, the interceptor must immediately abort and reject the promise with a descriptive error code (`CONTRACT.INVALID_URL_ARGUMENT`) without sending bad packets over the network.

## Multi-Tenant Security & Query Scoping (MANDATORY)
- **Two-Tier Tenant Isolation**: Tenant isolation must be strictly enforced at both the Guard/Controller layer and the Database/ORM layer.
- **Guard Layer (`TenantGuard`)**: Validate that the requesting user's `organizationId` matches the requested tenant context. Cross-tenant access attempts must immediately throw `AppForbiddenException` (HTTP 403).
- **Service & ORM Layer**: All database queries for tenant-scoped models (`Job`, `Candidate`, `Application`, `Interview`, `CandidateDocument`) must filter by `.where(e.organizationId.eq(organizationId))`. If `organizationId` is missing or invalid, services must return empty sets or throw `AppNotFoundException` without scanning global records.

## Headless Form & JSDOM Testing Conventions (MANDATORY)
- **HTML5 Constraint Validation in JSDOM**: When testing form components containing `<input required>` or constraint attributes in React Testing Library with jsdom, clicking a `<button type="submit">` will not trigger `onSubmit` if required fields are empty (jsdom silences invalid submissions without firing event handlers).
- **Explicit Form Submission in Tests**: To test validation error display on empty form submission, always submit the `<form>` directly using `fireEvent.submit(form)` or `fireEvent.submit(submitBtn.closest("form")!)`.
- **i18n Translation Key Synchronization**: All test fixtures mocking `useI18n()` must maintain exact 1-to-1 key parity with the component's actual translation calls (e.g., verifying `t("auth.signInButton")` vs `t("auth.signIn")`).
- **Query Flexibility**: When querying common elements (like email addresses or candidate names that appear in multiple summary tiles), prefer `screen.getAllByText(...)[0]` or regular expression matchers (`screen.getByText(/admin@tun\.io\.vn/)`) to prevent collision errors.

## Object Storage Security & CV Asset Isolation (MANDATORY)
- **Tenant Path Isolation**: Never upload files with raw client-supplied file paths to root buckets. All uploaded files (resumes, portfolios, attachments) must strictly follow the scoped path hierarchy:
  `tenants/{organizationId}/candidates/{candidateId}/{uuid}-{sanitizedFileName}`
- **Server-Side File Verification**: Do not rely on client-side MIME types or file extensions alone. Backend upload handlers must inspect buffer signatures (magic bytes) to verify genuine file types before persisting to MinIO / S3.
- **Short-Lived Presigned URLs**: CV buckets containing Personal Identifiable Information (PII) must remain completely private. Generate presigned download/preview URLs with short expiration windows (15 to 30 minutes maximum).

## TanStack Query Key Factory & Cache Invalidation Matrix (MANDATORY)
- **Canonical Key Factory**: Never write ad-hoc string query keys like `["candidates"]` scattered across components. All query keys must be generated via a centralized `QUERY_KEYS` factory object.
- **Mandatory Invalidation on Mutation**: Every mutation hook (creating/updating/deleting jobs, applications, candidates, or interviews) must explicitly declare all dependent query keys in its `onSuccess` callback via `queryClient.invalidateQueries(...)` to prevent stale UI states without requiring full page reloads.

## Pipeline Stage State Machine & Transition Validation (MANDATORY)
- **Deterministic Stage Progression**: Stage transitions must conform to the defined recruitment lifecycle: `APPLIED` → `SCREENING` → `INTERVIEW` → `OFFER` → `HIRED` or `REJECTED`.
- **Pre-Condition Checks**:
  - Transitioning to `INTERVIEW`: Automatically advance candidate from `APPLIED`/`SCREENING` upon first confirmed interview schedule.
  - Transitioning to `HIRED`: Validate remaining vacancy quota on the target job and record hiring timestamp.
  - Transitioning to `REJECTED`: Require a structured rejection reason (`rejectionReason`) and offer automated rejection email notification.

## Audit Trail & Zero Silent Mutation Logging (MANDATORY)
- **Zero Silent Mutations**: Every state-changing write operation (POST, PUT, PATCH, DELETE) modifying core domain entities must asynchronously create an `ActivityLog` entry via `ActivitiesService` recording `actorId`, `action`, `entityType`, `entityId`, and `metadata` (e.g., previous state vs new state).
- **PII Scrubbing in Logs**: Application and system logs (NestJS, Winston, terminal output) must scrub all sensitive PII (passwords, tokens, resume body texts, bank details) before emitting log streams.

## Unified Error Response Envelope & Client Extraction (MANDATORY)
- **Standardized Backend Error Envelope**: All exceptions thrown by backend services must inherit from `AppException` and return the unified JSON shape: `{ statusCode, errorCode, message, timestamp }` mapped to `@haihire/shared` error codes.
- **Client Error Handling**: Frontend components must never render raw error messages (`err.message` or `err.response.data`) directly. Always utilize the centralized `getApiErrorMessage(err, t, fallbackKey)` utility to ensure localized, user-friendly error dialogs and toasts.

## Background Job Idempotency & Queue Resilience (MANDATORY)
- **Unique Idempotency Keys**: All BullMQ background jobs (specifically email dispatches, webhook notifications, and AI resume parsing) must define an explicit and deterministic `jobId` (e.g. `email:${type}:${candidateId}:${interviewId}`).
- **Prevent Duplicate Dispatches**: Redis/BullMQ must silently discard redundant job enqueues if an identical job is currently active or recently completed, preventing duplicate interview invitations or offer letters from being sent to candidates during network retries or worker restarts.

## Safe Email Template Interpolation & Anti-XSS (MANDATORY)
- **Strict Variable Sanitization**: All candidate-supplied fields (candidate name, notes, phone, custom answers) interpolated into HTML email templates (`{{candidateName}}`, `{{interviewLink}}`, `{{companyName}}`) must be strictly HTML-escaped to prevent cross-site scripting (XSS), phishing links, or HTML injection attacks against recruiters and interviewers.
- **Deliverability & Domain Verification**: Monitor email sending status and ensure system mailers alert administrators if custom sending domains lack SPF/DKIM verification.

## Two-Tier Deletion Protocol (Soft Delete vs Hard Cascade) (MANDATORY)
- **Root Entities (Soft Delete)**: Core domain models (`Job`, `Candidate`) must utilize soft deletion (`deletedAt: Date | null`) to prevent irreversible accidental deletions and satisfy enterprise HR audit requirements (e.g., 30-day recovery window).
- **Dependent Relations (Hard Cascade)**: Secondary relational records (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) must maintain database-level `onDelete: Cascade` in `contract.prisma` so that when a root entity is genuinely purged/expunged, all dependent rows are cleanly and atomically wiped without leaving orphan records.



