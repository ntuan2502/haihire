# Báo Cáo Kỹ Thuật: Task #3 — Prometheus Alert Rules Cho BullMQ

**Dự án:** HaiHire Enterprise ATS  
**Tác giả:** Senior Software Engineer / Antigravity Agent  
**Ngày thực hiện:** 07/10/2026  
**Trạng thái:** ✅ HOÀN THÀNH TOÀN DIỆN (APPROVED & VERIFIED)  
**Branch:** `feat/task-03-prometheus-alert-rules`  
**Tài liệu tham chiếu:** [docs/DEFINITION_OF_DONE.md](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md), [monitoring/prometheus/alert-rules.yml](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)

---

## 1. Tóm Tắt Kết Quả (Executive Summary)

- **Đóng kín lỗ hổng giám sát cuối cùng:** Đã bổ sung 4 Prometheus alert rules mới chuyên trách cho BullMQ async job queues và DLQ vào [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml).
- **Chuẩn hóa toàn diện:** Toàn bộ 11 rules (7 rules cũ + 4 rules mới) được chuẩn hóa với nhãn bắt buộc `team: sre`, phân loại độ nghiêm trọng (`critical` / `high` / `warning`), cùng liên kết tài liệu runbook hướng dẫn xử lý sự cố chi tiết trong phần annotation.
- **Tài liệu tác chiến đầy đủ (3 Runbooks mới):** Tạo mới 3 tài liệu vận hành SRE actionable với đầy đủ 5 bước chuẩn (Khi nào alert fire, Verify, Diagnose, Mitigate, Resolve, Post-mortem):
  1. [`docs/runbooks/dlq-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/dlq-recovery.md)
  2. [`docs/runbooks/email-queue.md`](file:///c:/Workspaces/haihire/docs/runbooks/email-queue.md)
  3. [`docs/runbooks/redis-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/redis-recovery.md)
- **CI Architecture Gate 6:** Viết script tự động kiểm thử cú pháp PromQL và schema [`scripts/check-prometheus-rules.ts`](file:///c:/Workspaces/haihire/scripts/check-prometheus-rules.ts). Tích hợp vào `package.json` (`lint:prometheus-rules`), `scripts/check-all.ts` và GitHub Actions `.github/workflows/ci-cd.yml`.
- **Test Suite & Verification:**
  - Viết bộ test kiểm thử [`monitoring/prometheus/alert-rules.spec.ts`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.spec.ts) (8 test cases).
  - `pnpm check:all:fast`: 🟢 **9/9 CI Gates PASSED**.
  - `pnpm test`: 🟢 **515/515 Unit Tests PASSED** (359 backend & monitoring + 156 frontend).

---

## 2. Chi Tiết 4 Alert Rules Mới Cho BullMQ

| Tên Alert | Biểu Thức PromQL | Thời Gian Kích Hoạt (`for`) | Mức Độ | Nhãn | Mục Đích Giám Sát |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`HaiHireBullMqDlqGrowing`** | `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 10` | `5m` | `warning` | `team: sre` | Cảnh báo sớm khi hàng đợi DLQ dọn dẹp file mồ côi bắt đầu tích tụ > 10 jobs |
| **`HaiHireBullMqDlqCritical`** | `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 100` | `2m` | `critical` | `team: sre` | Cảnh báo khẩn cấp khi DLQ tích tụ > 100 jobs, nguy cơ tràn dung lượng MinIO và nghẽn worker |
| **`HaiHireEmailQueueBacklog`** | `bullmq_queue_depth{queue="email-queue",state="waiting"} > 500` | `10m` | `warning` | `team: sre` | Cảnh báo tắc nghẽn hàng đợi gửi email hệ thống (lời mời phỏng vấn, thư ứng tuyển) |
| **`HaiHireBullMqRedisDown`** | `bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} == -1` | `2m` | `critical` | `team: sre` | Cảnh báo mất kết nối Valkey/Redis khi metric trả về giá trị lỗi `-1` |

---

## 3. Danh Sách 11 Alert Rules Sau Khi Chuẩn Hóa

Tổng số rules trong [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml) là **11 rules**:

```yaml
groups:
  - name: haihire-production-alerts
    rules:
      # --- 7 Rules Cốt Lõi Hạ Tầng & API ---
      - alert: HaiHireBackendDown          # expr: up{job="haihire-backend"} == 0, severity: critical, team: sre
      - alert: HaiHirePostgresDown         # expr: haihire_service_health{service="postgres"} == 0, severity: critical, team: sre
      - alert: HaiHireRedisDown            # expr: haihire_service_health{service="redis"} == 0, severity: critical, team: sre
      - alert: HaiHireMinioDown            # expr: haihire_service_health{service="minio"} == 0, severity: high, team: sre
      - alert: HaiHireHighHttp5xxErrorRate # expr: rate(5xx)/rate(total)*100 > 5, severity: high, team: sre
      - alert: HaiHireHighHttpLatencyP95   # expr: http_request_duration_ms{quantile="0.95"} > 1000, severity: warning, team: sre
      - alert: HaiHireHighRateLimit429Rate # expr: rate(status="429")[5m] > 50, severity: warning, team: sre

      # --- 4 Rules Giám Sát Async Queues & DLQ Mới ---
      - alert: HaiHireBullMqDlqGrowing     # expr: bullmq_queue_depth{...dlq} > 10, severity: warning, team: sre
      - alert: HaiHireBullMqDlqCritical    # expr: bullmq_queue_depth{...dlq} > 100, severity: critical, team: sre
      - alert: HaiHireEmailQueueBacklog    # expr: bullmq_queue_depth{...email} > 500, severity: warning, team: sre
      - alert: HaiHireBullMqRedisDown      # expr: bullmq_queue_depth{...queue} == -1, severity: critical, team: sre
```

---

## 4. Danh Sách 3 Runbook Vận Hành Mới

1. **[`docs/runbooks/dlq-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/dlq-recovery.md):**  
   - Hướng dẫn kiểm tra MinIO connectivity, xác thực bucket permissions, kiểm tra lỗi S3 `NoSuchKey`.
   - Lệnh xác minh: `curl -s localhost:3001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq`.
   - Lệnh kích hoạt dọn rác bù: `docker exec -it haihire-prod-backend node --import tsx scripts/cleanup-orphan-minio.ts`.
2. **[`docs/runbooks/email-queue.md`](file:///c:/Workspaces/haihire/docs/runbooks/email-queue.md):**  
   - Hướng dẫn kiểm tra SMTP port 587, trạng thái Resend/SendGrid API, kiểm tra lỗi quota HTTP 429.
   - Lệnh xác minh: `curl -s localhost:3001/metrics | grep bullmq_queue_depth | grep email-queue`.
   - Lệnh truy vấn database: `SELECT status, COUNT(*) FROM "EmailLog" WHERE "createdAt" > NOW() - INTERVAL '2 hours' GROUP BY status;`.
3. **[`docs/runbooks/redis-recovery.md`](file:///c:/Workspaces/haihire/docs/runbooks/redis-recovery.md):**  
   - Hướng dẫn chẩn đoán container crash, lỗi OOMKiller, tràn dung lượng file lưu trữ AOF/RDB.
   - Lệnh xác minh: `redis-cli -p 16379 ping`, `docker stats --no-stream haihire-prod-redis`.
   - Hướng dẫn phục hồi ngắn hạn và cấu hình chính sách `maxmemory-policy volatile-lru` dài hạn.

---

## 5. Kết Quả Chạy CI Gate `pnpm lint:prometheus-rules`

Output thực tế:
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

## 6. Kết Quả Kiểm Thử Tự Động (Unit Tests)

Tệp tin [`monitoring/prometheus/alert-rules.spec.ts`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.spec.ts) gồm 8 test cases:
1. `Case 1: Parses YAML successfully and contains at least 11 rules (7 existing + 4 new)` (✅ PASS)
2. `Case 2: Every rule has all mandatory top-level fields (alert, expr, for, labels, annotations)` (✅ PASS)
3. `Case 3: Every rule has a valid severity label (critical, high, or warning)` (✅ PASS)
4. `Case 4: Every rule has team label explicitly assigned to 'sre'` (✅ PASS)
5. `Case 5: Every rule has non-empty summary and actionable description annotations` (✅ PASS)
6. `Case 6: Alert rule names are strictly unique across all groups` (✅ PASS)
7. `Case 7: 4 new BullMQ alert rules match specified PromQL expressions, durations and severities` (✅ PASS)
8. `Case 8: All referenced runbook documentation paths exist on the filesystem` (✅ PASS)

---

## 7. Bảng Đối Soát Acceptance Criteria (DoD)

| Tiêu chí | Yêu Cầu | Kết Quả Thực Tế | Trạng Thái |
| :---: | :--- | :--- | :---: |
| 1 | 4 alert rules mới cho BullMQ | `HaiHireBullMqDlqGrowing`, `HaiHireBullMqDlqCritical`, `HaiHireEmailQueueBacklog`, `HaiHireBullMqRedisDown` | ✅ PASS |
| 2 | 7 alert rules cũ có thêm label `team: sre` | Đã thêm đầy đủ cho cả 7 rules, giữ nguyên logic gốc | ✅ PASS |
| 3 | Tất cả rules có summary + description + severity + team | 100% 11 rules tuân thủ đầy đủ schema | ✅ PASS |
| 4 | 3 runbook files mới | `dlq-recovery.md`, `email-queue.md`, `redis-recovery.md` | ✅ PASS |
| 5 | CI gate `check-prometheus-rules.ts` pass | Hoạt động chính xác, exit code 0 | ✅ PASS |
| 6 | CI gate được thêm vào workflow | Đã gắn vào `package.json`, `check-all.ts` và `.github/workflows/ci-cd.yml` | ✅ PASS |
| 7 | Test file `alert-rules.spec.ts` pass | 8/8 test cases passed | ✅ PASS |
| 8 | Không có syntax error trong `alert-rules.yml` | Đã parse và validate qua cả script CI và vitest | ✅ PASS |
| 9 | `pnpm check:all:fast` pass | **9/9 checks passed** (20.81s) | ✅ PASS |
| 10 | `pnpm test` pass | **515/515 tests passed** (0 failures) | ✅ PASS |
| 11 | Không cài dependency mới không cần thiết | Dùng `yaml` chuẩn, không đọc `.env` thật | ✅ PASS |
