# BÁO CÁO XÁC MINH KỸ THUẬT #02: PRISMA GAPS, DLQ WORKER & TENANT SECURITY AUDIT
> **Tài liệu gửi DeepSeek & Chủ Dự Án (Single Source of Truth - Deep Dive Verification)**  
> **Dự án:** HaiHire Enterprise ATS Platform  
> **Người lập:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Thời gian:** 2026-10-06  
> **Mã báo cáo:** `DOCS-REP-02`

---

## MỤC LỤC BÁO CÁO
1. [PRISMA FEATURE GAP] Rà soát các tính năng nâng cao của Prisma trong `backend/src/`
2. [DLQ WORKER] Cơ chế hoạt động của Dead-Letter Queue (`orphan-cleanup-dlq`) & Kênh Alert
3. [E2E TENANT] Hiện trạng kiểm thử End-to-End Cross-Tenant qua HTTP thật
4. [TENANT SCOPE STATIC] Hiện trạng kiểm tra tĩnh (Static Analysis) cho `organizationId` trong ORM queries
5. [TỔNG KẾT RỦI RO & KHUYẾN NGHỊ KIẾN TRÚC] Action Items cho DeepSeek & Đội ngũ Kỹ thuật

---

## 1. [PRISMA FEATURE GAP] Rà soát các tính năng nâng cao của Prisma trong `backend/src/`

Khảo sát toàn bộ mã nguồn `backend/src/` nhằm xác định mức độ phụ thuộc vào các tính năng nâng cao của Prisma Engine:

| Tính năng Prisma | Trạng thái thực tế | Chi tiết & Dẫn chứng từ Codebase |
| :--- | :---: | :--- |
| **`$extends` (Prisma Client Extensions)** | **KHÔNG SỬ DỤNG** | Quét toàn bộ `backend/src/` có **0 kết quả**. Hệ thống sử dụng Prisma 8 RC (`@prisma/orm-postgres/runtime`) theo kiến trúc Contract-first với client khởi tạo tại [`backend/src/prisma/db.ts:L23-25`](file:///c:/Workspaces/haihire/backend/src/prisma/db.ts#L23-L25). Không sử dụng các extension runtime của Prisma Client truyền thống. |
| **Nested Writes phức tạp (`create: { ... create: { ... } }`)** | **KHÔNG SỬ DỤNG** | Prisma 8 RC contract-first sử dụng mô hình truy vấn phẳng (**flat queries**). Mọi thao tác ghi đa bảng (ví dụ: Candidate + Application + CandidateDocument) đều được tách thành các câu lệnh độc lập tuần tự bên trong `executeTx(async tx => ...)` ([`applications.service.ts:L537`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L537) & [`L654`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L654)). |
| **`transaction({ isolationLevel: ... })`** | **KHÔNG SỬ DỤNG** | Phương thức quản lý giao dịch tại [`backend/src/prisma/prisma.service.ts:L19-34`](file:///c:/Workspaces/haihire/backend/src/prisma/prisma.service.ts#L19-L34) chỉ nhận callback `fn: (tx) => Promise<T>`, **không có tham số cấu hình options hay `isolationLevel`**. Giao dịch chạy hoàn toàn theo mức cô lập mặc định của PostgreSQL (`READ COMMITTED`). |
| **Catch lỗi `P2002` (Unique constraint)** | **KHÔNG SỬ DỤNG** | Quét toàn bộ codebase có **0 kết quả**. HaiHire không bắt mã lỗi `P2002` khi câu lệnh crash mà áp dụng cơ chế **Pre-flight Check chủ động**: truy vấn kiểm tra trùng lặp trước khi tạo mới (ví dụ kiểm tra email trong [`applications.service.ts:L529-536`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L529-L536) và [`auth.service.ts:L186-193`](file:///c:/Workspaces/haihire/backend/src/auth/auth.service.ts#L186-L193)), ném ngoại lệ miền `AppBadRequestException` hoặc `AppConflictException`. |

---

## 2. [DLQ WORKER] Cơ chế hoạt động của Dead-Letter Queue & Kênh Alert

### 2.1 Hiện trạng Worker và Consumer
- **Đăng ký Queue:** Tại [`backend/src/applications/applications.module.ts:L21-25`](file:///c:/Workspaces/haihire/backend/src/applications/applications.module.ts#L21-L25), cả hai queue `orphan-cleanup-queue` và `orphan-cleanup-dlq` đều được đăng ký vào BullMQ.
- **Worker xử lý:** Chỉ có [`OrphanCleanupProcessor`](file:///c:/Workspaces/haihire/backend/src/applications/orphan-cleanup.processor.ts#L16-L18) lắng nghe queue chính `orphan-cleanup-queue`.
- **Hành vi khi lỗi:** Khi job thất bại quá 5 lần (`job.attemptsMade >= 5`), event handler `@OnWorkerEvent("failed")` ([`orphan-cleanup.processor.ts:L47-68`](file:///c:/Workspaces/haihire/backend/src/applications/orphan-cleanup.processor.ts#L47-L68)) sẽ ghi log và đẩy job sang `orphan-cleanup-dlq` với tên `dead-letter-cleanup`.
- ⚠️ **KẾT LUẬN VỀ CONSUMER:** **Hoàn toàn KHÔNG CÓ worker nào consume queue `dead-letter-cleanup` (`orphan-cleanup-dlq`).**

### 2.2 Alert được gửi tới đâu?
- Khi job chuyển vào DLQ, hệ thống chỉ kích hoạt:
  ```typescript
  // orphan-cleanup.processor.ts:L51-53
  this.logger.error(
    `[CRITICAL ALERT - DLQ] MinIO orphan cleanup failed permanently for object '${job.data.objectName}' after ${job.attemptsMade} attempts: ${err.message}. Moving to DLQ.`,
  );
  ```
- **Kênh nhận tin:** **Chỉ in ra Console Logger (STDOUT/STDERR)**. **Chưa có webhook gửi tới Slack, Email hay PagerDuty**.

### 2.3 DLQ hiện đang là "Nghĩa địa" (Graveyard) hay "Safety Net"?
- **Hiện tại là "Nghĩa địa" (Graveyard):** Các job lỗi tồn đọng vĩnh viễn trên Valkey/Redis, chờ kỹ sư SRE dùng CLI hoặc UI trích xuất thủ công.
- **Tầng Safety Net bù đắp ở mức Storage:** Hệ thống có script cron chạy lúc 4:00 AM hàng ngày ([`scripts/cleanup-orphan-minio.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.ts)) quét đối soát giữa database và MinIO. Các file mồ côi tồn tại quá 30 ngày (grace period) sẽ tự động bị dọn dẹp triệt để.

---

## 3. [E2E TENANT] Hiện trạng kiểm thử Cross-Tenant qua HTTP thật

- **Xác nhận:** **CHƯA CÓ.**
- **Hiện trạng kiểm thử Playwright:** Thư mục [`frontend/tests/e2e/`](file:///c:/Workspaces/haihire/frontend/tests/e2e/) hiện có 5 kịch bản browser:
  1. `apply-form.spec.ts`: Nộp hồ sơ ứng viên công khai.
  2. `careers-page.spec.ts`: Xem JD công khai và link tracking.
  3. `kanban-drag-drop.spec.ts`: Kéo thả stage ứng viên trên Kanban.
  4. `login-flow.spec.ts`: Đăng nhập & xác thực HttpOnly cookie.
  5. `theme-toggle.spec.ts`: Đổi giao diện Dark/Light mode.
- **Đánh giá:** Tính năng cô lập tenant hiện mới chỉ được kiểm tra ở tầng Unit & Integration trong NestJS:
  - [`backend/src/test/tenant-isolation.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/tenant-isolation.spec.ts) (3 cases - mock ExecutionContext).
  - [`backend/src/interviews/interviews.service.spec.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.spec.ts) (4 cases - gọi service method trực tiếp).
  - **Chưa có test nào thực sự khởi động máy chủ HTTP, đăng nhập User A, rồi gửi HTTP request kèm Cookie đó tới endpoint của User B để assert HTTP 403 Forbidden**.

---

## 4. [TENANT SCOPE STATIC] Hiện trạng kiểm tra tĩnh (Static Analysis) cho `organizationId`

- **Xác nhận:** **CHƯA CÓ.**
- **Hiện trạng bộ 7 cổng CI trong `scripts/`:**
  - `check-dtopipe-coverage.ts`: Quét regex `@Body()` có `DtoPipe`.
  - `check-api-contract-coverage.ts`: Quét endpoint controller so với client API module; kiểm tra chống rò rỉ `JSON.stringify(err)` và `alert()`.
  - `check-error-code-i18n.ts`: Quét key `APP_ERROR_CODES` với từ điển `vi.ts`/`en.ts`.
  - `check-env-sync.ts`: So khớp 100% key parity 5 file `.env`.
  - `frontend/scripts/check-i18n.ts`: Quét JSX chống hardcode text.
- **Đánh giá:** Hoàn toàn chưa có AST scanner hay ESLint rule nào quét mã nguồn backend để bắt buộc các truy vấn ORM `prisma.db.orm.public.[Model].select(...).where(...)` phải luôn luôn chứa điều kiện `organizationId.eq(...)`. Sự cô lập dữ liệu hiện tại dựa vào:
  1. Sự bảo vệ của `TenantGuard` ở tầng controller (nếu controller có gắn guard).
  2. Tính kỷ luật và cẩn thận của lập trình viên khi viết service logic.

---

## 5. [TỔNG KẾT RỦI RO & KHUYẾN NGHỊ KIẾN TRÚC]

Dành cho DeepSeek và Chủ Dự Án để đưa vào backlog nâng cấp kỹ thuật:

| Vấn đề phát hiện | Mức độ rủi ro | Khuyến nghị giải pháp (Action Items) |
| :--- | :---: | :--- |
| **DLQ không có Consumer & Alert** | **Trung bình** | 1. Cấu hình webhook bắn thông báo vào Slack/Email khi job bị chuyển vào `orphan-cleanup-dlq`.<br>2. Xây dựng dashboard nội bộ hoặc Bull-Board để SRE quan sát và retry các job trong DLQ. |
| **Thiếu HTTP E2E Cross-Tenant Test** | **Cao** | Bổ sung 1 file test E2E Playwright `tenant-security.spec.ts`: Tạo 2 tenant demo, đăng nhập tài khoản Tenant A, gửi HTTP GET/PATCH tới endpoint dữ liệu của Tenant B và xác nhận nhận về HTTP 403. |
| **Không có Static Analysis cho ORM Scoping** | **Cao** | Viết thêm 1 script CI gate `scripts/check-tenant-scoping.ts` (quét AST TypeScript) để kiểm tra mọi method trong các domain service (ngoại trừ Auth và Public Careers) bắt buộc phải truyền và filter theo `organizationId`. |
| **Prisma Engine Simplicity** | **Thấp (Ưu điểm)** | Việc không dùng `$extends`, không dùng nested writes phức tạp và không bắt `P2002` giúp codebase sạch, ít phụ thuộc vào engine internals và hoàn toàn tương thích với các bản Prisma 8 RC / GA sau này. |
