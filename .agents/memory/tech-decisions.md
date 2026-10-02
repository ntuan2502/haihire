---
type: project
created: 2026-07-18
updated: 2026-10-02
---

# Technical Decisions

- Component metadata uses SemVer while the toolkit release keeps CalVer.
- manifest.json and manifest.lock.json must remain synchronized with component frontmatter.

- **Centralized Schema-Driven Environment Architecture (Zod-based)**:
  - **Decision**: Reject scattered ad-hoc process.env checks and silent fallbacks. Consolidate all configuration parsing into dedicated Zod schemas: backend/src/config/env.ts and frontend/src/lib/env.ts.
  - **Auto-casting**: Coerce strings to types (PORT to number, MINIO_USE_SSL to boolean).
  - **Fail-Fast**: Terminate immediately at bootstrap with field-level error messages if required variables are missing or secrets are too short (JWT_SECRET >= 16, ENCRYPTION_SECRET >= 32).
  - **Test Suite Safety**: Vitest config imports ./src/config/env.ts to ensure tests execute against verified environment constraints without mock fallbacks.
  - **Sync Validation**: Keep .env and .env.example strictly synchronized via pnpm run check:env (scripts/check-env.ts).

- **Full-Stack Server-Side Pagination**:
  - **Decision**: Eliminate client-side array slicing (data.slice(...)) and backward-compatibility hacks (returning all rows when pagination params are absent).
  - **Shared Contract**: Standardize on PaginationParams (page, limit, search) and PaginatedResult<T> exported from @haihire/shared.
  - **UI Integration**: Frontend pagination controls (rows per page, current page, search query) bind directly to query parameters and receive metadata { data, total, page, limit, totalPages } directly from the backend.

- **Modern Package Ecosystem & Syntax Standards (2026 Baseline)**:
  - **Frontend**: Next.js 16.3.8 (Turbopack + Standalone output), React / React DOM 19.3.0, TanStack Query v5.104+, Base UI v1.8+, Shadcn CLI v4.22+.
  - **Backend**: NestJS 12.1.2, Vitest 5.0.3, BullMQ 6.3.11+, Dotenv 18.0.5+, Nodemailer 10.0.13+, Node 26+ types, ESLint 10.11+, TypeScript 6.0.3.
  - **Database**: PostgreSQL 17.6-alpine, Prisma 8.0.0-rc.19 (Contract-First ORM), @prisma/orm-postgres 8.0.0-rc.13, @prisma/composer 0.25.0.
  - **Cache/Queue**: Valkey 8.0.2-alpine (replaces Redis for license compliance), ioredis 6.0.0+.
  - **Runtime**: Node.js 26-alpine (Active LTS October 2026), Tailwind CSS v4.3.3.
  - **Token & Process Efficiency**: Keep code concise and direct; verify root cause before editing; avoid redundant rebuilds or repetitive status loops.

- **Prisma 8 & Composer Architecture Conventions**:
  - **Scaffolding**: Always scaffold using pnpx create-prisma@latest create <dir> --template <template> --provider postgres --package-manager pnpm.
  - **Schema/Contract**: Schema lives in src/prisma/contract.prisma with // use prisma-next header. Do NOT use obsolete datasource blocks inside schema or @updatedAt (use temporal.updatedAt() instead).
  - **Cascade Integrity**: Always specify onDelete: Cascade on dependent child relations (Application, Interview, CandidateDocument, ActivityLog) to guarantee atomic cascade deletion at the database level.
  - **Contract Compilation**: Always run pnpm run contract:emit after modifying contract.prisma or upgrading Prisma to synchronize contract.json, contract.d.ts, and runtime codecs.
  - **Composer Imports (CRITICAL, 0.25.0+ Modern Syntax)**:
    - Never import from deprecated @prisma/composer-prisma-cloud/prisma-next.
    - Always import ORM bindings from "@prisma/composer-prisma-cloud/orm".
    - Use postgres(...) (never obsolete pnPostgres) and dataContract(...) (never obsolete pnContract).
  - **Configuration**: Connection URL and ORM config live in prisma.config.ts using validated env.DATABASE_URL.
  - **Database Lifecycle**: Use prisma db init, prisma db update, prisma db migrate instead of legacy prisma migrate dev.
  - **Client Access**: Access models via namespace db.orm.public.<Model>.
  - **GA Transition Plan**: Prisma 8 is currently 8.0.0-rc.19. Track weekly release channel; upgrade to GA immediately on release. Remove experimental alchemy and @prisma/composer if not strictly needed.

- **Shadcn UI Installation Convention**:
  - **Official CLI**: Always initialize and add Shadcn components directly from the official Shadcn CLI (pnpm dlx shadcn@latest init, pnpm --filter ./frontend exec shadcn add <component>).
  - **No Manual Components**: Never manually write/create Shadcn UI primitive files; always pull them directly from the official registry.
  - **The cn Package Standard (CRITICAL)**: The repository strictly uses the official @shadcn-ui/cn package ("cn": "^0.3.0" in frontend/package.json). Components must import cn directly: import { cn } from "cn";. Do NOT install or re-add clsx or tailwind-merge as dependencies.

- **Component Architecture & Shadcn Isolation (5-Layer Modular Structure)**:
  - **1. UI Primitives (frontend/src/components/ui/)**: Exclusively reserved for pristine components generated via pnpx shadcn add <component>.
  - **2. Shared Design System (frontend/src/components/shared/)**: Proprietary reusable controls, custom selects, spinners, badges, and guards.
  - **3. Layout Components (frontend/src/components/layout/)**: Application shell and global navigation structures.
  - **4. Context Providers (frontend/src/components/providers/)**: App-wide providers wrapping client state and caches.
  - **5. Feature Modules (frontend/src/components/[feature]/)**: Domain-specific components organized by domain.
  - **Rule**: Never leave loose component files at the root of frontend/src/components/.

- **React Named Import Convention**:
  - Always use named imports from "react" (e.g. import { useState, useEffect, type ReactNode } from "react").
  - Never use default import React from "react", wildcard import * as React from "react", or namespace prefixing React.x in application code.

- **Client-Side Network Gatekeeper Interceptors (Fail-Fast URL Inspection)**:
  - **Decision**: Reject malformed URLs containing stringified objects ([object Object], [object%20Object]) or undefined/null tokens directly inside Axios request interceptors.
  - **Rationale**: Prevents accidental string interpolation bugs from causing malformed HTTP requests that pollute server logs, trigger 404/500 errors, or corrupt backend data.

- **Database Driver Priority Protocol (Local DATABASE_URL First)**:
  - **Decision**: In backend/src/prisma/db.ts, always evaluate and prioritize the local PostgreSQL connection via env.DATABASE_URL before falling back to cloud composer instances.
  - **Rationale**: Eliminates DRIVER.NOT_CONNECTED or CONTRACT.MARKER_READ_FAILED failures when running local Docker environments without cloud credentials.

- **Comprehensive Automated Testing Baseline (Full-Stack Continuous Verification)**:
  - **Decision**: Enforce a mandatory suite of 350+ automated tests across backend services and frontend components. Current baseline (Phase 17): 369 tests total (233 backend + 136 frontend).
  - **Coverage**: Covers auth flows, job wizard, pipeline kanban, interview scheduling, scorecard evaluation, member invitations, tenant isolation, transactions, Saga pattern, RSC metadata.
  - **Verification**: Run pnpm test across the monorepo to guarantee 0 regressions before committing major refactors.

- **Object Storage Architecture & Secure Asset Isolation**:
  - **Decision**: Structure MinIO / S3 object keys under strictly namespaced tenant paths (tenants/{orgId}/candidates/{candId}/...) and enforce server-side magic byte inspection for file uploads.
  - **Rationale**: Prevents file collisions across tenants, stops malicious payload uploads disguised with benign file extensions, and safeguards candidate PII via expiring presigned URLs.

- **TanStack Query Key Architecture (Centralized Factory)**:
  - **Decision**: Standardize all query keys into a canonical QUERY_KEYS factory and enforce explicit cache invalidation in all mutation hooks.
  - **Rationale**: Eliminates race conditions and stale UI views across multiple connected recruitment dashboards (Kanban, Tables, Drawers).

- **Recruitment Pipeline State Machine**:
  - **Decision**: Formalize application progression rules (APPLIED → SCREENING → INTERVIEW → OFFER → HIRED / REJECTED) with pre-condition and vacancy checks.
  - **Rationale**: Guarantees hiring funnel integrity, prevents accidental status overwrites, and automates interview stage progression.

- **Audit Trail & Activity Logging Architecture**:
  - **Decision**: Log every state mutation on core domain entities to ActivityLog via ActivitiesService while scrubbing PII.
  - **Rationale**: Complies with enterprise HR audit requirements, delivers transparent activity feeds in candidate profiles, and prevents silent data tampering.

- **Unified Error Envelope, Machine-Readable Codes & Client-Side i18n Architecture**:
  - **Decision**: Standardize all API errors on AppException returning { statusCode, code, message, params }. code must be a machine-readable domain code from APP_ERROR_CODES in @haihire/shared. Dynamic values must be isolated in params (never concatenated into message).
  - **English Fallback**: message is strictly English for logging, developer debugging, and external API consumers.
  - **Client-Side Localization**: Client frontend resolves localized strings via getApiErrorMessage(error, t) by looking up errors.${payload.code} with parameter interpolation. Translations remain strictly on the frontend to prevent backend bundle bloat when adding new languages.
  - **Centralized Test Setup**: Frontend Vitest configuration must provide a shared useI18n mock backed by actual locale dictionaries, eliminating repetitive mock declarations across *.spec.tsx files.

- **Background Job Idempotency & Queue Resilience**:
  - **Decision**: Configure all BullMQ producer queues with deterministic jobId keys based on entity IDs and action types, combined with Redis deduplication windows.
  - **Rationale**: Completely eliminates duplicate email dispatches or duplicate webhook triggers caused by network retries or process restarts.

- **Email Template Security & Anti-XSS**:
  - **Decision**: Enforce automatic HTML sanitization/escaping for all interpolated template variables, with validation of custom sender domain records (SPF/DKIM).
  - **Rationale**: Protects recruitment personnel from malicious payloads injected into candidate form fields.

- **Two-Tier Deletion Architecture (Soft Delete with Relational Cascade Purge)**:
  - **Decision**: Combine application-level soft delete (deletedAt field on Job and Candidate) with database-level onDelete: Cascade on child tables in contract.prisma.
  - **Rationale**: Enables a 30-day trash/restore grace period for accidental deletions while ensuring that permanent purge jobs leave zero orphan records in PostgreSQL.

- **Event-Driven Activity Timeline & Localized Activity Formatting Architecture**:
  - **Decision**: Reject storing raw localized text directly into ActivityLog.title and ActivityLog.description in the database. Instead, store standardized English prose as fallback, structured type/subType, and business parameters in metadata ({ userName, interviewer, round, date, time, jobTitle, fromStage, toStage, fileName, subject }).
  - **Client-Side Reactive Translation**: Frontend timeline components format events reactively using t("timeline.events." + key + "_title", metadata) and t("timeline.events." + key + "_desc", metadata). If the translation key is missing or the event is user-generated free-form notes (UGC), it gracefully falls back to event.title and event.description from the database.
  - **Rationale**: Guarantees instantaneous multi-language switching across candidate timeline views without database migration, prevents cross-recruiter language mismatch in global teams, and keeps database audit logs clean and immutable.

- **Docker Monorepo Architecture, Node 26 Alpine & Pure Production Containerization**:
  - **Decision**: Centralize port overrides in a single root .env file (POSTGRES_PORT, MINIO_PORT, MINIO_CONSOLE_PORT, BACKEND_PORT, FRONTEND_PORT, REDIS_PORT).
  - **Node 26 Alpine Baseline & Explicit pnpm Installation**: 
    - Upgraded all Docker base images to node:26-alpine to match modern host development environments.
    - Node 26 provides out-of-the-box native Temporal API without requiring experimental --harmony-temporal flags.
    - pnpm is installed explicitly via npm install -g pnpm@12 (NOT corepack enable, which was removed in Node 26).
  - **High-Performance Multi-Stage Production Builds & BuildKit Caching**:
    - **BuildKit Cache Mounts**: Both backend/Dockerfile and frontend/Dockerfile utilize --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store to cache package tarballs across builds. Subsequent builds bypass package downloads completely.
    - **Frontend Next.js Standalone Optimization (output: "standalone")**:
      - next.config.ts enables output: "standalone", tracing runtime node_modules into .next/standalone.
      - Stage 2 (runner) copies only .next/standalone, .next/static, and public, requiring zero npm/pnpm installation steps. Image size dropped by ~70% (down to ~330MB) and runner startup is instant.
      - BACKEND_HOST=backend and MINIO_HOST=minio are baked into the builder stage to ensure Next.js route manifests point to internal docker services.
    - **Backend (backend/Dockerfile)**: Stage 1 (builder) compiles @haihire/shared and bundles NestJS backend via esbuild to dist/server.mjs with --alias:@haihire/shared=../packages/shared/src/index.ts. Stage 2 (runner) installs only --prod dependencies directly from local cache mount and runs via node dist/server.mjs. Runner uses --chown=nestjs:nestjs on COPY commands instead of RUN chown -R.
    - **Elimination of Dev Volumes**: Removed host source volume mounts (./backend and ./frontend) from docker-compose.yml so production containers run compiled, immutable build artifacts.
    - **Single Command Operation**: Infrastructure runs via docker compose up -d, while the full containerized production stack runs via docker compose --profile app up -d.
  - **Infrastructure Baseline Upgrades (Postgres 17.6, Valkey 8, MinIO Community)**:
    - **PostgreSQL**: Upgraded to postgres:17.6-alpine (pinned minor version).
    - **Valkey Migration (Phase 15A.1)**: Replaced redis:alpine with valkey/valkey:8.0.2-alpine due to Redis RSALv2/SSPLv1 license concerns. 100% protocol-compatible with ioredis and BullMQ clients.
    - **MinIO Migration**: Due to upstream removal of minio/minio from Docker Hub in October 2025, switched to alpine/minio pinned by SHA256 digest. Bucket provisioning handled natively by MinioService via official AWS S3 SDK on application bootstrap.
    - **Reverse Proxy**: Caddy 2.8-alpine with automatic HTTPS redirect (301) and HSTS headers.
    - **Image Pinning Policy**: NEVER use floating tags (:latest, :alpine without version, :latest-release). Always pin to specific version or SHA256 digest.
  - **State Naming Conventions**:
    - Standardized interview cancellation loading state to isCancelling across modal and list components; eliminated redundant isCanceling prop.

- **Source Tracking Attribution Architecture & Session-Scoped Storage Hygiene**:
  - **Decision**: Strictly forbid unconstrained localStorage for marketing and referral tracking tokens (ref). Implement session-scoped storage (sessionStorage) paired with explicit internal URL parameter propagation and session-level click deduplication.
  - **Anti-Pattern (Sticky Cross-Session Attribution Poisoning)**: Unbounded localStorage persists indefinitely across browser restarts and days/weeks of unrelated visits. An applicant who initially landed via a Facebook ad days earlier and returns via a new tab to apply directly would have their application falsely attributed to the old Facebook link rather than Organic/Direct traffic.
  - **Architectural Pillars**:
    1. **Strict Session Lifetime (sessionStorage)**: Referral tokens are isolated to the active tab's session. Opening an independent new tab or restarting the browser creates a fresh session with zero residual attribution, accurately recording Direct traffic.
    2. **Job Card Link Propagation**: On general career landing pages (/careers/[orgSlug]?ref=TOKEN), job card URLs proactively attach ?ref=TOKEN to internal navigation links (/careers/[orgSlug]/[jobSlug]?ref=TOKEN). Candidates who right-click or middle-click "Open in new tab" naturally retain their campaign attribution in the target tab without relying on shared cross-tab persistent storage.
    3. **Session-Level Click Deduplication (haihire_click_recorded_${ref})**: Before issuing sourcingApi.recordPublicClick, the client checks and sets sessionStorage.getItem("haihire_click_recorded_" + ref). This ensures that internal browsing between the career landing page and job detail pages, as well as page refreshes (F5), never falsely inflate campaign click counts.
    4. **Tenant Isolation**: Backend validates link.organizationId === job.organizationId before attributing an application.

- **Database Transaction & Saga Pattern Architecture (Phase 16A)**:
  - **Decision**:
    1. All multi-table write operations MUST be wrapped in PrismaService.executeTx() (which delegates to interactive $transaction).
    2. For workflows spanning DB + MinIO (e.g., createApplication with CV upload), use Saga Pattern: Upload MinIO first → DB transaction → compensating delete on failure.
    3. Compensating delete failures push to BullMQ orphan-cleanup-queue with exponential backoff (5 retries) and DLQ fallback.
    4. PrismaService uses AsyncLocalStorage to propagate transaction context; nested executeTx reuses parent transaction.
  - **Rationale**: Guarantees atomic data integrity across distributed resources, prevents orphan DB records and orphan MinIO files, and prevents race conditions in concurrent requests.

- **Next.js React Server Components (RSC) for Public Routes (Phase 16A)**:
  - **Decision**:
    1. Public-facing routes (/careers/*) must be Server Components.
    2. generateMetadata() provides dynamic OpenGraph, Twitter, and JSON-LD JobPosting schema for SEO.
    3. Interactive UI (apply form, filter, search) must be isolated in *-client.tsx Client Components.
  - **Rationale**: Search engine bots (Google, LinkedIn, Facebook) need to read HTML content on first byte. Client-side SPA rendering breaks SEO, OpenGraph previews, and Google Search for Jobs indexing.

- **MinIO Orphan File Cleanup Cron (Phase 17)**:
  - **Decision**:
    1. Nightly cron at 0 4 * * * scans MinIO bucket for objects not referenced in DB.
    2. 30-day safety grace period before deletion (protects in-flight transactions).
    3. Dry-run mode available for manual testing before live deletion.
    4. Comprehensive runbook at docs/runbooks/orphan-cleanup.md.
  - **Rationale**: GDPR/ISO-27001 compliance, storage cost reduction, and cleanup of rare orphan files that slip through DLQ retries.

- **Verified-Ship Mindset (Post Phase 15-17)**:
  - **Decision**: Every "READY TO SHIP" self-assessment requires independent IV&V verification with raw execution evidence before deployment. Every phase's claim must be backed by raw execution evidence, not summary text.
  - **Rationale**: Across 10 IV&V rounds, 7 self-claimed "READY" were later found to have issues (Phase 3, 5, 10.1, 15A, etc.). Independent verification catches false claims (e.g., Phase 15B auditor inflated numbers by 6-15%, Phase 9 claimed "deploy ready" but had 9 bugs including P1 DTO validation bypass). Verified-ship mindset is the process discipline that prevents production incidents.