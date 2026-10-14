# Task #23: CI/CD Issues Diagnostic Report (E2E Nightly & Dependabot PR #38)

**Audit Date**: 2026-10-14T18:45:00+07:00  
**Investigator**: Antigravity (AI Senior DevOps & Debugging Specialist)  
**Status**: DIAGNOSED (Root Causes Identified, Fix Strategy Formulated)  

---

## Executive Summary

Following the 10/10 GitHub repository configuration audit (Task #22 Phase 2), two operational CI/CD issues were detected:
1. **E2E Nightly Verification failure** (Run #8 at 15:15 / 08:15 UTC) on `main` branch after 7 consecutive passed runs.
2. **Dependabot PR #38 failure**, where Dependabot incorrectly targeted `main` instead of `dev` and failed the "Playwright End-to-End Tests" gate.

Comprehensive investigation reveals that **both failures share the exact same underlying root cause**:
- The repository's `main` branch is at commit `8a07725` (Task #18 pre-release baseline).
- During Task #19 Phase 3, an unauthenticated session redirection bug in `frontend/tests/e2e/webhook-settings.spec.ts` was identified and fixed in commit `5237202` on `dev`.
- Furthermore, `.github/dependabot.yml` (specifying `target-branch: dev`) and the new layered CI/CD workflows were introduced in Task #19 on `dev`.
- Because `dev` has not yet been promoted to `main`, `main` lacks both the E2E auth fixture and `.github/dependabot.yml`.

---

## 1. E2E Nightly Verification Failure Analysis

### 1.1 Run Details & History
- **Workflow**: `.github/workflows/e2e-nightly.yml`
- **Trigger**: Scheduled Cron (`0 3 * * *`)
- **Run ID**: `38533782115`
- **Execution Time**: 2026-10-14T08:15:05Z (4m 55s)
- **Branch**: `main`
- **Commit SHA**: `8a077252a5c3718173277321b9b9521b7cf77d73`
- **Failed Job**: `Full Nightly Playwright E2E Suite` (Job ID: `115751640093`)
- **Failed Step**: Step #18 (`Run Playwright E2E Tests`)

### 1.2 Comparison with Run #7 (Passed)
| Metric | Run #7 (Passed) | Run #8 (Failed) |
|---|---|---|
| **Run ID** | `38379695455` | `38533782115` |
| **Date** | 2026-10-13T09:54:45Z | 2026-10-14T08:15:05Z |
| **Commit SHA** | `3f790ea` (Merge PR #10) | `8a07725` (Release v0.1.0 pre-release) |
| **Total Tests Ran** | 10 tests | 23 tests (20 passed, 3 failed) |
| **Duration** | 3m 34s | 4m 55s |
| **Webhook Tests** | **Did not exist** at commit `3f790ea` | Executed for the first time |

**Key Diff**: Run #7 ran against `3f790ea` (October 6 baseline). At that commit, `webhook-settings.spec.ts` did not exist. Between Run #7 and Run #8, PRs #11 through #32 were merged into `main` (culminating in commit `8a07725`), introducing `webhook-settings.spec.ts` (added originally in PR #11/#12 `947c3c0`) to `main` for the very first time.

### 1.3 Failed Tests & Error Evidence
The Playwright runner failed on all 3 test cases in `frontend/tests/e2e/webhook-settings.spec.ts`:

1. **Case 1: Admin creates Telegram webhook setting and verifies it appears in list**
   - **Location**: `frontend/tests/e2e/webhook-settings.spec.ts:30:3`
   - **Error**:
     ```text
     Error: expect(locator).toBeVisible() failed
     Locator: locator('#add-webhook-btn')
     Expected: visible
     Timeout: 10000ms
     Error: element(s) not found
     ```

2. **Case 2: Admin tests webhook connection and receives toast notification**
   - **Location**: `frontend/tests/e2e/webhook-settings.spec.ts:123:3`
   - **Error**:
     ```text
     Error: expect(locator).toBeVisible() failed
     Locator: locator('button:has(svg.lucide-send)').first()
     Expected: visible
     Timeout: 10000ms
     Error: element(s) not found
     ```

3. **Case 3: Member cannot see Add Webhook button and sees admin-only warning**
   - **Location**: `frontend/tests/e2e/webhook-settings.spec.ts:179:3`
   - **Assertion**: Line 208: `await expect(adminNotice.first()).toBeVisible({ timeout: 5000 });`
   - **Error**:
     ```text
     Error: expect(locator).toBeVisible() failed
     Locator: locator('svg.lucide-shield-alert').first()
     Expected: visible
     Timeout: 5000ms
     Error: element(s) not found
     ```

### 1.4 Root Cause
In `frontend/tests/e2e/webhook-settings.spec.ts` on `main`:
- The test navigates directly to `/dashboard/settings/webhooks`.
- Unlike other E2E tests, it sets up route mocks (`page.route("**/api/auth/me", ...)`) but **fails to seed the client authentication state** in browser storage (`localStorage` tokens `haihire_recruiter_token`, `haihire_recruiter_user` and cookies `haihire_token`, `haihire_has_org`).
- Next.js client-side router (`<AuthGuard>`) detects missing local credentials and redirects the page from `/dashboard/settings/webhooks` to `/auth/login`.
- On `/auth/login`, `#add-webhook-btn` and `svg.lucide-shield-alert` do not exist, causing assertions to time out after 10 seconds.
- **Proof of Fix on `dev`**: This exact issue was detected in Task #19 Phase 3 and fixed in commit `5237202`:
  ```typescript
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("haihire_recruiter_token", token);
    localStorage.setItem("haihire_recruiter_user", JSON.stringify(user));
    document.cookie = `haihire_token=${token}; path=/; max-age=86400`;
    document.cookie = `haihire_has_org=true; path=/; max-age=86400`;
  }, { token: "mock-jwt-token-admin-12345", user: adminUser });
  ```
- Because commit `5237202` exists on `dev` but has not yet been merged into `main`, `e2e-nightly.yml` (running on `main`) reproduced the bug.

---

## 2. Dependabot PR #38 Issue Analysis

### 2.1 PR Metadata
- **PR Number**: `#38`
- **URL**: `https://github.com/ntuan2502/haihire/pull/38`
- **Title**: `chore(deps): bump source-map-js from 1.2.1 to 1.2.2`
- **Author**: `dependabot[bot]`
- **Base Branch (Target)**: `main` *(Violation of repository branching policy)*
- **Head Branch**: `dependabot/npm_and_yarn/source-map-js-1.2.2`
- **Created At**: `2026-10-14T08:57:13Z`
- **Trigger**: Automated security alert (Fix for CVE-2026-93749 DoS vulnerability in `source-map-js`)

### 2.2 Checks Status & Failure Evidence
Checks executed under legacy `.github/workflows/ci-cd.yml` (Run ID: `38538812112`):
- `Detect Changed Paths`: **SUCCESS**
- `Static Gates, Unit Tests & Build`: **SUCCESS**
- `Playwright End-to-End Tests` (Job ID: `115769577529`): **FAILURE**
- `Build & Push Container Images`: **SKIPPED**
- `Deploy to Staging (Auto)`: **SKIPPED**
- `Deploy to Production (Manual Approval Gate)`: **SKIPPED**

**Failure Log (Job 115769577529)**:
```text
3 failed
  [chromium] › frontend/tests/e2e/webhook-settings.spec.ts:30:3 › Case 1: Admin creates Telegram webhook setting...
  [chromium] › frontend/tests/e2e/webhook-settings.spec.ts:123:3 › Case 2: Admin tests webhook connection...
  [chromium] › frontend/tests/e2e/webhook-settings.spec.ts:179:3 › Case 3: Member cannot see Add Webhook button...
20 passed (1.9m)
```
The failure is **100% identical** to E2E Nightly Run #8. Because PR #38 was based on `main`, it inherited the unpatched `webhook-settings.spec.ts`.

### 2.3 Why Did Dependabot Target `main`?
1. **GitHub Dependabot Architectural Requirement**:
   Dependabot parses configuration exclusively from `.github/dependabot.yml` on the repository's **default branch** (`main`).
2. **Missing Configuration on `main`**:
   Verification command:
   ```powershell
   git show main:.github/dependabot.yml
   # Output: fatal: path '.github/dependabot.yml' exists on disk, but not in 'main'
   ```
   `.github/dependabot.yml` was created during Task #19 on `dev` with `target-branch: "dev"`. However, because `dev` has not yet been merged into `main`, GitHub Dependabot has no configuration file on `main`.
3. **Default Fallback**:
   When Dependabot Security Updates was enabled at the repository settings level (Task #21/22), GitHub found no `dependabot.yml` on `main`. Under default behavior, security updates target the repository's default branch (`main`).
4. **Other Dependabot PRs**:
   Execution of `gh pr list --label dependencies` confirmed PR #38 is the only dependency PR currently open.

---

## 3. Root Cause Summary Matrix

| Issue | Symptom | Immediate Cause | Root Architectural Cause |
|---|---|---|---|
| **E2E Nightly (Run #8)** | 3 tests failed in `webhook-settings.spec.ts` | Missing `localStorage` & cookie auth tokens caused redirect to `/auth/login` | `main` was updated with PR #11-#32 but has not received Task #19 commit `5237202` from `dev`. |
| **PR #38 Target** | Dependabot targeted `main` instead of `dev` | GitHub Dependabot read default branch `main` where `.github/dependabot.yml` does not exist | Task #19's `.github/dependabot.yml` (specifying `target-branch: dev`) lives on `dev` and has not been merged to `main`. |
| **PR #38 Check Failure** | Playwright E2E test job failed in CI | PR #38 branched from `main`, inheriting unpatched `webhook-settings.spec.ts` | Same as E2E Nightly: missing commit `5237202` on `main`. |

---

## 4. Proposed Fixes & Strategic Options

### 4.1 Fix for Issue #1 (E2E Nightly)

#### Recommended Strategy (Clean Promotion):
Promote `dev` through `staging` into `main` via a formal release pull request (e.g., Release v0.1.1):
1. Create PR from `staging` to `main`.
2. This synchronizes commit `5237202` (`test(e2e): inject auth session in webhook-settings e2e spec`), the new layered workflows, and `.github/dependabot.yml`.
3. Nightly E2E runs will immediately pass.

#### Fast-Track Hotfix Strategy (If promotion is deferred):
If full promotion of `dev` to `main` is delayed:
1. Create a hotfix branch from `main`: `hotfix/main-e2e-webhook-auth`.
2. Cherry-pick commit `5237202` onto `main`.
3. Merge hotfix PR to `main`.

### 4.2 Fix for Issue #2 (PR #38)

#### Step 1: Close or Retarget PR #38
- Close PR #38:
  ```bash
  gh pr close 38 --comment "Closing PR #38: Dependabot targeted 'main' because .github/dependabot.yml does not exist on main yet. Security updates must target 'dev'."
  ```
- Alternatively, retarget PR #38 to `dev`:
  ```bash
  gh pr edit 38 --base dev
  ```
  *(Note: Retargeting may encounter merge conflicts or redundant changes if package.json has advanced on `dev`; closing and letting Dependabot recreate on `dev` is cleaner).*

#### Step 2: Establish `.github/dependabot.yml` on `main`
- When `dev` is promoted to `main` (or via hotfix), `.github/dependabot.yml` with `target-branch: "dev"` will reside on `main`.
- Dependabot will henceforth open all future version and security updates targeting `dev`.
- Once PRs are opened against `dev`, they will automatically run against the patched E2E suite and pass all CI checks.

---

## 5. Actionable Next Steps

1. **Close PR #38**: Close PR #38 to prevent unauthorized direct-to-main dependency merges.
2. **Promote `dev` -> `staging` -> `main`**: Execute standard promotion PR to bring `main` up to date with Task #19–#22 improvements (including the E2E auth fix and `.github/dependabot.yml`).
3. **Re-trigger Dependabot Security Update**: Once `.github/dependabot.yml` is active on `main`, trigger Dependabot to submit the `source-map-js` upgrade against `dev`.
4. **Trigger Manual Nightly Workflow Dispatch**: Run `gh workflow run e2e-nightly.yml --ref main` after promotion to verify 23/23 tests pass.
