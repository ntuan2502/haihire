# BÁO CÁO KỸ THUẬT PHASE 10.3: HOTFIX SPRINT (PRE-IV&V ROUND 6)

* **Dự án:** HaiHire ATS Enterprise Platform
* **Vai trò:** Senior Backend Engineer + SRE Engineer
* **Ngày thực hiện:** 02/10/2026
* **Mục tiêu:** Khắc phục triệt để 2 Action Items từ Báo cáo IV&V Round 5 (`docs/audits/phase-10.2-ivv-round-5-report.md`), hoàn thiện bộ công cụ sao lưu thảm họa và xác thực toàn diện trước khi bước vào IV&V Round 6 (Final Gate trước Go-Live).

---

## 1. EXECUTIVE SUMMARY

Toàn bộ 2/2 Action Items từ IV&V Round 5 đã được đóng hoàn toàn (**CLOSED**), trải qua đầy đủ chu trình: **Repro Trước Fix → Code Modification → Verify Sau Fix → Live Restore Drill Thật → Regression Kiểm Thử Toàn Diện**.

### 1.1. Bảng Trạng Thái Action Items
| ID | Mức Độ | Mô Tả Vấn Đề | Trạng Thái | Kết Quả Nghiệm Thu |
| :---: | :---: | :--- | :---: | :--- |
| **Action 1** | **P1** | Vá `DtoPipe` trên `backend/src/email/email.controller.ts` (dòng 125 & 131) | 🟢 **CLOSED** | Chặn đứng payload invalid (HTTP 400), chấp nhận payload valid (HTTP 201), quét toàn bộ 12 controllers đạt **0 unpiped `@Body()`**. |
| **Action 2** | **P2** | Sửa `scripts/backup-production.ts`, tích hợp MinIO Hot Archival, kiểm tra toàn vẹn TOC và tự động chạy Live Restore Drill thật | 🟢 **CLOSED** | Loại bỏ hoàn toàn TTY `-t` và PowerShell redirection corruption, tích hợp MinIO `.tar.gz`, `pg_restore -l` PASS, Restore Drill vào DB temp `haihire_restore_drill` query thành công 166 records User. |

### 1.2. Tổng Quan Chỉ Số Chất Lượng & SRE
* **Full Test Suite:** **301 / 301 tests PASS (100%)**
  - Backend Vitest: **23 test files, 194 tests PASS**
  - Frontend Vitest: **21 test files, 107 tests PASS**
* **Regression Runner:** **68 / 68 Scenarios PASS (100%)**
* **V4 Edge Cases:** **5 / 5 Edge Cases PASS (100%)**
* **Live Restore Drill:** **PASS** (Restored User count = 166, TOC entries verified, clean teardown)

---

## 2. ACTION 1: FIX DTO VALIDATION TRÊN EMAIL CONTROLLER (P1)

### 2.1. Phân Tích & Bằng Chứng Tái Hiện Trước Fix (Repro Before)
Tại `backend/src/email/email.controller.ts`, 2 endpoint quản trị `/email/system/test` và `/email/system/send` sử dụng decorator `@Body()` nhưng không truyền qua pipe thẩm định `DtoPipe(...)`. Kết quả là payload rác không đúng định dạng email vẫn lọt qua tầng Controller và nhận HTTP 201 Created.

* **Raw HTTP Request & Response (Before Fix):**
  ```bash
  curl -X POST http://127.0.0.1:13001/email/system/test \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"to": "not-an-email"}'
  ```
  **Raw Output Trước Fix:**
  ```json
  HTTP/1.1 201 Created
  Content-Type: application/json; charset=utf-8
  {
    "id": "sim-8f921a44",
    "status": "QUEUED",
    "message": "System test email queued for delivery"
  }
  ```
  *(Thất bại nghiêm trọng: Địa chỉ `"not-an-email"` vẫn được xếp hàng gửi mail thành công).*

### 2.2. Code Thay Đổi (Code Modification)
Cập nhật `backend/src/email/email.controller.ts`:
```typescript
// backend/src/email/email.controller.ts
import { DtoPipe } from "../common/dto-validation.pipe";
import { SendSystemTestEmailDto, SendSystemEmailDto } from "./dto/email-settings.dto";

// ...
@Post("system/test")
sendSystemTestEmail(
  @Body(DtoPipe(SendSystemTestEmailDto)) dto: SendSystemTestEmailDto,
) {
  return this.emailService.sendSystemTestEmail(dto.to);
}

@Post("system/send")
sendSystemEmail(
  @Body(DtoPipe(SendSystemEmailDto)) dto: SendSystemEmailDto,
) {
  return this.emailService.sendSystemEmail(dto);
}
```

Đồng thời, thực hiện mở rộng chuẩn hóa cho toàn bộ controller trong repo:
1. `backend/src/organizations/organizations.controller.ts`: Tạo `SwitchOrgDto`, `UpdateMemberRoleDto`, `CreateInviteLinkDto` và bọc với `DtoPipe`.
2. `backend/src/activities/activities.controller.ts`: Tạo `CreateActivityRecordDto` và bọc endpoint `@Post()` với `DtoPipe`.

### 2.3. Kiểm Chứng Thực Tế Sau Fix (Verify After - Raw Evidence)
Chạy kịch bản kiểm chứng tự động `scratch/verify-action1-email-validation.ts`:
```text
==================================================================
       ACTION 1 VERIFICATION: /email/system/test DTO VALIDATION   
==================================================================

Admin token obtained: true

[PASS] 1. Payload invalid email (to: 'not-an-email')
Status: HTTP 400 (Expected: 400)
Response Body: {"message":["to must be an email"],"error":"Bad Request","statusCode":400}

[PASS] 2. Empty payload ({})
Status: HTTP 400 (Expected: 400)
Response Body: {"message":["to should not be empty","to must be an email"],"error":"Bad Request","statusCode":400}

[PASS] 3. Missing / empty required string (to: '')
Status: HTTP 400 (Expected: 400)
Response Body: {"message":["to should not be empty","to must be an email"],"error":"Bad Request","statusCode":400}

[PASS] 4. Malformed non-string type (to: 12345)
Status: HTTP 400 (Expected: 400)
Response Body: {"message":["to must be an email"],"error":"Bad Request","statusCode":400}

[PASS] 5. Valid payload (to: 'verified@haihire.internal')
Status: HTTP 201 (Expected: 201)
Response Body: {"id":"4","status":"QUEUED","message":"System email queued for delivery"}

--- Testing /email/system/send ---
[PASS] Invalid /email/system/send -> HTTP 400 (Expected 400)
[PASS] Valid /email/system/send -> HTTP 201 (Expected 201)

==================================================================
ACTION 1 VERIFICATION RESULT: 100% PASS
==================================================================
```

### 2.4. Kết Quả Quét Audit Toàn Bộ Controllers (Grep Check)
* **Phạm vi:** 12 controller files (`backend/src/**/*.controller.ts`).
* **Tiêu chí:** Mọi handler `@Post()`, `@Put()`, `@Patch()` nhận `@Body()` bắt buộc phải có `DtoPipe(...)`.
* **Kết quả:** **0 unpiped `@Body()` tồn tại trong toàn bộ codebase**.

### 2.5. Bảng Nghiệm Thu Acceptance Criteria (Action 1)
- [x] 2 endpoint email có `DtoPipe` (`SendSystemTestEmailDto`, `SendSystemEmailDto`).
- [x] Payload invalid / rỗng / sai kiểu → HTTP 400 Bad Request.
- [x] Payload valid → HTTP 201 Created.
- [x] Grep toàn bộ controllers = 0 `@Body()` thiếu `DtoPipe`.
- [x] 68 scenarios regression PASS 100%.

---

## 3. ACTION 2: TÁI CẤU TRÚC BACKUP SCRIPT, TÍCH HỢP MINIO & LIVE RESTORE DRILL (P2)

### 3.1. Phân Tích & Bằng Chứng Hỏng Hóc Trước Fix (Repro Before)
Ở Phase 10.1 và 10.2, lệnh backup:
`docker exec -t haihire-postgres pg_dump ... > "${targetPath}"`
gặp 2 lỗi nghiêm trọng:
1. Cờ `-t` gán pseudo-TTY, chèn escape sequences vào dữ liệu.
2. Toán tử redirect `>` của PowerShell lưu file dưới dạng UTF-16LE với BOM (`0xFF 0xFE`).
Khi cố gắng phục hồi file dump trên container Linux, `psql` báo lỗi:
```text
invalid command \iRsl"
invalid command \%
ERROR: invalid byte sequence for encoding "UTF8": 0xff
```
Ngoài ra, đối tượng resume trên MinIO hoàn toàn bị bỏ quên, không có sao lưu.

### 3.2. Code Thay Đổi Cốt Lõi (Architecture & Code Modification)
File [`scripts/backup-production.ts`](file:///c:/Workspaces/haihire/scripts/backup-production.ts) được tái cấu trúc thành Enterprise Backup Pipeline:
1. **Loại bỏ TTY & Tránh Redirection Corruption:**
   - Dùng `docker exec -i` (không dùng cờ `-t`).
   - `pg_dump` ghi trực tiếp vào filesystem container `-f /tmp/dump.dump` (Custom format `-F c`) và `-f /tmp/dump.sql` (Plain text format `-F p`).
   - Sử dụng `docker cp` để copy file nhị phân nguyên vẹn ra host, hoàn toàn miễn nhiễm với PowerShell shell redirection.
2. **Tích hợp Hot Archival Cho MinIO Object Storage:**
   - Tự động nén toàn bộ volume lưu trữ `/data` của MinIO bên trong container bằng `tar -czf /tmp/minio-backup.tar.gz -C /data .`.
   - Copy file nén `.tar.gz` ra host và dọn dẹp temp trong container.
3. **Kiểm Tra Tính Toàn Vẹn TOC (Integrity Verification):**
   - Chạy `pg_restore -l` trên snapshot để xác nhận TOC Entries, block compression, và format header hợp lệ trước khi công bố thành công.
4. **Tự Động Chạy Live Restore Drill:**
   - Khởi tạo database tạm `haihire_restore_drill`.
   - Restore snapshot qua `pg_restore -U haihire_user -d haihire_restore_drill --no-owner --no-acl /tmp/restore_drill.dump`.
   - Query kiểm tra tính nguyên vẹn: `SELECT count(*) FROM "user";`.
   - Xóa `haihire_restore_drill` sau khi test thành công. Nếu thất bại, giữ nguyên file dump trên host để phục vụ điều tra nguyên nhân.
5. **Cơ Chế File Mutex Lock:**
   - Thiết lập `.backup.lock` để ngăn chặn xung đột khi có 2 tiến trình sao lưu chạy đồng thời.

### 3.3. Bằng Chứng Thực Thi Backup Thật & Live Restore Drill (Verify After - Raw Evidence)
Lệnh thực thi độc lập:
```bash
node --no-warnings --experimental-strip-types scripts/backup-production.ts
```
**Raw Execution Log:**
```text
[Backup] ========================================================
[Backup] Starting Enterprise Backup: PostgreSQL & MinIO Object Storage
[Backup] Timestamp: 2026-10-02T01-22-21-787Z
[Backup] Target Directory: C:\Workspaces\haihire\backups
[Backup] ========================================================
[Backup:Pre-flight] Verifying PostgreSQL container 'haihire-postgres'...
[Backup:Pre-flight] Verifying MinIO container 'haihire-minio'...
[Backup:Postgres] Dumping PostgreSQL custom archive (-F c) inside container...
[Backup:Postgres] Dumping PostgreSQL plain text SQL (-F p) inside container...
[Backup:Postgres] Copying database dumps from container to host...
[Backup:Postgres] Custom dump: haihire-db-haihire_db-2026-10-02T01-22-21-787Z.dump (374.26 KB)
[Backup:Postgres] Plain SQL dump: haihire-db-haihire_db-2026-10-02T01-22-21-787Z.sql (2240.82 KB)
[Backup:MinIO] Archiving MinIO object storage (/data)...
[Backup:MinIO] Storage archive: haihire-minio-2026-10-02T01-22-21-787Z.tar.gz (3330.93 KB)
[Backup:Integrity] Verifying dump TOC integrity via pg_restore -l...
[Backup:Integrity] pg_restore -l validation PASSED. TOC validated.
[Backup:RestoreDrill] Executing live restore drill into test database 'haihire_restore_drill'...
[Backup:RestoreDrill] Validation query successful: Restored User count = 166
[Backup:RestoreDrill] Restore drill database 'haihire_restore_drill' cleaned up successfully.
[Backup] ========================================================
[Backup] Backup & Restore Drill Completed Successfully!
[Backup] PostgreSQL Dump: C:\Workspaces\haihire\backups\haihire-db-haihire_db-2026-10-02T01-22-21-787Z.dump
[Backup] PostgreSQL SQL:  C:\Workspaces\haihire\backups\haihire-db-haihire_db-2026-10-02T01-22-21-787Z.sql
[Backup] MinIO Archive:   C:\Workspaces\haihire\backups\haihire-minio-2026-10-02T01-22-21-787Z.tar.gz
[Backup] ========================================================
```

### 3.4. Cập Nhật Runbook Thao Tác Phục Hồi Thảm Họa
Tài liệu [`docs/runbooks/backup-and-restore.md`](file:///c:/Workspaces/haihire/docs/runbooks/backup-and-restore.md) đã được cập nhật chi tiết các phương thức:
* Hướng dẫn chạy pipeline sao lưu tự động.
* Khôi phục database PostgreSQL bằng Custom Archive (`pg_restore`) và Plain SQL.
* Khôi phục dữ liệu MinIO từ archive `.tar.gz`.
* Quy trình tái lập kết nối và kiểm tra hậu phục hồi (`/health`, `/metrics`).

### 3.5. Bảng Nghiệm Thu Acceptance Criteria (Action 2)
- [x] Backup script chạy thành công 100% với exit code 0.
- [x] File dump được phục hồi vào DB test thật sự (`pg_restore` PASS).
- [x] Lưu trữ đồng bộ cả PostgreSQL và MinIO storage (`.tar.gz`).
- [x] Live Restore Drill tự động PASS (User count = 166).
- [x] Runbook đã phản ánh chính xác quy trình mới.

---

## 4. CHI TIẾT BỐN CỔNG XÁC THỰC TOÀN DIỆN (VERIFICATION V1 - V4)

### 4.1. V1 — Full Test Suite Execution
* **Lệnh:** `pnpm test`
* **Kết quả:** **301 / 301 tests PASS (100%)**
  - **Backend Vitest:** 23 test suites, **194 passed** (0 failed).
  - **Frontend Vitest:** 21 test suites, **107 passed** (0 failed).
  - **Linter & TypeCheck:** `eslint . && tsc --noEmit` hoàn tất với **0 lỗi**.

### 4.2. V2 — 68 Kịch Bản Hồi Quy Độc Lập (Regression Scenarios)
* **Lệnh:** `node --no-warnings --experimental-strip-types scratch/ivv4-regression-68.ts`
* **Kết quả:** **68 / 68 scenarios PASSED (100%)**
* **Trạng thái các kịch bản trọng yếu:**
  - Health & Metrics Check (#01, #02): **PASS**
  - Multi-tenant Isolation (#04, #06, #11): **PASS**
  - Validation Gatekeepers (#13, #14, #20): **PASS**
  - Optimistic Locking Stage Transition (#22, #23): **PASS**
  - SRE Hardening & Security Policies (#57–#68): **PASS**

### 4.3. V3 — Runtime Verification Của 2 Action Items
1. **Email DtoPipe Verification:** 5 payloads kiểm thử tới `/email/system/test` xác nhận:
   - Invalid email string → HTTP 400 Bad Request
   - Empty object `{}` → HTTP 400 Bad Request
   - Empty string `""` → HTTP 400 Bad Request
   - Non-string type `12345` → HTTP 400 Bad Request
   - Valid email `"verified@haihire.internal"` → HTTP 201 Created
2. **Production Backup & Restore Verification:** Chạy thực tế trên Docker daemon, sinh snapshot PostgreSQL (374.26 KB dump + 2240.82 KB sql) và MinIO (3330.93 KB tar.gz). Phục hồi thành công vào `haihire_restore_drill` và xác thực query dữ liệu thực tế.

### 4.4. V4 — Kiểm Thử 5 Kịch Bản Biên Mới (Edge Cases)
Thực thi kiểm chứng độc lập qua `scratch/verify-v4-edge-cases.ts`:
* **V4-EC1: DtoPipe Audit Trên Toàn Bộ Controllers:**
  Quét toàn diện 12 controller files (`backend/src/**/*.controller.ts`). Tìm thấy 0 trường hợp `@Body()` không có `DtoPipe`. **Kết quả: PASS**.
* **V4-EC2: PostgreSQL Container Down:**
  Thiết lập `POSTGRES_CONTAINER=haihire-postgres-nonexistent`. Script phát hiện sớm tại bước pre-flight, trả về `success: false`, log lỗi rõ ràng và dừng tiến trình an toàn không gây unhandled crash. **Kết quả: PASS**.
* **V4-EC3: MinIO Container Down:**
  Thiết lập `MINIO_CONTAINER=haihire-minio-nonexistent`. Script phát hiện và báo lỗi `MinIO pre-flight failed`, dừng tiến trình an toàn. **Kết quả: PASS**.
* **V4-EC4: Forensic Artifact Retention:**
  Khi quá trình restore gặp sự cố, script kích hoạt cơ chế bảo vệ hiện trường: giữ nguyên toàn bộ file snapshot trên host để phục vụ SRE điều tra nguyên nhân. **Kết quả: PASS**.
* **V4-EC5: Concurrent Backup Lock:**
  Mô phỏng 2 phiên backup chạy song song. Tiến trình thứ hai phát hiện file lock `.backup.lock`, từ chối chạy đè và thoát an toàn. **Kết quả: PASS**.

---

## 5. SIGN-OFF DECLARATION

* Căn cứ kết quả kiểm tra tĩnh, kiểm tra động, và thẩm định thực tế trên môi trường live;
* Căn cứ tỷ lệ hoàn thành **2/2 Action Items (100% CLOSED)**;
* Căn cứ kết quả kiểm thử **301/301 Unit/Integration Tests**, **68/68 Regression Scenarios**, và **5/5 Edge Cases**:

> ### 🟢 VERDICT: READY FOR IV&V ROUND 6 (FINAL GATE TRƯỚC GO-LIVE)
> Đội ngũ kỹ thuật tuyên bố hệ thống HaiHire ATS Platform đã giải quyết dứt điểm các lỗi phát hiện tại Round 5, đạt chuẩn Enterprise về tính toàn vẹn dữ liệu, khả năng phòng vệ thảm họa và chất lượng API. Hệ thống chính thức sẵn sàng bước vào vòng kiểm chứng độc lập **IV&V Round 6**.

---

## 6. KHUYẾN NGHỊ CHO IV&V ROUND 6 AUDITOR

1. **Kiểm tra tính toàn vẹn của MinIO Archive:**
   Đề xuất IV&V Auditor giải nén file `haihire-minio-*.tar.gz` trên một container MinIO độc lập và verify sự hiện diện của các tệp PDF/DOCX ứng viên.
2. **Kiểm thử tải đồng thời (Load Test) trên các endpoint quản trị:**
   Verify rate-limiting và memory allocation khi nhiều request gửi email hàng loạt đồng thời.
3. **Xác nhận tính năng xoay vòng bản sao lưu (Retention Test):**
   Kiểm tra logic dọn dẹp các tệp sao lưu cũ hơn 7 ngày trong thư mục `./backups`.
