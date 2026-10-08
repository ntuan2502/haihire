# PROJECT CONTEXT REPORT: HAIHIRE ENTERPRISE ATS
> **Single Source of Truth (SSOT) for Antigravity, DeepSeek & Project Owner**  
> **Version:** 1.0.0  
> **Updated:** 2026-10-06  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)

---

## 1. OVERVIEW
- **Project Name:** HaiHire Enterprise ATS Platform (`haihire-platform`).
- **Purpose:** Next-generation enterprise multi-tenant Applicant Tracking System (ATS). Optimizes the end-to-end recruitment lifecycle from job requisition authoring, multi-channel UTM tracking link generation, candidate resume ingestion (distributed Saga CV upload), drag-and-drop Kanban pipeline management, interviewer evaluation scorecards, to automated transactional email notifications.
- **Project Structure:** Full-stack Monorepo (`pnpm workspace`) comprising 3 core packages:
  - `backend`: REST API Server powered by NestJS 12.
  - `frontend`: Web Application built with Next.js 16 App Router.
  - `packages/shared`: Shared domain contract library (`@haihire/shared` containing types, enums, `APP_ERROR_CODES`, brand config).
- **Status:** **Version 1.0.0** — Production Release Candidate (Completed 22 hardening phases, audited across 10 Independent Verification & Validation (IV&V) cycles with credibility scores of 99.0% - 100%).
- **Target End Users:**
  1. *Recruiter / HR / Hiring Manager / Tenant Admin*: Authenticate into internal dashboard (`/dashboard`) to manage jobs, candidate pipelines, interview schedules, email templates, and sourcing attribution links.
  2. *Candidate*: Access public career portal (`/careers/[orgSlug]/[jobSlug]`) to view job specifications and submit applications online.

---

## 2. TECH STACK
- **Language + Version:** TypeScript `6.0.3` (100% Pure TypeScript mandate; pure `.js` files and `any` types are strictly prohibited — reference `.agents/memory/project-conventions.md:L13-19`).
- **Primary Frameworks:**
  - **Backend:** NestJS `12.1.2` (running on Express platform adapter, reference `backend/package.json:L33-38`).
  - **Frontend:** Next.js `16.3.8` (App Router, React Server Components combined with Client Components) + React `19.3.0` (reference `frontend/package.json:L30-33`).
- **Runtime:**
  - Node.js: `26.x` Active LTS baseline (Docker image `node:26-alpine`).
  - Package Engine: `pnpm@12.6.0` (Node 26 removed Corepack; pnpm installed directly via npm).
- **Core Libraries:**
  - *UI & Styling:* Tailwind CSS `v4`, Base UI (`@base-ui/react ^1.8.0`), Radix UI Primitives (Dialog, Dropdown, Select, Slot), Lucide React (`^1.49.0`), `sonner` (toast notifications), `@dnd-kit` (`^6.3.1` core & sortable for Kanban board).
  - *Client State & Cache:* `@tanstack/react-query` `^5.104.0` (server state management with centralized query key factories).
  - *ORM & Data Access:* Prisma 8 RC (`@prisma/orm-postgres` `8.0.0-rc.13`, `prisma` `8.0.0-rc.19` Contract-first architecture).
  - *Authentication:* Passport.js `^0.7.0`, `passport-jwt` `^4.0.1`, `bcryptjs` `^3.0.3`, HttpOnly JWT Cookies (`haihire_token`).
  - *Async Queues:* BullMQ `^6.3.11` + `@nestjs/bullmq` `^12.0.0` (email jobs and orphan file cleanup compensation).
  - *Object Storage SDK:* MinIO Node SDK `^8.0.7` (S3-compatible API).
  - *Validation:* Zod `^4.6.5` (centralized schemas), `class-validator` `^0.15.1` + `class-transformer` `^0.5.1` wrapped via custom `DtoPipe`.
  - *Testing:* Vitest `5.0.3` (unit/integration test), Playwright `1.63.0` (browser E2E), `@testing-library/react` `16.3.3`, `jsdom` `30.1.1`.
- **Database / Storage / Cache / Queue:**
  - *Database:* PostgreSQL `17.6-alpine` (Host dev port: `15432`, container: `5432`).
  - *Cache & Queue:* Valkey `8.0.2-alpine` (open-source Redis replacement complying with RSALv2/SSPLv1 license constraints; host dev port: `16379`, container: `6379`).
  - *Object Storage:* MinIO S3 (`alpine/minio` pinned digest; host dev API port: `19000`, console: `19001`).
- **DevOps:**
  - *Docker & Container Registry:* Docker Compose v2 (`docker-compose.yml` for dev infra, `docker-compose.prod.yml` pulling pre-built images from GitHub Container Registry - GHCR).
  - *Reverse Proxy:* Caddy `2.8-alpine` (TLS termination & reverse proxy).
  - *CI/CD:* GitHub Actions (`.github/workflows/ci-cd.yml`, `docker-publish.yml`, `e2e-nightly.yml`, `release.yml`) with automated architecture quality gates.
  - *Monitoring:* Internal Prometheus metrics endpoint at `/metrics` via `MetricsService` and Pushgateway for cron batch metrics.
- **Package Manager:** `pnpm` `12.6.0` (workspace configuration in `pnpm-workspace.yaml`).

---

## 3. ARCHITECTURE
- **Architectural Patterns:**
  - **Modular Monolith** on Backend (NestJS divided into independent domain modules communicating internally).
  - **Distributed Saga Pattern** coordinating dual writes between MinIO (Object Storage) and PostgreSQL (Relational Database) with BullMQ Dead-Letter Queue (DLQ).
  - **AsyncLocalStorage Transaction Propagation:** Manages nested service transactions without manual parameter threading (`backend/src/prisma/prisma.service.ts:L13-34`).
  - **Multi-Channel Webhook Alert Module:**
    - Location: `backend/src/common/webhook/`
    - Pattern: Factory + Interface (`WebhookProvider`, `WebhookProviderFactory` similar to `EmailTransporter`).
    - Available Providers: `TELEGRAM`, `DISCORD`, `GENERIC` (POST JSON with HMAC-SHA256 signature, `eventId`, `eventType`).
    - Fallback: Global environment variables with per-organization configuration support.
    - Integration: Connected directly into `OrphanCleanupProcessor` to emit alerts when jobs enter `orphan-cleanup-dlq`.
  - **Hybrid Next.js Architecture:** Public routes (`/careers/*`) built with pure **React Server Components (RSC)** for optimal SEO/GEO (JSON-LD `JobPosting` schema); Private routes (`/dashboard/*`) are high-interactivity Client SPA powered by `@tanstack/react-query`.
- **Directory Layout:**
```text
haihire/
├── .agents/                 # AG Kit AI agent rules, memory persistence (MEMORY.md), workflows
├── .github/workflows/       # GitHub Actions workflows: CI/CD gates, GHCR publish, nightly E2E
├── backend/                 # NestJS 12 REST API Server
│   ├── migrations/          # Prisma database migrations
│   ├── src/
│   │   ├── activities/      # Audit trail logging (async, PII-scrubbed)
│   │   ├── applications/    # Candidate application management, CV upload, Kanban stage transitions
│   │   ├── auth/            # JWT authentication, HttpOnly cookies, RBAC RolesGuard
│   │   ├── candidates/      # Talent pool, candidate profiles, attachments
│   │   ├── common/          # Custom exceptions, DtoPipe, date utils, AES-256 encryption
│   │   ├── config/          # Centralized fail-fast Zod schema (env.ts)
│   │   ├── email/           # Email worker (BullMQ), template interpolation, anti-XSS
│   │   ├── events/          # Internal event emitters & SSE notifications
│   │   ├── interviews/      # Interview scheduling, Google/Outlook meet links, scorecards
│   │   ├── jobs/            # Job requisition CRUD, public career listings
│   │   ├── metrics/         # Prometheus latency & request metrics collector
│   │   ├── minio/           # S3 client wrapper, magic-byte inspection, presigned URLs
│   │   ├── organizations/   # Multi-tenant management, memberships, invite links
│   │   ├── prisma/          # Prisma 8 contract-first ORM, ALS transaction engine, seed.ts
│   │   ├── sourcing/        # 5-parameter UTM tracking links, deduplicated click analytics
│   │   └── main.ts          # Backend bootstrap entry point
├── frontend/                # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/             # App Router: /auth, /careers (RSC), /dashboard (Kanban, Tables)
│   │   ├── components/      # 5-layer modular architecture: ui, shared, layout, providers, features
│   │   ├── context/         # AuthContext (session management, organization switching)
│   │   ├── hooks/           # Domain TanStack Query hooks (use-*-queries.ts) + query-keys.ts
│   │   ├── i18n/            # Dual-language engine (vi/en), I18nProvider, translation keys
│   │   ├── lib/             # Axios client with URL gatekeeper, api-error parser, domain API clients
│   │   └── types/           # Frontend TypeScript view model definitions
├── packages/
│   └── shared/              # @haihire/shared: APP_ERROR_CODES, enums, DTO contracts, BRAND_CONFIG
├── docs/                    # Architecture blueprints, API specs, runbooks, audit history
├── monitoring/              # Prometheus alert rules and configuration
└── scripts/                 # CI quality verification scripts (check-all.ts, check-dtopipe...)
```
- **Primary Data & Request Flows:**
  1. **Public Request (Candidate views JD):** Client $\rightarrow$ Caddy Reverse Proxy $\rightarrow$ Next.js Server Component (`/careers/[orgSlug]/[jobSlug]`) $\rightarrow$ Direct server fetch from internal Backend (`INTERNAL_API_URL`) $\rightarrow$ Semantic HTML + JSON-LD `JobPosting` schema $\rightarrow$ Rendered directly without client API waterfalls.
  2. **Dashboard Request (Recruiter interaction):** Browser calls `/api/*` (proxied by Next.js to Backend) $\rightarrow$ Axios Interceptor Gatekeeper validates URL $\rightarrow$ Backend `ThrottlerGuard` (rate limit) $\rightarrow$ `JwtAuthGuard` (reads HttpOnly cookie `haihire_token`) $\rightarrow$ `TenantGuard` (validates `organizationId`) $\rightarrow$ Controller $\rightarrow$ `DtoPipe` validation $\rightarrow$ Service.
  3. **Candidate Application Submission (Saga Workflow):**
     - *Step 1 (MinIO Upload):* CV file inspected for magic bytes and uploaded to `tenants/${orgId}/resumes/${filename}`.
     - *Step 2 (Transactional DB Write):* Invokes `PrismaService.executeTx()`, atomically inserting `Candidate`, `Application`, `CandidateDocument`, `ActivityLog`.
     - *Step 3 (Compensating Rollback):* If DB insert fails, MinIO object deletion is immediately triggered.
     - *Step 4 (DLQ Fallback):* If MinIO delete fails, job is pushed to BullMQ `orphan-cleanup-queue` with 5 retries and DLQ alerting.
- **Core Modules & Relationships:**
  - `Organizations`: Root tenant entity. All recruitment data is strictly scoped by `organizationId`.
  - `Auth` & `Users`: Account management and RBAC authorization (`ADMIN` vs `MEMBER`).
  - `Jobs`: Job postings belonging to an `Organization`.
  - `Candidates`: Candidate profiles scoped by `Organization`, unique on `(organizationId, email)`.
  - `Applications`: Junction entity `(Candidate, Job)` tracking pipeline stages (APPLIED $\rightarrow$ SCREENING $\rightarrow$ INTERVIEW $\rightarrow$ OFFER $\rightarrow$ HIRED/REJECTED).
  - `Interviews`: Tied to an `Application`, storing interview scorecards and video meeting links.
  - `Sourcing`: Generates `TrackingLink` (with 5 UTM parameters) attached to `Application` for channel attribution analytics.
  - `Activities`: Asynchronous audit trail logging all mutations on Candidates and Applications.
- **Entry Points:**
  - Backend: `backend/src/main.ts` (bootstraps NestJS, CORS, Helmet headers, Global Pipes, Filters, listening on `PORT=3001`).
  - Frontend: `frontend/src/app/layout.tsx` (RootLayout, injecting anti-FOUC theme script `beforeInteractive`, wrapping `I18nProvider`, `QueryClientProvider`, `AuthProvider`).

---

## 4. CONVENTIONS & CODING PATTERNS
- **Naming Conventions:**
  - *Files:* Strict `kebab-case` (`wizard-header.tsx`, `dto-validation.pipe.ts`, `query-keys.ts`).
  - *Variables & Functions:* `camelCase` (`executeTx`, `getApiErrorMessage`, `downloadAuthenticatedFile`).
  - *React Components:* `PascalCase` (`WizardHeader`, `MetricCard`, `CustomSelect`).
  - *Classes & DTOs:* `PascalCase` (`CreateJobDto`, `PrismaService`, `GlobalExceptionFilter`).
  - *Database Schema:* PostgreSQL tables mapped via `snake_case` in `backend/src/prisma/contract.prisma` (e.g. `@@map("job")`, `@@map("candidate")`).
- **File Structure Blueprint:**
  - *Frontend Component:*
    ```typescript
    "use client"; // (If Client Component)
    // 1. React / Next.js imports
    import { useState, useMemo } from "react";
    import Link from "next/link";
    // 2. Third-party UI / icons / utilities
    import { cn } from "cn"; // Direct import from "cn" package
    import { ArrowLeft } from "lucide-react";
    // 3. Project components & hooks
    import { Button } from "@/components/ui/button";
    import { useI18n } from "@/i18n";
    // 4. Types
    import type { Job } from "@/types";
    // 5. Props Interface
    interface ComponentProps { ... }
    // 6. Component export
    export function Component({ ... }: ComponentProps) { ... }
    ```
  - *Backend Controller:*
    ```typescript
    import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
    import { AuthGuard } from "@nestjs/passport";
    import { RolesGuard } from "../auth/roles.guard";
    import { DtoPipe } from "../common/dto-validation.pipe"; // Mandatory for @Body()
    import { CreateJobDto } from "./dto/create-job.dto";
    import { JobsService } from "./jobs.service";

    @Controller("jobs")
    export class JobsController {
      constructor(private readonly jobsService: JobsService) {}
      @Post()
      @UseGuards(AuthGuard("jwt"), RolesGuard)
      create(@Body(DtoPipe(CreateJobDto)) dto: CreateJobDto, @Request() req: any) { ... }
    }
    ```
- **State Management:**
  - *Server State:* 100% managed by `@tanstack/react-query` v5. Centralized query keys defined in `frontend/src/hooks/query-keys.ts`. Mutations must invoke `queryClient.invalidateQueries({ queryKey: queryKeys.<domain>(...) })`.
  - *Global Client State:* Dedicated React Context: `AuthContext` (session & tenant), `I18nContext` (language).
  - *Local UI State:* Standard React hooks (`useState`, `useReducer`, `useMemo`).
- **API Invocation:**
  - Singleton Axios client in `frontend/src/lib/api/client.ts` (`api = axios.create({ baseURL: getApiBaseUrl(), withCredentials: true })`).
  - **Client-Side Gatekeeper:** Active interceptor blocking malformed URLs containing `[object Object]` or `%5Bobject` before network transmission.
  - Domain-separated API files in `frontend/src/lib/api/<domain>.ts`.
- **Error Handling & Logging:**
  - *Backend:* Throw exceptions inheriting `AppException` with codes defined in `APP_ERROR_CODES` (`packages/shared/src/errors.ts`). `GlobalExceptionFilter` standardizes error envelope: `{ statusCode, code, message, params, timestamp, path }`. HTTP logging is structured JSON with PII scrubbing.
  - *Frontend:* Process errors via `getApiErrorMessage(err, t)` (`frontend/src/lib/api-error.ts`), translating machine codes to user messages (`errors.<CODE>`). Zero `alert()` calls or raw `JSON.stringify(err)` displays permitted.
- **Validation:**
  - *Backend Request Payload:* `class-validator` + `class-transformer` wrapped with `DtoPipe(<DtoClass>)` on `@Body()` parameters.
  - *Environment Variables:* Strict Zod schemas in `backend/src/config/env.ts` and `frontend/src/lib/env.ts`. Fail-fast zero-fallback philosophy.
- **Testing Standards:**
  - *Frameworks:* Vitest across monorepo packages; Playwright for E2E browser tests.
  - *Pattern:* AAA (Arrange - Act - Assert). HTML5 constraint forms in JSDOM must be submitted via `fireEvent.submit(form)`.
- **Branch & Commit Conventions:**
  - *Branch:* `feature/[task-slug]`, `fix/[bug-slug]`, `refactor/[task-slug]`, `perf/[task-slug]`, `docs/[task-slug]`.
  - *Commit:* Conventional Commits with mandatory scope: `type(scope): description` in lowercase English without trailing periods.

---

## 5. COMMON DEVELOPER COMMANDS
| Operation | Command | Notes |
| :--- | :--- | :--- |
| **Install dependencies** | `pnpm install` | Requires Node >= 26 and pnpm 12. Do not use `corepack enable`. |
| **Start Docker infra** | `pnpm docker:infra:up` | Boots PostgreSQL (`15432`), Valkey (`16379`), MinIO (`19000/19001`). |
| **Initialize DB & Seed** | `pnpm db:setup` | Executes `prisma db update` and populates demo seed data. |
| **Launch Development** | `pnpm dev` | Starts Backend (`13001`) and Frontend (`13000`) concurrently. |
| **Build all packages** | `pnpm build` | Builds `@haihire/shared` $\rightarrow$ `backend` $\rightarrow$ `frontend`. |
| **Run Unit & Int tests** | `pnpm test` | Runs all Vitest test suites. |
| **Run E2E Browser tests** | `pnpm test:e2e` | Runs Playwright E2E browser journeys. |
| **Full CI verification** | `pnpm check:all` | Executes full CI quality gates suite. |
| **Fast CI check (pre-commit)**| `pnpm check:all:fast`| Runs static gates + test diff (~38s). |
| **Verify Environment sync**| `pnpm lint:env-sync` | Asserts 100% key parity across `.env` templates and Docker Compose. |
| **Verify i18n parity** | `pnpm check:i18n` | Asserts zero hardcoded strings in JSX and complete dictionary keys. |
| **Verify DtoPipe coverage**| `pnpm lint:dtopipe` | Verifies 100% of `@Body()` parameters guarded by `DtoPipe`. |
| **Verify Error code i18n** | `pnpm lint:error-i18n` | Asserts all `APP_ERROR_CODES` exist in `vi.ts` and `en.ts`. |
| **Version synchronization**| `pnpm version:sync` / `pnpm version:bump [patch\|minor]` | Synchronizes lockstep version across monorepo `package.json` manifests. |
| **Start Production Docker**| `pnpm docker:prod:up` | Starts production container cluster with `.env.production`. |

---

## 6. CRITICAL ARCHITECTURAL CONSTRAINTS
- **Sensitive Files (Do Not Modify Without Caution):**
  1. `backend/src/prisma/contract.prisma` & `contract.json`: Prisma 8 RC ORM schema contract. Schema changes require `pnpm contract:emit` and `pnpm db:update`.
  2. `backend/src/common/dto-validation.pipe.ts`: Bridge protecting validation metatypes from bundler tree-shaking.
  3. `frontend/src/app/layout.tsx`: Anti-FOUC theme script `<Script id="theme-init" strategy="beforeInteractive">`. Do not replace with raw `<script>` tags.
  4. `backend/src/applications/applications.service.ts`: Core Saga resume upload logic. Houses MinIO compensating deletions and BullMQ DLQ triggers.
- **Known Technical Debt:**
  1. *Large Files Exceeding 400 Lines:*
     - `frontend/src/components/applications/applications-data-table.tsx` (~1.6k lines).
     - `backend/src/applications/applications.service.ts` (~1.1k lines).
     - `backend/src/organizations/organizations.service.ts` (~1.1k lines).
     - `backend/src/sourcing/sourcing.service.ts` (~988 lines).
     - `frontend/src/components/jobs/job-list.tsx` (~900 lines).
  2. *Legacy Table Mappings:* 9 tables in `contract.prisma` retain legacy camelCase `@@map` directives (`organizationMember`, `trackingLink`...) pending future migration.
- **Common Pitfalls to Avoid:**
  - *React SyntheticEvent Leakage:* When passing callbacks to `onClick`, if the target function accepts optional arguments (`onDelete(id?: string)`), do **not** bind directly `onClick={onDelete}`. React will pass the `MouseEvent` as the first argument, resulting in `"[object Object]"` URL parameters. Always bind via arrow function: `onClick={() => onDelete(id)}`.
  - *Cross-Platform File Path Sanitization:* Never use `path.basename()` to clean uploaded filenames; it does not strip Windows `\` separators on Linux CI hosts. Always use universal regex: `.replace(/^.*[/\\]/, "")`.

---

## 7. UNWRITTEN RULES & AGENT DIRECTIVES
1. **Never chain shell commands with `&&` on Windows PowerShell:** The host OS uses PowerShell. Chaining with `&&` can cause syntax errors. Execute commands sequentially or separate with `;`.
2. **Never execute `pnpm run seed` or `pnpm db:setup` without user confirmation:** Seeding wipes the existing database and restores default demo state. Always confirm with the user.
3. **No hardcoded user-facing strings in Frontend:** All text, labels, and placeholders must resolve via `useI18n()` and `t("key.path")`. New strings must be added simultaneously to `types.ts`, `vi.ts`, and `en.ts`.
4. **No duplicate proxy files when modularizing:** In directories such as `frontend/src/lib/api/`, `index.ts` is the single export source. Never create an adjacent `frontend/src/lib/api.ts` file.
5. **No `corepack enable`:** Node.js 26 has removed Corepack. Use explicit npm package installation: `npm install -g pnpm@12.6.0`.
6. **All `.env` changes must be synchronized across 5 files:** `.env`, `.env.example`, `backend/.env.example`, `frontend/.env.example`, `.env.production.example`.
7. **Do not import `clsx` or `tailwind-merge` directly:** Always import the unified helper from `cn`: `import { cn } from "cn";`.

---

## 8. OPEN ARCHITECTURAL QUESTIONS
1. **[CONFIRMATION REQUIRED] Refactoring the 5 Large Files:** Modules such as `applications-data-table.tsx` and `applications.service.ts` exceed modular thresholds. Should these be refactored now or maintained as-is to preserve stability for v1.0.0?
2. **[CONFIRMATION REQUIRED] Database Table Name Migration:** 9 tables currently use camelCase `@@map` names in `contract.prisma`. Should these be migrated to PostgreSQL `snake_case` now or post-release?
3. **[CONFIRMATION REQUIRED] Full-Width Canvas Alignment:** Several components retain container constraints (`max-w-7xl mx-auto`). Should all pages be standardized to full-width layouts?
4. **[CONFIRMATION REQUIRED] Production Email Provider:** Current environment defaults to `SYSTEM_EMAIL_PROVIDER="SIMULATED"`. Which provider (`SMTP`, `RESEND`, or `SENDGRID`) will be designated for production release?

---

## 9. ROADMAP & FUTURE EXTENSIONS
### Candidate Providers for v1.1.0:
- Microsoft Teams Incoming Webhook
- Zalo OA Webhook
- Lark/Feishu Bot
- Slack (Block Kit integration)

---

## 10. LANGUAGE CONVENTION

All documentation, code comments, commit messages, alert descriptions, and log messages MUST be in English.

Vietnamese is ONLY allowed in:
- `frontend/src/i18n/locales/vi.ts` — UI text for Vietnamese users
- Mock data and seed data (realistic Vietnamese names, sample email templates)

### Exceptions

Historical artifacts that are preserved as-is:
- `docs/archive/audits/*.md` — Phase 1-22.8 historical audit records (may contain Vietnamese, preserved for historical integrity)
- Git commit history (already in English via Conventional Commits)

### Rationale

- International team scalability
- Industry standard for technical documentation
- Consistent search/grep across codebase
- Separation of concerns: content vs localization

