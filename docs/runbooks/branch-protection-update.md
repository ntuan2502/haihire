# Branch Protection Update Guide

## Context

Task #32 removed the `pull_request` trigger from `ci-dev.yml` and `ci-staging.yml` to eliminate redundant duplicate workflow executions upon pull request synchronization and merging. Consequently, the GitHub branch protection rules on `dev` must be updated to require status checks from `ci-feature.yml` instead of `ci-dev.yml`.

## Step-by-Step Procedure

### 1. Update `dev` Branch Protection Rule

1. Navigate to: https://github.com/ntuan2502/haihire/settings/branches
2. Edit the branch protection rule for `dev`.
3. Under **Require status checks to pass before merging**:
   - **Remove legacy checks** (previously emitted by `ci-dev.yml` on PR):
     - `11 CI Architecture Gates`
     - `Full Unit Tests & Anti-Regression`
   - **Add new required checks** (emitted by `ci-feature.yml` on feature PRs):
     - `Fast Static & Quality Checks`
     - `Fast Unit & Integration Tests`
4. Click **Save changes**.

### 2. Verification

1. Open or update a test pull request targeting `dev`.
2. Verify that `ci-feature.yml` triggers with path filtering and executes in under 2 minutes.
3. Confirm that `Fast Static & Quality Checks` and `Fast Unit & Integration Tests` report green status checks on the pull request.
