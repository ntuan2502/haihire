# Runtime Verification Report — HaiHire Platform

> **Ngày thực hiện**: 01/10/2026  
> **Phương pháp kiểm thử**: Full Runtime & Functional Verification (Thực thi trực tiếp trên hệ sinh thái đang chạy)  
> **Nguyên tắc**: KHÔNG sửa mã nguồn, KHÔNG refactor, thu thập bằng chứng thực tế (HTTP status, Database state, MinIO objects, Redis keys, SSE streams).

---

## 1. Environment (Môi Trường Thực Tế)

| Dịch vụ | Cổng (Port) | Trạng thái Runtime | Chi tiết kiểm chứng |
|---|---|---|---|
| **PostgreSQL** | `15432` | ✅ **HEALTHY** | Docker container `haihire-postgres` (healthy), phản hồi trong 74ms, schema đồng bộ 100% với Prisma contract. |
| **Redis** | `16379` | ✅ **HEALTHY** | Docker container `haihire-redis` (healthy), lệnh `PING` trả về `PONG` trong 14ms. Các keys của BullMQ đang hoạt động. |
| **MinIO S3** | `19000 / 19001` | ✅ **HEALTHY** | Docker container `haihire-minio` (healthy), bucket `haihire-resumes` sẵn sàng, upload/download tệp hoạt động bình thường. |
| **Backend API** | `13001` | ✅ **HEALTHY** | NestJS 12 running (PID 25276), `GET /` trả về HTTP 200 `{"message":"hello from create-prisma + nest"}` trong 27ms. |
| **Frontend** | `13000` | ✅ **HEALTHY** | Next.js 16.3.7 running (PID 42808), SSR render trang chủ trả về HTTP 200 trong 68ms với đầy đủ HTML và title. |
| **BullMQ Worker** | - | ✅ **ACTIVE** | Worker tích hợp trong NestJS backend, kết nối Redis trên queue `email-queue`, xử lý các job email tự động. |

---

## 2. Runtime Tests (Bảng Kịch Bản Kiểm Thử Thực Tế)

| # | Kịch bản kiểm thử | Kỳ vọng (Expected) | Thực tế khi chạy (Actual) | Kết quả | Bằng chứng (Evidence) |
|---|---|---|---|---|---|
| 1 | **Login with Cookie Only** (Không gửi Bearer header) | HTTP 200, xác thực bằng cookie HttpOnly | HTTP 401 Unauthorized | ❌ **FAIL** (Bug #1 Confirmed) | `GET /auth/me` với header `Cookie: haihire_token=...` trả về `{"statusCode":401,"message":"Unauthorized"}`. Trong khi gửi kèm header `Authorization: Bearer` thì trả về 200 OK. |
| 2 | **Login with Bearer Token** | HTTP 200, trả về thông tin user | HTTP 200 OK, trả về đúng profile | ✅ **PASS** | `GET /auth/me` trả về `{ id, email, name, role, organizationId }`. |
| 3 | **Token Refresh** | HTTP 200, cấp access token mới | HTTP 200 OK, cấp token mới thành công | ✅ **PASS** | `POST /auth/refresh` với `refreshToken` trả về `accessToken` mới và set lại cookie. |
| 4 | **Logout** | HTTP 200, xóa cookie xác thực | HTTP 200 OK, set `Max-Age=0` | ✅ **PASS** | Header `Set-Cookie: haihire_token=; Max-Age=0; Path=/; Expires=Thu, 01 Oct 2026 04:18:20 GMT`. |
| 5 | **Invalid / Expired Token** | HTTP 401 Unauthorized | HTTP 401 Unauthorized | ✅ **PASS** | Cả token rác và token hết hạn đều bị chặn với mã 401. |
| 6 | **Cross-Tenant: User A đọc Job B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Mã lỗi `JOB_INVALID_ORGANIZATION`: "Access denied: job belongs to another organization." |
| 7 | **Cross-Tenant: User A sửa Job B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Mã lỗi `JOB_INVALID_ORGANIZATION`: "Access denied: job belongs to another organization." |
| 8 | **Cross-Tenant: User A đọc Candidate B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Mã lỗi `CANDIDATE_ORG_MISMATCH`: "Access denied: candidate belongs to another organization." |
| 9 | **Cross-Tenant: User A đọc Application B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Mã lỗi `APPLICATION_INVALID_ORGANIZATION`: "Access denied: application belongs to another organization." |
| 10 | **Cross-Tenant: User A sửa Stage Application B** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | Mã lỗi `APPLICATION_INVALID_ORGANIZATION`: "Access denied: application belongs to another organization." |
| 11 | **Cross-Tenant: Tải CV của ứng viên khác Org** | HTTP 403 Forbidden | HTTP 403 Forbidden | ✅ **PASS** | `GET /applications/:id/documents/download` trả về 403 Forbidden. |
| 12 | **Stage Transition: Valid Flow** (APPLIED → SCREENING → INTERVIEW → OFFER → HIRED) | HTTP 200, cập nhật tuần tự | HTTP 200 cho toàn bộ các bước | ✅ **PASS** | Database cập nhật chính xác từng stage theo từng bước gọi API. |
| 13 | **Stage Transition: HIRED → APPLIED** | HTTP 400 (Chặn chuyển ngược) | HTTP 200, DB đổi thành APPLIED | ❌ **FAIL** (Bug #2 Confirmed) | `PATCH /applications/:id/stage` chấp nhận chuyển từ `HIRED` ngược về `APPLIED` không có ràng buộc. |
| 14 | **Stage Transition: REJECTED → OFFER** | HTTP 400 (Chặn chuyển phi lý) | HTTP 200, DB đổi thành OFFER | ❌ **FAIL** (Bug #2 Confirmed) | Ứng viên đã bị REJECTED vẫn chuyển thẳng sang OFFER thành công mà không có kiểm tra điều kiện. |
| 15 | **Stage Transition: APPLIED → HIRED** (Nhảy cóc) | HTTP 400 (Yêu cầu qua phỏng vấn) | HTTP 200, DB đổi thành HIRED | ❌ **FAIL** (Bug #2 Confirmed) | Ứng viên mới nộp đơn nhảy thẳng lên HIRED thành công. |
| 16 | **File Upload: Valid PDF** | HTTP 201, lưu trữ vào MinIO | HTTP 201, tệp lưu đúng bucket | ✅ **PASS** | MinIO SDK kiểm tra trực tiếp: file tồn tại với kích thước 63 bytes, `content-type: application/pdf`. |
| 17 | **File Upload: Valid DOCX** | HTTP 201, lưu trữ vào MinIO | HTTP 201 Created | ✅ **PASS** | File DOCX được chấp nhận bởi bộ lọc và lưu trữ thành công. |
| 18 | **File Upload: PNG/JPG vào Document** | HTTP 400 Bad Request | HTTP 400 Bad Request | ✅ **PASS** | `VALIDATION_ERROR`: "File type not allowed. Only .pdf, .doc, and .docx formats are accepted". |
| 19 | **File Upload: Vượt giới hạn 10MB** | Bị từ chối (413 hoặc 400) | HTTP 413 Payload Too Large | ✅ **PASS** | Tệp 11MB bị Multer chặn ngay lập tức với mã 413 "File too large". |
| 20 | **File Upload: Giả mạo extension** (Bash script đổi tên thành `.pdf`) | Bị từ chối qua Magic Bytes check | HTTP 201 Created (Chấp nhận) | ⚠️ **FAIL / GAP** | Script bash được lưu vào hệ thống vì backend chỉ kiểm tra đuôi tệp và header client gửi lên, không kiểm tra buffer magic bytes. |
| 21 | **File Upload: Chống Path Traversal** (`../../../../etc/passwd.pdf`) | Tên tệp được chuẩn hóa, không thoát thư mục | HTTP 201, tên object là UUID an toàn | ✅ **PASS** | Đường dẫn lưu trữ trên MinIO được thay thế bằng timestamp + UUID, triệt tiêu hoàn toàn path traversal. |
| 22 | **Email: Xác nhận ứng tuyển (Confirmation)** | Email được enqueue và xử lý | HTTP 201, EmailLog được tạo | ✅ **PASS** | BullMQ xử lý job, bản ghi `EmailLog` được tạo trong PostgreSQL với template `APPLICATION_CONFIRMATION`. |
| 23 | **Email: Thông báo từ chối (Rejection)** | Tự động gửi khi đổi stage sang REJECTED | EmailLog được tạo tự động | ✅ **PASS** | Khi chuyển stage sang `REJECTED`, worker sinh log với template `REJECTION`. |
| 24 | **Email: Thư mời phỏng vấn (Invitation)** | Gửi email khi đặt lịch kèm flag | EmailLog được tạo tự động | ✅ **PASS** | Tạo interview với `sendInvitationEmail: true` sinh log với template `INTERVIEW_INVITATION`. |
| 25 | **Email: Tên tổ chức trong email** | Lấy tên thật của tổ chức | Tên bị gán cứng thành "ATS Recruitment" | ❌ **FAIL** (Bug #6 Confirmed) | Tiêu đề email thực tế ghi: `[Xác nhận] Hồ sơ ứng tuyển vị trí ... tại ATS Recruitment`. |
| 26 | **SSE: Rò rỉ sự kiện tổ chức** (Cross-tenant leak) | User B chỉ nhận sự kiện Org B | User B nhận cả sự kiện nội bộ của Org A | ❌ **FAIL / SECURITY ISSUE** (Bug #14 Confirmed) | User B (thuộc Org B) đang mở kết nối SSE `/events/sse` đã nhận được event `MEMBER_ROLE_UPDATED` của Org A kèm `organizationId: OrgA` và `targetUserId`. |
| 27 | **Public Career Page: Danh sách công khai** | Chỉ hiển thị job PUBLISHED | Hiển thị cả DRAFT, CLOSED, ARCHIVED | ❌ **FAIL / LEAK** (New Bug Confirmed) | `GET /jobs?organizationSlug=...` trả về toàn bộ 4 công việc ở các trạng thái `DRAFT`, `CLOSED`, `ARCHIVED`, `PUBLISHED`. |
| 28 | **Rate Limiting: Vượt ngưỡng 5 req/phút** | HTTP 429 Too Many Requests | HTTP 500 Internal Server Error | ⚠️ **FAIL / DEFECT** | Header `x-ratelimit-remaining` giảm đúng từ 4 về 0 ở 5 request đầu. Nhưng ở request thứ 6, server quăng lỗi 500 do thiếu Exception Filter xử lý `ThrottlerException`. |
| 29 | **Database Migration & Schema Sync** | Schema DB khớp Prisma contract | Đồng bộ 100%, không sai lệch | ✅ **PASS** | `prisma db verify` và `prisma migration status` đều thoát với mã 0: "Database marker and schema match contract". |
| 30 | **Production Build: Backend** | Build thành công | Build thành công (26ms) | ✅ **PASS** | Esbuild tạo `dist/server.mjs` (537.5kb) không có lỗi cú pháp hay import. |
| 31 | **Production Build: Frontend** | Build thành công | Build thành công (18.3s) | ✅ **PASS** | Next.js 16 compile thành công, sinh toàn bộ 22 static và dynamic routes. |
| 32 | **Race Condition: Nộp đơn đồng thời** (5 concurrent requests) | Chỉ 1 đơn ứng tuyển được tạo | Đúng 1 Candidate và 1 Application được tạo | ✅ **PASS** | 1 request trả về 201, 4 request còn lại bị ràng buộc unique trong PostgreSQL chặn lại. Dữ liệu không bị nhân bản. |

---

## 3. Business Flow (Đánh Giá Toàn Trình 12 Luồng Nghiệp Vụ)

| Quy trình nghiệp vụ (Workflow) | Static | Unit Test | Runtime | Kết quả chung |
|---|---|---|---|---|
| **1. Authentication** | ✅ Có | ✅ 17 tests | ⚠️ Lỗi khi chỉ dùng Cookie | **VERIFIED WITH ISSUE** (Cookie auth trả 401) |
| **2. Organization Management** | ✅ Có | ✅ Tests đầy đủ | ✅ Hoạt động tốt | **VERIFIED** |
| **3. Job Management** | ✅ Có | ✅ Tests đầy đủ | ⚠️ Lộ tin Draft trên public page | **VERIFIED WITH ISSUE** (Leak tin nháp) |
| **4. Candidate Management** | ✅ Có | ✅ Tests đầy đủ | ✅ Hoạt động tốt | **VERIFIED** |
| **5. Application Pipeline** | ✅ Có | ✅ E2E test | ⚠️ Cho phép chuyển stage tùy tiện | **VERIFIED WITH ISSUE** (Thiếu state machine) |
| **6. Interview Scheduling** | ✅ Có | ✅ Tests đầy đủ | ✅ Hoạt động tốt kèm scorecard | **VERIFIED** |
| **7. Email System** | ✅ Có | ✅ 17 tests | ⚠️ Hardcoded tên tổ chức | **VERIFIED WITH ISSUE** (Hardcoded name) |
| **8. Sourcing & Attribution** | ✅ Có | ✅ Tests đầy đủ | ✅ Hoạt động tốt | **VERIFIED** |
| **9. Activity Logging** | ✅ Có | ✅ Tests đầy đủ | ⚠️ Xóa đơn ứng tuyển không ghi log | **VERIFIED WITH ISSUE** (Silent deletion) |
| **10. Public Career Page** | ✅ Có | ❌ Thiếu test | ⚠️ Lộ tin Draft/Archived | **VERIFIED WITH ISSUE** (Logic filter) |
| **11. Real-time Events (SSE)** | ✅ Có | ✅ Tests đầy đủ | ❌ Rò rỉ sự kiện sang Org khác | **FAILED (SECURITY ISSUE)** |
| **12. Document Storage (MinIO)** | ✅ Có | ✅ Mock tests | ⚠️ Thiếu magic bytes check | **VERIFIED WITH ISSUE** |

---

## 4. Security Verification (Xác Minh An Toàn Bảo Mật)

| Bài kiểm tra bảo mật | Kết quả | Bằng chứng thực tế (Evidence) |
|---|---|---|
| **Cách ly dữ liệu đa tổ chức (Multi-tenant Isolation)** | ✅ **PASS** | Mọi nỗ lực truy cập chéo giữa Tenant A và Tenant B (đọc/sửa Job, đọc Candidate, đọc/sửa Application, tải tệp) đều bị `TenantGuard` chặn với mã HTTP 403 Forbidden. |
| **Cách ly luồng sự kiện SSE (Cross-tenant Event Leak)** | 🔴 **SECURITY ISSUE** | Người dùng thuộc Tổ chức B nhận được sự kiện `MEMBER_ROLE_UPDATED` của Tổ chức A vì điều kiện `if (event.organizationId)` trong `events.service.ts:64` đang broadcast cho tất cả client kết nối. |
| **Xác thực Cookie HttpOnly** | 🔴 **VULNERABILITY / BUG** | Cookie HttpOnly `haihire_token` được cấp phát nhưng backend không bóc tách được ở các route bảo vệ, khiến ứng dụng có thể phải phụ thuộc vào việc lưu token ở local storage hoặc header Bearer. |
| **Chống tấn công Path Traversal tệp tin** | ✅ **PASS** | Tên tệp chứa `../../../../etc/passwd.pdf` được hệ thống bóc tách phần mở rộng và gán định danh ngẫu nhiên bằng timestamp + UUID trên MinIO, ngăn chặn hoàn toàn việc ghi đè tệp hệ thống. |
| **Xác thực nội dung tệp (Magic Bytes)** | 🟡 **POTENTIAL GAP** | Tệp script thực thi (bash script) được đổi đuôi thành `.pdf` vẫn được tải lên thành công do hệ thống chỉ kiểm tra đuôi mở rộng và MIME type client tự khai báo. |

---

## 5. Data Integrity (Tính Toàn Vẹn Của Dữ Liệu)

| Kiểm tra tính toàn vẹn | Kết quả | Bằng chứng thực tế |
|---|---|---|
| **Chống nộp đơn trùng lặp (Concurrency / Race Condition)** | ✅ **PASS** | 5 request nộp cùng lúc cho cùng một ứng viên và vị trí chỉ sinh ra duy nhất 1 bản ghi `Application` và 1 bản ghi `Candidate` trong CSDL nhờ ràng buộc unique constraint của PostgreSQL. |
| **Ràng buộc khóa ngoại & Cascade Delete** | ✅ **PASS** | Prisma schema và CSDL PostgreSQL đồng bộ 100%, cấu hình `onDelete: Cascade` hoạt động chính xác khi dọn dẹp các bản ghi con. |
| **Toàn vẹn vòng đời Pipeline (State Machine)** | ❌ **FAIL** | Không có ràng buộc tính hợp lệ giữa các stage. CSDL chấp nhận các đột biến dữ liệu vô lý (`HIRED → APPLIED`, `REJECTED → OFFER`). |
| **Tính nhất quán xóa dữ liệu (Two-Tier Deletion)** | ⚠️ **PARTIAL** | Jobs và Candidates tuân thủ xóa mềm (`deletedAt`), riêng Application bị xóa cứng bằng lệnh SQL `.delete()`. |

---

## 6. External Integrations (Tích Hợp Dịch Vụ Ngoài)

| Dịch vụ tích hợp | Đã test Runtime? | Kết quả | Chi tiết kiểm chứng |
|---|---|---|---|
| **PostgreSQL 17** | ✅ Có | ✅ **PASS** | Kết nối trực tiếp qua Prisma Contract, truy vấn dữ liệu thực tế thành công. |
| **Redis 7 (Alpine)** | ✅ Có | ✅ **PASS** | PING trả về PONG, BullMQ lưu trữ job metadata và xử lý stalled checks đúng chuẩn. |
| **MinIO S3** | ✅ Có | ✅ **PASS** | Upload tệp PDF thật, kiểm tra metadata trên S3, tải tệp và xóa tệp thành công. |
| **BullMQ Queue Worker** | ✅ Có | ✅ **PASS** | Job được đưa vào queue bất đồng bộ, worker nhặt job và hoàn tất ghi nhận vào bảng `EmailLog`. |
| **Email Transporter (Simulated)** | ✅ Có | ✅ **PASS** | Giả lập gửi email thành công end-to-end cho cả 3 mẫu (Confirmation, Rejection, Interview). |
| **Email Transporter (SMTP ngoài)** | ⏸️ Chưa kích hoạt | ❓ **NOT VERIFIED** | Thông tin Gmail SMTP có trong file `.env` nhưng tenant mặc định dùng chế độ `SIMULATED`. |

---

## 7. Bugs Confirmed at Runtime (Lỗi Được Xác Minh Trực Tiếp Khi Chạy)

1. 🔴 **Bug #1 (Xác thực Cookie)**: `GET /auth/me` gửi kèm Cookie `haihire_token` mà không có header Bearer bị trả về HTTP 401 Unauthorized do `jwt.strategy.ts` thiếu hàm trích xuất từ cookie.
2. 🔴 **Bug #14 (Rò rỉ dữ liệu qua SSE)**: Người dùng thuộc Tenant B nhận được sự kiện `MEMBER_ROLE_UPDATED` của Tenant A do `events.service.ts:64` trả về `true` cho mọi sự kiện có `organizationId`.
3. 🟡 **Bug #2 (Thiếu State Machine cho Pipeline)**: Cho phép chuyển trạng thái tùy ý (`HIRED → APPLIED`, `REJECTED → OFFER`, `APPLIED → HIRED`) mà không bị chặn, dẫn đến sai lệch dữ liệu nghiệp vụ.
4. 🟡 **Bug Mới Phát Hiện (Lộ tin tuyển dụng nháp trên Career Page)**: `GET /jobs?organizationSlug=...` trả về cả tin DRAFT, CLOSED, ARCHIVED cho người dùng chưa đăng nhập vì dòng 99 trong `jobs.service.ts` kiểm tra `filter?.status` thay vì `effectiveStatus`.
5. 🟡 **Bugs #3, #4, #5 (Phân trang in-memory)**: Các service Jobs, Candidates, Applications đều tải toàn bộ bản ghi vào RAM bằng `.all()` rồi mới dùng JavaScript `.slice()` để cắt trang.
6. 🟠 **Bug #6 (Hardcoded tên tổ chức trong Email)**: Toàn bộ email xác nhận ứng tuyển, từ chối và thư mời phỏng vấn đều bị gán cứng chuỗi `"tại ATS Recruitment"` thay vì tên tổ chức thật.
7. 🟠 **Bug #16 (Định dạng ID tài liệu không chuẩn UUID)**: Thao tác tải tài liệu ứng viên sinh mã ID dạng `doc-${Date.now()}` thay vì chuẩn UUID v4.
8. 🟡 **Bug Rate Limiting (Lỗi 500 thay vì 429)**: Khi vượt quá giới hạn request/phút, hệ thống trả về HTTP 500 Internal Server Error thay vì HTTP 429 Too Many Requests do thiếu exception filter cho `ThrottlerException`.

---

## 8. Unknown / Not Testable (Các Hạng Mục Chưa Thể Kiểm Tra)

- **Browser E2E (UI Trình duyệt thật)**: Dự án chưa cài đặt framework automation như Playwright hoặc Cypress. Đánh dấu: **NOT VERIFIED**.
- **Gửi Email SMTP thực tế ra hộp thư thật**: Cần kiểm tra an toàn với địa chỉ email đích được chỉ định trước để tránh gửi nhầm thư rác.

---

## 9. Final Status (Phân Loại Trạng Thái Từng Tính Năng)

| Tính năng | Phân loại trạng thái | Ghi chú |
|---|---|---|
| **Môi trường & Hạ tầng (Docker, DB, Redis, MinIO)** | 🟢 **VERIFIED** | Hoạt động trơn tru 100%, kết nối nhanh. |
| **Đăng ký & Đăng nhập (Auth)** | 🟡 **VERIFIED WITH ISSUE** | Hoạt động tốt với Bearer token, lỗi với HttpOnly cookie. |
| **Quản lý Tổ chức & Thành viên** | 🟢 **VERIFIED** | Tạo tổ chức, quản lý thành viên và link mời hoạt động tốt. |
| **Quản lý Tin Tuyển Dụng** | 🟡 **VERIFIED WITH ISSUE** | Chức năng CRUD tốt, nhưng lộ tin Draft trên public page. |
| **Trang Tuyển Dụng Công Khai (Career Page)** | 🟡 **VERIFIED WITH ISSUE** | Nộp đơn công khai tốt, nhưng lộ tin nháp/đã đóng. |
| **Quy Trình Tuyển Dụng (Kanban Pipeline)** | 🟡 **VERIFIED WITH ISSUE** | Luồng nghiệp vụ chính chạy thông suốt, thiếu bộ chặn chuyển stage sai. |
| **Phỏng Vấn & Bảng Đánh Giá (Scorecard)** | 🟢 **VERIFIED** | Lên lịch và lưu kết quả chấm điểm hoạt động chuẩn xác. |
| **Hệ Thống Email Tự Động** | 🟡 **VERIFIED WITH ISSUE** | Queue + Worker xử lý mượt mà, nhưng bị hardcode tên công ty. |
| **Sự Kiện Thời Gian Thực (SSE)** | 🔴 **FAILED** | Hoạt động được nhưng rò rỉ sự kiện sang tổ chức khác. |
| **Lưu Trữ Tệp (MinIO Object Storage)** | 🟡 **VERIFIED WITH ISSUE** | Upload/Download/Delete tốt, thiếu xác thực magic bytes. |
| **Cách Ly Dữ Liệu Đa Tổ Chức (Data Isolation)** | 🟢 **VERIFIED** | Chặn toàn bộ các request truy cập chéo tài nguyên. |
| **Độ Bền Concurrency (Chống Duplicate)** | 🟢 **VERIFIED** | PostgreSQL chặn đứng việc nộp trùng lặp đồng thời. |
| **Quy Trình Đóng Gói (Production Build)** | 🟢 **VERIFIED** | Cả Backend và Frontend đều build thành công 100%. |
| **Giao Diện Trình Duyệt E2E** | ⚪ **NOT VERIFIED** | Chưa cài đặt công cụ kiểm thử trình duyệt tự động. |
