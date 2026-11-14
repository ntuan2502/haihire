# HaiHire Platform Roadmap

Post-restructure roadmap tracking operational excellence, release automation, and product scalability milestones built on the verified `v0.1.0` baseline.

---

## 1. Completed Baseline (`v0.1.0` + Hardening)

- Multi-tenant NestJS 12 ESM backend (`15` AppModule modules, `12` controllers, `107` endpoints) and Next.js 16 App Router UI (`src/proxy.ts`, Shadcn `base-nova`, Tailwind CSS v4 `oklch`).
- Prisma `7.10.1` Stable GA + `@prisma/adapter-pg` across `22` models and `18` enums with `AsyncLocalStorage` transactions.
- Closed cross-tenant IDOR vectors (`interviews`, `sourcing`), hardened per-method AST/regex tenant gate auditing (`267` queries), fixed document storage compensation, and tightened demo seed ordering.
- Aligned `.agents/skills/` (6 focused HaiHire skills) and rebuilt documentation from verified source code.

---

## 2. Near-Term Engineering Focus

| Area                              | Planned Deliverable                                                                                                                    | Operational Goal                                                                                      |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Database Schema Lifecycle**     | Adopt clean sequential SQL/Prisma migration workflow replacing ad-hoc schema push for production promotions                            | Zero-downtime schema rollouts in staging/prod                                                         |
| **Orphan Cleanup Scheduling**     | Provision dedicated containerized cron/worker runner invoking [scripts/cleanup-orphan-minio.ts](../../scripts/cleanup-orphan-minio.ts) | Automated daily MinIO grace-period sweeps + Pushgateway heartbeat (`HaiHireOrphanCleanupCronMissing`) |
| **UI Visual Rhythm & FHD Polish** | Unify spacing, table alignment, and laptop 125% scaling height ergonomics across `apps/web` dashboard routes                           | Consistent visual hierarchy from `375px` mobile to `1920x1080` desktop                                |
| **Container Release Automation**  | Tagged `vX.Y.Z` builds via `.github/workflows/cd-release.yml` with Trivy SARIF archiving and live smoke drills                         | Repeatable zero-regression production releases                                                        |

---

## 3. Backlog Candidates (Scoped Behind Product Priority)

- **Candidate Portal Self-Service & Status Links:** Tokenized read-only application timeline status lookup.
- **Calendar & Video Conferencing Sync:** Optional OAuth webhook adapters generating interview meeting links cleanly on `Interview` creation.
- **CSV / Structured Analytics Exports:** Streaming tenant-scoped export jobs routed through BullMQ with signed expiring download tokens.
