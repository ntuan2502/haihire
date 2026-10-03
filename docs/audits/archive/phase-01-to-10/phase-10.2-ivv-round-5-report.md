# Báo Cáo Thẩm Định Độc Lập IV&V Round 5 (Pre-Golive Final Gate)

> **Người thực hiện:** Independent Verification & Validation (IV&V) Engineer + SRE Auditor  
> **Thời điểm thẩm định:** 01/10/2026  
> **Đối tượng thẩm định:** Báo cáo `docs/audits/phase-10.1-hotfix-report.md` và mã nguồn repo tại commit Phase 10.1.  
> **Nguyên tắc thẩm định:** Zero Trust — Bằng chứng thực nghiệm độc lập (Raw Evidence), không dựa vào lời tự nhận của báo cáo.

---

## 1. TỔNG QUAN PHÁN QUYẾT IV&V ROUND 5

```
================================================================================
                    PHÁN QUYẾT CUỐI CÙNG: 🔴 NO-GO (BLOCK GO-LIVE)
================================================================================
  LÝ DO CHẶN GOLIVE (BLOCKING GAPS):
  1. [P1 - TỒN DƯ BUG-P10-06]: Fix DtoPipe bị bỏ sót tại email.controller.ts (dòng 125, 131).
     Payload rác gửi tới POST /email/system/test và POST /email/system/send vẫn nhận HTTP 201
     Created thành công mà không bị chặn!
  2. [P2 - TỒN DƯ BUG-P10-09]: File backup sinh ra bởi scripts/backup-production.ts KHÔNG THỂ
     RESTORE ĐƯỢC vào PostgreSQL do nhiễm TTY escape codes (-t) và UTF-16 BOM encoding; đồng
     thời kịch bản tự động hoàn toàn bỏ quên MinIO storage.
================================================================================
```

---

## 2. PART A — XÁC MINH 4 ĐIỂM NGHI VẤN CHÍNH

### 2.1. Nghi Vấn 1: `BUG-P10-06` và Wrapper `DtoPipe` Trên Controllers
* **Kiểm tra tĩnh (Static Grep):**
  Quét toàn bộ `@Body()` trong toàn bộ controller (`backend/src/**/*.controller.ts`).
* **Phát hiện:**
  - Hầu hết các controllers (`auth`, `organizations`, `jobs`, `applications`, `candidates`, `interviews`, `sourcing`) đã được gắn `DtoPipe` chính xác và trả về HTTP 400 khi nhận payload sai format.
  - **TUY NHIÊN, phát hiện bỏ sót nghiêm trọng tại `backend/src/email/email.controller.ts`:**
    - Dòng 125: `sendSystemTestEmail(@Body() dto: SendSystemTestEmailDto)`
    - Dòng 131: `sendSystemEmail(@Body() dto: SendSystemEmailDto)`
* **Kiểm chứng thực nghiệm (Raw Evidence):**
  Chạy script kiểm tra `scratch/ivv5-check-missed-dtopipe.ts` gửi payload `{ to: "not-an-email-at-all" }`:
  ```
  POST /email/system/test status: 201
  Response body: {
    "id": "1",
    "status": "QUEUED",
    "message": "System email queued for delivery"
  }
  🔴 CRITICAL IV&V FINDING: Validation was BYPASSED on /email/system/test! HTTP 201
  ```
* **Kết luận:** Tuyên bố *"Áp dụng DtoPipe trên toàn bộ các controller nhận payload DTO"* trong báo cáo Phase 10.1 là **FALSE CLAIM / INCOMPLETE FIX**.

---

### 2.2. Nghi Vấn 2: Test Coverage Của `prisma.service.ts` Đạt 100%?
* **Kiểm chứng độc lập:**
  Chạy `pnpm --filter ./backend exec vitest run src/prisma/prisma.service.spec.ts --coverage`.
* **Raw Coverage Data:**
  ```
  -------------------|---------|----------|---------|---------|-------------------
  File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
  -------------------|---------|----------|---------|---------|-------------------
  prisma.service.ts  |     100 |       75 |     100 |     100 | 70                
  -------------------|---------|----------|---------|---------|-------------------
  ```
* **Đánh giá chất lượng test:**
  - File test `prisma.service.spec.ts` mock module `db` (`vi.mock("./db")`). Vì `PrismaService` là một thin wrapper quản lý lifecycle `onModuleInit`, việc mock này là hợp lý theo pattern của NestJS.
  - Test bao phủ được 3 nhánh chính: (1) DB đã có user $\rightarrow$ skip seed, (2) DB trống $\rightarrow$ seed demo accounts, (3) DB lỗi $\rightarrow$ catch error không crash server.
  - **Lưu ý kỹ thuật:** Branch Coverage thực tế là **75%** (dòng 70: nhánh `String(error)` khi error không phải là instance của `Error` chưa được kích hoạt), không phải 100% Branch như hiểu lầm thông thường. Tuy nhiên, Line Coverage đạt **100%** ($\ge 60\%$ theo yêu cầu).

---

### 2.3. Nghi Vấn 3: Nguồn Gốc và Định Danh Của `BUG-P10-06b`
* **Đối chiếu lịch sử Phase 10:**
  - Trong báo cáo Phase 10 mục 2 (A8) và mục 4 (#68), vấn đề thiếu 30s timeout guard trong Graceful Shutdown đã bị tác giả Phase 10 đánh nhầm mã định danh trùng với lỗ hổng DTO Validation (`BUG-P10-06`).
  - Trong Phase 10.1, đội ngũ phát triển nhận diện sự xung đột này và tạm gọi là `BUG-P10-06b`.
* **Phân loại chính thức IV&V:**
  - Đây không phải bug Phase 9, mà là **một finding độc lập phát sinh từ Phase 10 audit**.
  - Chính thức định danh lại thành: **`BUG-P10.1-01` [P2]: Graceful Shutdown Missing 30s Force-Exit Timeout**.
  - **Tình trạng:** Đã được khắc phục trong `backend/src/main.ts` với `forceExitTimer` (30000ms, `.unref()`).

---

### 2.4. Nghi Vấn 4: Xác Minh Tách Biệt `BUG-P10-08` (Alerting) & `BUG-P10-09` (Backup & Restore)

#### A. Xác minh Alerting Rules (`BUG-P10-08`):
* File: `monitoring/prometheus/alert-rules.yml`
* Kiểm tra cú pháp PromQL thực tế qua container Prometheus chính thức:
  ```bash
  docker run --rm --entrypoint promtool -v "C:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml:/etc/prometheus/alert-rules.yml" prom/prometheus:latest check rules /etc/prometheus/alert-rules.yml
  ```
* **Raw Evidence Output:**
  ```
  Checking /etc/prometheus/alert-rules.yml
    SUCCESS: 7 rules found
  ```
* **Kết luận:** **PASS**. Cú pháp PromQL và cấu trúc YAML hợp lệ 100%.

#### B. Xác minh Backup & Disaster Recovery (`BUG-P10-09`):
* **Kiểm tra kịch bản sinh bản backup:**
  Chạy `node --no-warnings --experimental-strip-types scripts/backup-production.ts`:
  ```
  [Backup] Initiating automated database backup...
  [Backup] Target: C:\Workspaces\haihire\backups\haihire-db-haihire_db-2026-10-01T15-22-44-309Z.sql
  [Backup] Executing dump command...
  [Backup] Dump completed successfully. File size: 4349.88 KB
  ```
* **Kiểm tra thực nghiệm phục hồi (Restore Drill) vào database sạch `haihire_restore_drill`:**
  ```bash
  cmd.exe /c "docker exec -i haihire-postgres psql -U haihire_user -d haihire_restore_drill < C:\Workspaces\haihire\backups\haihire-db-*.sql"
  ```
* **RAW FAILURE EVIDENCE:**
  ```
  invalid command \iRsl"
  invalid command \%
  ERROR:  invalid byte sequence for encoding "UTF8": 0xff
  ```
* **Phân tích nguyên nhân lỗi:**
  1. Trong `scripts/backup-production.ts`: Lệnh `docker exec -t haihire-postgres pg_dump ...` sử dụng cờ `-t` (allocate pseudo-TTY). Cờ này chèn thêm ký tự điều khiển TTY và chuyển đổi byte làm file dump bị hỏng.
  2. Việc redirect `> "${targetPath}"` trong môi trường PowerShell mặc định chuyển output sang định dạng UTF-16 LE có BOM (`0xFF 0xFE`), khiến `psql` phía Linux container từ chối biên dịch UTF-8.
  3. **Thiếu vắng hoàn toàn MinIO backup:** File script `scripts/backup-production.ts` chỉ có lệnh dump PostgreSQL; hoàn toàn không có dòng code nào thực hiện backup đối tượng MinIO tự động.
* **Kết luận:** **FAIL**. Bản backup **hoàn toàn vô dụng trong tình huống thảm họa thực tế (unrestorable)** do chưa từng được test restore trước khi tuyên bố DONE.

---

## 3. PART B — KIỂM CHỨNG TOÀN DIỆN 68 REGRESSION SCENARIOS

* **Lệnh thực thi:**
  `node --no-warnings --experimental-strip-types scratch/ivv4-regression-68.ts`
* **Kết quả:** **68 / 68 Scenarios PASS (100%)**.
* **Xác minh 8 kịch bản từng thất bại ở Phase 10:**

| # | Kịch Bản | Kết Quả Phase 10 | Kết Quả Phase 10.1 (IV&V 5) | Raw Evidence |
| :---: | :--- | :---: | :---: | :--- |
| **#13** | Register Invalid Email | 🔴 FAIL (409) | 🟢 **PASS (400)** | Trả về `["Invalid email format"]` |
| **#14** | Register Short Password | 🔴 FAIL (201) | 🟢 **PASS (400)** | Trả về `["Password must be at least 6 characters"]` |
| **#22** | Optimistic Locking Stage Update | 🔴 FAIL (200) | 🟢 **PASS (409)** | Xung đột đồng thời được xử lý đúng chuẩn |
| **#25** | Create Interview Schedule | 🔴 FAIL (400) | 🟢 **PASS (201)** | Tạo lịch phỏng vấn chuẩn DTO thành công |
| **#65** | B9: Production HTTPS Redirection | 🔴 FAIL (No 301) | 🟢 **PASS (301)** | Middleware chuyển hướng `x-forwarded-proto !== https` |
| **#67** | B11: Content-Security-Policy | 🔴 FAIL (Header null) | 🟢 **PASS (200)** | Header `Content-Security-Policy` hiện diện đầy đủ |
| **#68** | B12: Graceful Shutdown Drain | 🔴 FAIL (No timer) | 🟢 **PASS (200)** | Có `forceExitTimer` 30,000ms với `.unref()` |
| **#A6** | Docker Build Context Root | 🔴 FAIL (Path err) | 🟢 **PASS (Build OK)** | Docker Compose cấu hình context tại root repo |

---

## 4. PART C — KIỂM CHỨNG ĐỘC LẬP BỘ TEST SUITE

### 4.1. Đếm Test Độc Lập
* **Backend Vitest:**
  - Files: **23 passed**
  - Tests: **194 passed**
  - Thời gian chạy: 6.32s
* **Frontend Vitest:**
  - Files: **21 passed**
  - Tests: **107 passed**
  - Thời gian chạy: 7.38s
* **Tổng cộng thực tế:** **301 tests passed**.
* **Đối chiếu báo cáo Phase 10.1:** Báo cáo tuyên bố **301 / 301 tests**.
* **Đánh giá:** ✅ **Chính xác tuyệt đối 100% (Không phát hiện gian lận hay đếm sai test count)**.

---

## 5. PART D — KẾT QUẢ THẨM ĐỊNH 10 EDGE CASES MỚI

Chạy kịch bản độc lập `scratch/ivv5-test-10-edge-cases.ts`:

| # | Edge Case | Kết Quả | Chi Tiết Kỹ Thuật (Raw Evidence) |
| :---: | :--- | :---: | :--- |
| **EC1** | DtoPipe với Nested Object | **PASS** | Server từ chối object lồng nhau khi kỳ vọng Enum với HTTP 400. |
| **EC2** | DtoPipe với Array of DTO | **PASS** | Gửi mảng `[{...}]` vào endpoint nhận DTO đơn trả về HTTP 400. |
| **EC3** | DtoPipe với Query/Path Params | **OBSERVATION** | `@Query()` không tự validate nếu thiếu pipe chuyên biệt; API bỏ qua query rác. |
| **EC4** | Stress Test `/health` (1,000 Reqs) | **PASS** | 1,000 reqs liên tiếp trong 944ms trả về **1,000x HTTP 200 OK**, **0x 429**. |
| **EC5** | CSP Không Break Next.js Chunks | **PASS** | CSP đặt ở Backend API; Frontend Next.js không bị block load dynamic chunks. |
| **EC6** | HTTPS Redirect Loop Protection | **PASS** | Request có `x-forwarded-proto: https` trả về HTTP 200 trực tiếp, không loop 301. |
| **EC7** | Backup Script Khi Disk/Path Lỗi | **PASS** | Bắt lỗi `ENOENT` / I/O graceful, trả exit code 1 không vỡ tiến trình unhandled. |
| **EC8** | Backup Script Với MinIO Storage | 🔴 **FAIL** | Script `backup-production.ts` hoàn toàn bỏ quên MinIO; chỉ dump Postgres. |
| **EC9** | PromQL Alert Rule Syntax Check | **PASS** | `promtool` phát hiện và chặn đứng cú pháp PromQL lỗi (`{{{}}`). |
| **EC10**| Graceful Shutdown 100 In-Flight | **PASS** | Bọc bởi `forceExitTimer` (30s) đảm bảo process thoát an toàn dù socket treo. |

---

## 6. CREDIBILITY ASSESSMENT PHASE 10.1

| Tiêu Chí Đánh Giá | Phase 9 | Phase 10.1 | Phân Tích Của IV&V Auditor |
| :--- | :---: | :---: | :--- |
| **Tỷ lệ tuyên bố verify được** | 70 / 100 | **82 / 100** | Đã verify được 8/9 finding, coverage tăng thật, skipThrottle và CSP hoạt động thật. |
| **False Claim Count** | 65 / 100 | **78 / 100** | Phát hiện 2 tuyên bố không đúng thực tế: DtoPipe phủ toàn bộ controller (sót 2 endpoint email), và backup đã sẵn sàng (file dump bị hỏng). |
| **Chất lượng bằng chứng** | 80 / 100 | **90 / 100** | Cung cấp raw outputs chi tiết, script repro rõ ràng. |
| **Tính trung thực về SRE & Ops** | 70 / 100 | **75 / 100** | Chưa thực hiện restore drill thực tế dẫn đến không phát hiện file dump bị hỏng do TTY và BOM. |
| **Tính chính xác về đếm test** | 85 / 100 | **100 / 100** | 301/301 tests khớp chính xác tuyệt đối giữa code và văn bản báo cáo. |
| **ĐIỂM TRUNG BÌNH CREDIBILITY** | **78 / 100** | **85.0 / 100** | 📈 **Có sự phục hồi (+7.0 điểm), đạt ngưỡng chuẩn 85/100**. |

---

## 7. ĐIỀU KIỆN ĐỂ MỞ GO-LIVE (ACTION ITEMS CHO PHASE 10.2)

Trước khi cấp phép **APPROVED FOR GOLIVE**, đội ngũ kỹ thuật bắt buộc phải hoàn thành 2 việc:

1. **Vá nốt lỗ hổng `DtoPipe` trên `email.controller.ts`:**
   - Thêm `DtoPipe(SendSystemTestEmailDto)` tại dòng 125.
   - Thêm `DtoPipe(SendSystemEmailDto)` tại dòng 131.
2. **Sửa lỗi hỏng file dump trong `scripts/backup-production.ts`:**
   - Bỏ cờ `-t` trong `docker exec` (thay bằng `docker exec -i`).
   - Xuất file dump qua stream nhị phân hoặc dùng option `-f` trực tiếp của `pg_dump` thay vì redirect `>` trong PowerShell.
   - Tích hợp thêm lệnh tự động sync/archive thư mục MinIO storage.
   - Chạy thành công 1 lần Restore Drill thật vào DB test.
