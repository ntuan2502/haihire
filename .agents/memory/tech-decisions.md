---
type: project
created: 2026-07-18
updated: 2026-08-27
---

# Technical Decisions

- Component metadata uses SemVer while the toolkit release keeps CalVer.
- `manifest.json` and `manifest.lock.json` must remain synchronized with component frontmatter.
- **Prisma 8 Architecture & Conventions**:
  - **Scaffolding**: Always scaffold using `pnpx create-prisma@latest create <dir> --template <template> --provider postgres --package-manager pnpm`.
  - **Schema/Contract**: Schema lives in `src/prisma/contract.prisma` with `// use prisma-next` header. Do NOT use obsolete `datasource` blocks inside schema or `@updatedAt` (use `temporal.updatedAt()` instead).
  - **Contract Compilation**: Always run `pnpm run contract:emit` after modifying `contract.prisma` to generate `contract.json` and `contract.d.ts`.
  - **Configuration**: Connection URL and ORM config live in `prisma.config.ts` via `definePrismaConfig` and `@prisma/orm-postgres/config`.
  - **Database Lifecycle**: Use `prisma db init`, `prisma db update`, `prisma db migrate` instead of legacy `prisma migrate dev`.
  - **Client Access**: Access models via namespace `db.orm.public.<Model>`.
  - **Standalone Scripts & ESM DB Connection (CRITICAL)**: Because of Node.js ESM import hoisting, `db.ts` must never be statically imported if `dotenv.config()` is called in the same file. Always load environment variables first, then dynamically import `db`:
    ```ts
    import dotenv from "dotenv";
    dotenv.config({ path: "path/to/.env" });
    const { db, connectDatabase } = await import("./prisma/db");
    await connectDatabase();
    ```
  - **Postgres DDL Execution (No Extra Packages Needed)**:
    When running new DDL migrations against the local database, execute via the running Docker container `ats-postgres` with `psql`:
    `Get-Content backend/src/prisma/<script>.sql | docker exec -i ats-postgres psql -U ats_user -d ats_db`
    Note: Table names in Postgres are lowercase/camelCase (`organization`, `candidate`, `application`, etc.), so foreign key references must match the exact case.
- **Shadcn UI Installation Convention**:
  - **Official CLI**: Always initialize and add Shadcn components directly from the official Shadcn CLI (`pnpx shadcn@latest init`, `pnpx shadcn@latest add <component>`).
  - **No Manual Components**: Never manually write/create Shadcn UI primitive files; always pull them directly from the official registry.
- **Component Architecture & Shadcn Isolation (5-Layer Modular Structure)**:
  - **1. UI Primitives (`frontend/src/components/ui/`)**: Exclusively reserved for pristine components generated via `pnpx shadcn add <component>`. Never place proprietary or custom domain components here.
  - **2. Shared Design System (`frontend/src/components/shared/`)**: Proprietary reusable controls, custom selects, spinners, badges, and guards (`custom-select.tsx`, `loading-spinner.tsx`, `job-status-badge.tsx`, `stage-badge.tsx`, `language-dropdown.tsx`, `theme-toggle.tsx`, `auth-guard.tsx`).
  - **3. Layout Components (`frontend/src/components/layout/`)**: Application shell and global navigation structures (`navbar.tsx`, headers, sidebars, footers).
  - **4. Context Providers (`frontend/src/components/providers/`)**: App-wide providers wrapping client state and caches (`query-provider.tsx`, `theme-provider.tsx`).
  - **5. Feature Modules (`frontend/src/components/[feature]/`)**: Domain-specific components organized by domain (`jobs/`, `candidates/`, `applications/`, `interviews/`, `careers/`).
  - **Rule**: Never leave loose component files at the root of `frontend/src/components/`.
- **React Named Import Convention**:
  - Always use named imports from `"react"` (e.g. `import { useState, useEffect, type ReactNode } from "react"`).
  - Never use default `import React from "react"`, wildcard `import * as React from "react"`, or namespace prefixing `React.x` in application code.
  - **Exception**: Files in `frontend/src/components/ui/` (pristine Shadcn CLI primitives) must NEVER be modified to preserve CLI overwrite compatibility.


