# Technical Verification Report #03: Concurrency (Lost Update) & Orphan Cron Audit
> **Report for DeepSeek & Project Owner (Single Source of Truth - Concurrency & Cron Reliability)**  
> **Project:** HaiHire Enterprise ATS Platform  
> **Author:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Date:** 2026-10-06  
> **Report ID:** `DOCS-REP-03`

---

## Table of Contents
1. [LOST UPDATE & CONCURRENCY] Anti-Lost Update mechanism during stage updates in `applications.service.ts`
2. [CONCURRENCY TEST] Race Condition testing / 2 Concurrent updates by users
3. [CRON SAFETY NET & OBSERVABILITY] Visibility, logging, and alerting in `scripts/cleanup-orphan-minio.ts`
4. [RISK SUMMARY & ARCHITECTURAL RECOMMENDATIONS] Action items for DeepSeek & Project Owner

---

## 1. [LOST UPDATE & CONCURRENCY] Mechanism in `applications.service.ts`

Inspected the `updateStage(id, dto, tenantOrgId)` method in [`backend/src/applications/applications.service.ts:L786-816`](../../backend/src/applications/applications.service.ts#L786-L816):

### 1.1 Audit Findings
- **Is there a version column / optimistic locking (`WHERE version = X`)?**
  - **Version column:** **NO**. The `Application` table has no `version: Int` column.
  - **Optimistic Locking:** **YES!** The system uses the business state `stage` itself as the **Optimistic Concurrency Predicate**: `WHERE id = :id AND stage = :oldStage`.
- **Does it use `SELECT ... FOR UPDATE` (row-level lock)?**
  - **NO.** Does not use row-level locks or pessimistic locking.
- **Does it use transactions with an isolation level higher than `READ COMMITTED`?**
  - **NO.** The `updateStage` operation does not open a transaction with `REPEATABLE READ` or `SERIALIZABLE`. It executes a single `update` statement via the default database connection pool (`READ COMMITTED`).

### 1.2 Code Evidence
In [`backend/src/applications/applications.service.ts:L787-816`](../../backend/src/applications/applications.service.ts#L787-L816):
```typescript
async updateStage(id: string, dto: UpdateStageDto, tenantOrgId?: string | null) {
  const existing = await this.findOne(id, tenantOrgId);
  const oldStage = existing.stage; // Read current stage (e.g. APPLIED)

  // 1. Validate state machine transition
  if (dto.stage !== oldStage) {
    const allowedNextStages = (VALID_APPLICATION_STAGE_TRANSITIONS as Record<string, readonly string[]>)[oldStage] || [];
    if (!allowedNextStages.includes(dto.stage)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.APPLICATION_INVALID_STAGE_TRANSITION,
        `Cannot transition application stage from '${oldStage}' to '${dto.stage}'...`,
        { currentStage: oldStage, targetStage: dto.stage },
      );
    }
  }

  // 2. OPTIMISTIC CONCURRENCY CONTROL: Conditional update on prior stage
  const updatedRecord = await this.prisma.db.orm.public.Application
    .where((a) => a.id.eq(id))
    .where((a) => a.stage.eq(oldStage)) // <-- Prevents Lost Update here!
    .update({
      stage: dto.stage,
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
    });

  // 3. Handle conflict when another concurrent request updated first
  if (!updatedRecord) {
    throw new AppConflictException(
      APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
      `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
      { currentStage: oldStage, targetStage: dto.stage },
    );
  }
  // ...
}
```

### 1.3 Concurrency Defense:
If User A and User B open the application when the status is `APPLIED`:
- User A submits a transition to `SCREENING`.
- User B simultaneously submits a transition to `REJECTED`.
- Whichever request reaches PostgreSQL first succeeds (because `stage = 'APPLIED'`).
- The subsequent request evaluates `WHERE id = :id AND stage = 'APPLIED'`, but the database row has already changed $\rightarrow$ the update returns `null` (no records affected).
- The system detects `!updatedRecord` and immediately throws **`AppConflictException` (HTTP 409 Conflict)** with error code `APPLICATION_STAGE_CONFLICT`.
- **Conclusion:** **LOST UPDATE RISK IS FULLY MITIGATED** through state-based optimistic locking.

---

## 2. [CONCURRENCY TEST] Race Condition Testing for Concurrent User Updates

### 2.1 Audit Findings
- **Is there a test simulating 2 users/requests simultaneously updating an application?** **YES.**
- **Test file:** [`backend/src/applications/applications.service.spec.ts`](../../backend/src/applications/applications.service.spec.ts)
- **Test name:** `should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict`
- **Location:** [Lines 567 to 582](../../backend/src/applications/applications.service.spec.ts#L567-L582)

### 2.2 Test Code Evidence
```typescript
// backend/src/applications/applications.service.spec.ts:L567-582
it("should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict", async () => {
  // app-1 starts at APPLIED. Both see APPLIED.
  const p1 = service.updateStage("app-1", { stage: ApplicationStage.SCREENING });
  const p2 = service.updateStage("app-1", { stage: ApplicationStage.REJECTED });

  // Simulate parallel competing requests
  const results = await Promise.allSettled([p1, p2]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  // Exactly one succeeds and one fails
  expect(fulfilled.length).toBe(1);
  expect(rejected.length).toBe(1);

  // Failed request receives HTTP 409 Conflict with exact error code
  const err = (rejected[0] as PromiseRejectedResult).reason;
  expect(err).toBeInstanceOf(AppConflictException);
  expect(err.code).toBe(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT);
});
```

---

## 3. [CRON SAFETY NET & OBSERVABILITY] Mechanics in `scripts/cleanup-orphan-minio.ts`

Inspected [`scripts/cleanup-orphan-minio.ts`](../../scripts/cleanup-orphan-minio.ts) and core logic in [`backend/src/common/orphan-cleanup.ts`](../../backend/src/common/orphan-cleanup.ts):

### 3.1 Logging / Metrics for Cleaned Files Count
- **STDOUT Logging:** **EXPLICIT AND COMPREHENSIVE.**  
  Upon completion, the script prints a structured summary to console (STDOUT) in [`scripts/cleanup-orphan-minio.ts:L45-59`](../../scripts/cleanup-orphan-minio.ts#L45-L59):
  ```typescript
  console.log(`Total Objects Scanned:     ${report.scannedCount}`);
  console.log(`Active DB References:      ${report.dbRefCount}`);
  console.log(`Orphan Objects Found:      ${report.orphanCount}`);
  console.log(`  - Preserved (< ${thresholdDays}d):     ${report.preservedGraceCount}`);
  console.log(`  - ${isDryRun ? "Eligible for Deletion" : "Deleted"}:      ${report.deletedCount}`);
  console.log(`Storage Space Freed:       ${(report.bytesFreed / (1024 * 1024)).toFixed(2)} MB (${report.bytesFreed} bytes)`);

  if (report.deletedFiles.length > 0) {
    console.log(`\nFiles ${isDryRun ? "identified for deletion" : "deleted"}:`);
    report.deletedFiles.slice(0, 20).forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    // ...
  }
  ```
- **Metrics:** **NONE (Prior to Task #6).**  
  No Prometheus Pushgateway or Counter/Gauge metric was originally reported to `MetricsService`.
- **Log Retention Limitations:** The script executes as a standalone cron container (`orphan-cleanup` in `docker-compose.prod.yml` at `0 4 * * *`). Logs reside in Docker logging daemon (`json-file`); without a centralized log aggregator (Vector, Promtail, FluentBit), SREs must manually run `docker logs`.

### 3.2 Alerting for Orphan Count Spikes (> N files)
- **NONE.**
- The code originally lacked threshold alerting logic:
  ```typescript
  // DID NOT EXIST IN ORIGINAL IMPLEMENTATION:
  if (report.orphanCount > THRESHOLD_LIMIT) {
    sendAlertToSlackOrEmail(...);
  }
  ```
- Regardless of finding 1 file or 10,000 orphan files (indicating an application leak or bug in candidate submission), the script silently printed to STDOUT and exited with code 0.

---

## 4. [RISK SUMMARY & ARCHITECTURAL RECOMMENDATIONS]

| Category | Assessment | Risk Level | Architectural Action Items |
| :--- | :--- | :---: | :--- |
| **Lost Update (Stage updates)** | Uses State-based Optimistic Locking (`WHERE stage = :oldStage`) & verified via 409 Conflict race condition tests. | **Low (Mitigated)** | No need for a `version` column. Current mechanism is clean, lightweight, and robust. |
| **Orphan Cleanup Metrics** | Detailed console logs to STDOUT but **lacks Prometheus metrics**. | **Medium** | Implemented Pushgateway integration in Task #6 with `minio_orphan_files_cleaned_total` and `minio_orphan_bytes_freed_total` counters. |
| **Orphan Spike Alerting** | **Lacked threshold alerts** when orphan count spiked (> N files). | **High** | **RESOLVED IN TASK #6:** Added Pushgateway metrics and alert threshold logic to notify SREs when orphan count exceeds defined bounds. |
