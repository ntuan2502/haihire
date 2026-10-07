# Báo Cáo Kỹ Thuật: Task #4 Follow-Up & Khảo Sát Kickoff Task #5

**Dự án:** HaiHire Enterprise ATS  
**Tác giả:** Senior Software Engineer / Antigravity Agent  
**Ngày thực hiện:** 07/10/2026  
**Trạng thái:** ✅ SẴN SÀNG CHỜ DEEPSEEK REVIEW & PHÁT HÀNH SPEC TASK #5  
**Tài liệu tham chiếu:** [docs/reports/13-task-04-e2e-cross-tenant-valkey-report.md](file:///c:/Workspaces/haihire/docs/reports/13-task-04-e2e-cross-tenant-valkey-report.md), [backend/src/prisma/contract.prisma](file:///c:/Workspaces/haihire/backend/src/prisma/contract.prisma)

---

## PHẦN A: XÁC MINH SỰ BẤT NHẤT CỦA MÃ LỖI (ERROR CODE INCONSISTENCY)

Trong Task #4, 4 kịch bản kiểm thử từ chối truy cập chéo tổ chức (cross-tenant rejection) sử dụng 4 mã lỗi:
1. `CANDIDATE_ORG_MISMATCH` (`GET /candidates`)
2. `JOB_INVALID_ORGANIZATION` (`PATCH /jobs`)
3. `APPLICATION_INVALID_ORGANIZATION` (`DELETE /applications`)
4. `ORG_FORBIDDEN_ACTION` (`PATCH /webhook-settings`)

### 1. Tại sao mã #4 (`ORG_FORBIDDEN_ACTION`) không theo pattern `<ENTITY>_<PROBLEM>`?

Khảo sát toàn bộ mã nguồn backend xác nhận:
Mã `ORG_FORBIDDEN_ACTION` không thuộc về riêng một thực thể nào vì đây là **Mã Lỗi Bảo Vệ Ngữ Cảnh Tổ Chức Cấp Hệ Thống (System-Level Organization Guard Error)**.

- **Được sử dụng trực tiếp tại `TenantGuard` ([`backend/src/common/guards/tenant.guard.ts:L44, L54`](file:///c:/Workspaces/haihire/backend/src/common/guards/tenant.guard.ts#L44-L54)):**
  Khi bất kỳ HTTP request nào mang `organizationId` (qua query, body hoặc param) mà người dùng không có quyền thành viên hợp lệ trong tổ chức đó, guard sẽ chủ động ném `AppForbiddenException(APP_ERROR_CODES.ORG_FORBIDDEN_ACTION)`.
- **Được dùng chung trong các service quản trị cấp tổ chức:**
  - [`backend/src/organizations/organizations.service.ts`](file:///c:/Workspaces/haihire/backend/src/organizations/organizations.service.ts): Quản lý thành viên, lời mời, cập nhật tổ chức chéo quyền (L431, L589, L751, L854, L962, L1141).
  - [`backend/src/webhook-settings/webhook-settings.service.ts`](file:///c:/Workspaces/haihire/backend/src/webhook-settings/webhook-settings.service.ts): Quản lý cấu hình webhook per-org (L118, L222, L368, L414).
  - [`backend/src/activities/activities.service.ts`](file:///c:/Workspaces/haihire/backend/src/activities/activities.service.ts): Kiểm tra quyền truy cập nhật ký hoạt động (L72, L111).
  - [`backend/src/email/email.service.ts`](file:///c:/Workspaces/haihire/backend/src/email/email.service.ts): Kiểm tra quyền gửi email tổ chức (L82).

**Kết luận:** `ORG_FORBIDDEN_ACTION` có phạm vi dùng chung rộng rãi (shared guard / org context). Giữ nguyên code này là **hoàn toàn chính xác** về mặt kiến trúc.

---

### 2. Khảo sát UX trong `frontend/src/i18n/locales/vi.ts` và `en.ts`

Dưới đây là nội dung thực tế đang được hiển thị tới người dùng:

| Mã Lỗi | Tiếng Việt (`vi.ts`) | Tiếng Anh (`en.ts`) |
| :--- | :--- | :--- |
| **`ORG_FORBIDDEN_ACTION`** | `"Bạn không có quyền thực hiện thao tác này trong tổ chức ({organizationId})."` | `"You do not have permission to perform this action in organization ({organizationId})."` |
| **`JOB_INVALID_ORGANIZATION`** | `"Vị trí tuyển dụng ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Job position ({id}) does not belong to your organization."` |
| **`APPLICATION_INVALID_ORGANIZATION`**| `"Hồ sơ ứng tuyển ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Application ({id}) does not belong to your organization."` |
| **`CANDIDATE_ORG_MISMATCH`** | `"Ứng viên ({id}) không thuộc tổ chức hiện tại của bạn."` | `"Candidate ({id}) does not belong to your organization."` |

**Nhận xét:**
- 3 mã entity (`JOB_INVALID_ORGANIZATION`, `APPLICATION_INVALID_ORGANIZATION`, `CANDIDATE_ORG_MISMATCH`) đã được chuẩn hóa rất đẹp theo cùng một khuôn mẫu ngữ nghĩa:
  `"<Tên Thực Thể> ({id}) không thuộc tổ chức hiện tại của bạn."`
  Thông điệp này giúp người dùng và lập trình viên nhận diện chính xác loại tài nguyên nào bị vi phạm cross-tenant.
- Mã `ORG_FORBIDDEN_ACTION` mang ngữ nghĩa bao quát cho các hành vi cấp tổ chức / guard.

---

### 3. Đề xuất chuẩn hóa & Document
- **Giữ nguyên 4 Error Codes:** Tuyệt đối không đổi tên mã lỗi trong `packages/shared/src/errors.ts` để tránh breaking change API contract giữa Backend và Frontend.
- **Về UX Messages:**
  - **Phương án 1 (Khuyến nghị):** Giữ nguyên các thông điệp chi tiết theo từng entity như hiện tại vì đã có cấu trúc chuẩn hóa cao và cung cấp thông tin rõ ràng cho người dùng.
  - **Phương án 2 (Đồng nhất hoàn toàn 1 câu):** Nếu DeepSeek muốn thống nhất toàn bộ 4 lỗi về cùng một câu chung:
    - VI: `"Bạn không có quyền truy cập dữ liệu của tổ chức khác."`
    - EN: `"You do not have permission to access data from another organization."`
- **Tài liệu hóa:** Đã ghi nhận mô hình lỗi 2 tầng (**Tầng 1:** Entity-Level Isolation & **Tầng 2:** Organization-Guard Isolation) vào [`docs/PROJECT_CONTEXT.md`](file:///c:/Workspaces/haihire/docs/PROJECT_CONTEXT.md).

---

## PHẦN B: KHẢO SÁT KICKOFF TASK #5 (TENANT SCOPING STATIC ANALYSIS)

---

### Câu hỏi 1: Liệt kê tất cả file `*.service.ts` trong `backend/src/`
Tổng cộng có **18 service files**:

#### A. Tenant-Scoped Services (8 services nghiệp vụ có dữ liệu đa người thuê):
1. [`backend/src/activities/activities.service.ts`](file:///c:/Workspaces/haihire/backend/src/activities/activities.service.ts)
2. [`backend/src/applications/applications.service.ts`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts)
3. [`backend/src/candidates/candidates.service.ts`](file:///c:/Workspaces/haihire/backend/src/candidates/candidates.service.ts)
4. [`backend/src/interviews/interviews.service.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.ts)
5. [`backend/src/jobs/jobs.service.ts`](file:///c:/Workspaces/haihire/backend/src/jobs/jobs.service.ts)
6. [`backend/src/organizations/organizations.service.ts`](file:///c:/Workspaces/haihire/backend/src/organizations/organizations.service.ts)
7. [`backend/src/sourcing/sourcing.service.ts`](file:///c:/Workspaces/haihire/backend/src/sourcing/sourcing.service.ts)
8. [`backend/src/webhook-settings/webhook-settings.service.ts`](file:///c:/Workspaces/haihire/backend/src/webhook-settings/webhook-settings.service.ts)
*(Ghi chú: [`backend/src/users/users.service.ts`](file:///c:/Workspaces/haihire/backend/src/users/users.service.ts) là service đọc danh sách người dùng mẫu toàn hệ thống)*

#### B. Non-Tenant-Scoped Services (9 services hạ tầng / hệ thống):
1. `backend/src/app.service.ts` — Kiểm tra sức khỏe hệ thống (Health & Service Status).
2. `backend/src/auth/auth.service.ts` — Xác thực tài khoản, băm mật khẩu, cấp JWT token.
3. `backend/src/common/encryption.service.ts` — Thuật toán mã hóa AES-256-GCM.
4. `backend/src/common/webhook/webhook-notifier.service.ts` — Dispatcher gửi HTTP webhook ra ngoài.
5. `backend/src/email/email.service.ts` — BullMQ worker và kết nối SMTP/Resend/SendGrid.
6. `backend/src/events/events.service.ts` — SSE In-memory event bus.
7. `backend/src/metrics/metrics.service.ts` — Thu thập Prometheus metrics.
8. `backend/src/minio/minio.service.ts` — Kết nối S3 Object Storage MinIO.
9. `backend/src/prisma/prisma.service.ts` — Quản lý vòng đời kết nối Prisma Engine.

---

### Câu hỏi 2: Thống kê các câu truy vấn ORM trong các file Tenant-Scoped
Dự án sử dụng **Prisma 8 Composer API** (`this.prisma.db.orm.public.<Model>.<method>` hoặc `tx.orm.public.<Model>.<method>`).
Kết quả khảo sát tự động qua bộ quét tĩnh:

- **Tổng số câu query ORM phát hiện:** **214 queries**.
- **Số câu query CÓ lọc `organizationId` (hoặc `targetOrgId`):** **108 queries**.
- **Số câu query KHÔNG lọc trực tiếp bằng `organizationId`:** **106 queries** (Đây là các query cần được phân loại Whitelist ở Câu 3).

**Chi tiết theo từng tệp tin:**
- `activities.service.ts`: 3 queries (Có Org: 1, Không Org: 2 — lọc động `query.where(...)` ở dòng tiếp theo).
- `applications.service.ts`: 32 queries (Có Org: 13, Không Org: 19).
- `candidates.service.ts`: 18 queries (Có Org: 5, Không Org: 13).
- `interviews.service.ts`: 26 queries (Có Org: 4, Không Org: 22).
- `jobs.service.ts`: 16 queries (Có Org: 6, Không Org: 10).
- `organizations.service.ts`: 80 queries (Có Org: 65, Không Org: 15).
- `sourcing.service.ts`: 28 queries (Có Org: 10, Không Org: 18).
- `webhook-settings.service.ts`: 10 queries (Có Org: 4, Không Org: 6).
- `users.service.ts`: 1 query (Không Org: 1).

---

### Câu hỏi 3: Những câu query nào ĐÚNG và HỢP LỆ khi KHÔNG CÓ `organizationId`? (Whitelist Cases)

Qua việc kiểm tra schema tại [`backend/src/prisma/contract.prisma`](file:///c:/Workspaces/haihire/backend/src/prisma/contract.prisma), phát hiện 4 nhóm hợp lệ bắt buộc phải Whitelist:

#### Nhóm 1: Các Model vật lý HOÀN TOÀN KHÔNG CÓ cột `organizationId` trong Database
1. **Model `Interview`:** Bảng `interview` chỉ có `id`, `applicationId`, `scheduledAt`, v.v... **Không tồn tại cột `organizationId`**. Mọi câu query trên bảng `Interview` bắt buộc phải lọc qua `applicationId` (hoặc `id`), không thể lọc qua `organizationId`.
2. **Model `Application`:** Bảng `application` liên kết qua `jobId` và `candidateId`. **Không có cột `organizationId`**. Tenant context được kế thừa từ `jobId -> job.organizationId`.
3. **Model `TrackingClick`:** Chỉ có `id` và `trackingLinkId`. Kế thừa qua `trackingLinkId`.
4. **Model `Organization`:** Khóa chính của bảng này là `id`. Do đó truy vấn thông tin tổ chức lọc bằng `id: orgId` hoặc `slug: orgSlug`, không có cột `organizationId`.

#### Nhóm 2: Truy vấn phụ sau khi đã Guard / Verify đối tượng cha ở đầu hàm
- *Ví dụ 1 (`applications.service.ts:findByJob`):* Đầu hàm đã fetch `Job` theo `jobId` và kiểm tra `if (job.organizationId !== tenantOrgId) throw 403`. Sau khi Job đã được xác thực thuộc đúng tenant, các query tiếp theo lấy `Application` (`where(a => a.jobId.eq(jobId))`) và `Candidate` (`where(c => c.id.in(candidateIds))`) là hoàn toàn an toàn.
- *Ví dụ 2 (`jobs.service.ts:findOne`):* Đã assert `job.organizationId === tenantOrgId`, sau đó fetch các Application của job đó.

#### Nhóm 3: Cập nhật hoặc Xóa theo Khóa chính duy nhất (`id`) sau khi đã verify
- *Ví dụ (`jobs.service.ts:update` hoặc `webhook-settings.service.ts:delete`):* Đầu tiên gọi `findOne(id, tenantOrgId)` ném 403 nếu sai tenant. Khi đã xác thực an toàn, câu lệnh `update` / `delete` chỉ cần `where((x) => x.id.eq(id))`.

#### Nhóm 4: Các endpoint Public Careers không cần đăng nhập
- *Ví dụ (`jobs.service.ts:findBySlug`):* Ứng viên ngoài Internet xem tin tuyển dụng công khai qua slug của tổ chức (`orgSlug`) và `status === "PUBLISHED"`.

---

### Câu hỏi 4: Có pattern query nào khác ngoài `this.prisma.db.orm.public` không?
1. **Raw SQL (`$queryRaw`, `$executeRaw`):** **HOÀN TOÀN KHÔNG CÓ (0 query)**. Toàn bộ dự án tuân thủ tuyệt đối Prisma 8 Composer type-safe queries.
2. **Transaction Queries:** Có sử dụng biến transaction `tx.orm.public.<Model>...` bên trong callback `executeTx`.
3. **Biến DB tĩnh:** File `users.service.ts` import trực tiếp `db.orm.public.User` từ `../prisma/db.ts`.
4. **Kết luận cho Tool Static Analysis:** Script Version 1 cần bắt regex linh hoạt:
   `/(?:this\.prisma\.db|tx|db)\.orm\.public\.([A-Za-z0-9_]+)/`

---

### Câu hỏi 5: Phân tích file `scripts/check-dtopipe-coverage.ts`
- **Cách thức parse:** Sử dụng **Regex / Line-by-line inspection** kết hợp duyệt đệ quy `fs.readdirSync` và `fs.readFileSync`.
  - Không cần dùng TypeScript Compiler API hay Babel AST, giúp script chạy siêu tốc (< 0.2s), phù hợp tuyệt đối với tiêu chí CI fast gate.
- **Khả năng tái sử dụng:**
  - Cấu trúc quét đệ quy, hàm kiểm tra, cơ chế in lỗi màu đỏ với đường dẫn `file:line -> snippet`, và mã thoát `process.exit(1)` hoàn toàn có thể tái sử dụng 100% cho `scripts/check-tenant-scoping.ts`.

---

## TỔNG KẾT & TRẠNG THÁI WORKING TREE

- **Working Tree:** Hoàn toàn sạch (`working tree clean`), branch `feat/task-04-e2e-cross-tenant-test` đã đồng bộ với `origin`.
- **Trạng thái Code:** Chưa có thay đổi code mới nào cần commit cho phần A/B (giữ nguyên để chờ spec chính thức từ DeepSeek).
- **Sẵn sàng:** Báo cáo khảo sát đầy đủ 5 mục đã được lưu trữ vĩnh viễn tại `docs/reports/14-task-04-followup-and-task-05-kickoff-survey-report.md`, sẵn sàng để DeepSeek đánh giá và ban hành đặc tả chi tiết cho **Task #5 (Tenant Scoping Static Analysis)**.
