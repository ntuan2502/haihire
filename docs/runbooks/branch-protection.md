# Branch Protection & Repository Administration

> **Canonical operational runbook for GitHub branch protection rules, required CI/CD status checks, deployment environments, and repository security settings.**  
> **Platform Version:** v0.1.2+  
> **Last Updated:** 2026-10-16

---

## 1. Overview

HaiHire uses a 3-tier branch architecture (`dev` $\rightarrow$ `staging` $\rightarrow$ `main`) protected by branch protection rules on GitHub. This document serves as the authoritative Single Source of Truth (SSOT) for configuring, updating, and troubleshooting branch rulesets and repository governance settings.

---

## 2. Branch Protection Rules

All rules are configured via **GitHub Repository Settings** $\rightarrow$ **Branches** (`https://github.com/ntuan2502/haihire/settings/branches`).

### 2.1 `main` Branch (Production Release Gatekeeper)

The `main` branch holds immutable production releases. It enforces the strictest governance:

- **Require a pull request before merging:** Enabled
  - **Required approvals:** `2`
  - **Dismiss stale pull request approvals when new commits are pushed:** Enabled
  - **Require review from Code Owners:** Enabled (`.github/CODEOWNERS`)
- **Require status checks to pass before merging:** Enabled
  - **Require branches to be up to date before merging:** Enabled
  - **Required status checks:**
    1. `Full CI Quality Pipeline` (from `ci-main.yml`)
    2. `Playwright End-to-End Suite` (from `ci-main.yml`)
    3. `Dependency Security Audit` (from `ci-main.yml`)
    4. `Docker Build Dry-Run Verification` (from `ci-main.yml`)
- **Require conversation resolution before merging:** Enabled
- **Require signed commits:** Recommended
- **Require linear history:** Enabled
- **Do not allow bypassing the above settings:** Enabled (Enforce for administrators)
- **Allow force pushes:** Disabled (Strictly prohibited)
- **Allow deletions:** Disabled (Strictly prohibited)

### 2.2 `staging` Branch (Pre-Production Verification Gate)

The `staging` branch validates end-to-end integration with live test containers before production promotion:

- **Require a pull request before merging:** Enabled
  - **Required approvals:** `1`
  - **Dismiss stale pull request approvals when new commits are pushed:** Enabled
- **Require status checks to pass before merging:** Enabled
  - **Require branches to be up to date before merging:** Enabled
  - **Required status checks:**
    1. `11 CI Architecture Gates` (from `ci-staging.yml`)
    2. `Unit & Integration Tests (Coverage)` (from `ci-staging.yml`)
    3. `Playwright End-to-End Suite` (from `ci-staging.yml`)
    4. `Production Build Verification` (from `ci-staging.yml`)
- **Require linear history:** Enabled
- **Do not allow bypassing the above settings:** Enabled
- **Allow force pushes:** Disabled
- **Allow deletions:** Disabled

### 2.3 `dev` Branch (Active Integration Branch)

The `dev` branch receives feature PRs and serves as the integration trunk:

- **Require a pull request before merging:** Enabled
  - **Required approvals:** `0` (Solo developer mode — merges are gated strictly by CI status checks)
- **Require status checks to pass before merging:** Enabled
  - **Require branches to be up to date before merging:** Enabled
  - **Required status checks (from `ci-feature.yml`):**
    1. `Fast Static & Quality Checks`
    2. `Fast Unit & Integration Tests`
- **Require linear history:** Optional / Recommended
- **Do not allow bypassing the above settings:** Enabled
- **Allow force pushes:** Disabled
- **Allow deletions:** Disabled

---

## 3. GitHub Environment: `production`

Configured under **Settings** $\rightarrow$ **Environments** (`https://github.com/ntuan2502/haihire/settings/environments`):

- **Environment Name:** `production`
- **Environment protection rules:**
  - **Required reviewers:** Add repository owner (`@ntuan2502`) and designated senior reviewers.
  - **Prevent self-review:** Disabled in solo developer mode; enabled in multi-maintainer mode.
  - **Wait timer:** `0` minutes (or `5` minutes for safety grace window).
- **Deployment branches and tags:**
  - Selected branches and tags:
    - `main` (exact branch)
    - `v*.*.*` (release tag pattern)

---

## 4. Repository Governance & Security Settings

Configured under **Settings** $\rightarrow$ **General** and **Code security and analysis**:

- **Pull Requests:**
  - **Allow merge commits:** Enabled
  - **Allow squash merging:** Enabled
  - **Allow rebase merging:** Enabled
  - **Automatically delete head branches:** Enabled (cleans up merged feature branches)
- **Code Security & Analysis:**
  - **Dependency graph:** Enabled
  - **Dependabot alerts:** Enabled
  - **Dependabot security updates:** Enabled
  - **Secret scanning:** Enabled
  - **Push protection:** Enabled (blocks commits containing exposed API tokens or private keys)

---

## 5. Updating Branch Protection Rules (Task #32 Migration Guide)

When workflow triggers change (e.g., Task #32 removing `pull_request` triggers from `ci-dev.yml` to prevent duplicate runs), branch protection checks must be updated synchronously:

### Procedure

1. Navigate to: `https://github.com/ntuan2502/haihire/settings/branches`.
2. Edit the rule for `dev`.
3. Under **Require status checks to pass before merging**:
   - **Remove legacy check contexts:**
     - `11 CI Architecture Gates`
     - `Full Unit Tests & Anti-Regression`
   - **Add new required check contexts (from `ci-feature.yml`):**
     - `Fast Static & Quality Checks`
     - `Fast Unit & Integration Tests`
4. Click **Save changes**.
5. Verify on open PRs: GitHub UI should display the new checks green and allow merging.

---

## 6. Common Issues & Manual Remediation SOP

### Fix #1: Solo Developer PR Review Block on `dev`

- **Symptom:** Pull request cannot be merged because `1 approval required` and GitHub does not permit author self-approval.
- **Root Cause:** Branch protection requires 1 approval with no external collaborator available.
- **Remediation:**
  1. Go to `Settings` $\rightarrow$ `Branches` $\rightarrow$ Edit `dev`.
  2. Uncheck **Require approvals** (or set count to `0`).
  3. Ensure **Require status checks to pass before merging** remains checked.
  4. Save changes.

### Fix #2: Secret Scanning & Push Protection

- **Symptom:** CI passes but secrets are not proactively blocked at `git push` time.
- **Remediation:**
  1. Go to `Settings` $\rightarrow$ `Code security and analysis`.
  2. Click **Enable** on **Secret scanning** and **Push protection**.

### Fix #3: Missing `production` Environment Gate

- **Symptom:** Release workflows deploy without manual operator sign-off.
- **Remediation:**
  1. Create environment `production` under `Settings` $\rightarrow$ `Environments`.
  2. Restrict deployments to tag pattern `v*.*.*` and branch `main`.

---

## 7. Automated Staging & Dev Promotion Flow (Task #42)

With Task #42, `ci-dev.yml` and `ci-staging.yml` execute on `pull_request` targeting their respective branches:

- **Pre-Merge PR Verification:** When a PR `dev` $\rightarrow$ `staging` is opened, `ci-staging.yml` automatically triggers on `pull_request`, running all 4 required checks:
  1. `11 CI Architecture Gates`
  2. `Unit & Integration Tests (Coverage)`
  3. `Playwright End-to-End Suite`
  4. `Production Build Verification`
- **Zero Workaround Required:** Since checks run directly on the PR, branch protection status requirements are fully satisfied before merging without disabling `enforce_admins`.
- **Duplicate Run Elimination:** Upon PR merge, the `push` event contains commit message `Merge pull request #...`. The workflow detects merge commits and skips duplicate execution, saving CI runner compute while ensuring complete verification.
