# HaiHire Versioning, Release & Container Registry Strategy

This runbook defines the canonical versioning standards, release management protocols, container publishing workflows, and rollback procedures for the HaiHire Enterprise ATS platform.

---

## 1. Semantic Versioning Rules (SemVer 2.0.0)

HaiHire strictly enforces [Semantic Versioning 2.0.0](https://semver.org/) across all monorepo packages in the format:

$$\text{MAJOR}.\text{MINOR}.\text{PATCH}$$

| Level | Semantic Meaning | Criteria & Trigger Events | Example Scenarios |
| :--- | :--- | :--- | :--- |
| **MAJOR** | Breaking Changes | Incompatible API contract changes, breaking database schema shifts without backward-compatibility, removal of endpoints or deprecated feature removal. | Modifying candidate status enum values, dropping active database columns, changing authentication token format. |
| **MINOR** | Feature Additions | New backward-compatible functionality, new API endpoints, additive non-breaking database columns or tables. | Adding AI resume scoring endpoint, adding recruiter Kanban filter, adding a new notification template. |
| **PATCH** | Fixes & Maintenance | Backward-compatible bug fixes, security remediations, performance enhancements, dependency updates. | Fixing rate limit bypass bug, updating Valkey cache TTL, patching dependency CVEs. |

---

## 2. Monorepo Version Alignment & Lockstep Strategy

To eliminate cross-package drift and ensure deterministic production builds, all packages in the HaiHire monorepo share a unified version in lockstep:

1. **Root Manifest:** [`package.json`](file:///c:/Workspaces/haihire/package.json)
2. **Backend Service:** [`backend/package.json`](file:///c:/Workspaces/haihire/backend/package.json)
3. **Frontend Application:** [`frontend/package.json`](file:///c:/Workspaces/haihire/frontend/package.json)
4. **Shared Library:** [`packages/shared/package.json`](file:///c:/Workspaces/haihire/packages/shared/package.json)

### Automated Version Synchronization Scripts

The repository includes dedicated TypeScript automation to synchronize and bump versions:

```bash
# Preview version synchronization without writing files
pnpm version:sync --dry-run

# Synchronize all packages to match root package.json version
pnpm version:sync

# Synchronize all packages to an explicit target version
pnpm version:sync 1.0.1

# Preview a SemVer bump
pnpm version:bump patch --dry-run
pnpm version:bump minor --dry-run
pnpm version:bump major --dry-run

# Execute SemVer bump across all manifests
pnpm version:bump patch

# Execute bump and automatically create matching Git tag (e.g., v1.0.1)
pnpm version:bump patch --tag
```

---

## 3. Container Registry Publishing Architecture (GHCR)

All container images are built and pushed to **GitHub Container Registry (GHCR)** via automated GitHub Actions workflows. Production hosts **never build containers locally**; they pull pre-compiled, cryptographically immutable images.

### Image Naming Conventions

* **Backend Service:**
  `ghcr.io/${GITHUB_REPOSITORY}/haihire-backend:${IMAGE_TAG}`
* **Frontend Web Application:**
  `ghcr.io/${GITHUB_REPOSITORY}/haihire-frontend:${IMAGE_TAG}`

Where `${GITHUB_REPOSITORY}` is the lowercase GitHub repository identifier (e.g., `ntuan2502/haihire`).

### OCI Metadata Labels

Every container image is tagged with Open Container Initiative (OCI) image specifications:
- `org.opencontainers.image.title`
- `org.opencontainers.image.description`
- `org.opencontainers.image.version`
- `org.opencontainers.image.revision` (Git Commit SHA)
- `org.opencontainers.image.created` (ISO 8601 Timestamp)
- `org.opencontainers.image.source` (GitHub Repository URL)

---

## 4. Immutable Tag Policy

> [!CAUTION]
> **NEVER USE `latest` IN PRODUCTION DEPLOYMENTS OR RUNBOOKS.**
>
> The `:latest` tag is mutable, non-deterministic, and breaks deployment reproducibility. If a broken image is pushed with `:latest`, any node pulling that tag will execute unstable code without traceability.

### Allowed Tag Formats in Production

1. **Semantic Release Tags:** `v1.0.0`, `v1.0.1`, `v1.1.0` (Recommended for production releases)
2. **Immutable Commit SHA Tags:** `sha-a1b2c3d` or `a1b2c3d4e5f...` (Recommended for staging and continuous deployment)

---

## 5. Release Workflow: Step-by-Step

Follow these steps to produce a verified production release:

### Step 1: Pre-Release Quality Verification
Ensure the complete quality gate suite passes:
```bash
pnpm check:all
```

### Step 2: Version Bump & Synchronization
Bump the version using the automated CLI tool:
```bash
# Example for patch release:
pnpm version:bump patch
```

### Step 3: Document Changes in CHANGELOG.md
Update [`CHANGELOG.md`](file:///c:/Workspaces/haihire/CHANGELOG.md) moving items from `[Unreleased]` into the new release header:
```markdown
## [1.0.1] - 2026-10-03
### Added
- ...
### Fixed
- ...
```

### Step 4: Commit and Create Git Tag
```bash
git add package.json backend/package.json frontend/package.json packages/shared/package.json CHANGELOG.md
git commit -m "chore(release): bump version to v1.0.1"

# Create annotated Git tag
git tag -a v1.0.1 -m "Release v1.0.1"

# Push commit and tag to GitHub
git push origin main
git push origin v1.0.1
```

### Step 5: Automated Workflow Execution
Pushing tag `v*.*.*` automatically triggers:
1. [`.github/workflows/docker-publish.yml`](file:///c:/Workspaces/haihire/.github/workflows/docker-publish.yml):
   - Runs full test suite
   - Builds multi-stage optimized Docker images with Buildx and GitHub Actions cache
   - Publishes backend & frontend images to GHCR tagged with `v1.0.1` and `sha-...`
   - Generates official GitHub Release with release notes and deployment commands
2. [`.github/workflows/release.yml`](file:///c:/Workspaces/haihire/.github/workflows/release.yml):
   - Updates release notes and sends optional release notification webhook

---

## 6. Audit Trail: Recording Image Digests

For SOC 2, ISO 27001, and production audit compliance, every production deployment must record the cryptographic SHA-256 digest of deployed images:

```bash
# Inspect and record backend image digest:
docker inspect --format='{{index .RepoDigests 0}}' \
  ghcr.io/${GITHUB_REPOSITORY}/haihire-backend:${IMAGE_TAG}

# Inspect and record frontend image digest:
docker inspect --format='{{index .RepoDigests 0}}' \
  ghcr.io/${GITHUB_REPOSITORY}/haihire-frontend:${IMAGE_TAG}
```

Example digest record in deployment log:
```
Deploy Timestamp: 2026-10-03T15:45:00Z
Target Version: v1.0.0
Backend Digest: ghcr.io/ntuan2502/haihire/haihire-backend@sha256:d894f280e21a42f6efba8bbcd54784a0c8b0932a76fa8e932ff187515fb2a3db
Frontend Digest: ghcr.io/ntuan2502/haihire/haihire-frontend@sha256:56ea3bf70e7e3725b8490a0715cf4b643a6d91f163b0632b509efab61f8939b4
```

---

## 7. Zero-Build Production Deployment & Rollback

### Production Deployment (Zero Local Build)

On the production server:
```bash
# 1. Update environment with desired version
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=v1.0.1/' .env.production

# 2. Pull pre-built images from GHCR
docker compose --env-file .env.production -f docker-compose.prod.yml pull

# 3. Graceful rolling restart
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend orphan-cleanup

# 4. Health verification
curl -f http://localhost:3001/health
```

### Emergency Rollback to N-1 Tag

If issues arise, immediately revert to the previous verified immutable version:
```bash
# 1. Revert IMAGE_TAG to previous version (e.g. v1.0.0)
export PREVIOUS_TAG="v1.0.0"

# 2. Pull previous verified images
IMAGE_TAG=${PREVIOUS_TAG} docker compose --env-file .env.production -f docker-compose.prod.yml pull

# 3. Restart services
IMAGE_TAG=${PREVIOUS_TAG} docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend

# 4. Verify restored service
curl -i http://localhost:3001/health
```
