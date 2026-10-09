# Technical Verification Report #05: Kanban Pipeline State Update Verification (Optimistic vs Pessimistic Update)
> **Report for DeepSeek & Project Owner (Single Source of Truth - Pipeline State Management & Concurrency UX)**  
> **Project:** HaiHire Enterprise ATS Platform  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Date:** 2026-10-07  
> **Report ID:** `DOCS-REP-05`

---

## Table of Contents
1. [EXECUTIVE SUMMARY] Pipeline state update architectural classification
2. [DETAILED ANALYSIS OF LINES 380-420 IN `pipeline/page.tsx`]
3. [HOOK AND QUERY CLIENT VERIFICATION] `useUpdateStageMutation`
4. [BEHAVIOR UPON HTTP 409 CONFLICT] Card presentation and error reaction
5. [ARCHITECTURAL TRADE-OFF ANALYSIS] Safety vs User Experience
6. [SUMMARY & REALTIME SYNCHRONIZATION RECOMMENDATIONS]

---

## 1. [EXECUTIVE SUMMARY]

- **Is there an Optimistic Update (instant card relocation prior to API call)?** **NO.**
- **Applied Architecture:** **Pessimistic Update (Server-Authoritative Pattern)**.
- **Behavioral Summary:**
  - When a user drags and drops a candidate card to a new Stage (or clicks a stage transition button), the UI **DOES NOT preemptively move the card**.
  - The client maintains the card's original position, displays an `isMovingStage = true` loading/disabled state, and awaits the HTTP response from the server.
  - Only after the server responds with `200 OK` is the card transitioned to the new Stage.
  - Upon receiving an HTTP 409 (`APPLICATION_STAGE_CONFLICT`), the card never experiences visual flickering or jumpy rollbacks because state was never speculatively altered; concurrently, TanStack Query automatically refetches to synchronize the card with actual database truth.

---

## 2. [DETAILED ANALYSIS OF LINES 380-420 IN `pipeline/page.tsx`]

Source code in [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx:L383-420`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L383-L420):

```typescript
383:   const handleMoveCandidateStage = async (
384:     newStage: ApplicationStage,
385:     overrideCandidateId?: string,
386:   ) => {
387:     const activeAppId = overrideCandidateId || selectedCandidate?.id;
388:     const candidate = jobApplications.find((a) => a.id === activeAppId) || selectedCandidate;
389:     if (!candidate) return;
390: 
391:     // PART A (A3 Prevention): Enforce state machine transition check before calling API
392:     if (!canTransition(candidate.stage, newStage)) {
393:       const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
394:       toast.error(reason);
395:       return;
396:     }
397: 
398:     try {
399:       await updateStageMutation.mutateAsync({
400:         id: candidate.id,
401:         stage: newStage,
402:       });
403:       setSelectedStage(newStage);
404:       const newParams = new URLSearchParams(searchParams.toString());
405:       newParams.set("stage", newStage);
406:       newParams.set("applicationId", candidate.id);
407:       router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
408:         scroll: false,
409:       });
410:     } catch (err) {
411:       console.error("Failed to move candidate stage", err);
412:       // PART B (B2 & B4 Defense in Depth): Pass all errors through getApiErrorMessage -> i18n
413:       const errorMsg = getApiErrorMessage(err, t);
414:       toast.error(errorMsg);
415:       // Refresh / sync Kanban queries
416:       queryClient.invalidateQueries({ queryKey: ["applications"] });
417:       queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
418:     }
419:   };
```

### Code Evidence Confirming Absence of Optimistic Update:
1. **Before `await updateStageMutation.mutateAsync` (Lines 383-398):**
   - Only validates stage transitions via the local state machine check `canTransition(candidate.stage, newStage)`.
   - **Zero statements mutate UI state** (no `setJobApplications`, no `queryClient.setQueryData`).
2. **Line 399:** The API call is `await`ed. Execution halts until the server returns.
3. **Only on API Success (Lines 403-407):**
   - `setSelectedStage(newStage)` and `router.replace(...)` are triggered.
   - Cards and lists are synchronized via TanStack Query's cache.

---

## 3. [HOOK AND QUERY CLIENT VERIFICATION]

Inspected hook `useUpdateStageMutation` in [`frontend/src/hooks/use-application-queries.ts:L103-120`](../../frontend/src/hooks/use-application-queries.ts#L103-L120):

```typescript
export function useUpdateStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      stage,
      orderIndex,
    }: {
      id: string;
      stage: ApplicationStage;
      orderIndex?: number;
    }) => applicationsApi.updateStage(id, stage, orderIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
```

- The hook **omits an `onMutate` callback** (typically used to back up previous state and speculatively write optimistic data into cache).
- The hook exclusively declares `mutationFn` and `onSuccess`.

---

## 4. [BEHAVIOR UPON HTTP 409 CONFLICT]

When 2 Recruiters perform conflicting operations on a candidate profile (or the server rejects a stale transition via `APPLICATION_STAGE_CONFLICT`):

1. `await updateStageMutation.mutateAsync` rejects with HTTP 409.
2. Execution halts at line 399 and enters the `catch (err)` block at line 410.
3. State advancement commands (lines 403-407) **are completely skipped**.
4. **Visual Card Presentation:**
   - The card remains stationary in its original column, avoiding visual snapping or erratic rollback animations.
   - Toast renders localized notice: *"This application was recently modified by another user. Please refresh the page to view the latest status."* ([`vi.ts:L89`](../../frontend/src/i18n/locales/vi.ts#L89)).
   - Lines 416-417 execute:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ["applications"] });
     queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
     ```
     This triggers a refetch from PostgreSQL, rendering the card in the correct position updated by the earlier collaborator.

---

## 5. [ARCHITECTURAL TRADE-OFF ANALYSIS]

| Dimension | Optimistic Update | Pessimistic Update (HaiHire Implementation) |
| :--- | :--- | :--- |
| **Perceived Latency** | Instantaneous (0ms) | Dependent on network roundtrip (~50 - 150ms) |
| **Data Integrity** | Desynchronization risk upon failed rollbacks | **Strict Single Source of Truth** |
| **UX on Conflict (409)** | Card jumps forward then bounces backward (disorienting) | **Zero flicker**, card remains stable and refetches |
| **Code Complexity** | High (snapshot backups, query cancellations, error rollbacks) | **Clean, testable, zero client race conditions** |

In an Enterprise Applicant Tracking System (ATS), preserving pipeline state integrity across concurrent hiring team actions outweighs shaving tens of milliseconds off drag-and-drop animations. Hence, this design is intentional, deterministic, and resilient.

---

## 6. [SUMMARY & REALTIME SYNCHRONIZATION RECOMMENDATIONS]

1. **Conclusion:** Stage updates in `pipeline/page.tsx` follow a **Pessimistic Update** strategy, ensuring full resilience against concurrent update conflicts.
2. **Future Enhancement Recommendation:**  
   To retain the safety of Pessimistic Updates while eliminating latency perception, integrate **Server-Sent Events (SSE)** or WebSockets into the Kanban Pipeline. When Recruiter A updates a candidate, Recruiter B's pipeline board will synchronize in real time before Recruiter B attempts an overlapping modification.
