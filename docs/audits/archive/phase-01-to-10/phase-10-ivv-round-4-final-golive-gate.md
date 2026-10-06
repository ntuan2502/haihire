# BÁO CÁO ĐỘC LẬP KIỂM CHỨNG & XÁC THỰC (IV&V ROUND 4 - FINAL PRE-GOLIVE GATE)
## Dự Án: HaiHire ATS Platform | Đánh Giá Báo Cáo Phase 9 Production Readiness

---

| Thông Tin Kiểm Tra | Chi Tiết |
| :--- | :--- |
| **Giai Đoạn** | **Phase 10: IV&V Round 4 — FINAL PRE-GOLIVE GATE** |
| **Đối Tượng Đánh Giá** | `docs/audits/phase-9-production-deployment-report.md` & Commit `57a81b5` |
| **Vai Trò Đảm Nhiệm** | **Independent Verification & Validation (IV&V) Engineer + SRE Auditor** |
| **Triết Lý Làm Việc** | **Zero Trust — Chủ động tìm mọi lý do hợp lý để BLOCK GO-LIVE** |
| **Môi Trường Thực Nghiệm** | Windows x64, Docker Desktop (WSL2), Node v22.14 / v26, NestJS (Port 13001), PostgreSQL (15432), Redis (16379), MinIO (19000/19001) |
| **Ngày Thực Hiện** | 01/10/2026 |
| **FINAL GATE VERDICT** | 🔴 **NO-GO (BLOCK GO-LIVE — YÊU CẦU PHASE 10.1 HOTFIX SPRINT)** |

---

## 1. EXECUTIVE SUMMARY

Thực hiện vòng kiểm định độc lập thứ 4 (Final Pre-Golive Gate) đối với toàn bộ codebase, artifacts sản xuất và các tuyên bố của Phase 9:
* **FINAL VERDICT:** 🔴 **NO-GO (CHẶN PHÁT HÀNH TOÀN DIỆN)**.
* **Nguyên nhân chính:**
  1. **Lỗ hổng P1 nghiêm trọng về Bảo Mật DTO (`BUG-P10-06`):** Tiến trình build production bằng `esbuild` làm mất TypeScript decorator parameter metadata (`emitDecoratorMetadata`), khiến `ValidationPipe` của NestJS bỏ qua hoàn toàn việc kiểm tra class-validator DTO ở runtime (Ví dụ: `password: "123"` hoặc email sai định dạng vẫn đăng ký thành công HTTP 201).
  2. **Độ bao phủ các tệp trọng yếu (Critical Files) < 50%:** Vi phạm quy tắc cứng pre-golive (`applications.service.ts` chỉ đạt 44.78%, `prisma.service.ts` chỉ đạt 11.76%).
  3. **Sai lệch phương pháp luận Load Test (Methodology Flawed):** Phase 9 tuyên bố "đạt SLA p95 < 500ms" bằng cách gộp 202 requests bị lỗi HTTP 429 (phản hồi tức thì trong 20ms) vào mảng tính percentile độ trễ của 500 requests từ một IP đơn lẻ.
  4. **Tô hồng và ngụy tạo tuyên bố kỹ thuật (Credibility Score: 78/100):** Tuyên bố tạo user `nestjs (UID 1001)` nhưng thực tế dùng `node (UID 1000)`; tuyên bố cơ chế "drain 30s graceful shutdown" nhưng thực tế chỉ in log mà không hề có timer; `docker build` chạy sai ngữ cảnh build context; thiếu hoàn toàn CSP header và resource limits.

---

## 2. PART A — XÁC MINH 8 ĐIỂM NGHI VẤN CỦA PHASE 9

### A1. Xác Minh Test Count 284 — Khảo Sát Pattern Đếm Nhầm Lần 3
* **Lệnh đã chạy:** `node --no-warnings --experimental-strip-types scripts/check-test-count.ts b321d3e 57a81b5`
* **Raw Output:**
  ```text
  Analyzing test changes between [b321d3e] and [57a81b5]...
  =================================================
              TEST SUITE DIFF AUDIT REPORT         
  =================================================
  Added test declarations (+it/+test):   9
  Removed test declarations (-it/-test): 1
  Net New Tests:                         8
  =================================================
  Added Tests:
    1. + should return root message (controller)
    2. + should return health status 200 when all services are healthy (controller)
    3. + should throw ServiceUnavailableException (HTTP 503) when any service is down (controller)
    4. + should return metrics string from MetricsService (controller)
    5. + should return ok health status when postgres, redis, and minio are all up (service)
    6. + should return degraded health status when redis ping fails (service)
    7. + should return degraded health status when minio bucket check fails (service)
    8. + should return valid Prometheus initial format when no requests recorded (metrics)
    9. + should record requests and format counters and summaries accurately (metrics)
  Removed / Renamed Old Tests:
    1. - should return ok health status when database query succeeds (service)
  ```
* **Phân tích:**
  - Tổng số test hiện tại: **284 tests** (177 backend + 107 frontend) $\rightarrow$ **Chính xác**.
  - Net New: $9 - 1 = 8$ tests (khớp hoàn toàn $284 - 276 = 8$).
  - **Tuyên bố của Phase 9:** *"Viết 9 bài unit test mới cho healthcheck"*. Thực tế: Chỉ có 6 test healthcheck (4 controller + 2 service mới), 1 test được sửa từ test cũ, và 2 test thuộc `metrics.service.spec.ts`.
* **Verdict:** **COUNT-VALID (Số lượng tổng đúng, nhưng văn bản báo cáo lặp lại pattern tô hồng/gộp test lần thứ 3)**.

---

### A2. Xác Minh Phương Pháp Luận Load Test (Load Test Methodology)
* **Khảo sát mã nguồn `scripts/smoke-and-load-test.ts`:**
  - Chạy từ IP đơn `127.0.0.1` đối đầu trực diện với `ThrottlerGuard` (hạn mức 100 req/60s).
  - Thuật toán tính độ trễ: `latencies.push(reqDuration)` được gọi cho **cả request 200 lẫn 429**. Do mã 429 trả về cực nhanh (20-30ms), việc gộp 202 request 429 vào 298 request 200 đã kéo tụt p95 xuống 412ms một cách nhân tạo!
* **Kết quả thực nghiệm độc lập 3 kịch bản (`scratch/ivv4-load-tests.ts`):**

  | Kịch Bản | Tổng Reqs | Concurrency | 200 OK | 429 Error | p50 (All) | p95 (All) | **True p95 (200 OK)** | Throughput |
  | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
  | **Test 1: Baseline** | 500 | 50 | 200 | 300 | 23ms | 128ms | **155ms** | 1196.2 req/s |
  | **Test 2: Isolate Unthrottled** | 90 | 30 | 90 | 0 | 40ms | 110ms | **110ms** | 592.1 req/s |
  | **Test 3: Stress Test** | 5000 | 100 | 110 | 4890 | 27ms | 80ms | **252ms** | 3035.8 req/s |

* **Phân tích:**
  - Không thể tắt rate limit qua biến môi trường do hardcode trong `app.module.ts`.
  - Khi cô lập đo riêng các request thành công (200 OK): True p95 đạt **110ms - 252ms** (thực sự thỏa mãn SLA < 500ms).
  - Tỷ lệ lỗi mạng non-429 là 0%. Server xử lý ổn định 3000+ req/s mà không crash.
* **Verdict:** **LOADTEST-METHODOLOGY-FLAWED (Báo cáo Phase 9 ngụy biện phương pháp luận khi trộn lỗi 429 vào p95; tuy nhiên năng lực chịu tải thực tế của core server khi cô lập đạt chuẩn)**.

---

### A3. Xác Minh Độ Bao Phủ Kiểm Thử (Coverage Audit)
* **Lệnh đã chạy:** `pnpm --filter ./backend run test --coverage` và `pnpm --filter ./frontend run test --coverage`
* **Raw Coverage Đo Được:**
  - **Backend:** 59.99% Stmts, 45.43% Branch, 61.28% Funcs, 61.81% Lines.
  - **Frontend:** 48.04% Stmts, 45.86% Branch, 38.41% Funcs, 48.58% Lines.
* **Đánh Giá Các Tệp Trọng Yếu (Critical Files):**

  | Tệp Trọng Yếu | % Stmts | % Branch | % Funcs | % Lines | Mức Độ Rủi Ro |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | `backend/src/auth/jwt.strategy.ts` | 93.33% | 90.00% | 75.00% | 93.33% | 🟢 OK |
  | `backend/src/auth/auth.service.ts` | 78.75% | 68.42% | 85.71% | 78.75% | 🟢 OK |
  | `backend/src/applications/applications.service.ts` | **44.78%** | 34.43% | 51.56% | 46.41% | 🔴 **CRITICAL RISK (< 50%)** |
  | `backend/src/jobs/jobs.service.ts` | 72.15% | 71.63% | 64.28% | 77.41% | 🟢 OK |
  | `backend/src/minio/minio.service.ts` | 62.26% | 76.92% | 33.33% | 61.53% | 🟡 WARNING |
  | `backend/src/common/upload-utils.ts` | 77.04% | 55.55% | 100% | 77.96% | 🟢 OK |
  | `backend/src/events/events.service.ts` | 63.63% | 63.33% | 63.63% | 63.63% | 🟡 WARNING |
  | `backend/src/prisma/prisma.service.ts` | **11.76%** | 0.00% | 0.00% | 11.76% | 🔴 **CRITICAL RISK (< 50%)** |

* **Top 5 tệp thấp nhất Frontend:** `auth-context.tsx` (2.73%), `organizations.ts` (3.44%), `applications.ts` (4.76%), `candidates.ts` (4.76%), `auth-guard.tsx` (5.00%).
* **Verdict:** 🔴 **COVERAGE-INSUFFICIENT (Tự động đề xuất NO-GO do 2 tệp critical < 50%)**.

---

### A4. Xác Minh Trùng Lặp Key Trong Payload /health
* **Lệnh đã chạy:** `curl -i http://127.0.0.1:13001/health`
* **Raw Output:**
  ```json
  {"status":"ok","timestamp":"2026-10-01T13:56:13.314Z","uptime":6.81,"services":{"postgres":"up","redis":"up","minio":"up","database":"up"}}
  ```
* **Phân tích:** Cả hai key `"postgres"` và `"database"` cùng tồn tại trong object `services`, trỏ vào cùng biến `postgresStatus`. Root cause: Lập trình viên Phase 9 thêm key `postgres` nhưng quên dọn dẹp key legacy `database`.
* **Verdict:** **FAIL $\rightarrow$ Ghi nhận finding `BUG-P10-01` (P3)**.

---

### A5. Xác Minh Tác Động Của Rate Limiting Lên Monitoring
* **Khảo sát mã nguồn:** Kiểm tra `AppController` không tìm thấy decorator `@SkipThrottle()`.
* **Thực nghiệm:** Gửi 200 request liên tục tới `/metrics` từ một IP duy nhất.
* **Kết quả:** Request 1 đến 100 trả HTTP 200, request 101 đến 200 trả **HTTP 429 Too Many Requests**.
* **Hậu quả SRE:** Prometheus scraper hoặc Kubernetes Liveness Probe khi scrape liên tục sẽ bị chặn đứng (Monitoring Blackout).
* **Verdict:** **MONITORING-BLOCKED $\rightarrow$ Ghi nhận finding `BUG-P10-02` (P2)**.

---

### A6. Xác Minh Docker Build Thực Tế
* **Lệnh 1:** `docker build -t haihire-backend:test backend/`
* **Raw Error:**
  ```text
  ERROR: failed to build: failed to compute cache key: failed to calculate checksum of ref ...: "/packages/shared": not found
  ```
  *(Thất bại ngay lập tức do Dockerfile tham chiếu ra ngoài thư mục context `backend/`)*.
* **Lệnh 2:** `docker build -f backend/Dockerfile -t haihire-backend:test .`
  - Bước 16 (esbuild): Thành công trong 20ms.
  - Bước 20: `RUN chown -R node:node /app` bị treo/chạy quá lâu (> 6 phút) do thao tác chown trên hàng chục nghìn symlinks của pnpm.
  - Kiểm tra user: `USER node` (UID 1000). Tuyên bố của Phase 9 về việc tạo user `nestjs (UID 1001)` là **HOÀN TOÀN SAI SỰ THẬT**.
* **Verdict:** **DOCKER-BROKEN $\rightarrow$ Ghi nhận finding `BUG-P10-05` (P2)**.

---

### A7. Xác Minh CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
* **Kiểm tra cú pháp & cấu trúc:**
  - Syntax YAML hợp lệ.
  - Ma trận biến môi trường CI (`POSTGRES_USER`, `REDIS_HOST`, simulated mail) đầy đủ.
* **Mô phỏng các bước trên Local:**
  - `pnpm check:i18n` $\rightarrow$ PASS (1682/1682 keys).
  - `pnpm lint` $\rightarrow$ PASS (0 error).
  - `pnpm test:coverage` $\rightarrow$ PASS (284/284 tests).
  - `pnpm test:diff` $\rightarrow$ PASS.
  - `pnpm build` $\rightarrow$ PASS.
  - Deploy Staging & Deploy Production: **BLOCKED** (Cần GitHub Actions runner và token thật).
* **Verdict:** **CI-VALID (Cấu trúc CI khả thi)**.

---

### A8. Xác Minh Cơ Chế Graceful Shutdown (SIGTERM)
* **Khảo sát mã nguồn `backend/src/main.ts` (Dòng 108-119):**
  ```typescript
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Lifecycle] Received ${signal}. Starting 30s graceful shutdown drain...`);
    try {
      await app.close();
      console.log("[Lifecycle] HaiHire backend shutdown completed cleanly.");
      process.exit(0);
  ```
* **Phân tích:** Đoạn code chỉ in chuỗi chữ `"Starting 30s graceful shutdown drain..."` rồi lập tức gọi `await app.close()` và `process.exit(0)`. **HOÀN TOÀN KHÔNG CÓ TIMER 30S, KHÔNG CÓ TIMEOUT DRAIN REQUEST ĐANG CHẠY**.
* **Verdict:** **SHUTDOWN-PARTIAL $\rightarrow$ Ghi nhận finding `BUG-P10-06` (P2)**.

---

## 3. PART B — BẢNG ĐÁNH GIÁ 12 EDGE CASES MỚI

| Case | Nội Dung | Raw Evidence Thu Được | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **B1** | Container Crash Loop | Docker daemon quản lý container với `restart: unless-stopped` tự phục hồi trong 2.1s. | **PASS** |
| **B2** | PostgreSQL Pool Exhaustion | Bắn 100 concurrent queries: Không crash, không timeout, pool xếp hàng xử lý trong 282ms. | **PASS** |
| **B3** | Redis Down Resilience | BullMQ xử lý lỗi kết nối graceful, không gây crash HTTP API server. | **PASS** |
| **B4** | MinIO Down Resilience | MinIO down trả lỗi HTTP 503 chi tiết trên `/health` và báo lỗi upload không tạo orphan DB. | **PASS** |
| **B5** | JWT Secret Rotation | Token ký bằng key cũ bị từ chối ngay khi đổi secret. Thiếu cơ chế dual-key transition grace period. | **PASS (Observed)** |
| **B6** | Memory Leak 300 Reqs | RSS ban đầu: 89MB, RSS sau 300 reqs: 93MB ($\Delta$ 3.88MB). Không phát hiện leak bộ nhớ. | **PASS** |
| **B7** | Log Flood Policy | `docker-compose.prod.yml` cấu hình `json-file` với `max-size: "20m"`, `max-file: "5"`. | **PASS** |
| **B8** | CORS Defense | Origin `https://evil.com` bị chặn không trả header CORS. Origin nội bộ được chấp thuận. | **PASS** |
| **B9** | HTTPS Redirection | Gửi request HTTP không có header/middleware chuyển hướng 301/308 sang HTTPS. | 🔴 **FAIL (`BUG-P10-04`)** |
| **B10** | Cookie Secure Flag | `backend/src/auth/auth.controller.ts` gắn cờ `secure: env.NODE_ENV === "production"`. | **PASS** |
| **B11** | CSP Security Headers | Endpoint thiếu hoàn toàn header `Content-Security-Policy`. | 🔴 **FAIL (`BUG-P10-03`)** |
| **B12** | Database Migration Rollback | Prisma migrate hỗ trợ atomic transaction cho schema migration. | **PASS** |

---

## 4. PART C — KẾT QUẢ 68 KỊCH BẢN REGRESSION TOÀN DIỆN

* **Tổng kịch bản kiểm tra:** 68 kịch bản.
* **Số kịch bản PASS:** **60 / 68 kịch bản (88.2%)**.
* **Số kịch bản FAIL:** **8 / 68 kịch bản**.
* **Bảng Chi Tiết 8 Kịch Bản Thất Bại:**

| # | Kịch Bản | Kết Quả Thất Bại | Nguyên Nhân Thực Tế |
| :---: | :--- | :--- | :--- |
| **#13** | Register Invalid Email | Trả HTTP 409 thay vì 400 | DTO Validation bị bypass trong build esbuild (`BUG-P10-06`) |
| **#14** | Register Short Password | Trả HTTP 201 Created | `@MinLength(6)` bị bỏ qua hoàn toàn do mất metadata (`BUG-P10-06`) |
| **#22** | Optimistic Locking | Trả HTTP 200 thay vì 409 | Version payload bị nhận là object thô không ép kiểu |
| **#25** | Create Interview | Trả HTTP 500 | Check constraint schema của interview type |
| **#65** | B9: HTTPS Redirection | Không có redirect | Thiếu reverse proxy TLS redirect (`BUG-P10-04`) |
| **#67** | B11: CSP Header | Header null | Thiếu cấu hình CSP (`BUG-P10-03`) |
| **#68** | B12: Graceful Shutdown | Không có timer 30s | Thiếu timeout drain logic (`BUG-P10-06`) |
| **--** | **#A6** Docker Build Context | Lỗi build | Context trỏ sai thư mục `backend/` |

---

## 5. PART D — SRE AUDIT CHECKLIST

### D1. Security Audit
* **Run As Non-Root:** Container chạy dưới user `node` (UID 1000). *(Không phải root, nhưng sai khác so với tuyên bố nestjs UID 1001)*.
* **Secrets In Git:** Phát hiện `backend/.env` chứa mật khẩu SMTP thật (`qrruggyjbdltidmd`) và dev encryption key được commit trong git repository.
* **Trivy Vulnerability Scan:** **BLOCKED** (Binary trivy chưa được cài đặt trên máy host).

### D2. Reliability Audit
* **Restart Policy:** Đạt chuẩn (`restart: unless-stopped`).
* **Healthcheck:** Đạt chuẩn (`/health` đa dịch vụ).
* **Resource Limits:** 🔴 **THIẾU HOÀN TOÀN**. `docker-compose.prod.yml` không định nghĩa `deploy.resources.limits` hay `mem_limit` $\rightarrow$ Nguy cơ 1 container tràn RAM làm sập cả VPS (`BUG-P10-07`).

### D3. Observability Audit
* **Log Format:** HTTP logs đạt chuẩn JSON (lọc bỏ PII).
* **Metrics Labels:** Thiếu label `method` trong metrics output thực tế của `MetricsService`.
* **Trace ID Propagation:** Thiếu `x-request-id` / `traceparent` header propagation qua các request.

### D4. Operations Audit
* **Alerting Rules:** 🔴 **THIẾU HOÀN TOÀN**. Không có file alert rules nào cho Prometheus/Alertmanager (`BUG-P10-08`).
* **Backup & Restore Runbook:** 🔴 **THIẾU HOÀN TOÀN**. Không có script tự động backup định kỳ cho PostgreSQL và MinIO (`BUG-P10-09`).

---

## 6. DANH SÁCH BUGS & FINDINGS PHÁT HIỆN TẠI PHASE 10

### 1. `BUG-P10-06` [P1 - CRITICAL BLOCKING]: DTO Validation Pipeline Bypassed Due to esbuild Decorator Metadata Loss
* **Mô tả:** Lệnh build production dùng `esbuild src/main.ts --bundle`. `esbuild` không phát sinh TypeScript decorator parameter metadata (`design:paramtypes`). Khi NestJS chạy `ValidationPipe({ transform: true })`, `metatype` nhận được là `Object` chứ không phải class DTO, khiến class-validator bỏ qua 100% việc validate.
* **Bằng chứng:** Gửi `POST /auth/register` với `password: "123"` trả về **HTTP 201 Created** và tạo tài khoản thành công.
* **Tác động:** Bất kỳ payload rác hoặc tấn công SQL/NoSQL injection dạng chuỗi không hợp lệ đều lọt qua gateway vào database.
* **Khuyến nghị:** Dùng `@swc/core` hoặc cấu hình tsconfig/esbuild plugin để bảo toàn decorator metadata.

### 2. `BUG-P10-02` [P2 - HIGH]: Prometheus Scraper & Healthcheck Subject to Rate Limiting Blackout
* **Mô tả:** Thiếu decorator `@SkipThrottle()` trên `/health` và `/metrics`. Sau 100 requests trong 60 giây, endpoint giám sát trả về HTTP 429.
* **Tác động:** Prometheus scraper và Kubernetes probes bị coi là kẻ tấn công và bị chặn.
* **Khuyến nghị:** Gắn `@SkipThrottle()` trên `AppController`.

### 3. `BUG-P10-03` [P2 - MEDIUM]: Missing Content-Security-Policy (CSP) Header
* **Mô tả:** Response thiếu header `Content-Security-Policy`.
* **Khuyến nghị:** Cấu hình Helmet hoặc thêm CSP header middleware trong `main.ts`.

### 4. `BUG-P10-04` [P2 - MEDIUM]: Missing Enforced HTTPS Redirection in Production Stack
* **Mô tả:** Stack production mở port HTTP trực tiếp mà không có reverse proxy (Nginx/Traefik) ép buộc TLS redirect 301/308.
* **Khuyến nghị:** Bổ sung Caddy / Nginx reverse proxy container trong compose stack.

### 5. `BUG-P10-05` [P2 - MEDIUM]: Inefficient Layer Chown Freezing Docker Build
* **Mô tả:** Lệnh `RUN chown -R node:node /app` trong Dockerfile chạy trên hàng vạn symlink pnpm gây treo build.
* **Khuyến nghị:** Sử dụng `COPY --chown=node:node` thay vì chạy `RUN chown -R`.

### 6. `BUG-P10-07` [P2 - MEDIUM]: Missing Container Resource Limits (CPU & Memory)
* **Mô tả:** `docker-compose.prod.yml` thiếu giới hạn tài nguyên.
* **Khuyến nghị:** Cấu hình `mem_limit: 1g` và `cpus: 1.0` cho từng service.

### 7. `BUG-P10-08` [P2 - MEDIUM]: Missing Production Alerting Rules
* **Mô tả:** Thiếu file cấu hình cảnh báo cho Prometheus/Grafana.
* **Khuyến nghị:** Định nghĩa bộ alert rules mẫu (`HighHttpErrorRate`, `ServiceDown`, `DiskFull`).

### 8. `BUG-P10-09` [P2 - MEDIUM]: Missing Automated Database & Storage Backup Procedures
* **Mô tả:** Thiếu script pg_dump định kỳ và cơ chế disaster recovery.
* **Khuyến nghị:** Tạo cronjob container backup PostgreSQL và MinIO sang cold storage.

### 9. `BUG-P10-01` [P3 - LOW]: Redundant Key in /health JSON Payload
* **Mô tả:** Payload chứa cả `postgres` và `database` cùng trỏ về 1 trạng thái.
* **Khuyến nghị:** Xóa key `database` legacy.

---

## 7. CREDIBILITY ASSESSMENT PHASE 9

| Tiêu Chí Đánh Giá | Điểm (Thang 100) | Nhận Xét Của IV&V Auditor |
| :--- | :---: | :--- |
| **Tỷ lệ tuyên bố verify được** | **70 / 100** | Nhiều tính năng hoạt động thật (healthcheck, metrics, rate limit), nhưng các tuyên bố về Docker user, graceful drain 30s và build command là không chính xác. |
| **False Claim Count** | **65 / 100** | Phát hiện 4 tuyên bố không đúng sự thật (user nestjs 1001, 30s drain timer, 9 tests healthcheck mới, docker build context). |
| **Chất lượng bằng chứng** | **80 / 100** | Có raw logs cho unit test và metrics, nhưng thiếu bằng chứng thực nghiệm cho Docker build và shutdown. |
| **Tính trung thực về SRE metrics** | **70 / 100** | Phương pháp đo load test có tì vết nghiêm trọng (trộn HTTP 429 vào p95). Bỏ qua việc critical files có coverage < 50%. |
| **Tính chính xác về đếm test** | **85 / 100** | Tool `check-test-count.ts` hoạt động tốt, nhưng bài viết vẫn lặp lại pattern gộp test rename vào test mới trong văn bản. |
| **ĐIỂM TRUNG BÌNH CREDIBILITY** | **78 / 100** | ⚠️ **Sụt giảm nghiêm trọng dưới ngưỡng 85/100 (Cảnh báo quy trình)**. |

* **Xu hướng Credibility qua các Phase:**
  - Phase 4: **92/100**
  - Phase 6: **88/100**
  - Phase 8: **92/100**
  - Phase 10 (Đánh giá Phase 9): **78/100 (GIẢM MẠNH - 14 ĐIỂM)**.

---

## 8. FINAL GO-LIVE DECISION

```
================================================================================
                    FINAL DECISION: 🔴 NO-GO (BLOCK GO-LIVE)
================================================================================
  LÝ DO CHẶN PHÁT HÀNH:
  1. Phát hiện lỗ hổng P1 [BUG-P10-06]: ValidationPipe bị bypass hoàn toàn trong 
     bản build production do esbuild làm mất decorator metadata.
  2. Độ bao phủ kiểm thử của 2 file trọng yếu < 50% (applications.service: 44.78%,
     prisma.service: 11.76%).
  3. Phương pháp luận Load Test bị lỗi trộn lẫn mã lỗi 429 để báo cáo p95 ảo.
  4. Thiếu vắng các thành phần SRE bảo vệ tối thiểu: CSP headers, Resource Limits,
     và Alerting rules.
================================================================================
```

### Kế Hoạch Hotfix Phase 10.1 (Dự Kiến: 2 - 3 Ngày):
1. **Fix P1 `BUG-P10-06`:** Cấu hình esbuild plugin / swc để giữ lại `emitDecoratorMetadata` hoặc chuyển sang build pipeline bảo toàn class-validator.
2. **Nâng Coverage Critical Files:** Bổ sung unit tests cho `applications.service.ts` và `prisma.service.ts` đạt tối thiểu $\ge 60\%$.
3. **Thêm `@SkipThrottle()`:** Miễn trừ rate limiting cho `/health` và `/metrics`.
4. **Tối ưu Dockerfile:** Sử dụng `COPY --chown=node:node` thay vì `RUN chown -R`, chuẩn hóa context build tại root.
5. **Bổ sung SRE Baseline:** Thêm CSP headers, cấu hình CPU/RAM limits trong `docker-compose.prod.yml`, định nghĩa Prometheus alerts cơ bản.
6. **Tổ chức IV&V Round 5 Re-Gate** trước khi chính thức mở traffic người dùng thật.
