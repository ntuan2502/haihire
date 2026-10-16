# GitHub Branch Protection Setup Guide

## Overview

This guide walks through configuring branch protection rules for the
`dev`, `staging`, and `main` branches via the GitHub repository management UI.

## Prerequisites

- Repository administrator access on `https://github.com/ntuan2502/haihire`.
- GitHub account with owner / maintainer permissions.

---

## Step 1: Protect `main` Branch (Strictest)

1. Navigate to: https://github.com/ntuan2502/haihire/settings/branches
2. Click **"Add branch ruleset"** or **"Add rule"**.
3. Branch name pattern: `main`
4. Configure protection parameters:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `2`
     - ✅ Dismiss stale PR approvals when new commits are pushed
     - ✅ Require review from Code Owners (if CODEOWNERS is configured)
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Status checks to require:
       - `Full CI Quality Pipeline` (from `ci-main.yml`)
       - `Playwright End-to-End Suite` (from `ci-main.yml`)
       - `Dependency Security Audit` (from `ci-main.yml`)
       - `Docker Build Dry-Run Verification` (from `ci-main.yml`)
   - ✅ **Require conversation resolution before merging**
   - ✅ **Require linear history**
   - ✅ **Do not allow bypassing the above settings** (Enforce for administrators)
   - ❌ **Allow force pushes** (DISABLED)
   - ❌ **Allow deletions** (DISABLED)
5. Click **"Create"** / **"Save changes"**.

---

## Step 2: Protect `staging` Branch

1. Navigate to: https://github.com/ntuan2502/haihire/settings/branches
2. Click **"Add rule"**.
3. Branch name pattern: `staging`
4. Configure protection parameters:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `1`
   - ✅ **Require status checks to pass before merging**
     - Status checks to require:
       - `11 CI Architecture Gates` (from `ci-staging.yml`)
       - `Unit & Integration Tests (Coverage)` (from `ci-staging.yml`)
       - `Playwright End-to-End Suite` (from `ci-staging.yml`)
       - `Production Build Verification` (from `ci-staging.yml`)
   - ✅ **Require linear history**
   - ❌ **Allow force pushes** (DISABLED)
   - ❌ **Allow deletions** (DISABLED)
5. Click **"Create"** / **"Save changes"**.

---

## Step 3: Protect `dev` Branch

1. Navigate to: https://github.com/ntuan2502/haihire/settings/branches
2. Click **"Add rule"**.
3. Branch name pattern: `dev`
4. Configure protection parameters:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `1`
   - ✅ **Require status checks to pass before merging**
     - Status checks to require:
       - `11 CI Architecture Gates` (from `ci-dev.yml`)
       - `Full Unit Tests & Anti-Regression` (from `ci-dev.yml`)
   - ❌ **Allow force pushes** (DISABLED)
   - ❌ **Allow deletions** (DISABLED)
5. Click **"Create"** / **"Save changes"**.

---

## Step 4: Setup GitHub Environment "production"

1. Navigate to: https://github.com/ntuan2502/haihire/settings/environments
2. Click **"New environment"**.
3. Name: `production`
4. Configure protection rules:
   - ✅ **Required reviewers:** Add repository owner (`ntuan2502`) + designated senior reviewer.
   - ✅ **Wait timer:** `0` (or `5` minutes for additional safety).
   - ✅ **Deployment branches:** Select **"Selected branches and tags"** -> Add `main` and tag pattern `v*.*.*`.
5. Click **"Save protection rules"**.

---

## Step 5: Enable Dependabot Security & Updates

1. Navigate to: https://github.com/ntuan2502/haihire/settings/security_analysis
2. Enable:
   - ✅ **Dependabot alerts** (Click "Enable")
   - ✅ **Dependabot security updates** (Click "Enable")
   - ✅ **Dependabot version updates** (Loaded automatically from `.github/dependabot.yml`)
3. Verify that GitHub recognizes `.github/dependabot.yml`.

---

## Verification Checklist

After completing the manual setup via GitHub UI, verify the following:

- [ ] Direct push to `main` is rejected: `git push origin main` -> `GH006: Protected branch update failed`.
- [ ] Pull requests targeting `main` require 2 peer approvals and all 4 CI status checks to be green.
- [ ] Pull requests targeting `staging` require 1 peer approval and all 4 staging CI checks to be green.
- [ ] Pull requests targeting `dev` require 1 peer approval and 11 gates + unit tests to pass.
- [ ] Dependabot alerts and security update PRs are active in the Security tab.
- [ ] Deployments to `production` environment require explicit manual authorization.

---

## Troubleshooting

### "Required status checks not showing in search dropdown"

- GitHub Actions status checks only appear in the dropdown once they have run at least once on the repository.
- Run a PR or commit against the respective branch, wait for the jobs to finish, then refresh the branch protection settings page.

### "Cannot merge PR due to outdated branch"

- If linear history or up-to-date checks are enforced:
  - Click **"Update branch"** on the GitHub PR page.
  - Or rebase locally:
    ```bash
    git checkout <branch>
    git pull --rebase origin <base-branch>
    git push --force-with-lease
    ```

---

## References

- GitHub Documentation: [Managing protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- GitHub Documentation: [Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
