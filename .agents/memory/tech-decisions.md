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
- **Shadcn UI Installation Convention**:
  - **Official CLI**: Always initialize and add Shadcn components directly from the official Shadcn CLI (`pnpx shadcn@latest init`, `pnpx shadcn@latest add <component>`).
  - **No Manual Components**: Never manually write/create Shadcn UI primitive files; always pull them directly from the official registry.
