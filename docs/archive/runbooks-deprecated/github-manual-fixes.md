# GitHub Manual Configuration Fixes

## Overview

Task #21 audit identified 6 gaps in GitHub configuration. Some can
be fixed via code (CODEOWNERS), others require manual UI configuration.

This guide walks through manual fixes step-by-step.

---

## Fix #1 (P1): Solo Developer PR Review Block on `dev`

### Problem

`dev` branch has `1 required approval` + `enforce admins` enabled.
As a solo developer, you cannot approve your own PRs. This blocks
all PRs to `dev`.

### Solution A (Recommended): Set `dev` required approvals = 0

1. Go to: https://github.com/ntuan2502/haihire/settings/branches
2. Find the protection rule with branch pattern `dev`.
3. Click **"Edit"**.
4. Under **"Require a pull request before merging"**:
   - UNCHECK **"Require approvals"** (or reduce count to 0).
   - Keep **"Require status checks to pass before merging"** enabled (with `11 CI Architecture Gates` and `Full Unit Tests & Anti-Regression`).
5. Click **"Save changes"**.

**Result:** You can merge PRs to `dev` after CI passes (no peer approval blocked).

### Solution B: Uncheck "Do not allow bypassing the above settings"

1. Same URL: https://github.com/ntuan2502/haihire/settings/branches
2. Edit `dev` rule.
3. UNCHECK **"Do not allow bypassing the above settings"**.
4. Click **"Save changes"**.

**Result:** Admin (`ntuan2502`) can bypass approval requirements on `dev`.

---

## Fix #2 (P1): Missing `production` Environment

### Problem

GitHub Environment `production` doesn't exist. Release workflows cannot enforce manual approval gates for production deployments.

### Solution

1. Go to: https://github.com/ntuan2502/haihire/settings/environments
2. Click **"New environment"**.
3. Name: `production`.
4. Click **"Configure environment"**.
5. Under **"Environment protection rules"**:
   - Check **"Required reviewers"**.
   - Add reviewers: `ntuan2502` (and peer collaborator if available).
   - (Optional) Check **"Prevent self-review"** only if you have a second reviewer.
   - Check **"Deployment branches and tags"**.
   - Choose **"Selected branches and tags"**.
   - Add rule: `main` (exact match).
   - Add rule: `v*.*.*` (tag pattern).
6. Click **"Save protection rules"**.

---

## Fix #3 (P2): Missing `.github/CODEOWNERS`

### Status

Created by Task #22 (`.github/CODEOWNERS`). After merging to `main`:

1. Go to: https://github.com/ntuan2502/haihire/settings/branches
2. Edit `main` rule.
3. Under **"Require a pull request before merging"**:
   - CHECK **"Require review from Code Owners"**.
4. Click **"Save changes"**.

---

## Fix #4 (P2): Secret Scanning & Push Protection Disabled

### Solution

1. Go to: https://github.com/ntuan2502/haihire/settings/security_analysis
2. Under **"Secret scanning"**:
   - Click **"Enable"** (if not already enabled).
3. Under **"Push protection"**:
   - Click **"Enable"**.
4. Verify both statuses display green **"Enabled"**.

_Note: 100% free for public repositories._

---

## Fix #5 (P3): Auto-delete Merged Branches Disabled

### Solution

1. Go to: https://github.com/ntuan2502/haihire/settings
2. Scroll to the **"Pull Requests"** section.
3. CHECK **"Automatically delete head branches"**.
4. Settings auto-save.

---

## Fix #6 (P3): Dismiss Stale Reviews on `staging`

### Solution

1. Go to: https://github.com/ntuan2502/haihire/settings/branches
2. Edit `staging` rule.
3. Under **"Require a pull request before merging"**:
   - CHECK **"Dismiss stale pull request approvals when new commits are pushed"**.
4. Click **"Save changes"**.

---

## Verification Checklist

After applying all manual UI fixes:

- [ ] Can create PR to `dev` and merge without peer approval blockage.
- [ ] `production` environment exists with required reviewer (`ntuan2502`) and tag pattern `v*.*.*`.
- [ ] `.github/CODEOWNERS` file committed in repository.
- [ ] Secret scanning + push protection enabled.
- [ ] Auto-delete head branches enabled.
- [ ] Dismiss stale reviews on `staging` enabled.
