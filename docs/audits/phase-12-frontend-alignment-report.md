# Phase 12 Verification & Completion Report: Frontend State Machine Alignment

**Project Code:** HaiHire ATS  
**Phase:** Phase 12 — Frontend State Machine Alignment  
**Role:** Senior Frontend Architect & SRE Auditor (`@frontend-specialist`)  
**Report Date:** 02/10/2026  
**Status:** 🟢 **COMPLETED & APPROVED FOR SHIP**

---

## 1. Executive Summary

### 1.1 Bug Description & User Evidence
* **Trigger URL:** `/dashboard/jobs/[id]/pipeline?stage=SCREENING&applicationId=[appId]`
* **User Action:** User drags or clicks to transition an application from `SCREENING` backwards to `APPLIED`.
* **Backend Response:**
  ```http
  HTTP 400 Bad Request
  Content-Type: application/json

  {
    "statusCode": 400,
    "code": "APPLICATION_INVALID_STAGE_TRANSITION",
    "message": "Cannot transition application stage from 'SCREENING' to 'APPLIED'",
    "params": {
      "currentStage": "SCREENING",
      "targetStage": "APPLIED"
    }
  }
  ```
* **UI State (Pre-fix):**
  1. **Zero Prevention UX:** Pipeline Kanban and Drawer allowed dragging and clicking across all stage buttons without state machine validation.
  2. **Raw JSON Leakage:** Upon receiving HTTP 400, the UI leaked raw JSON `{"statusCode": 400, "code": "APPLICATION_INVALID_STAGE_TRANSITION", ...}` rather than localized i18n messages.
  3. **Out of Sync:** Failed to trigger `queryClient.invalidateQueries`, causing the board to desynchronize from actual database state.

### 1.2 Remediation Scope
* **Single Source of Truth:** Directly consume `VALID_APPLICATION_STAGE_TRANSITIONS` matrix from `@haihire/shared`.
* **Centralized State Machine Guard:** Authored centralized helpers `canTransition(from, to): boolean` and `getTransitionDisabledReason(from, to, t): string` in `frontend/src/lib/stages.ts`.
* **Componentization & UX Prevention (A3 & A4):**
  - Created `StageSelector` (`frontend/src/components/jobs/pipeline/stage-selector.tsx`) supporting two variants: `dropdown` (filters out invalid stages) and `buttons` (disables invalid buttons with informative tooltips such as *"Cannot transition from SCREENING to APPLIED"* or *"Candidate is HIRED and cannot transition to APPLIED"*).
  - Integrated HTML5 Drag & Drop in `PipelineCandidateCard` and `PipelineStageSelector`: Validates `canTransition` pre-flight, intercepting invalid drops with toast alerts.
* **Defense-in-Depth Error Handling:**
  - Standardized all 4 `updateStage` API call sites across the frontend: Routed errors through `getApiErrorMessage(err, t)` and invoked `queryClient.invalidateQueries` to resync state immediately.
  - Added `<Toaster richColors position="top-right" />` from `sonner` into `RootLayout` (`frontend/src/app/layout.tsx`).
* **Backend Preservation:** Preserved backend logic untouched (already sound since Phase 3).

### 1.3 Test Count & Quality Gates Before / After
| Metric | Pre-Phase 12 | Post-Phase 12 | Delta |
| :--- | :---: | :---: | :---: |
| **Backend Test Suite** | 218 tests (25 files) | 218 tests (25 files) | Unchanged (100% PASS) |
| **Frontend Test Suite** | 107 tests (21 files) | **126 tests** (23 files) | **+19 net new tests** (100% PASS) |
| **Total Unit/Integration Tests** | **325 tests** | **344 tests** | **+19 tests (Exceeds $\ge 325$ threshold)** |
| **DtoPipe CI Gate** | 100% pass | 100% pass | 0 regressions |
| **TypeScript Typecheck** | 0 errors | 0 errors | 0 errors |
| **Monorepo ESLint** | 0 errors | 0 errors | 0 errors |

---

## 2. PART A: Frontend Prevention

### 2.1 Single Source of Truth & Helper Functions
Referenced recruitment lifecycle transition matrix directly from `@haihire/shared`:

```typescript
// frontend/src/lib/stages.ts
import {
  ApplicationStage,
  VALID_APPLICATION_STAGE_TRANSITIONS,
} from "@haihire/shared";

/**
 * Check whether an application stage transition is valid according to the ATS state machine.
 */
export function canTransition(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
): boolean {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = VALID_APPLICATION_STAGE_TRANSITIONS[from as ApplicationStage];
  return allowed ? allowed.includes(to as ApplicationStage) : false;
}

/**
 * Get human-readable localized reason why an application stage transition is disabled.
 */
export function getTransitionDisabledReason(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!from || !to || from === to) return "";
  const fromStage = from as ApplicationStage;
  const toStage = to as ApplicationStage;

  if (fromStage === "HIRED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveHired", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveHired") return msg;
      } catch { /* Fallback */ }
    }
    return `Candidate is HIRED and cannot transition to ${toStage}`;
  }

  if (fromStage === "REJECTED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveRejected", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveRejected") return msg;
      } catch { /* Fallback */ }
    }
    return `Candidate is REJECTED and cannot transition to ${toStage}`;
  }

  if (t) {
    try {
      const msg = t("pipeline.tooltips.invalidTransition", { from: fromStage, to: toStage });
      if (msg && msg !== "pipeline.tooltips.invalidTransition") return msg;
    } catch { /* Fallback */ }
  }
  return `Cannot transition from ${fromStage} to ${toStage}`;
}
```

### 2.2 Reusable `StageSelector` Component
New file: `frontend/src/components/jobs/pipeline/stage-selector.tsx`
- **Variant `dropdown`:** Automatically filters out invalid stages from `<select>`. When in `SCREENING`, only `INTERVIEW` and `REJECTED` are rendered; `APPLIED` is omitted.
- **Variant `buttons`:** Renders other stages while disabling invalid targets (`opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800`), attaching descriptive hover tooltips.

```tsx
// frontend/src/components/jobs/pipeline/stage-selector.tsx (Buttons excerpt)
return (
  <div className={`flex items-center gap-2 flex-wrap ${className}`}>
    {stageOptions
      .filter((stage) => !stage.isCurrent)
      .map((stage) => {
        const isButtonDisabled = disabled || isLoading || !stage.allowed;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={isButtonDisabled}
            title={stage.reason || stage.actionLabel}
            onClick={() => handleStageClick(stage.id)}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors ${
              stage.allowed
                ? `${stage.btnBg} ${stage.btnHover} text-white cursor-pointer disabled:opacity-50`
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-200 dark:border-slate-800"
            }`}
          >
            <span>{stage.actionLabel}</span>
            <span className="h-4 w-4 rounded-full text-[10px] flex items-center justify-center">
              {stage.stepNumber}
            </span>
          </button>
        );
      })}
  </div>
);
```

### 2.3 HTML5 Kanban Drag & Drop Prevention
Integrated drag and drop interaction between `PipelineCandidateCard` and `PipelineStageSelector`:
* In `PipelineCandidateCard`: Set `draggable={canDrag}` passing metadata `{ id, stage }` via `dataTransfer`.
* In `PipelineStageSelector`: Handled `onDragOver` and `onDrop` per stage pill.
* In `page.tsx` (`handleDropCandidate`):
  ```typescript
  const handleDropCandidate = (
    candidateId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => {
    if (fromStage === toStage) return;
    // Intercept pre-flight
    if (!canTransition(fromStage, toStage)) {
      const reason = getTransitionDisabledReason(fromStage, toStage, t);
      toast.error(reason);
      return;
    }
    handleMoveCandidateStage(toStage, candidateId);
  };
  ```

---

## 3. PART B: Error Handling (Defense in Depth)

### 3.1 All `updateStage` Invocations Audited
Audited all 4 stage update invocation sites across the frontend:
1. `frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx` (Line 380 - Kanban Pipeline Page)
2. `frontend/src/components/applications/applications-data-table.tsx` (Line 434 - Applications Drawer)
3. `frontend/src/app/dashboard/applications/[id]/page.tsx` (Line 198 - Application Details Page)
4. `frontend/src/components/interviews/schedule-interview-modal.tsx` (Line 210 - Schedule Interview Modal)

### 3.2 Standardized `getApiErrorMessage` & State Refresh
Eliminated raw `JSON.stringify(err)` and `err.message` output. All errors flow through `getApiErrorMessage(err, t)` and trigger TanStack Query invalidation:

```typescript
// Refactored handleMoveCandidateStage in page.tsx
const handleMoveCandidateStage = async (
  newStage: ApplicationStage,
  overrideCandidateId?: string,
) => {
  const activeAppId = overrideCandidateId || selectedCandidate?.id;
  const candidate = jobApplications.find((a) => a.id === activeAppId) || selectedCandidate;
  if (!candidate) return;

  // 1. Client-side prevention guard
  if (!canTransition(candidate.stage, newStage)) {
    const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
    toast.error(reason);
    return;
  }

  try {
    await updateStageMutation.mutateAsync({
      id: candidate.id,
      stage: newStage,
    });
    setSelectedStage(newStage);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("stage", newStage);
    newParams.set("applicationId", candidate.id);
    router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
      scroll: false,
    });
  } catch (err) {
    console.error("Failed to move candidate stage", err);
    // 2. Defense-in-depth: getApiErrorMessage -> localized i18n
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);
    // 3. State sync: refresh TanStack query cache
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
  }
};
```

### 3.3 Multilingual i18n Verification
Error codes and tooltips synchronized in `vi.ts` and `en.ts`:
* `errors.APPLICATION_INVALID_STAGE_TRANSITION`:
  - **vi:** *"Không thể chuyển hồ sơ sang giai đoạn này. Vui lòng kiểm tra lại quy trình tuyển dụng."*
  - **en:** *"This stage transition is not allowed. Please check the recruitment workflow."*
* `errors.APPLICATION_STAGE_CONFLICT`:
  - **vi:** *"Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất."*
  - **en:** *"This application was just updated by another user. Please refresh to see the latest status."*
* `pipeline.tooltips.*`:
  - `invalidTransition`: *"Không thể chuyển từ {from} sang {to}"* / *"Cannot transition from {from} to {to}"*
  - `cannotMoveHired`: *"Ứng viên đã HIRED không thể quay lại {to}"* / *"Candidate is HIRED and cannot transition to {to}"*
  - `cannotMoveRejected`: *"Ứng viên đã REJECTED không thể chuyển sang {to}"* / *"Candidate is REJECTED and cannot transition to {to}"*
  - `dragNotAllowed`: *"Không thể kéo ứng viên sang giai đoạn này"* / *"Cannot drag candidate to this stage"*

---

## 4. PART C: Verification Evidence

### 4.1 Unit Tests for `canTransition` (C1)
File: `frontend/src/lib/stages.spec.ts` (10 tests, 100% pass)
* `APPLIED` $\rightarrow$ `SCREENING`: `true` (Valid)
* `APPLIED` $\rightarrow$ `HIRED`: `false` (Blocked: skipping stages prohibited)
* `SCREENING` $\rightarrow$ `APPLIED`: `false` (Blocked: backward transition prohibited)
* `HIRED` $\rightarrow$ `APPLIED`: `false` (Blocked: terminal state)
* `REJECTED` $\rightarrow$ `OFFER`: `false` (Blocked: terminal state)
* `APPLIED` $\rightarrow$ `APPLIED`: `true` (No-op identity)
* `null` / `undefined`: `false` (Fail-safe)
* `getTransitionDisabledReason`: Returns expected localized reasons.

### 4.2 Component Tests for `StageSelector` (C2)
File: `frontend/src/components/jobs/pipeline/stage-selector.spec.tsx` (5 tests, 100% pass)
* When `currentStage === "SCREENING"`: Dropdown omits `APPLIED`.
* Clicking valid option (`INTERVIEW`): Triggers `onSelectStage("INTERVIEW")`.
* Button variant: `APPLIED` button is `disabled`, includes `title="Cannot transition from SCREENING to APPLIED"`, click events ignored.
* When candidate is `HIRED`: All buttons disabled with respective tooltips.

### 4.3 Component Tests for Kanban Drag & Drop (C3)
File: `frontend/src/components/jobs/pipeline/pipeline-drag-drop.spec.tsx` (3 tests, 100% pass)
* Drag `APPLIED` $\rightarrow$ `SCREENING`: Valid, API dispatched with `{ candidateId, toStage: "SCREENING" }`, no error toast.
* Drag `SCREENING` $\rightarrow$ `APPLIED`: Invalid, API **NOT** dispatched, toast alerts *"Cannot transition from SCREENING to APPLIED"*.
* Drag `HIRED` $\rightarrow$ `APPLIED`: Invalid terminal, API **NOT** dispatched, toast alerts *"Candidate is HIRED..."*.

### 4.4 Full Test Suite Execution Results
```text
backend test:  Test Files  25 passed (25)
backend test:       Tests  218 passed (218)
backend test:    Duration  27.97s

frontend test: Test Files  23 passed (23)
frontend test:      Tests  126 passed (126)
frontend test:   Duration  28.24s

TOTAL: 48 test files, 344 passed tests, 0 failed.
```

---

## 5. Process Improvement & Lessons Learned

### 5.1 Root Cause
This issue stemmed from an **INTEGRATION GAP**: In Phase 3, backend state machine guards were hardened without corresponding client-side validation, allowing UI actions that generated HTTP 400 errors.

### 5.2 CI Guard Recommendations
State machine modifications require closed-loop governance:
1. **Shared Contract:** Define types, transitions, and errors in `@haihire/shared`.
2. **Backend Enforcement:** Guard service methods, throwing domain `AppBadRequestException`.
3. **Frontend Alignment:** Integrate pre-flight validation in the UI (disable buttons, filter options, display explanatory tooltips).
4. **Full-stack Integration Tests:** Unit test backend rejections and component test frontend UI controls.
5. **i18n Coverage:** Add localized entries to `vi.ts` and `en.ts` prior to committing.

---

## 6. Sign-Off Checklist

* [x] **Bug permanently resolved:** Impossible to drag/click from `SCREENING` to `APPLIED` in the UI.
* [x] **Zero Raw JSON:** All network errors format cleanly through i18n into toasts.
* [x] **State synchronization:** TanStack query cache refreshes on error to preserve UI-database parity.
* [x] **Test suite expanded:** Reached **344 passed tests** (+19 over baseline 325).
* [x] **Zero regressions:** Backend maintains 218 passes, DtoPipe CI Gate at 100%, linter at 0 errors, TypeScript at 0 errors.
* [x] **Ready for production deployment.**
