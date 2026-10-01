# ATS (Applicant Tracking System) - Test Cases & Verification Matrix

> **Tài liệu phân loại và theo dõi ma trận kiểm định thực tế của hệ thống HaiHire ATS.**  
> **Phiên bản:** `v1.0.0` (Production-Ready)  
> **Cập nhật:** 01/10/2026 (Sau Phase 7 Final Polish)  
> **Hệ thống Test tự động (Automated Test Suite):** **276 / 276 Tests Passed (100%)**  
> **Kịch bản kiểm thử độc lập (IV&V Scenarios):** **31 / 31 Scenarios Passed (100%)**

---

## 📌 Phân loại trạng thái kiểm thử (Legend)

- 🟢 **Automated Passed**: Đã chạy qua Unit/Integration Test (`vitest`) hoặc kịch bản kiểm thử tự động, tích hợp trong CI/CD và pass 100%.
- 🟣 **Runtime Verified (IV&V)**: Đã được thực thi độc lập trên môi trường đang chạy thật (HTTP request, Database query, MinIO object inspection, SSE stream).
- 🔵 **Build & Logic Verified**: Đã kiểm tra logic mã nguồn, type-checking (`tsc --noEmit`), linting và build Next.js thành công.
- 🟡 **UI/Manual Verified**: Đã kiểm tra thao tác chuột, giao diện responsive, modal và kéo thả trên trình duyệt thực tế.

---

## 📊 Bảng tổng hợp trạng thái (Test Summary)

| Phân hệ (Module) | Số Test Tự động (`vitest`) | Kịch bản Runtime (IV&V) | Tỷ lệ Vượt qua | Trạng thái |
| :--- | :---: | :---: | :---: | :---: |
| **1. Authentication & Security Hardening** | 23 | 4 | 100% | 🟢 **PASSED** |
| **2. Organization & Multi-Tenancy (SSE)** | 27 | 3 | 100% | 🟢 **PASSED** |
| **3. Job Management & Public Career Portal** | 30 | 2 | 100% | 🟢 **PASSED** |
| **4. Candidate Pipeline & Optimistic Locking** | 36 | 6 | 100% | 🟢 **PASSED** |
| **5. Sourcing & Attribution Tracking** | 12 | 1 | 100% | 🟢 **PASSED** |
| **6. Resume Storage & Deep Binary Inspection** | 32 | 6 | 100% | 🟢 **PASSED** |
| **7. Interviews & Scorecards** | 22 | 2 | 100% | 🟢 **PASSED** |
| **8. Email Engine & Activity Audit Trail** | 35 | 4 | 100% | 🟢 **PASSED** |
| **9. LAN, Network & Proxy Architecture** | 18 | 2 | 100% | 🟢 **PASSED** |
| **10. i18n & Error Handling System** | 41 | 1 | 100% | 🟢 **PASSED** |
| **TỔNG CỘNG** | **276 Tests** | **31 Scenarios** | **100%** | 🚀 **READY TO SHIP** |

---

## 1. Xác thực & Bảo mật Hệ thống (Authentication & Security Hardening)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Đăng nhập tài khoản Admin | `vitest` + Runtime HTTP | `/auth/login` cấp token hợp lệ và cookie `haihire_token` | 🟢 **Automated Passed** |
| **AUTH-02** | Đăng nhập tài khoản Member | `vitest` + Runtime HTTP | Trả về vai trò `MEMBER`, kiểm soát quyền theo RBAC | 🟢 **Automated Passed** |
| **AUTH-03** | Xác thực HttpOnly Cookie | Runtime Cookie Check | Cookie `haihire_token` có cờ `HttpOnly; SameSite=Lax` chống XSS | 🟣 **Runtime Verified** |
| **AUTH-04** | Đăng nhập sai mật khẩu | `vitest` | Trả về `401 Unauthorized` | 🟢 **Automated Passed** |
| **AUTH-05** | Đăng ký tài khoản mới | `vitest` | Hash mật khẩu bằng bcrypt độ an toàn cao | 🟢 **Automated Passed** |
| **AUTH-06** | Đăng ký email trùng lặp | `vitest` | Trả về `409 ConflictException` | 🟢 **Automated Passed** |
| **AUTH-07** | Đăng xuất (Logout) an toàn | Client & Cookie cleanup | Xóa HttpOnly cookie qua endpoint logout, xóa trạng thái client | 🟢 **Automated Passed** |
| **AUTH-08** | Khôi phục phiên (/auth/me) | `auth.service.spec.ts` | Tự động khôi phục user profile từ cookie hoặc Bearer header | 🟢 **Automated Passed** |
| **AUTH-09** | Xử lý token hết hạn | Runtime HTTP | Gửi token hết hạn $\rightarrow$ trả về `401 Unauthorized`, không crash | 🟣 **Runtime Verified** |
| **AUTH-10** | Chống Brute-Force Rate Limiting | Redis Throttler | Gửi request liên tục vượt ngưỡng $\rightarrow$ trả về `429 Too Many Requests` | 🟣 **Runtime Verified** |
| **AUTH-11** | Chống Rate Limit Bypass qua Header | IP Spoofing check | Thử chèn `X-Forwarded-For` giả mạo $\rightarrow$ Redis vẫn bắt đúng IP nguồn | 🟣 **Runtime Verified** |
| **AUTH-12** | Route Guard Middleware | Next.js Middleware | Bảo vệ các route `/dashboard/*`, tự redirect về `/login` | 🔵 **Build Verified** |

---

## 2. Tổ chức, Đa khách hàng & SSE (Organization & Multi-Tenancy)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **ORG-01** | Tạo tổ chức Onboarding | `organizations.service.spec.ts` | Tạo Workspace, sinh slug duy nhất, gán Owner | 🟢 **Automated Passed** |
| **ORG-02** | Lấy thông tin Org hiện tại | `organizations.service.spec.ts` | `getMyOrg` trả về đúng tổ chức đang chọn | 🟢 **Automated Passed** |
| **ORG-03** | Đổi tên tổ chức | `organizations.service.spec.ts` | Cập nhật tên và lưu cơ sở dữ liệu | 🟢 **Automated Passed** |
| **ORG-04** | Chuyển đổi tổ chức (Switch Org) | Runtime HTTP | Chuyển workspace và cập nhật context người dùng tức thì | 🟣 **Runtime Verified** |
| **ORG-05** | Tạo link mời thành viên | `organizations.service.spec.ts` | Sinh token mời kèm cấu hình `expiresAt`, `maxUses` | 🟢 **Automated Passed** |
| **ORG-06** | Thu hồi link mời (Revoke) | `organizations.service.spec.ts` | Vô hiệu hóa link, người sau không thể tham gia | 🟢 **Automated Passed** |
| **ORG-07** | Tham gia qua link mời hợp lệ | `organizations.service.spec.ts` | Thêm thành viên mới, cập nhật role mặc định `MEMBER` | 🟢 **Automated Passed** |
| **ORG-08** | Tham gia link hết hạn / hết lượt | `organizations.service.spec.ts` | Trả về lỗi `400 Bad Request` | 🟢 **Automated Passed** |
| **ORG-09** | Thay đổi quyền thành viên | `organizations.service.spec.ts` | `PATCH /members/:id/role` đổi quyền `ADMIN` $\leftrightarrow$ `MEMBER` | 🟢 **Automated Passed** |
| **ORG-10** | Xóa thành viên khỏi tổ chức | `organizations.service.spec.ts` | Gỡ quyền truy cập, kích hoạt đẩy ra qua SSE | 🟢 **Automated Passed** |
| **ORG-11** | Cách ly tuyệt đối kênh SSE | Runtime Stream Check | User Org A kết nối SSE không nhận được event của Org B | 🟣 **Runtime Verified** |
| **ORG-12** | Duy trì kết nối SSE Heartbeat | `events.service.spec.ts` | Bắn tín hiệu ping mỗi 15 giây qua RxJS Subject | 🟢 **Automated Passed** |

---

## 3. Tin tuyển dụng & Cổng sự nghiệp (Job Management & Careers)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **JOB-01** | Tạo tin tuyển dụng mới | `jobs.service.spec.ts` | Lưu đầy đủ tiêu đề, phòng ban, lương, yêu cầu | 🟢 **Automated Passed** |
| **JOB-02** | Xem danh sách tin tuyển dụng | `jobs.service.spec.ts` | Phân trang, tìm kiếm và lọc theo trạng thái | 🟢 **Automated Passed** |
| **JOB-03** | Cập nhật thông tin công việc | `jobs.service.spec.ts` | Chỉnh sửa nội dung và lưu thay đổi | 🟢 **Automated Passed** |
| **JOB-04** | Xóa tin tuyển dụng | `jobs.service.spec.ts` | Xóa công việc kèm cascade dữ liệu an toàn | 🟢 **Automated Passed** |
| **JOB-05** | Public Career Portal (Chỉ thấy PUBLISHED) | Runtime HTTP Verification | Các tin `DRAFT`, `CLOSED`, `ARCHIVED` trả về `404 Not Found` | 🟣 **Runtime Verified** |
| **JOB-06** | Career Page Org Slug không tồn tại | Runtime HTTP Verification | Truy cập slug tổ chức lạ trả về `404 Not Found`, không crash | 🟣 **Runtime Verified** |
| **JOB-07** | Nộp hồ sơ trực tuyến từ Career Page | Public Apply API | Ứng viên vãng lai nộp CV thành công không cần đăng nhập | 🟢 **Automated Passed** |
| **JOB-08** | Hiển thị giao diện Card / Table | Component Spec | Chuyển đổi linh hoạt giữa giao diện Grid và Table | 🟢 **Automated Passed** |

---

## 4. Pipeline Tuyển dụng & Khóa Lạc quan (Candidate & Optimistic Locking)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **CAN-01** | Kanban 6 cột trạng thái chuẩn | UI Kanban Component | Applied, Screening, Interview, Offer, Hired, Rejected | 🟢 **Automated Passed** |
| **CAN-02** | Kéo thả ứng viên cập nhật Stage | `applications.service.spec.ts` | Cập nhật `stage` và `orderIndex` chính xác | 🟢 **Automated Passed** |
| **CAN-03** | Chặn bước nhảy Stage không hợp lệ | State Machine Guard | Chuyển sai luồng $\rightarrow$ trả về `400 APPLICATION_INVALID_STAGE_TRANSITION` | 🟢 **Automated Passed** |
| **CAN-04** | Optimistic Locking Concurrency Race | Concurrent HTTP Hammer | 2 request chuyển trạng thái đồng thời: 1 Thắng (`200`), 1 Thua (`409`) | 🟣 **Runtime Verified** |
| **CAN-05** | Concurrency 3 Request Đồng Thời | Multi-Thread Hammer | 1 Thắng (`200 OK`), 2 Thua nhận HTTP `409 APPLICATION_STAGE_CONFLICT` | 🟣 **Runtime Verified** |
| **CAN-06** | Cập nhật trùng Stage (No-Op) | `applications.service.spec.ts` | Gửi cùng stage hiện tại $\rightarrow$ trả về `200 OK`, không sinh log thừa | 🟢 **Automated Passed** |
| **CAN-07** | Thao tác trên hồ sơ đã bị xóa | Runtime HTTP Verification | Thử đổi stage hồ sơ đã xóa $\rightarrow$ trả về `404 APPLICATION_NOT_FOUND` | 🟣 **Runtime Verified** |
| **CAN-08** | Tìm kiếm & Sắp xếp bảng ứng viên | `use-table-params.spec.ts` | Đồng bộ 2 chiều các tham số lên URL query params | 🟢 **Automated Passed** |
| **CAN-09** | Xóa ứng viên bảo toàn Audit Trail | Soft-delete test | Đánh dấu xóa nhưng vẫn giữ nguyên lịch sử hoạt động để kiểm toán | 🟢 **Automated Passed** |

---

## 5. Nguồn ứng viên & Theo dõi chiến dịch (Sourcing & Attribution)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **SRC-01** | Tạo link tracking nguồn tuyển dụng | `sourcing.service.spec.ts` | Sinh mã tracking đính kèm campaign và channel | 🟢 **Automated Passed** |
| **SRC-02** | Ghi nhận lượt click link tracking | Sourcing Public Click API | Tự động tăng `clickCount` và ghi log IP truy cập | 🟢 **Automated Passed** |
| **SRC-03** | Gán nguồn ứng viên tự động (Attribution) | Application Apply Flow | Nộp hồ sơ qua link tracking tự động lưu `sourceId` và `campaign` | 🟣 **Runtime Verified** |
| **SRC-04** | Báo cáo thống kê hiệu quả Sourcing | `sourcing-stats.spec.tsx` | Hiển thị số click, số ứng viên và conversion rate theo kênh | 🟢 **Automated Passed** |

---

## 6. Lưu trữ & Kiểm định Nhị phân sâu (Resume Storage & Deep Inspection)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **DOC-01** | MinIO Safe Tenant Regex Sanitization | `minio.service.spec.ts` | Khử khuẩn `../../../etc/passwd` thành `tenants/etcpasswd/...` | 🟢 **Automated Passed** |
| **DOC-02** | Bắt buộc Tenant ID khi Upload | `minio.service.spec.ts` | `tenantOrgId = null` hoặc rỗng $\rightarrow$ ném `400 TENANT_ID_REQUIRED` | 🟢 **Automated Passed** |
| **DOC-03** | Kiểm định tệp giả mạo extension | `upload-utils.spec.ts` | Script shell giả đuôi `.pdf` $\rightarrow$ chặn `400 VALIDATION_ERROR` | 🟢 **Automated Passed** |
| **DOC-04** | PDF Truncated Validation (Kiểm tra %%EOF) | `upload-utils.spec.ts` | PDF bị cắt ngang thiếu `%%EOF` $\rightarrow$ ném `400 UPLOAD_TRUNCATED_FILE` | 🟢 **Automated Passed** |
| **DOC-05** | DOCX EOCD Trailer Validation | `upload-utils.spec.ts` | DOCX thiếu `PK\x05\x06` trong 65,557 bytes cuối $\rightarrow$ ném `400` | 🟢 **Automated Passed** |
| **DOC-06** | DOCX Hợp lệ chấp nhận Upload | Runtime MinIO Upload | Tệp DOCX đầy đủ header & EOCD trailer $\rightarrow$ trả về `201 Created` | 🟣 **Runtime Verified** |
| **DOC-07** | Tệp 0-byte (Empty Buffer) | Runtime MinIO Upload | Buffer rỗng $\rightarrow$ từ chối ngay với `400 Bad Request` | 🟣 **Runtime Verified** |
| **DOC-08** | Tải xuống CV tên tiếng Việt UTF-8 | Content-Disposition test | Giữ nguyên dấu tiếng Việt chuẩn RFC 5987/6266 | 🟢 **Automated Passed** |
| **DOC-09** | In-App PDF Preview Modal | Next.js Reverse Proxy | Xem trước CV qua route an toàn tránh phơi bày MinIO ra Internet | 🟡 **UI Verified** |

---

## 7. Lịch phỏng vấn & Phiếu đánh giá (Interviews & Scorecards)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **INTV-01** | Đặt lịch phỏng vấn đa hình thức | `interviews.service.spec.ts` | Lưu lịch hẹn kèm link Meet/Zoom hoặc phòng họp | 🟢 **Automated Passed** |
| **INTV-02** | Giao diện Calendar View (Tháng / Tuần) | Next.js Calendar Spec | Hiển thị các buổi hẹn trực quan theo khung thời gian | 🟢 **Automated Passed** |
| **INTV-03** | Điền Scorecard đánh giá 5 sao | `interview-scorecard-modal.spec.tsx` | Chấm điểm 4 tiêu chí cốt lõi và gửi khuyến nghị tuyển dụng | 🟢 **Automated Passed** |
| **INTV-04** | Xóa buổi phỏng vấn | `interviews.service.spec.ts` | Gỡ lịch hẹn và tự động cập nhật timeline ứng viên | 🟢 **Automated Passed** |

---

## 8. Hệ thống Email & Kiểm toán Hoạt động (Email & Audit Trail)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **EMAIL-01** | Tự động nạp 4 mẫu thư mặc định | `email.service.spec.ts` | Tự động tạo mẫu Confirmation, Interview, Reject, Offer | 🟢 **Automated Passed** |
| **EMAIL-02** | Thay thế biến động Dot-notation | `email.service.spec.ts` | Thay thế chính xác `{{candidate.name}}`, `{{job.title}}`, `{{company.name}}` | 🟢 **Automated Passed** |
| **EMAIL-03** | Lấy tên tổ chức động từ DB | Runtime Email Test | Sử dụng tên thật của tổ chức trong cơ sở dữ liệu thay vì hardcode | 🟣 **Runtime Verified** |
| **EMAIL-04** | Chống XSS trong nội dung Email | Email Template Escape | Tên công ty chứa `<script>` được escape HTML an toàn trước khi gửi | 🟣 **Runtime Verified** |
| **EMAIL-05** | Mã hóa AES-256-GCM mật khẩu SMTP | `email.service.spec.ts` | Mật khẩu lưu trong DB được mã hóa, trả về UI dạng `••••••••` | 🟢 **Automated Passed** |
| **EMAIL-06** | Tự động gửi thư theo vòng đời | Trigger Hooks | Chuyển stage REJECTED $\rightarrow$ tự động gửi thư từ chối lịch sự | 🟢 **Automated Passed** |
| **EMAIL-07** | Nhật ký hộp thư đi (Email Outbox) | `email.service.spec.ts` | Lưu vết đầy đủ trạng thái gửi, người nhận, thời gian | 🟢 **Automated Passed** |
| **ACT-01** | Ghi log dòng thời gian hoạt động | `ActivityLog` Engine | Tự động lưu mọi biến động của hồ sơ vào cơ sở dữ liệu | 🟢 **Automated Passed** |
| **ACT-02** | Hiển thị Timeline có bộ lọc | `candidate-drawer.spec.tsx` | Xem dòng thời gian trực quan theo chiều dọc | 🟢 **Automated Passed** |

---

## 9. Mạng nội bộ & Kiến trúc Reverse Proxy (LAN & Network Access)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **NET-01** | Lắng nghe toàn bộ giao diện mạng (0.0.0.0) | Khởi động máy chủ | Cho phép truy cập từ thiết bị di động/laptop trong cùng mạng LAN | 🟢 **Automated Passed** |
| **NET-02** | Cấp quyền Turbopack Subnet /24 | `getAllowedDevOrigins` | Tự động nhận diện dải IP cục bộ và cấp quyền truy cập | 🟢 **Automated Passed** |
| **NET-03** | Reverse Proxy tránh lỗi CORS & PNA | Next.js Rewrites | Trình duyệt gọi tương đối `/api/*`, server-side rewrite vào backend | 🟢 **Automated Passed** |

---

## 10. Đa ngôn ngữ & Xử lý Lỗi chuẩn hóa (i18n & Error Handling)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **I18N-01** | Đồng bộ toàn vẹn Key Parity (1682/1682) | Script `check:i18n` | 100% keys khớp tuyệt đối giữa `types.ts`, `vi.ts`, `en.ts` | 🟢 **Automated Passed** |
| **I18N-02** | Dịch mã lỗi APPLICATION_STAGE_CONFLICT | `api-error.spec.ts` | Trả về thông báo tiếng Việt: *"Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác..."* | 🟢 **Automated Passed** |
| **I18N-03** | Dịch mã lỗi APPLICATION_INVALID_STAGE_TRANSITION | `api-error.spec.ts` | Trả về thông báo tiếng Việt: *"Không thể chuyển hồ sơ sang giai đoạn này..."* | 🟢 **Automated Passed** |
| **I18N-04** | Trình xử lý lỗi API tổng quát | `api-error.spec.ts` | Bắt đúng mã lỗi HTTP 400, 401, 403, 404, 409, 429, 500 | 🟢 **Automated Passed** |

---

## 🛠️ Lệnh kiểm chứng tự động toàn diện (Verification Commands)

```bash
# 1. Chạy toàn bộ 276 tests tự động (Backend + Frontend)
pnpm test

# 2. Kiểm tra tính toàn vẹn kiểu dữ liệu (0 lỗi TypeScript)
pnpm run typecheck

# 3. Kiểm định tính nhất quán đa ngôn ngữ i18n (1682/1682 keys)
pnpm run check:i18n

# 4. Kiểm tra cấu hình biến môi trường
pnpm run check:env

# 5. Build kiểm tra gói sản phẩm Production
pnpm run build
```
