# Báo Cáo Kỹ Thuật: Task #6 — Cron Pushgateway Metrics

**Dự án:** HaiHire Enterprise ATS  
**Tác giả:** Senior Software Engineer / Antigravity Agent  
**Ngày thực hiện:** 08/10/2026  
**Trạng thái:** ✅ HOÀN THÀNH 100% — SẴN SÀNG CHỜ DEEPSEEK REVIEW  
**Tài liệu tham chiếu:** [docs/reports/16-task-05-followup-and-task-06-kickoff-report.md](file:///c:/Workspaces/haihire/docs/reports/16-task-05-followup-and-task-06-kickoff-report.md), [docs/DEFINITION_OF_DONE.md](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md)

---

### Task #6: Cron Pushgateway Metrics

**1. Summary**
- **Branch:** `feat/task-06-cron-pushgateway-metrics`
- **Commit:** `291094a` (`feat(monitoring): push orphan cleanup metrics to pushgateway`)
- **Remote:** Đã push lên `origin/feat/task-06-cron-pushgateway-metrics`
- **Files created/changed:**
  - `docker-compose.prod.yml`: Thêm `pushgateway` service và biến `PUSHGATEWAY_URL` cho container `orphan-cleanup` (+24 lines)
  - `.env.example`: Thêm `PUSHGATEWAY_PORT` và `PUSHGATEWAY_URL` (+6 lines)
  - `.env.production.example`: Thêm cấu hình Pushgateway (+6 lines)
  - `backend/.env.example`: Thêm cấu hình Pushgateway (+6 lines)
  - `frontend/.env.example`: Thêm `PUSHGATEWAY_PORT` (+5 lines)
  - `.github/workflows/ci-cd.yml`: Đồng bộ biến môi trường Pushgateway cho CI runner (+3 lines)
  - `scripts/cleanup-orphan-minio.ts`: Thêm `pushMetrics()` và `pushFailureMetric()` (+97 lines)
  - `scripts/cleanup-orphan-minio.spec.ts`: Unit test suite kiểm thử toàn diện 7 kịch bản (+186 lines - TẠO MỚI)
- **Total diff:** +333 / -0 lines

---

**2. Implementation Notes**
- **Không cài thêm SDK bên thứ ba:** Sử dụng `fetch()` HTTP POST có sẵn trong runtime Node.js, tuân thủ nghiêm ngặt định dạng Prometheus exposition text format.
- **Khả năng chịu lỗi cao (Non-throwing Resiliency):** 
  - Toàn bộ thao tác gửi metric trong `pushMetrics()` và `pushFailureMetric()` đều được bọc trong `try/catch`. 
  - Trong trường hợp Pushgateway bị tắt, sập mạng hoặc trả về mã lỗi HTTP 5xx, cron log ra console cảnh báo và **vẫn kết thúc với exit code 0 bình thường**, không làm crash luồng dọn dẹp orphan files.
- **Xử lý trạng thái thất bại (Failure status push):**
  - Khi script dọn dẹp gặp lỗi nghiêm trọng (ném ngoại lệ trong `runCli()`), hàm `pushFailureMetric()` sẽ gửi metric `minio_orphan_cleanup_success 0` lên Pushgateway trước khi gọi `process.exit(1)`.
- **Đủ 7 metrics theo đặc tả:**
  1. `minio_orphan_cleanup_scanned_total` (gauge): Tổng số đối tượng MinIO được quét.
  2. `minio_orphan_cleanup_orphans_found_total` (gauge): Tổng số file orphan phát hiện (chuẩn bị dữ liệu cho Task #7).
  3. `minio_orphan_cleanup_preserved_total` (gauge): Số file orphan còn trong thời gian ân hạn (grace period).
  4. `minio_orphan_cleanup_deleted_total` (gauge): Số file orphan đã xóa vĩnh viễn.
  5. `minio_orphan_cleanup_bytes_freed_total` (gauge): Dung lượng dung lượng byte giải phóng.
  6. `minio_orphan_cleanup_last_run_timestamp_seconds` (gauge): Unix timestamp thời điểm chạy gần nhất.
  7. `minio_orphan_cleanup_success` (gauge): Trạng thái hoàn thành (1 = thành công, 0 = thất bại).

---

**3. Diff Docker Compose Service**

```diff
--- a/docker-compose.prod.yml
+++ b/docker-compose.prod.yml
@@ -253,6 +253,7 @@ services:
       MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
       MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
       MINIO_BUCKET_NAME: ${MINIO_BUCKET_NAME:-haihire-resumes}
+      PUSHGATEWAY_URL: ${PUSHGATEWAY_URL:-http://pushgateway:9091}
     depends_on:
       postgres:
         condition: service_healthy
@@ -270,6 +271,29 @@ services:
           cpus: "0.1"
           memory: 128M
 
+  # ------------------------------------------------------------------------------
+  # 7. Prometheus Pushgateway Service (Metrics for Batch & Cron Jobs)
+  # ------------------------------------------------------------------------------
+  pushgateway:
+    image: prom/pushgateway:v1.10.0
+    container_name: haihire-prod-pushgateway
+    restart: unless-stopped
+    ports:
+      - "${PUSHGATEWAY_PORT:-9091}:9091"
+    networks:
+      - haihire-prod-network
+    logging: *prod-logging
+    deploy:
+      resources:
+        limits:
+          memory: 64M
+    healthcheck:
+      test: [ "CMD", "wget", "--spider", "-q", "http://localhost:9091/-/healthy" ]
+      interval: 30s
+      timeout: 5s
+      retries: 3
+      start_period: 10s
```

---

**4. Test Coverage**
- **Unit test file:** [`scripts/cleanup-orphan-minio.spec.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.spec.ts)
- **Số lượng test cases:** **7 test cases** (+7 net new tests)
  1. `Test 1:` Gửi metrics hợp lệ lên Pushgateway khi có `report` đầy đủ (kiểm tra URL và HTTP POST method).
  2. `Test 2:` Kiểm tra nội dung body chứa chính xác 7 định nghĩa HELP/TYPE và giá trị metric tương ứng.
  3. `Test 3:` Bỏ qua gửi metrics và ghi log info nếu không cấu hình `PUSHGATEWAY_URL`, không gọi `fetch`.
  4. `Test 4:` Xử lý khi Pushgateway trả về lỗi HTTP 500 một cách êm thấm (không throw exception).
  5. `Test 5:` Xử lý khi `fetch()` throw ngoại lệ mạng (Network Error/Fetch Failed) mà không làm crash cron.
  6. `Test 6:` Xác nhận metric `minio_orphan_cleanup_success 1` được đẩy lên khi chạy thành công.
  7. `Test 7:` Xác nhận metric `minio_orphan_cleanup_success 0` được đẩy lên khi tác vụ gặp lỗi thất bại.
- **Tổng số kiểm thử hệ thống:** **531/531 tests PASSED** (156 frontend + 375 backend).

---

**5. Verification Evidence**

#### 5.1. CI Gates & Lint
- `pnpm check:all:fast`: **10/10 CỔNG KIỂM TRA ĐẠT TUYỆT ĐỐI (PASS)** trong 71.07s.
- `pnpm test`: **531 passing** (0 failing).
- `pnpm lint:env-sync`: **PASS** (100% đồng bộ key trên 5 file `.env.example` và compose file).

#### 5.2. Manual Verification với Container Thật (`prom/pushgateway:v1.10.0`)
1. **Khởi chạy Pushgateway container:**
   ```bash
   docker run -d -p 9091:9091 --name test-pushgateway prom/pushgateway:v1.10.0
   ```
2. **Chạy script với biến môi trường:**
   ```bash
   $env:PUSHGATEWAY_URL = "http://localhost:9091"; pnpm tsx scripts/cleanup-orphan-minio.ts --dry-run
   ```
   **Output ghi nhận:**
   ```
   ==================================================================
          HAIHIRE ENTERPRISE ATS: MINIO ORPHAN CLEANUP CRON          
   ==================================================================
   Execution Mode:       DRY-RUN (Safe Simulation - No Deletions)
   Age Threshold:        30 days
   Target Bucket:        haihire-resumes
   ------------------------------------------------------------------
   Total Objects Scanned:     29
   Active DB References:      202
   Orphan Objects Found:      29
     - Preserved (< 30d):     29
     - Eligible for Deletion:      0
   Storage Space Freed:       0.00 MB (0 bytes)
   ==================================================================
   [SUCCESS] Metrics pushed to http://localhost:9091/metrics/job/minio_orphan_cleanup

   [SUCCESS] MinIO orphan cleanup finished successfully.
   ```

3. **Truy vấn endpoint `curl http://localhost:9091/metrics`:**
   ```prometheus
   # HELP minio_orphan_cleanup_bytes_freed_total Bytes freed by cleanup
   # TYPE minio_orphan_cleanup_bytes_freed_total gauge
   minio_orphan_cleanup_bytes_freed_total{instance="",job="minio_orphan_cleanup"} 0

   # HELP minio_orphan_cleanup_deleted_total Orphan objects deleted
   # TYPE minio_orphan_cleanup_deleted_total gauge
   minio_orphan_cleanup_deleted_total{instance="",job="minio_orphan_cleanup"} 0

   # HELP minio_orphan_cleanup_last_run_timestamp_seconds Last run timestamp
   # TYPE minio_orphan_cleanup_last_run_timestamp_seconds gauge
   minio_orphan_cleanup_last_run_timestamp_seconds{instance="",job="minio_orphan_cleanup"} 1.791422876e+09

   # HELP minio_orphan_cleanup_orphans_found_total Total orphan objects found
   # TYPE minio_orphan_cleanup_orphans_found_total gauge
   minio_orphan_cleanup_orphans_found_total{instance="",job="minio_orphan_cleanup"} 29

   # HELP minio_orphan_cleanup_preserved_total Orphan objects preserved (in grace period)
   # TYPE minio_orphan_cleanup_preserved_total gauge
   minio_orphan_cleanup_preserved_total{instance="",job="minio_orphan_cleanup"} 29

   # HELP minio_orphan_cleanup_scanned_total Total MinIO objects scanned
   # TYPE minio_orphan_cleanup_scanned_total gauge
   minio_orphan_cleanup_scanned_total{instance="",job="minio_orphan_cleanup"} 29

   # HELP minio_orphan_cleanup_success Run status (1=success, 0=failure)
   # TYPE minio_orphan_cleanup_success gauge
   minio_orphan_cleanup_success{instance="",job="minio_orphan_cleanup"} 1
   ```
   *(Xác nhận: Toàn bộ 7 metric xuất hiện đầy đủ với giá trị thực tế).*

4. **Xác nhận cron exit 0 khi Pushgateway down:**
   - Đã dừng container: `docker stop test-pushgateway`
   - Chạy lại script dọn dẹp.
   - **Output ghi nhận:**
     ```
     [ERROR] Failed to push metrics to Pushgateway: fetch failed
     [SUCCESS] MinIO orphan cleanup finished successfully.
     ```
   - **Mã thoát (Exit Code):** `0` (cron hoàn thành bình thường, không crash hệ thống).
   - Đã xóa container tạm: `docker rm test-pushgateway`.

---

**6. Acceptance Criteria Checklist**

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Pushgateway service thêm vào `docker-compose.prod.yml` | ✅ PASS |
| `PUSHGATEWAY_PORT` env trong 5 file `.env.example` và local env | ✅ PASS |
| `PUSHGATEWAY_URL` env trong các file `.env` | ✅ PASS |
| Script `pushMetrics()` push 7 metrics đúng format Prometheus | ✅ PASS |
| Non-throwing: Pushgateway down -> script exit 0 | ✅ PASS |
| Script fail -> push `minio_orphan_cleanup_success 0` trước khi exit 1 | ✅ PASS |
| Test spec `cleanup-orphan-minio.spec.ts` pass (≥6 cases, thực tế: 7 cases) | ✅ PASS |
| Manual verify với Pushgateway thật pass | ✅ PASS |
| `pnpm check:all:fast` pass (10/10 gates) | ✅ PASS |
| `pnpm test` pass (531 tests) | ✅ PASS |
| `pnpm lint:env-sync` pass | ✅ PASS |
| Mọi mục trong `docs/DEFINITION_OF_DONE.md` đều PASS | ✅ PASS |

---

**7. Open Questions & Bước Kế Tiếp**
- **Sẵn sàng cho Task #7:** Metric `minio_orphan_cleanup_orphans_found_total` và `minio_orphan_cleanup_preserved_total` đã sẵn sàng để cấu hình Prometheus Alert Rule phát hiện bất thường trong cron dọn dẹp orphan MinIO.
- **Review:** Kính gửi DeepSeek và chủ dự án thẩm định PR của branch `feat/task-06-cron-pushgateway-metrics`.

---

**8. Files for Review**
1. [`docker-compose.prod.yml`](file:///c:/Workspaces/haihire/docker-compose.prod.yml) (Service `pushgateway` và env `PUSHGATEWAY_URL`)
2. [`scripts/cleanup-orphan-minio.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.ts) (Hàm `pushMetrics`, `pushFailureMetric`, xử lý non-throwing)
3. [`scripts/cleanup-orphan-minio.spec.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.spec.ts) (7 test cases kiểm thử Vitest)
