# Versioning & Release Tagging Runbook

> SemVer synchronization, immutable Git release tags, and changelog maintenance across the HaiHire monorepo.

---

## 1. Monorepo Version Targets

HaiHire synchronizes a single SemVer version across all four workspace manifests (current baseline: `0.1.0`):

| Package                                  | Manifest Path                                                      |
| :--------------------------------------- | :----------------------------------------------------------------- |
| **Root Monorepo (`haihire`)**            | [package.json](../../package.json)                                 |
| **Backend (`api`)**                      | [apps/api/package.json](../../apps/api/package.json)               |
| **Frontend (`web`)**                     | [apps/web/package.json](../../apps/web/package.json)               |
| **Shared Contracts (`@haihire/shared`)** | [packages/shared/package.json](../../packages/shared/package.json) |

---

## 2. Automated Version Tooling

### Synchronizing Existing Versions (`pnpm version:sync`)

Implemented by [scripts/sync-version.ts](../../scripts/sync-version.ts). Aligns all four manifests to the version in root `package.json` or an explicit argument:

```bash
# Dry-run alignment check
pnpm version:sync -- --dry-run

# Apply root version to all packages
pnpm version:sync
```

### Bumping & Tagging a Release (`pnpm version:bump`)

Implemented by [scripts/bump-version.ts](../../scripts/bump-version.ts). Accepts `major`, `minor`, `patch` (default), or an explicit `x.y.z` SemVer string, updates all four `package.json` files, and optionally creates an annotated Git tag `v{newVersion}`:

```bash
# Preview a minor bump + tag creation without editing files
pnpm version:bump minor -- --dry-run --tag

# Execute a patch bump cleanly across all manifests
pnpm version:bump patch

# Bump to explicit version and create immutable local annotated Git tag v0.2.0
pnpm version:bump 0.2.0 -- --tag
```

> [!IMPORTANT]
> Release tags (`v{semver}`) are **strictly immutable**. [scripts/bump-version.ts](../../scripts/bump-version.ts) aborts with `[IMMUTABILITY VIOLATION]` if the target tag already exists and never runs `git tag -f` or force-pushes tags.

---

## 3. Release Workflow

1. Update [CHANGELOG.md](../../CHANGELOG.md) under the target release version section (move items out of `[Unreleased]`).
2. Bump versions locally:

```bash
pnpm version:bump <patch|minor|major|x.y.z>
```

3. Run the full verification suite:

```bash
pnpm check:all
```

4. Commit release metadata and changelog, create the annotated tag, and push commit + tag to trigger [cd-release.yml](../../.github/workflows/cd-release.yml):

```bash
git commit -am "chore(release): v<x.y.z>"
git tag -a "v<x.y.z>" -m "Release v<x.y.z>"
git push origin main --follow-tags
```

5. After CD finishes publishing GHCR images (`haihire-api` and `haihire-web`), follow [Production Deployment Plan](production-deployment-plan.md).

---

## 4. Related Documentation

- [CHANGELOG.md](../../CHANGELOG.md)
- [CI/CD Runbook](ci-cd.md)
- [Production Deployment Plan](production-deployment-plan.md)
- [Branch Protection Runbook](branch-protection.md)
