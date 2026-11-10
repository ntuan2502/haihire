# Prisma Version Policy (GA Stable)

This runbook documents the exact version pinning policy and upgrade procedure for Prisma ORM across the HaiHire platform.

---

## 1. Rationale: Exact Version Pinning Policy

All Prisma ORM packages in [`apps/api/package.json`](../../apps/api/package.json) are pinned to **Prisma 7 GA Stable** (`7.10.1`) without caret (`^`) or tilde (`~`):

```json
{
  "dependencies": {
    "@prisma/adapter-pg": "7.10.1",
    "@prisma/client": "7.10.1"
  },
  "devDependencies": {
    "prisma": "7.10.1"
  }
}
```

### Why Strict GA Pinning is Enforced:

1. **Supply-Chain Security & Zero Pre-Release CVEs:** Per decision [D-015](../decisions/DECISIONS.md#d-015-downgrade-from-prisma-8-rc-to-prisma-7101-stable), the platform deprecated Prisma 8 RC to eliminate 11 transitive High CVEs and experimental engine overrides. Prisma 7.10.1 GA provides stable, enterprise-ready database access.
2. **Deterministic CI/CD Builds:** Exact version pinning ensures `pnpm install --frozen-lockfile` produces bit-for-bit identical dependency trees across local environments, GitHub Actions CI, and production container builds.
3. **Database Schema & Adapter Compatibility:** The PostgreSQL driver adapter (`@prisma/adapter-pg`) must strictly match the `@prisma/client` and `prisma` CLI versions to avoid runtime interface mismatches.

---

## 2. Prisma Upgrade Procedure

Whenever upgrading Prisma to a newer stable GA version, follow this strict 6-step workflow:

### Step 1: Upstream Release Review

- Review upstream changelog and GitHub release notes for breaking changes, schema syntax adjustments, and driver adapter requirements.

### Step 2: Exact Version Update

- Update the version string in `apps/api/package.json` to the exact target version (no `^` or `~`):
  - `@prisma/adapter-pg`
  - `@prisma/client`
  - `prisma`

### Step 3: Lockfile Synchronization & Client Generation

```bash
# Update pnpm lockfile
pnpm install

# Verify schema and generate Prisma client
pnpm db:status
pnpm db:generate
```

### Step 4: Verification of Frozen Lockfile

```bash
# Verify frozen lockfile passes without drift
pnpm install --frozen-lockfile
```

### Step 5: Full Quality Gate & Test Suite Execution

```bash
# Run fast CI architecture gates
pnpm check:all:fast

# Run full API test suite
pnpm test:api
```

### Step 6: PR & Conventional Commit

- Commit with Conventional Commit standard:
  ```bash
  git commit -m "chore(deps): bump prisma to <exact-version>"
  ```
- Submit a dedicated PR for the dependency bump; do not bundle feature or refactoring code with Prisma upgrades.
