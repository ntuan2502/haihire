---
type: project
created: 2026-07-18
updated: 2026-09-18
---

# Technical Decisions

- Component metadata uses SemVer while the toolkit release keeps CalVer.
- `manifest.json` and `manifest.lock.json` must remain synchronized with component frontmatter.

- **Centralized Schema-Driven Environment Architecture (Zod-based)**:
  - **Decision**: Reject scattered ad-hoc `process.env` checks and silent fallbacks. Consolidate all configuration parsing into dedicated Zod schemas: `backend/src/config/env.ts` and `frontend/src/lib/env.ts`.
  - **Auto-casting**: Coerce strings to types (`PORT` to `number`, `MINIO_USE_SSL` to `boolean`).
  - **Fail-Fast**: Terminate immediately at bootstrap with field-level error messages if required variables are missing or secrets are too short (`JWT_SECRET >= 16`, `ENCRYPTION_SECRET >= 32`).
  - **Test Suite Safety**: Vitest config imports `./src/config/env.ts` to ensure tests execute against verified environment constraints without mock fallbacks.
  - **Sync Validation**: Keep `.env` and `.env.example` strictly synchronized via `pnpm run check:env` (`scripts/check-env.ts`).

- **Full-Stack Server-Side Pagination**:
  - **Decision**: Eliminate client-side array slicing (`data.slice(...)`) and backward-compatibility hacks (returning all rows when pagination params are absent).
  - **Shared Contract**: Standardize on `PaginationParams` (`page`, `limit`, `search`) and `PaginatedResult<T>` exported from `@ats/types`.
  - **UI Integration**: Frontend pagination controls (rows per page, current page, search query) bind directly to query parameters and receive metadata `{ data, total, page, limit, totalPages }` directly from the backend.

- **Modern Package Ecosystem & Syntax Standards (2026 Baseline)**:
  - **Frontend**: Next.js 16.3.5 (Turbopack), React / React DOM 19.3.0, TanStack Query v5.103+, Base UI v1.8+, Shadcn CLI v4.21+.
  - **Backend**: Vitest 5.0.1, BullMQ 6.3.8+, Dotenv 18.0+, Node 26+ types, ESLint 10.11+.
  - **Token & Process Efficiency**: Keep code concise and direct; verify root cause before editing; avoid redundant rebuilds or repetitive status loops.

- **Prisma 8 & Composer Architecture Conventions**:
  - **Scaffolding**: Always scaffold using `pnpx create-prisma@latest create <dir> --template <template> --provider postgres --package-manager pnpm`.
  - **Schema/Contract**: Schema lives in `src/prisma/contract.prisma` with `// use prisma-next` header. Do NOT use obsolete `datasource` blocks inside schema or `@updatedAt` (use `temporal.updatedAt()` instead).
  - **Cascade Integrity**: Always specify `onDelete: Cascade` on dependent child relations (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) to guarantee atomic cascade deletion at the database level.
  - **Contract Compilation**: Always run `pnpm run contract:emit` after modifying `contract.prisma` or upgrading Prisma to synchronize `contract.json`, `contract.d.ts`, and runtime codecs.
  - **Composer Imports (CRITICAL - 0.20.0+ Modern Syntax)**:
    - Never import from deprecated `@prisma/composer-prisma-cloud/prisma-next`.
    - Always import ORM bindings from `"@prisma/composer-prisma-cloud/orm"`.
    - Use `postgres(...)` (never obsolete `pnPostgres`) and `dataContract(...)` (never obsolete `pnContract`).
  - **Configuration**: Connection URL and ORM config live in `prisma.config.ts` using validated `env.DATABASE_URL`.
  - **Database Lifecycle**: Use `prisma db init`, `prisma db update`, `prisma db migrate` instead of legacy `prisma migrate dev`.
  - **Client Access**: Access models via namespace `db.orm.public.<Model>`.

- **Shadcn UI Installation Convention**:
  - **Official CLI**: Always initialize and add Shadcn components directly from the official Shadcn CLI (`pnpm dlx shadcn@latest init`, `pnpm --filter ./frontend exec shadcn add <component>`).
  - **No Manual Components**: Never manually write/create Shadcn UI primitive files; always pull them directly from the official registry.
  - **The `cn` Package Standard (CRITICAL)**:
    - The repository strictly uses the official `@shadcn-ui/cn` package (`"cn": "^0.3.0"` in `frontend/package.json`).
    - Components must import `cn` directly: `import { cn } from "cn";`.
    - Do NOT install or re-add `clsx` or `tailwind-merge` as dependencies.

- **Component Architecture & Shadcn Isolation (5-Layer Modular Structure)**:
  - **1. UI Primitives (`frontend/src/components/ui/`)**: Exclusively reserved for pristine components generated via `pnpx shadcn add <component>`.
  - **2. Shared Design System (`frontend/src/components/shared/`)**: Proprietary reusable controls, custom selects, spinners, badges, and guards.
  - **3. Layout Components (`frontend/src/components/layout/`)**: Application shell and global navigation structures.
  - **4. Context Providers (`frontend/src/components/providers/`)**: App-wide providers wrapping client state and caches.
  - **5. Feature Modules (`frontend/src/components/[feature]/`)**: Domain-specific components organized by domain.
  - **Rule**: Never leave loose component files at the root of `frontend/src/components/`.

- **React Named Import Convention**:
  - Always use named imports from `"react"` (e.g. `import { useState, useEffect, type ReactNode } from "react"`).
  - Never use default `import React from "react"`, wildcard `import * as React from "react"`, or namespace prefixing `React.x` in application code.

- **Client-Side Network Gatekeeper Interceptors (Fail-Fast URL Inspection)**:
  - **Decision**: Reject malformed URLs containing stringified objects (`[object Object]`, `[object%20Object]`) or `undefined`/`null` tokens directly inside Axios request interceptors.
  - **Rationale**: Prevents accidental string interpolation bugs from causing malformed HTTP requests that pollute server logs, trigger 404/500 errors, or corrupt backend data.

- **Database Driver Priority Protocol (Local DATABASE_URL First)**:
  - **Decision**: In `backend/src/prisma/db.ts`, always evaluate and prioritize the local PostgreSQL connection via `env.DATABASE_URL` before falling back to cloud composer instances.
  - **Rationale**: Eliminates `DRIVER.NOT_CONNECTED` or `CONTRACT.MARKER_READ_FAILED` failures when running local Docker environments without cloud credentials.

- **Comprehensive Automated Testing Baseline (Full-Stack Continuous Verification)**:
  - **Decision**: Enforce a mandatory suite of 200+ automated tests across backend services and frontend components.
  - **Coverage**: Covers auth flows, job wizard, pipeline kanban, interview scheduling, scorecard evaluation, member invitations, and tenant isolation.
  - **Verification**: Run `pnpm test` across the monorepo to guarantee 0 regressions before committing major refactors.

- **Object Storage Architecture & Secure Asset Isolation**:
  - **Decision**: Structure MinIO / S3 object keys under strictly namespaced tenant paths (`tenants/{orgId}/candidates/{candId}/...`) and enforce server-side magic byte inspection for file uploads.
  - **Rationale**: Prevents file collisions across tenants, stops malicious payload uploads disguised with benign file extensions, and safeguards candidate PII via expiring presigned URLs.

- **TanStack Query Key Architecture (Centralized Factory)**:
  - **Decision**: Standardize all query keys into a canonical `QUERY_KEYS` factory and enforce explicit cache invalidation in all mutation hooks.
  - **Rationale**: Eliminates race conditions and stale UI views across multiple connected recruitment dashboards (Kanban, Tables, Drawers).

- **Recruitment Pipeline State Machine**:
  - **Decision**: Formalize application progression rules (`APPLIED` → `SCREENING` → `INTERVIEW` → `OFFER` → `HIRED` / `REJECTED`) with pre-condition and vacancy checks.
  - **Rationale**: Guarantees hiring funnel integrity, prevents accidental status overwrites, and automates interview stage progression.

- **Audit Trail & Activity Logging Architecture**:
  - **Decision**: Log every state mutation on core domain entities to `ActivityLog` via `ActivitiesService` while scrubbing PII.
  - **Rationale**: Complies with enterprise HR audit requirements, delivers transparent activity feeds in candidate profiles, and prevents silent data tampering.

- **Unified Error Envelope & Client Extraction**:
  - **Decision**: Require all backend exceptions to inherit from `AppException` returning standardized JSON envelopes, parsed on frontend exclusively via `getApiErrorMessage`.
  - **Rationale**: Prevents unhandled client exceptions, eliminates generic "Error occurred" toasts, and delivers precise, localized feedback to users.


