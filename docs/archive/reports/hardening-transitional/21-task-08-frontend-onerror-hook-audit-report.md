# Technical Report: Task #8 — Frontend onError Hook Standardization (Phase 1 Audit)

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Antigravity Agent  
**Date:** 2026-10-08  
**Status:** 📋 PHASE 1 AUDIT COMPLETE — PENDING DEEPSEEK & PROJECT OWNER APPROVAL  
**Branch:** `feat/task-08-frontend-onerror-hook`  
**Reference Documentation:** [`docs/reports/04-frontend-409-conflict-handling-audit.md`](file:///c:/Workspaces/haihire/docs/reports/04-frontend-409-conflict-handling-audit.md), [`docs/PROJECT_CONTEXT.md`](file:///c:/Workspaces/haihire/docs/PROJECT_CONTEXT.md), [`docs/DEFINITION_OF_DONE.md`](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md)

---

## 1. Executive Summary & Context

Task #8 is the final hardening milestone prior to tagging `v1.0.0` and initiating production release.

During Audit #04 (*Frontend 409 Conflict Handling Audit*), it was identified that 3 out of 4 critical candidate/application screens had localized `invalidateQueries` in their `catch` blocks. The 4th screen, `schedule-interview-modal.tsx`, lacked query invalidation upon unexpected failure (e.g., HTTP 409 conflict during concurrent pipeline moves).

To establish robust **defense-in-depth**, the project architecture mandates standardizing query cache invalidation directly at the **hook level** via TanStack React Query's `onError` callback, rather than relying on disparate components remembering to call `invalidateQueries` inside catch blocks. This pattern was successfully piloted in Task #1B for `use-webhook-setting-queries.ts`. Task #8 extends this standard across all existing mutation hooks in `frontend/src/hooks/`.

---

## 2. Phase 1 Audit: Full Mutation Hook Inventory

Every `useMutation` instance in `frontend/src/hooks/` was audited for `onSuccess` and `onError` cache invalidation parity.

### 2.1 Complete Audit Matrix (35 Mutation Hooks Across 8 Files)

| # | File Path | Hook Name | `onSuccess` Invalidate | `onError` Invalidate | Invalidated Query Keys | Audit Status |
|:---:|:---|:---|:---:|:---:|:---|:---:|
| **1** | `use-webhook-setting-queries.ts` | `useCreateWebhookSettingMutation` | **Y** | **Y** | `["webhook-settings"]` | ✅ Compliant (Task #1B) |
| **2** | `use-webhook-setting-queries.ts` | `useUpdateWebhookSettingMutation` | **Y** | **Y** | `["webhook-settings"]` | ✅ Compliant (Task #1B) |
| **3** | `use-webhook-setting-queries.ts` | `useDeleteWebhookSettingMutation` | **Y** | **Y** | `["webhook-settings"]` | ✅ Compliant (Task #1B) |
| **4** | `use-webhook-setting-queries.ts` | `useTestWebhookSettingMutation` | **Y** | **Y** | `["webhook-settings"]` | ✅ Compliant (Task #1B) |
| **5** | `use-sourcing-queries.ts` | `useCreateTrackingLinkMutation` | **Y** | **N** | `["sourcing"]` | ⚠️ Missing `onError` |
| **6** | `use-sourcing-queries.ts` | `useUpdateTrackingLinkMutation` | **Y** | **N** | `["sourcing"]` | ⚠️ Missing `onError` |
| **7** | `use-sourcing-queries.ts` | `useDeleteTrackingLinkMutation` | **Y** | **N** | `["sourcing"]` | ⚠️ Missing `onError` |
| **8** | `use-job-queries.ts` | `useUpdateJobMutation` | **Y** | **N** | `["jobs"]`, `["jobs", variables.id]` | ⚠️ Missing `onError` |
| **9** | `use-job-queries.ts` | `useCreateJobMutation` | **Y** | **N** | `["jobs"]` | ⚠️ Missing `onError` |
| **10** | `use-job-queries.ts` | `useDeleteJobMutation` | **Y** | **N** | `["jobs"]`, `["applications"]` | ⚠️ Missing `onError` |
| **11** | `use-organization-queries.ts` | `useSwitchOrgMutation` | **Y** | **N** | All queries (`queryClient.invalidateQueries()`) | ⚠️ Missing `onError` |
| **12** | `use-organization-queries.ts` | `useUpdateMyOrgMutation` | **Y** | **N** | `queryKeys.myOrg()` (`["organization", "my"]`) | ⚠️ Missing `onError` |
| **13** | `use-organization-queries.ts` | `useDeleteMyOrgMutation` | **Y** | **N** | `queryKeys.myOrg()` (`["organization", "my"]`) | ⚠️ Missing `onError` |
| **14** | `use-organization-queries.ts` | `useCreateInviteLinkMutation` | **Y** | **N** | `queryKeys.inviteLinks()` (`["organization", "invite-links"]`) | ⚠️ Missing `onError` |
| **15** | `use-organization-queries.ts` | `useRevokeInviteLinkMutation` | **Y** | **N** | `queryKeys.inviteLinks()` (`["organization", "invite-links"]`) | ⚠️ Missing `onError` |
| **16** | `use-organization-queries.ts` | `useUpdateMemberRoleMutation` | **Y** | **N** | `queryKeys.orgMembers()` (`["organization", "members"]`) | ⚠️ Missing `onError` |
| **17** | `use-organization-queries.ts` | `useRemoveMemberMutation` | **Y** | **N** | `queryKeys.orgMembers()` (`["organization", "members"]`) | ⚠️ Missing `onError` |
| **18** | `use-interview-queries.ts` | `useCreateInterviewMutation` | **Y** | **N** | `["interviews"]`, `["applications"]` | ⚠️ Missing `onError` *(Modal #4)* |
| **19** | `use-interview-queries.ts` | `useUpdateInterviewMutation` | **Y** | **N** | `["interviews"]`, `queryKeys.interview(variables.id)`, `["applications"]` | ⚠️ Missing `onError` |
| **20** | `use-interview-queries.ts` | `useDeleteInterviewMutation` | **Y** | **N** | `["interviews"]`, `["applications"]` | ⚠️ Missing `onError` |
| **21** | `use-email-queries.ts` | `useUpdateEmailTemplateMutation` | **Y** | **N** | `["email", "templates"]` | ⚠️ Missing `onError` |
| **22** | `use-email-queries.ts` | `useUpdateEmailSettingsMutation` | **Y** | **N** | `["email", "settings"]` | ⚠️ Missing `onError` |
| **23** | `use-email-queries.ts` | `useSendTestEmailMutation` | **N** | **N** | *None (Stateless trigger, no DB/cache)* | ℹ️ Preserved (Stateless) |
| **24** | `use-email-queries.ts` | `useSendEmailMutation` | **Y** | **N** | `["email", "logs"]`, `["activities", "candidate", variables.candidateId]` *(conditional)* | ⚠️ Missing `onError` |
| **25** | `use-application-queries.ts` | `useCreateApplicationMutation` | **Y** | **N** | `["applications"]` | ⚠️ Missing `onError` |
| **26** | `use-application-queries.ts` | `useUpdateStageMutation` | **Y** | **N** | `["applications"]` | ⚠️ Missing `onError` *(Kanban 409)* |
| **27** | `use-application-queries.ts` | `useUpdateCandidateMutation` | **Y** | **N** | `["applications"]` | ⚠️ Missing `onError` |
| **28** | `use-application-queries.ts` | `useUploadDocumentMutation` | **Y** | **N** | `["applications"]`, `["candidates"]` | ⚠️ Missing `onError` |
| **29** | `use-application-queries.ts` | `useDeleteApplicationMutation` | **Y** | **N** | `["applications"]`, `["candidates"]` | ⚠️ Missing `onError` |
| **30** | `use-application-queries.ts` | `useDeleteDocumentMutation` | **Y** | **N** | `["applications"]`, `["candidates"]` | ⚠️ Missing `onError` |
| **31** | `use-candidate-queries.ts` | `useCreateCandidateMutation` | **Y** | **N** | `["candidates"]` | ⚠️ Missing `onError` |
| **32** | `use-candidate-queries.ts` | `useUpdateCandidateDetailsMutation` | **Y** | **N** | `["candidates"]`, `queryKeys.candidate(variables.id)`, `["applications"]` | ⚠️ Missing `onError` |
| **33** | `use-candidate-queries.ts` | `useDeleteCandidateMutation` | **Y** | **N** | `["candidates"]`, `["applications"]`, `["interviews"]` | ⚠️ Missing `onError` |
| **34** | `use-candidate-queries.ts` | `useUploadCandidateDocumentMutation` | **Y** | **N** | `queryKeys.candidate(variables.id)`, `["candidates"]` | ⚠️ Missing `onError` |
| **35** | `use-candidate-queries.ts` | `useDeleteCandidateDocumentMutation` | **Y** | **N** | `queryKeys.candidate(variables.id)`, `["candidates"]` | ⚠️ Missing `onError` |

---

## 3. Scope Categorization & Findings

1. **Total Mutation Hooks Discovered:** 35 hooks across 8 files.
2. **Already Standardized (Compliant):** 4 hooks (`use-webhook-setting-queries.ts`, standardized during Task #1B).
3. **Stateless Operations (No Query Cache Impact):** 1 hook (`useSendTestEmailMutation`, sends an immediate test SMTP packet without writing to persistence or query caches).
4. **Target Hooks for `onError` Invalidation:** **30 hooks** across 7 files:
   - `use-sourcing-queries.ts`: 3 hooks
   - `use-job-queries.ts`: 3 hooks
   - `use-organization-queries.ts`: 7 hooks
   - `use-interview-queries.ts`: 3 hooks
   - `use-email-queries.ts`: 3 hooks (excluding `useSendTestEmailMutation`)
   - `use-application-queries.ts`: 6 hooks
   - `use-candidate-queries.ts`: 5 hooks
5. **No Loose Mutations in Components:** A global search across `frontend/src/` confirmed that zero inline `useMutation` calls exist in UI components or pages; 100% of mutation logic is encapsulated in `frontend/src/hooks/`.

---

## 4. Screen #4 Focus: `schedule-interview-modal.tsx`

In `frontend/src/components/interviews/schedule-interview-modal.tsx` (L223-L226):
```tsx
} catch (err) {
  console.error("Schedule interview failed:", err);
  setFormError(getApiErrorMessage(err, t));
}
```
The modal invokes:
- `useCreateInterviewMutation`
- `useUpdateInterviewMutation`
- `useUpdateStageMutation`

When `onError` is added to all three hooks:
1. If scheduling or stage advancement encounters a concurrency conflict (HTTP 409), TanStack Query automatically triggers `onError` on the hook level.
2. The query cache (`["interviews"]`, `["applications"]`, and specific details) is invalidated and refetched immediately.
3. In `schedule-interview-modal.tsx`, we will also implement **Option A** (documenting that cache invalidation is handled by hook defense-in-depth) along with an explicit `queryClient.invalidateQueries` in the catch block if needed for double assurance.

---

## 5. Phase 2 & Phase 3 Execution Plan (Pending Approval)

Upon receipt of approval:

### Step 1: Implementation of `onError` in 30 Hooks
- Ensure 100% exact parity between `onSuccess` query keys and `onError` query keys.
- Preserve all existing `mutationFn` signatures and business logic.
- Handle parameterized invalidations cleanly (e.g. `variables.id`, `variables.candidateId`).

### Step 2: Harmonize `schedule-interview-modal.tsx`
- Update error catch block to guarantee seamless recovery on HTTP 409.

### Step 3: Comprehensive Unit Test Suite
- Author dedicated Vitest unit tests for the updated hook files:
  - `use-sourcing-queries.spec.ts`
  - `use-job-queries.spec.ts`
  - `use-organization-queries.spec.ts`
  - `use-interview-queries.spec.ts`
  - `use-email-queries.spec.ts`
  - `use-application-queries.spec.ts`
  - `use-candidate-queries.spec.ts`
- Verify both `onSuccess` and `onError` trigger `invalidateQueries` with expected arguments.

### Step 4: Quality Gate Verification & Single Commit
- Run `pnpm check:all:fast` (10/10 gates) and `pnpm test`.
- Stage all files via `git add .` and create a single atomic commit:
  `refactor(frontend): standardize onError invalidation across mutation hooks`
