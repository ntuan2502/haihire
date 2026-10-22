# Prisma 8 RC Version Policy

This runbook documents the exact version pinning policy and upgrade procedure for Prisma 8 Release Candidates (RC) across the HaiHire platform.

---

## 1. Rationale: Exact Version Pinning Policy

All Prisma 8 packages in [`backend/package.json`](../../backend/package.json) must be pinned to **EXACT** version strings without caret (`^`) or tilde (`~`):

```json
{
  "dependencies": {
    "@prisma/composer": "0.29.1",
    "@prisma/composer-prisma-cloud": "0.29.1",
    "@prisma/orm-postgres": "8.0.0-rc.13"
  },
  "devDependencies": {
    "prisma": "8.0.0-rc.19"
  }
}
```

### Why Caret/Tilde are Strictly Prohibited for RC Releases:
1. **Breaking Changes Between RCs:** Release candidate (RC) versions frequently introduce breaking API adjustments, query builder internal rewrites, or emitter contract shifts between successive RC increments (e.g., from `rc.13` to `rc.19`).
2. **Contract Emitter Discrepancies:** Prisma 8 Contract-First architecture uses `prisma contract emit` which generates `src/prisma/contract.d.ts` and `src/prisma/contract.json`. Silent version bumps can invalidate generated query proxies.
3. **Deterministic CI/CD Builds:** Exact pinning ensures that `pnpm install --frozen-lockfile` produces bit-for-bit identical dependency trees across local environments, GitHub Actions CI, and production container builds.

---

## 2. Prisma RC Upgrade Procedure

Whenever a new Prisma 8 RC or stable release is evaluated, follow this strict 6-step upgrade workflow:

### Step 1: Upstream Release Review
- Review upstream changelog and GitHub release notes for breaking changes, schema syntax adjustments, and database driver requirements.

### Step 2: Exact Version Update
- Update the version string in `backend/package.json` to the exact target version (no `^` or `~`).
- Keep `@prisma/orm-postgres` and `prisma` CLI versions compatible.

### Step 3: Lockfile Synchronization & Contract Emission
```bash
# Update pnpm lockfile
pnpm install

# Verify schema and emit contract types
pnpm db:status
pnpm contract:emit
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

# Run full backend test suite
pnpm test:backend
```

### Step 6: PR & Conventional Commit
- Commit with Conventional Commit standard:
  ```bash
  git commit -m "chore(deps): bump prisma to <exact-version>"
  ```
- Submit a dedicated PR for the dependency bump; do not bundle feature or refactoring code with Prisma RC upgrades.
