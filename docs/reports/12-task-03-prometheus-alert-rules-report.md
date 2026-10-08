# Technical Report: Task #3 — Prometheus Alert Rules for BullMQ

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Antigravity Agent  
**Date:** 2026-10-07  
**Status:** ✅ FULLY COMPLETED (APPROVED & VERIFIED)  
**Branch:** `feat/task-03-prometheus-alert-rules`  
**References:** [docs/DEFINITION_OF_DONE.md](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md), [monitoring/prometheus/alert-rules.yml](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)

---

## 1. Executive Summary

- **Closing the final observability gap:** Added 4 new Prometheus alert rules specifically for BullMQ async job queues and DLQ into [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml).
- **Comprehensive standardization:** All 11 rules (7 existing + 4 new) are standardized with the mandatory `team: sre` label, severity classification (`critical` / `high` / `warning`), and actionable runbook documentation links in annotations.
- **Complete operational documentation (3 new runbooks):** Authored 3 actionable SRE runbooks covering all 5 standard steps (When alert fires, Verify, Diagnose, Mitigate, Resolve, Post-mortem):
  1. [`docs/runbooks/dlq-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/dlq-recovery.md)
  2. [`docs/runbooks/email-queue.md`](file:///c:/Workspaces/haihire/docs/runbooks/email-queue.md)
  3. [`docs/runbooks/redis-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/redis-recovery.md)
- **CI Architecture Gate 6:** Created automated PromQL syntax and schema verification script [`scripts/check-prometheus-rules.ts`](file:///c:/Workspaces/haihire/scripts/check-prometheus-rules.ts). Integrated into `package.json` (`lint:prometheus-rules`), `scripts/check-all.ts`, and GitHub Actions `.github/workflows/ci-cd.yml`.
- **Test Suite & Verification:**
  - Added test suite [`monitoring/prometheus/alert-rules.spec.ts`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.spec.ts) (8 test cases).
  - `pnpm check:all:fast`: 🟢 **9/9 CI Gates PASSED**.
  - `pnpm test`: 🟢 **515/515 Unit Tests PASSED** (359 backend & monitoring + 156 frontend).

---

## 2. Details of the 4 New BullMQ Alert Rules

| Alert Name | PromQL Expression | Firing Duration (`for`) | Severity | Labels | Monitoring Purpose |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`HaiHireBullMqDlqGrowing`** | `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 10` | `5m` | `warning` | `team: sre` | Early warning when orphan file cleanup DLQ begins accumulating > 10 jobs |
| **`HaiHireBullMqDlqCritical`** | `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 100` | `2m` | `critical` | `team: sre` | Urgent warning when DLQ accumulates > 100 jobs, risking MinIO storage growth and worker backlog |
| **`HaiHireEmailQueueBacklog`** | `bullmq_queue_depth{queue="email-queue",state="waiting"} > 500` | `10m` | `warning` | `team: sre` | Warning for email delivery backlog (interview invitations, candidate applications) |
| **`HaiHireBullMqRedisDown`** | `bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} == -1` | `2m` | `critical` | `team: sre` | Critical alert for Valkey/Redis connection loss when metric returns error value `-1` |

---

## 3. List of 11 Standardized Alert Rules

The total number of rules in [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml) is **11 rules**:

```yaml
groups:
  - name: haihire-production-alerts
    rules:
      # --- 7 Core Infrastructure & API Rules ---
      - alert: HaiHireBackendDown          # expr: up{job="haihire-backend"} == 0, severity: critical, team: sre
      - alert: HaiHirePostgresDown         # expr: haihire_service_health{service="postgres"} == 0, severity: critical, team: sre
      - alert: HaiHireRedisDown            # expr: haihire_service_health{service="redis"} == 0, severity: critical, team: sre
      - alert: HaiHireMinioDown            # expr: haihire_service_health{service="minio"} == 0, severity: high, team: sre
      - alert: HaiHireHighHttp5xxErrorRate # expr: rate(5xx)/rate(total)*100 > 5, severity: high, team: sre
      - alert: HaiHireHighHttpLatencyP95   # expr: http_request_duration_ms{quantile="0.95"} > 1000, severity: warning, team: sre
      - alert: HaiHireHighRateLimit429Rate # expr: rate(status="429")[5m] > 50, severity: warning, team: sre

      # --- 4 New Async Queues & DLQ Monitoring Rules ---
      - alert: HaiHireBullMqDlqGrowing     # expr: bullmq_queue_depth{...dlq} > 10, severity: warning, team: sre
      - alert: HaiHireBullMqDlqCritical    # expr: bullmq_queue_depth{...dlq} > 100, severity: critical, team: sre
      - alert: HaiHireEmailQueueBacklog    # expr: bullmq_queue_depth{...email} > 500, severity: warning, team: sre
      - alert: HaiHireBullMqRedisDown      # expr: bullmq_queue_depth{...queue} == -1, severity: critical, team: sre
```

---

## 4. Summary of 3 New Operational Runbooks

1. **[`docs/runbooks/dlq-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/dlq-recovery.md):**  
   - Instructions for verifying MinIO connectivity, validating bucket permissions, and debugging S3 `NoSuchKey` errors.
   - Verification command: `curl -s localhost:3001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq`.
   - Manual orphan purge command: `docker exec -it haihire-prod-backend node --import tsx scripts/cleanup-orphan-minio.ts`.
2. **[`docs/runbooks/email-queue.md`](file:///c:/Workspaces/haihire/docs/runbooks/email-queue.md):**  
   - Instructions for checking SMTP port 587, Resend/SendGrid API availability, and HTTP 429 quota limits.
   - Verification command: `curl -s localhost:3001/metrics | grep bullmq_queue_depth | grep email-queue`.
   - Database query: `SELECT status, COUNT(*) FROM "EmailLog" WHERE "createdAt" > NOW() - INTERVAL '2 hours' GROUP BY status;`.
3. **[`docs/runbooks/redis-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/redis-recovery.md):**  
   - Instructions for diagnosing container crashes, OOMKiller events, and AOF/RDB file storage exhaustion.
   - Verification commands: `redis-cli -p 16379 ping`, `docker stats --no-stream haihire-prod-redis`.
   - Short-term mitigation and long-term `maxmemory-policy volatile-lru` configuration recommendations.

---

## 5. CI Gate Execution Results: `pnpm lint:prometheus-rules`

Actual output:
```text
$ tsx scripts/check-prometheus-rules.ts
==================================================================
      CI ARCHITECTURE GATE: PROMETHEUS ALERT RULES AUDIT         
==================================================================
Groups verified: 1
Total alert rules inspected: 11
------------------------------------------------------------------
[CI GATE PASSED] All 11 Prometheus alert rules are 100% compliant!
  • Valid PromQL expr syntax verified on all rules
  • Required labels present: severity (critical/high/warning) and team: sre
  • Required annotations present: summary and actionable description
==================================================================
```

---

## 6. Automated Unit Test Results

The test file [`monitoring/prometheus/alert-rules.spec.ts`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.spec.ts) contains 8 test cases:
1. `Case 1: Parses YAML successfully and contains at least 11 rules (7 existing + 4 new)` (✅ PASS)
2. `Case 2: Every rule has all mandatory top-level fields (alert, expr, for, labels, annotations)` (✅ PASS)
3. `Case 3: Every rule has a valid severity label (critical, high, or warning)` (✅ PASS)
4. `Case 4: Every rule has team label explicitly assigned to 'sre'` (✅ PASS)
5. `Case 5: Every rule has non-empty summary and actionable description annotations` (✅ PASS)
6. `Case 6: Alert rule names are strictly unique across all groups` (✅ PASS)
7. `Case 7: 4 new BullMQ alert rules match specified PromQL expressions, durations and severities` (✅ PASS)
8. `Case 8: All referenced runbook documentation paths exist on the filesystem` (✅ PASS)

---

## 7. Acceptance Criteria Checklist (DoD)

| Criteria | Requirement | Actual Result | Status |
| :---: | :--- | :--- | :---: |
| 1 | 4 new alert rules for BullMQ | `HaiHireBullMqDlqGrowing`, `HaiHireBullMqDlqCritical`, `HaiHireEmailQueueBacklog`, `HaiHireBullMqRedisDown` | ✅ PASS |
| 2 | 7 existing alert rules updated with `team: sre` label | Added across all 7 rules, retaining original logic | ✅ PASS |
| 3 | All rules include summary + description + severity + team | 100% of 11 rules comply with schema | ✅ PASS |
| 4 | 3 new runbook documentation files | `dlq-recovery.md`, `email-queue.md`, `redis-recovery.md` | ✅ PASS |
| 5 | CI gate `check-prometheus-rules.ts` passes | Fully operational, exit code 0 | ✅ PASS |
| 6 | CI gate added to pipeline | Added to `package.json`, `check-all.ts`, and `.github/workflows/ci-cd.yml` | ✅ PASS |
| 7 | Test file `alert-rules.spec.ts` passes | 8/8 test cases passed | ✅ PASS |
| 8 | Zero syntax errors in `alert-rules.yml` | Parsed and validated via both CI script and Vitest | ✅ PASS |
| 9 | `pnpm check:all:fast` passes | **9/9 checks passed** (20.81s) | ✅ PASS |
| 10 | `pnpm test` passes | **515/515 tests passed** (0 failures) | ✅ PASS |
| 11 | Zero unnecessary dependencies added | Uses standard `yaml`, no real `.env` parsing required | ✅ PASS |
