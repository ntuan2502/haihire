# Technical Verification Report #04: Frontend 409 Conflict Handling (Stage Conflict)
> **Report for DeepSeek & Project Owner (Single Source of Truth - Frontend UX & Concurrency Handling)**  
> **Project:** HaiHire Enterprise ATS Platform  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Date:** 2026-10-07  
> **Report ID:** `DOCS-REP-04`

---

## Table of Contents
1. [FRONTEND 409 HANDLING OVERVIEW] Error code mapping mechanism via `getApiErrorMessage`
2. [I18N DISPLAY MESSAGING] User-facing messaging during stage conflict
3. [DETAILED API INVOCATIONS & REFETCH BEHAVIOR ACROSS SCREENS]
   - Screen 1: Kanban Pipeline Board (`pipeline/page.tsx`)
   - Screen 2: Application Detail View (`applications/[id]/page.tsx`)
   - Screen 3: Applications Data Table (`applications-data-table.tsx`)
   - Screen 4: Schedule Interview Modal (`schedule-interview-modal.tsx`)
4. [UX AUDIT EVALUATION] Risk of generic notifications
5. [SUMMARY & ARCHITECTURAL RECOMMENDATIONS] Action items for DeepSeek & Frontend Team

---

## 1. [FRONTEND 409 HANDLING OVERVIEW]

- **Is error code `APPLICATION_STAGE_CONFLICT` (409) handled?** **YES.**
- **Handling Mechanism:**  
  When the backend throws `AppConflictException(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT)` with HTTP status 409:
  ```json
  {
    "statusCode": 409,
    "code": "APPLICATION_STAGE_CONFLICT",
    "message": "Application stage conflict: the application has been modified by another request. Current stage is no longer 'APPLIED'."
  }
  ```
  All `updateStage` calls across the UI are wrapped in `try/catch` blocks and pass errors through the standardized utility [`getApiErrorMessage(err, t)`](../../frontend/src/lib/api-error.ts#L15-L52) in [`frontend/src/lib/api-error.ts`](../../frontend/src/lib/api-error.ts).
- This function extracts `payload.code === "APPLICATION_STAGE_CONFLICT"` and maps it directly to the translation key `errors.APPLICATION_STAGE_CONFLICT`.

---

## 2. [I18N DISPLAY MESSAGING] What Does the User See?

The system **DOES NOT display generic errors**. Instead, users receive an actionable, context-aware notification:

### 2.1 Vietnamese ([`frontend/src/i18n/locales/vi.ts:L89`](../../frontend/src/i18n/locales/vi.ts#L89)):
```typescript
APPLICATION_STAGE_CONFLICT: "Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất.",
```

### 2.2 English ([`frontend/src/i18n/locales/en.ts:L89`](../../frontend/src/i18n/locales/en.ts#L89)):
```typescript
APPLICATION_STAGE_CONFLICT: "This application was just updated by another user. Please refresh to see the latest status.",
```

### 2.3 Unit Testing for Error Mapping:
Verified in the test suite in [`frontend/src/lib/api-error.spec.ts:L90-110`](../../frontend/src/lib/api-error.spec.ts#L90-L110) and [`L146-175`](../../frontend/src/lib/api-error.spec.ts#L146-L175):
```typescript
it("translates APPLICATION_STAGE_CONFLICT (HTTP 409) with Vietnamese message", async () => { ... });
it("translates APPLICATION_INVALID_STAGE_TRANSITION and APPLICATION_STAGE_CONFLICT in English", async () => { ... });
```

---

## 3. [DETAILED API INVOCATIONS & REFETCH BEHAVIOR ACROSS SCREENS]

Inspected all 4 invocations of `updateStageMutation.mutateAsync` across the frontend:

### 3.1 Screen 1: Kanban Pipeline Board (Drag-and-drop Candidate Stages)
- **File:** [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx)
- **Line Location:** [Lines 410 to 418](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L410-L418)
- **Source Code:**
  ```typescript
  } catch (err) {
    console.error("Failed to move candidate stage", err);
    // 1. Display specific 409 Conflict toast error
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // 2. AUTOMATIC REFETCH: Invalidate queries to sync Kanban card to latest actual stage
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
  }
  ```
- **UX Behavior:** When a recruiter encounters a conflict while moving a card, the toast displays the conflict notification, while the client **automatically refetches in the background** to place the card in its accurate database stage.

---

### 3.2 Screen 2: Application Detail View
- **File:** [`frontend/src/app/dashboard/applications/[id]/page.tsx`](../../frontend/src/app/dashboard/applications/[id]/page.tsx)
- **Line Location:** [Lines 213 to 219](../../frontend/src/app/dashboard/applications/[id]/page.tsx#L213-L219)
- **Source Code:**
  ```typescript
  } catch (err) {
    console.error("Failed to update stage:", err);
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // AUTOMATIC REFETCH for both application list and active detail view
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["application", appIdStr] });
  }
  ```
- **UX Behavior:** Toast presents the conflict error, and the view **automatically refetches**, advancing the stage progress bar to the actual remote state.

---

### 3.3 Screen 3: Applications Data Table
- **File:** [`frontend/src/components/applications/applications-data-table.tsx`](../../frontend/src/components/applications/applications-data-table.tsx)
- **Line Location:** [Lines 446 to 451](../../frontend/src/components/applications/applications-data-table.tsx#L446-L451)
- **Source Code:**
  ```typescript
  } catch (err) {
    console.error("Failed to update stage:", err);
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // AUTOMATIC REFETCH for data table
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  }
  ```
- **UX Behavior:** When changing stage from the table dropdown, conflicts trigger an explanatory toast and the table **automatically refetches** the affected row.

---

### 3.4 Screen 4: Schedule Interview Modal
- **File:** [`frontend/src/components/interviews/schedule-interview-modal.tsx`](../../frontend/src/components/interviews/schedule-interview-modal.tsx)
- **Line Location:** [Lines 223 to 226](../../frontend/src/components/interviews/schedule-interview-modal.tsx#L223-L226)
- **Source Code:**
  ```typescript
  } catch (err) {
    console.error("Schedule interview failed:", err);
    setFormError(getApiErrorMessage(err, t));
  }
  ```
- **UX Behavior:** When scheduling an interview that auto-advances the application to `INTERVIEW`, 409 conflicts render inline within the modal form: "This application was just updated by another user...".  
  *(Note: This modal relies on parent view invalidation upon closure)*.

---

## 4. [UX AUDIT EVALUATION]

| Criteria | Verdict | Verification Details |
| :--- | :---: | :--- |
| **Are generic toasts emitted?** | **NO** | 100% of screens use `getApiErrorMessage(err, t)`, extracting `APPLICATION_STAGE_CONFLICT` and rendering an explanatory message. |
| **Is automatic refetching performed?** | **YES (3/4 primary screens)** | All 3 primary views (Kanban board, Detail view, Data table) call `queryClient.invalidateQueries(...)` in `catch` blocks to reconcile server truth. |
| **Kanban drag-and-drop UX:** | **Resilient** | During 409 collisions, cards do not stick to incorrect columns; they resynchronize seamlessly after query invalidation executes. |

---

## 5. [SUMMARY & ARCHITECTURAL RECOMMENDATIONS]

### Strengths:
- Synchronized contracts between backend `APP_ERROR_CODES`, `getApiErrorMessage`, and `vi.ts`/`en.ts` dictionaries operate reliably, completely preventing uninformative generic error toasts.
- Catch blocks across primary views actively invalidate TanStack Query cache.

### Recommended Enhancements:
1. **Add `onError` invalidation to `useUpdateStageMutation` hook:**  
   In [`frontend/src/hooks/use-application-queries.ts:L103-120`](../../frontend/src/hooks/use-application-queries.ts#L103-L120), `invalidateQueries` is currently configured only on `onSuccess`. Adding `onError: () => queryClient.invalidateQueries(...)` at the base hook level guarantees that **all future components** automatically resynchronize even if component authors omit cache invalidation in local catch blocks.
2. **"Refresh Now" Toast Action:**  
   While background queries automatically resynchronize state, adding an explicit `action: { label: "Refresh", onClick: () => window.location.reload() }` to the Sonner toast gives users explicit control and reassurance.
