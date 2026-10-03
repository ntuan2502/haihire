# HaiHire Documentation Center

> Central knowledge base, architectural specifications, operations runbooks, API contracts, and verification audit logs for the HaiHire Enterprise ATS platform.

---

## 🧭 Documentation Map

```
docs/
├── onboarding.md                   # Step-by-step developer onboarding & quick start
├── architecture/                   # System design & topology
│   └── system-overview.md          # Monorepo topology, Mermaid diagrams, core patterns
├── api/                            # REST API contracts & specifications
│   └── overview.md                 # 9 controllers, 77 endpoints, auth, error envelope
├── runbooks/                       # Site reliability & operational runbooks
│   ├── production-deployment-plan.md # 5-phase deployment protocol & rollback
│   ├── versioning.md               # Monorepo versioning, SemVer, GHCR & immutable release policy
│   ├── backup-and-restore.md       # PostgreSQL dumps, MinIO hot backup & restore drills
│   ├── orphan-cleanup.md           # MinIO daily orphan file cleanup cron
│   ├── env-management.md           # 5-file environment architecture & sync
│   └── alerts.md                   # Prometheus alerts catalog & emergency SOPs
└── audits/                         # Historical verification logs & quality evidence
    ├── README.md                   # Registry of all 20 phases & verification milestones
    ├── SUMMARY.md                  # Cross-phase synthesis, bug taxonomy & credibility curve
    ├── archive/                    # Archived early phase audits (Phase 1 to Phase 10)
    │   └── phase-01-to-10/
    └── phase-11-* to phase-21-*    # Modern phase audit reports
```

---

## 📂 Quick Links by Role

### For New Developers
- 🚀 [**Developer Onboarding Guide**](file:///c:/Workspaces/haihire/docs/onboarding.md): Get your local environment up and running in under 5 minutes.
- 🌿 [**Contributing Guidelines**](file:///c:/Workspaces/haihire/CONTRIBUTING.md): Git branching conventions, Conventional Commits, and 7 CI quality gates.

### For Software Engineers & Architects
- 🏛️ [**System Architecture Overview**](file:///c:/Workspaces/haihire/docs/architecture/system-overview.md): High-level system diagram, distributed Saga transactions, AsyncLocalStorage context, and React Server Components.
- 🔌 [**REST API Specifications**](file:///c:/Workspaces/haihire/docs/api/overview.md): Endpoint inventory, HttpOnly JWT authentication, server-side pagination, and 51 standardized `APP_ERROR_CODES`.

### For DevOps & Site Reliability Engineers (SRE)
- 🚀 [**Production Deployment Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/production-deployment-plan.md): Safe 5-phase deployment workflow, smoke verification, and rollback procedures.
- 📦 [**Versioning & Container Publishing Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/versioning.md): SemVer rules, monorepo alignment, GHCR image publishing, and immutable tag policy.
- 💾 [**Backup & Disaster Recovery Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/backup-and-restore.md): Automated PostgreSQL dual-format dumps, MinIO volume snapshots, and automated restore verification drills.
- 🧹 [**MinIO Orphan File Cleanup Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/orphan-cleanup.md): Daily cron purging unreferenced resume files after a 30-day grace period.
- ⚙️ [**Environment Architecture Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/env-management.md): Segregated 5-file environment management, auto-sync checks, and build-time inlining rules.
- 🚨 [**Monitoring & Incident Response Runbook**](file:///c:/Workspaces/haihire/docs/runbooks/alerts.md): Prometheus alert matrix, triage steps, and emergency remediation SOPs.

### For QA, Security & Verification Engineers
- 🛡️ [**Audit Registry & Milestones**](file:///c:/Workspaces/haihire/docs/audits/README.md): Complete phase-by-phase verification index across all 20 implementation phases.
- 📊 [**Audit Cross-Phase Synthesis**](file:///c:/Workspaces/haihire/docs/audits/SUMMARY.md): Credibility score evolution (94.1% -> 99.0%), root-cause lessons learned, and bug taxonomy.

---

## 📝 Documentation Guidelines
1. **Language:** All documentation must be written strictly in **English**.
2. **Accuracy:** Keep all commands, port mappings, script names, and versions aligned with actual repository configuration.
3. **Integrity:** Never leave broken markdown links. Use absolute file URI links (`file:///...`) or relative repository links.
4. **Preservation:** Never delete verification logs; move legacy audits into `docs/audits/archive/`.
