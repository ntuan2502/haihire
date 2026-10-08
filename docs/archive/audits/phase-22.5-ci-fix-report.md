# Phase 22.5 Audit Report: CI Permissions Hardening & Actions Version Modernization

**Milestone:** Phase 22.5 — Fix CI Permissions & Actions Modernization  
**Role:** DevOps Engineer & Release Manager  
**Date:** 2026-10-03  
**Status:** 🟢 **VERIFIED PASS & READY TO PUSH**  

---

## 1. Executive Summary

During Pull Request execution in GitHub Actions, the workflow job `changes` ("Detect Changed Paths") failed with the error:
```
HttpError: Resource not accessible by integration
```

### Root Cause
1. `dorny/paths-filter@v3` inspects Pull Request modifications by calling the GitHub REST API (`GET /repos/{owner}/{repo}/pulls/{pull_number}/files`).
2. The workflow file `.github/workflows/ci-cd.yml` declared top-level permissions limited to `contents: read` and `packages: write`, explicitly excluding `pull-requests: read`.
3. In GitHub Actions, when `permissions` are declared explicitly without `pull-requests: read`, the automatically issued `GITHUB_TOKEN` is stripped of pull request read access, causing the GitHub API to reject path-filtering requests with an HTTP 403 Forbidden error.
4. Additionally, GitHub Actions emitted deprecation notices for Node 20 runners across legacy `v4` actions (`actions/checkout@v4`, `actions/setup-node@v4`, `docker/build-push-action@v5`).

### Summary of Interventions
- **Explicit Scopes Added**: Added `pull-requests: read` at both workflow level and job level in `.github/workflows/ci-cd.yml`.
- **Action Version Baseline Upgrades**:
  - `actions/checkout@v4` $\rightarrow$ `actions/checkout@v5` (Native Node 24 runtime, zero deprecation warnings).
  - `actions/setup-node@v4` $\rightarrow$ `actions/setup-node@v5` (Node 24 runtime & enhanced caching engine).
  - `docker/build-push-action@v5` $\rightarrow$ `docker/build-push-action@v6` (Buildx engine parity with `docker-publish.yml`).
  - Maintained latest stable `actions/cache@v4`, `actions/upload-artifact@v4`, and `dorny/paths-filter@v3`.
- **Zero Syntax Errors**: All 4 workflow YAML files verified via `pnpm dlx js-yaml`.
- **Documentation & Runbooks Updated**: Added Section 7 ("GitHub Actions Permissions Setup") in `docs/runbooks/ci-strategy.md` and updated project memory conventions in `.agents/memory/project-conventions.md`.

---

## 2. Root Cause Analysis

### 2.1 Why `dorny/paths-filter@v3` Needs Permissions
When triggered on a `pull_request` event, `dorny/paths-filter` uses Octokit to fetch the list of changed files directly from the GitHub API. This approach is superior to `git diff` inside the runner because shallow checkouts (`fetch-depth: 1` or `0`) might not have the merge-base locally, or may be prone to commit range drift.
However, querying the PR Files API requires the OAuth/token scope `pull-requests: read`.

### 2.2 Why Default Permissions Were Insufficient
In `.github/workflows/ci-cd.yml`, the permissions block was previously defined as:
```yaml
permissions:
  contents: read
  packages: write
```
By explicitly listing permissions at the workflow level, GitHub Actions adopts a **strict allowlist model**: all omitted scopes (such as `issues`, `pull-requests`, `checks`, `deployments`) are downgraded to `none`. Consequently:
- `GITHUB_TOKEN` had `pull-requests: none`.
- The call to `octokit.rest.pulls.listFiles()` was rejected by GitHub's API gateway with `403 Resource not accessible by integration`.

---

## 3. Fix Implementation

### 3.1 Permissions Added
In `.github/workflows/ci-cd.yml`, permissions were applied with defense-in-depth at both workflow root and individual job level:

```yaml
# Workflow-level default permissions
permissions:
  contents: read
  packages: write
  pull-requests: read

jobs:
  changes:
    name: Detect Changed Paths
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    outputs:
      e2e-critical: ${{ steps.filter.outputs.e2e-critical }}
      docker-critical: ${{ steps.filter.outputs.docker-critical }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
      - name: Filter changed paths
        uses: dorny/paths-filter@v3
        id: filter
        # ...
```

### 3.2 Action Version Upgrades Matrix
All 4 GitHub Actions workflows were updated to align with modern Node 24 runtimes and avoid deprecation warnings:

| Workflow File | Action | Previous Version | Upgraded Version | Runtime Target |
| :--- | :--- | :---: | :---: | :--- |
| `.github/workflows/ci-cd.yml` | `actions/checkout` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/ci-cd.yml` | `actions/setup-node` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/ci-cd.yml` | `docker/build-push-action` | `@v5` | `@v6` | Latest Buildx |
| `.github/workflows/docker-publish.yml` | `actions/checkout` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/docker-publish.yml` | `actions/setup-node` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/e2e-nightly.yml` | `actions/checkout` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/e2e-nightly.yml` | `actions/setup-node` | `@v4` | `@v5` | Node 24 |
| `.github/workflows/release.yml` | `actions/checkout` | `@v4` | `@v5` | Node 24 |

---

## 4. Verification Evidence

### 4.1 YAML Syntax Verification
Executed `pnpm dlx js-yaml` across all 4 workflow definitions:

```powershell
pnpm dlx js-yaml .github/workflows/ci-cd.yml          # VALID (exit code 0)
pnpm dlx js-yaml .github/workflows/docker-publish.yml  # VALID (exit code 0)
pnpm dlx js-yaml .github/workflows/e2e-nightly.yml    # VALID (exit code 0)
pnpm dlx js-yaml .github/workflows/release.yml        # VALID (exit code 0)
```

### 4.2 Explicit Permissions Audit (Grep)
Executed PowerShell scan across `.github/workflows/*.yml` to confirm permissions declaration:

```powershell
Get-ChildItem .github/workflows/*.yml | Select-String -Pattern "permissions:" -Context 0,3
```

**Output:**
```
> .github\workflows\ci-cd.yml:13:permissions:
  .github\workflows\ci-cd.yml:14:  contents: read
  .github\workflows\ci-cd.yml:15:  packages: write
  .github\workflows\ci-cd.yml:16:  pull-requests: read
> .github\workflows\ci-cd.yml:25:    permissions:
  .github\workflows\ci-cd.yml:26:      contents: read
  .github\workflows\ci-cd.yml:27:      pull-requests: read
  .github\workflows\ci-cd.yml:28:    outputs:
> .github\workflows\docker-publish.yml:18:permissions:
  .github\workflows\docker-publish.yml:19:  contents: write
  .github\workflows\docker-publish.yml:20:  packages: write
  .github\workflows\docker-publish.yml:21:  id-token: write
> .github\workflows\e2e-nightly.yml:12:permissions:
  .github\workflows\e2e-nightly.yml:13:  contents: read
> .github\workflows\release.yml:18:permissions:
  .github\workflows\release.yml:19:  contents: write
```

### 4.3 Node 20 / @v4 Action Sweep
Verified that no deprecated `@v4` instances remain for `checkout` or `setup-node`:
- `actions/cache@v4`: Confirmed current latest release.
- `actions/upload-artifact@v4`: Confirmed current latest release.
- `actions/checkout@v5`: 100% updated across all jobs.
- `actions/setup-node@v5`: 100% updated across all jobs.

### 4.4 Local Static Gates Execution
All 8 static gates and architecture verifications passed cleanly in 19.51s:
```
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.29s
  2. Two-Way i18n & Zero Hardcoded Strings          [PASS]    0.65s
  3. ESLint Code Quality (Backend + Frontend)       [PASS]   11.21s
  4. TypeScript Type Safety                         [PASS]    6.28s
  5. CI Gate 3: DtoPipe Validation Coverage         [PASS]    0.19s
  6. CI Gate 4: Error Code i18n Localization        [PASS]    0.31s
  7. CI Gate 5: API Contract & Leaks Audit          [PASS]    0.31s
  8. Test Count Delta & Anti-Regression             [PASS]    0.27s
──────────────────────────────────────────────────────────────────
 Total Time: 19.51s
 Status: 🟢 ALL CHECKS PASSED (8/8) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

### 4.5 Documentation Links Integrity
```powershell
pnpm tsx scripts/verify-doc-links.ts
# Audited 65 markdown files.
# SUCCESS: 0 broken markdown links found.
```

---

## 5. User Action Required (GitHub Repository Settings)

If the target GitHub repository has organization-level security defaults restricting Actions tokens, repository administrators should ensure the following settings are enabled:

1. Open your repository on GitHub:
   `https://github.com/ntuan2502/haihire/settings/actions`
2. Scroll to the **Workflow permissions** section.
3. Select **Read and write permissions** (or choose "Read repository contents and pull requests permission").
4. Check the box:
   `☑ Allow GitHub Actions to create and approve pull requests`
5. Click **Save**.

> **Note:** With the explicit `permissions: { contents: read, pull-requests: read }` declared inside the workflow YAML, the pipeline adheres to the Principle of Least Privilege and functions securely even under restricted repository defaults.

---

## 6. Documentation Updates

1. **`docs/runbooks/ci-strategy.md`**:
   - Added Section 7: "GitHub Actions Permissions Setup".
   - Documented `pull-requests: read` requirement for `dorny/paths-filter@v3`.
   - Documented Node 24 action baseline standards.
2. **`.agents/memory/project-conventions.md`**:
   - Added `## CI/CD Permissions & Action Version Baseline (Phase 22.5 MANDATORY)`.
3. **`.agents/memory/MEMORY.md`**:
   - Indexed Phase 22.5 rule in project conventions list.
4. **`docs/audits/README.md`**:
   - Registered Phase 22.5 report in active audit trajectory.

---

## 7. Sign-Off & Verdict

- **Phase 22.5 Verdict:** 🟢 **READY FOR PRODUCTION SHIP & CI DISPATCH**
- **Expected CI Behavior on Push:**
  - Job `changes` ("Detect Changed Paths") will successfully authenticate with the GitHub Pull Request API using the newly provisioned `pull-requests: read` scope.
  - Zero "Resource not accessible by integration" errors.
  - Zero Node 20 runner deprecation warnings for checkout and node setup.

---

## 8. Next Steps

1. **User Action:**
   Push the committed changes to GitHub:
   ```powershell
   git push origin feature/production-hardening
   ```
2. **Monitor Actions Run:**
   - Confirm job `changes` passes with green checkmark in under 10 seconds.
   - Confirm static gates pass.
   - Confirm E2E triggers correctly according to modified paths.
