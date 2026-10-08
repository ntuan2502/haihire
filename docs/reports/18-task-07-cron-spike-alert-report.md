# Technical Report: Task #7 — Cron Spike Alert

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Antigravity Agent  
**Date:** 2026-10-08  
**Status:** ✅ 100% COMPLETED — READY FOR DEEPSEEK REVIEW  
**Reference Documentation:** [`docs/reports/17-task-06-cron-pushgateway-metrics-report.md`](file:///c:/Workspaces/haihire/docs/reports/17-task-06-cron-pushgateway-metrics-report.md), [`docs/DEFINITION_OF_DONE.md`](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md)

---

### Task #7: Cron Spike Alert

**1. Summary**
- **Branch:** `feat/task-07-cron-spike-alert`
- **Commit:** `feat(monitoring): add spike alerts for orphan cleanup cron`
- **Files created/changed:**
  - `monitoring/prometheus/alert-rules.yml`: Added 3 new alert rules (`HaiHireOrphanCleanupSpikeWarning`, `HaiHireOrphanCleanupSpikeCritical`, `HaiHireOrphanCleanupCronMissing`) (+43 lines)
  - `monitoring/prometheus/alert-rules.spec.ts`: Updated Case 1 to assert 14 total rules and added Case 9 verifying PromQL expressions, durations, severities, and labels for the 3 new rules (+30 lines)
  - `docs/runbooks/dlq-recovery.md`: Added runbook section "Khi Orphan Cleanup Spike (HaiHireOrphanCleanupSpikeWarning/Critical)" covering verification, diagnosis, mitigation, resolution, and post-mortem (+49 lines)
  - `docs/reports/18-task-07-cron-spike-alert-report.md`: Technical task completion report (NEW)
- **Total diff:** +122 / -1 lines (excluding report)

---

**2. Implementation Notes**
- **3 New Prometheus Alert Rules:**
  1. `HaiHireOrphanCleanupSpikeWarning`:
     - PromQL: `minio_orphan_cleanup_orphans_found_total > 50`
     - Duration (`for`): `0m` (immediate alert upon cron emission)
     - Severity: `warning`, Team: `sre`
     - Actionable summary & description directing SRE to `docs/runbooks/dlq-recovery.md`.
  2. `HaiHireOrphanCleanupSpikeCritical`:
     - PromQL: `minio_orphan_cleanup_orphans_found_total > 500`
     - Duration (`for`): `0m` (immediate escalation)
     - Severity: `critical`, Team: `sre`
     - Escalates potential production upload regressions or Saga compensation failures.
  3. `HaiHireOrphanCleanupCronMissing`:
     - PromQL: `time() - minio_orphan_cleanup_last_run_timestamp_seconds > 90000`
     - Duration (`for`): `5m`
     - Severity: `critical`, Team: `sre`
     - Flags cron stalls exceeding 25 hours (standard schedule is daily at 4:00 AM UTC/ICT).
- **Rule Count Progression:**
  - Original baseline: 7 rules
  - Task #3 (BullMQ): +4 rules (total 11)
  - Task #7 (Cron Spike): +3 rules (total 14)
- **CI Gate Compatibility:**
  - `scripts/check-prometheus-rules.ts` validates all 14 rules without modification (dynamic rule parser and syntax validator).
  - All rules satisfy balanced bracket syntax, label presence (`severity`, `team: sre`), and valid descriptions.

---

**3. Test Coverage**
- **Unit & Contract Tests:**
  - File: `monitoring/prometheus/alert-rules.spec.ts`
  - Total test cases: 9/9 passing
  - Case 1: Parses YAML successfully and contains at least 14 rules (7 existing + 4 BullMQ + 3 cron spike).
  - Case 9: Verifies 3 new orphan cleanup rules have exact PromQL expressions, valid `for` duration, exact severities, and `team: sre`.
- **System Test Suite:**
  - Total test suites: 67 passed (38 backend + 29 frontend)
  - Total tests executed: 532 passing (376 backend + 156 frontend), 0 failing.

---

**4. Verification Evidence**

### `pnpm lint:prometheus-rules` Output:
```bash
$ tsx scripts/check-prometheus-rules.ts
==================================================================
      CI ARCHITECTURE GATE: PROMETHEUS ALERT RULES AUDIT         
==================================================================
Groups verified: 1
Total alert rules inspected: 14
------------------------------------------------------------------
[CI GATE PASSED] All 14 Prometheus alert rules are 100% compliant!
  • Valid PromQL expr syntax verified on all rules
  • Required labels present: severity (critical/high/warning) and team: sre
  • Required annotations present: summary and actionable description
==================================================================
```

### `pnpm test` Output:
```bash
backend test:  Test Files  38 passed (38)
backend test:       Tests  376 passed (376)
frontend test:  Test Files  29 passed (29)
frontend test:       Tests  156 passed (156)
All 532 tests passed!
```

### `pnpm check:all:fast` Output:
```bash
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.30s
  2. Two-Way i18n & Zero Hardcoded Strings      [PASS]    0.64s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   16.29s
  4. TypeScript Type Safety                     [PASS]    8.60s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.24s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.37s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.38s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.44s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.45s
 10. Test Count Delta & Anti-Regression         [PASS]    0.34s
──────────────────────────────────────────────────────────────────
 Total Time: 28.06s
 Status: 🟢 ALL CHECKS PASSED (10/10) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

### Acceptance Criteria Checklist:
- [x] 3 new alert rules for orphan cleanup spike and missing cron (`HaiHireOrphanCleanupSpikeWarning`, `HaiHireOrphanCleanupSpikeCritical`, `HaiHireOrphanCleanupCronMissing`)
- [x] Alert rules have severity + team + summary + actionable description
- [x] Total rule count = 14 (11 previous + 3 new)
- [x] Test spec updated to verify 14 rules and check specific fields (`monitoring/prometheus/alert-rules.spec.ts` Case 1 & Case 9)
- [x] Runbook `docs/runbooks/dlq-recovery.md` updated with section "Khi Orphan Cleanup Spike (HaiHireOrphanCleanupSpikeWarning/Critical)"
- [x] `pnpm lint:prometheus-rules` pass (14/14 rules compliant)
- [x] `pnpm check:all:fast` pass (10/10 quality gates pass)
- [x] `pnpm test` pass (532/532 unit & component tests pass)
- [x] All items in `docs/DEFINITION_OF_DONE.md` pass

---

**5. Detailed Artifacts**

### 5.1 New Alert Rules in `monitoring/prometheus/alert-rules.yml`
```yaml
      - alert: HaiHireOrphanCleanupSpikeWarning
        expr: minio_orphan_cleanup_orphans_found_total > 50
        for: 0m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "Orphan cleanup phát hiện {{ $value }} file orphan"
          description: |
            Cron cleanup phát hiện hơn 50 file orphan trong lần chạy gần nhất.
            Điều tra nguyên nhân rò rỉ trước khi grace period 30 ngày kết thúc.
            Có thể do bug ở luồng upload hoặc MinIO connectivity issue.
            Xem runbook: docs/runbooks/dlq-recovery.md

      - alert: HaiHireOrphanCleanupSpikeCritical
        expr: minio_orphan_cleanup_orphans_found_total > 500
        for: 0m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "CRITICAL: {{ $value }} file orphan — có thể có bug ở luồng upload"
          description: |
            Cron cleanup phát hiện hơn 500 file orphan trong lần chạy gần nhất.
            Escalate ngay. Kiểm tra MinIO connectivity + Saga rollback logic.
            Có thể có sự cố production đang xảy ra.
            Xem runbook: docs/runbooks/dlq-recovery.md

      - alert: HaiHireOrphanCleanupCronMissing
        expr: time() - minio_orphan_cleanup_last_run_timestamp_seconds > 90000
        for: 5m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Cron orphan cleanup không chạy hơn 25 giờ"
          description: |
            Timestamp lần chạy cuối của cron cleanup đã hơn 25 giờ (90000s).
            Cron được schedule chạy hàng ngày lúc 4:00 AM. Nếu không chạy →
            file orphan tích tụ không được dọn dẹp.
            Kiểm tra container "orphan-cleanup" có đang chạy không.
            Xem runbook: docs/runbooks/dlq-recovery.md
```

### 5.2 Section Added to `docs/runbooks/dlq-recovery.md`
```markdown
## Khi Orphan Cleanup Spike (HaiHireOrphanCleanupSpikeWarning/Critical)

### Verify
```bash
curl -s http://pushgateway:9091/metrics | grep minio_orphan_cleanup
```

Xem:
- `orphans_found_total`: số file orphan phát hiện
- `preserved_total`: số file trong grace period
- `last_run_timestamp_seconds`: lần chạy cuối

### Diagnose
1. Nếu `orphans_found` > 50 đột ngột → có thể do:
   - Bug ở luồng upload CV (Saga rollback không xóa file).
   - MinIO connectivity issue → upload thành công nhưng DB write fail.
   - Test data được upload không đúng cách.
2. Kiểm tra log backend gần đây:
   ```bash
   docker logs haihire-prod-backend --since 24h | grep -i "orphan\|minio"
   ```
3. Kiểm tra DLQ có tích tụ job không:
   ```bash
   curl -s localhost:3001/metrics | grep bullmq_queue_depth
   ```

### Mitigate
1. Nếu spike nhỏ (<100 files): theo dõi thêm 1-2 ngày.
2. Nếu spike lớn (>100 files): 
   - Tạm dừng cron cleanup (để giữ file làm evidence).
   - Điều tra root cause.
   - Sau khi fix → chạy manual cleanup:
     ```bash
     docker exec -it haihire-prod-orphan-cleanup node --import tsx scripts/cleanup-orphan-minio.ts
     ```

### Resolve
1. Fix root cause (Saga logic, MinIO config).
2. Verify no new orphans trong 24h tiếp theo.
3. Chạy manual cleanup để dọn file orphan tích tụ.

### Post-mortem
- Đếm chính xác số file orphan đã dọn.
- Verify không có file hợp lệ bị xóa nhầm.
- Update monitoring nếu cần thêm metric.
```

---

**6. Open Questions**
- None. All requirements adhere strictly to the project specifications.

---

**7. Files for Review**
- [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml#L127-L168)
- [`monitoring/prometheus/alert-rules.spec.ts`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.spec.ts#L37-L43)
- [`docs/runbooks/dlq-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/dlq-recovery.md#L9-L56)
- [`docs/reports/18-task-07-cron-spike-alert-report.md`](file:///c:/Workspaces/haihire/docs/reports/18-task-07-cron-spike-alert-report.md)
