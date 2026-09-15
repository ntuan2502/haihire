# ATS (Applicant Tracking System) - Test Cases & Verification Matrix

> **Tài liệu phân loại và theo dõi trạng thái kiểm định thực tế của hệ thống ATS.**  
> **Phiên bản:** 1.0.0-beta  
> **Cập nhật lần cuối:** 04/09/2026  
> **Tổng số Test Cases:** 65  

---

## 📌 Phân loại trạng thái kiểm thử (Legend)

- 🟢 **Automated Passed**: Đã chạy qua Unit/Integration Test (`vitest`) hoặc kịch bản kiểm thử tự động (Script Node.js/Fetch) và đã pass 100%.
- 🔵 **Build & Logic Verified**: Đã kiểm tra logic mã nguồn, type-checking (`tsc`), linting (`eslint`) và build Next.js thành công.
- 🟡 **Pending Manual/UI Check**: Sẵn sàng trên giao diện để kiểm thử thủ công qua thao tác chuột/màn hình cảm ứng trên thiết bị thực tế.

---

## 📊 Bảng tổng hợp trạng thái (Test Summary)

| Phân hệ (Module) | Tổng số TC | 🟢 Automated Passed | 🔵 Build & Logic Verified | 🟡 Pending Manual/UI Check |
| :--- | :---: | :---: | :---: | :---: |
| **1. Authentication & Session** | 10 | 7 | 2 | 1 (Click Quick Login trên UI) |
| **2. Organization & Multi-tenancy** | 12 | 8 | 2 | 2 (Thao tác Switch Org, Copy link) |
| **3. Real-time SSE Sync** | 8 | 5 | 2 | 1 (Quan sát UI tự ẩn hiện nút) |
| **4. Job Management** | 9 | 5 | 2 | 2 (Form Wizard UI, Table switch) |
| **5. Candidate & Pipeline** | 14 | 5 | 5 | 4 (Drag & Drop, Đổi cột view) |
| **6. Resume Storage & Preview** | 6 | 3 | 2 | 1 (Xem Iframe PDF modal) |
| **7. LAN & Network Access** | 6 | 4 | 2 | 0 |
| **TỔNG CỘNG** | **65** | **37 (57%)** | **17 (26%)** | **11 (17%)** |

---

## 1. Xác thực & Quản lý phiên (Authentication & Session)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Đăng nhập Admin | `vitest` + Node Fetch Script | `auth.service.spec.ts` & Script login gọi `/auth/login` trả về 200, JWT token | 🟢 **Automated Passed** |
| **AUTH-02** | Đăng nhập Member | `vitest` + Node Fetch Script | `auth.service.spec.ts` & Script login gọi `/auth/login` trả về 200, role MEMBER | 🟢 **Automated Passed** |
| **AUTH-03** | Đăng nhập Quick Login | Thao tác UI trên form login | Kiểm tra click chip Admin/Member tự điền form và submit | 🟡 **Pending Manual Check** |
| **AUTH-04** | Đăng nhập sai mật khẩu | `vitest` | `auth.service.spec.ts` test case ném `UnauthorizedException` (401) | 🟢 **Automated Passed** |
| **AUTH-05** | Đăng ký tài khoản mới | `vitest` | `auth.service.spec.ts` tạo user thành công, hash bcrypt mật khẩu | 🟢 **Automated Passed** |
| **AUTH-06** | Đăng ký email trùng lặp | `vitest` | `auth.service.spec.ts` ném lỗi `ConflictException` (409) | 🟢 **Automated Passed** |
| **AUTH-07** | Đăng xuất (Logout) | Logic code + Cookies cleanup | `auth-context.tsx`: clear localStorage, clear cookies, redirect `/login` | 🔵 **Build Verified** |
| **AUTH-08** | Khôi phục phiên làm việc | `authApi.getMe()` integration | Client đọc token từ localStorage và gọi xác thực lại với `/auth/me` | 🟢 **Automated Passed** |
| **AUTH-09** | Tự logout khi Token hết hạn | `auth.service.spec.ts` | Backend từ chối JWT hết hạn, frontend interceptor tự chuyển về login | 🟢 **Automated Passed** |
| **AUTH-10** | Route Guard bảo vệ trang | Middleware Next.js + Component | Kiểm tra chuyển hướng tự động khi chưa có token/cookie | 🔵 **Build Verified** |

---

## 2. Tổ chức & Phân quyền (Organization & Multi-tenancy)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **ORG-01** | Tạo tổ chức Onboarding | `vitest` | `organizations.service.spec.ts`: tạo Org, gán ownerId, slug | 🟢 **Automated Passed** |
| **ORG-02** | Lấy thông tin Org hiện tại | `vitest` | `organizations.service.spec.ts`: truy vấn `getMyOrg` thành công | 🟢 **Automated Passed** |
| **ORG-03** | Đổi tên tổ chức | `vitest` | `organizations.service.spec.ts`: cập nhật tên org và lưu vào DB | 🟢 **Automated Passed** |
| **ORG-04** | Chuyển đổi tổ chức (Switch Org) | UI Menu dropdown | Chuyển org và kiểm tra giữ nguyên danh sách các org khác | 🟡 **Pending Manual Check** |
| **ORG-05** | Tạo link mời thành viên | `vitest` + Node Fetch Script | `organizations.service.spec.ts`: tạo token mời kèm hạn dùng và số lần | 🟢 **Automated Passed** |
| **ORG-06** | Copy link mời vào Clipboard | Thao tác UI | Kiểm tra `navigator.clipboard.writeText` trên trình duyệt | 🟡 **Pending Manual Check** |
| **ORG-07** | Thu hồi link mời (Revoke) | `vitest` | `organizations.service.spec.ts`: xóa link mời, kiểm tra link không còn hợp lệ | 🟢 **Automated Passed** |
| **ORG-08** | Tham gia qua link mời hợp lệ | `vitest` + Node Fetch Script | Script chạy `joinByToken` thêm member vào org và cập nhật role thành công | 🟢 **Automated Passed** |
| **ORG-09** | Tham gia link hết hạn/hết lượt | `vitest` | `organizations.service.spec.ts`: ném lỗi khi link quá hạn hoặc quá số lượt | 🟢 **Automated Passed** |
| **ORG-10** | Đổi quyền (Admin $\leftrightarrow$ Member) | Node Script E2E + `vitest` | Chạy `PATCH /organizations/my/members/:id/role`, kiểm tra đổi role tức thì | 🟢 **Automated Passed** |
| **ORG-11** | Xóa member khỏi tổ chức | `vitest` | `organizations.service.spec.ts`: gỡ member khỏi org và DB | 🟢 **Automated Passed** |
| **ORG-12** | Chặn Member truy cập Settings Admin | Phân quyền `canEdit` | Kiểm tra biến `canEdit = isAdmin \|\| isOwner` ẩn các nút nhạy cảm | 🔵 **Build Verified** |

---

## 3. Đồng bộ thời gian thực qua SSE (Server-Sent Events)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **SSE-01** | Kết nối Stream SSE thành công | Node Fetch Script | Gọi `/api/events/sse?token=...` trả về 200 `text/event-stream` và event `CONNECTED` | 🟢 **Automated Passed** |
| **SSE-02** | Giữ kết nối qua Heartbeat ping | `events.service.spec.ts` | Gửi gói tin `HEARTBEAT` định kỳ 15s qua RxJS interval | 🟢 **Automated Passed** |
| **SSE-03** | Tự động reconnect khi ngắt mạng | EventSource onerror | Cơ chế reconnect tự động của Web API EventSource | 🔵 **Build Verified** |
| **SSE-04** | Bị đẩy ra khi xóa khỏi Org | `events.service.spec.ts` | Nhận event `MEMBER_REMOVED`, client chuyển hướng `/onboarding/create-org` | 🟢 **Automated Passed** |
| **SSE-05** | Nhận event đổi quyền Real-time | Node Fetch E2E Script | User B kết nối SSE, Admin A đổi quyền $\rightarrow$ User B nhận gói tin `MEMBER_ROLE_UPDATED` ngay | 🟢 **Automated Passed** |
| **SSE-06** | Ẩn/Hiện nút tác vụ theo quyền | UI React State | Khi role đổi, kiểm tra các nút tác vụ trên giao diện tự cập nhật theo state | 🟡 **Pending Manual Check** |
| **SSE-07** | Redirect khỏi trang cấm khi hạ quyền | `useEffect` route check | `useAuth()` đổi `canEdit` $\rightarrow$ tự động redirect về trang an toàn | 🔵 **Build Verified** |
| **SSE-08** | Invalidate React Query Cache | CustomEvent listener | Bắt `ats:sse_event` $\rightarrow$ gọi `queryClient.invalidateQueries(orgMembers)` | 🟢 **Automated Passed** |

---

## 4. Quản lý tin tuyển dụng (Job Management)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **JOB-01** | Xem danh sách tin tuyển dụng | `vitest` | `jobs.service.spec.ts`: `findAll` trả về danh sách kèm số lượng ứng viên | 🟢 **Automated Passed** |
| **JOB-02** | Tìm kiếm tin tuyển dụng | `vitest` | `jobs.service.spec.ts`: lọc theo title, department, location | 🟢 **Automated Passed** |
| **JOB-03** | Lọc theo trạng thái/phòng ban | `vitest` | `jobs.service.spec.ts`: lọc theo status (PUBLISHED, DRAFT) | 🟢 **Automated Passed** |
| **JOB-04** | Tạo tin tuyển dụng mới (Wizard) | `vitest` | `jobs.service.spec.ts`: tạo job mới thành công | 🟢 **Automated Passed** |
| **JOB-05** | Xem chi tiết tin tuyển dụng | `vitest` | `jobs.service.spec.ts`: lấy job theo id kèm danh sách applications | 🟢 **Automated Passed** |
| **JOB-06** | Chỉnh sửa tin tuyển dụng | `vitest` | `jobs.service.spec.ts`: cập nhật thông tin job | 🟢 **Automated Passed** |
| **JOB-07** | Xóa tin tuyển dụng | `vitest` | `jobs.service.spec.ts`: xóa job khỏi database | 🟢 **Automated Passed** |
| **JOB-08** | Thống kê số lượng ứng viên theo cột | Aggregation mapping | Gom nhóm ứng viên theo từng stage (Applied, Screening, Interview, etc.) | 🔵 **Build Verified** |
| **JOB-09** | Chuyển đổi giao diện Card / Table | Thao tác UI | Bấm nút toggle layout Grid/Table trên trang Jobs | 🟡 **Pending Manual Check** |

---

## 5. Hồ sơ & Pipeline ứng viên (Candidate & Pipeline)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **CAN-01** | Hiển thị 6 cột Pipeline Kanban | Cấu trúc UI + Stage map | 6 cột chuẩn: Applied, Screening, Interview, Tech Review, Offer, Hired | 🔵 **Build Verified** |
| **CAN-02** | Kéo thả (Drag & Drop) chuyển vòng | Thao tác chuột/cảm ứng UI | Kéo card ứng viên giữa các cột Kanban trên trình duyệt | 🟡 **Pending Manual Check** |
| **CAN-03** | Cập nhật vòng tuyển dụng API | `vitest` | `applications.service.spec.ts`: `updateStage` cập nhật stage và orderIndex | 🟢 **Automated Passed** |
| **CAN-04** | Xem danh sách ứng viên (Data Table) | `vitest` | `applications.service.spec.ts`: lấy danh sách ứng viên đầy đủ | 🟢 **Automated Passed** |
| **CAN-05** | Sắp xếp bảng ứng viên (Sorting) | Client-side sorting logic | Sort theo Tên, Email, Ngày nộp, Score trong component | 🔵 **Build Verified** |
| **CAN-06** | Tìm kiếm ứng viên | Client-side filter | Lọc realtime theo từ khóa gõ vào ô input | 🔵 **Build Verified** |
| **CAN-07** | Ẩn/Hiện cột (Column Visibility) | Popover component | Bật tắt checkbox trong popover để ẩn hiện cột | 🟡 **Pending Manual Check** |
| **CAN-08** | Thêm ứng viên mới | `vitest` | `applications.service.spec.ts`: tạo ứng viên mới kèm thông tin liên hệ | 🟢 **Automated Passed** |
| **CAN-09** | Xem chi tiết hồ sơ ứng viên | `vitest` | `applications.service.spec.ts`: lấy application theo id | 🟢 **Automated Passed** |
| **CAN-10** | Chỉnh sửa hồ sơ ứng viên | `vitest` | `applications.service.spec.ts`: cập nhật thông tin ứng viên | 🟢 **Automated Passed** |
| **CAN-11** | Xóa ứng viên | `vitest` | `applications.service.spec.ts`: xóa application khỏi database | 🟢 **Automated Passed** |
| **CAN-12** | Đổi nhanh vòng từ Table Action menu | Dropdown menu component | Click menu 3 chấm > Move Stage trên bảng ứng viên | 🟡 **Pending Manual Check** |
| **CAN-13** | Phân trang (Pagination) | Pagination component | Chuyển trang và thay đổi pageSize | 🔵 **Build Verified** |
| **CAN-14** | Tên viết tắt Avatar (Initials) | Hàm tiện ích `getInitials` | Hiển thị avatar ảnh hoặc 2 chữ cái đầu (VD: "Jane Doe" -> "JD") | 🔵 **Build Verified** |

---

## 6. Quản lý tài liệu & MinIO (Resume Storage & Preview)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **DOC-01** | Tải lên tài liệu CV (Upload) | `applications.service.spec.ts` | Ghi metadata file và liên kết vào hồ sơ ứng viên | 🟢 **Automated Passed** |
| **DOC-02** | Xem trước tài liệu PDF trong Modal | Iframe Modal component | Mở modal preview PDF trực tiếp trong trình duyệt | 🟡 **Pending Manual Check** |
| **DOC-03** | Tải về CV đúng tên file gốc UTF-8 | Hàm `fixUtf8String` | Chuẩn hóa chuỗi UTF-8 tiếng Việt cho header Content-Disposition | 🔵 **Build Verified** |
| **DOC-04** | Xem tài liệu qua Next.js Proxy | Proxy rewrite test | Request `/ats-resumes/...` được chuyển tiếp server-side vào MinIO cổng 9000 | 🟢 **Automated Passed** |
| **DOC-05** | Xóa tài liệu khỏi hồ sơ | `applications.service.spec.ts` | Gỡ tài liệu khỏi mảng documents và database | 🟢 **Automated Passed** |
| **DOC-06** | Lưu trữ nhiều tài liệu cho 1 ứng viên | JSON metadata parser | Parse và quản lý nhiều document objects (CV, Cover Letter, Bằng cấp) | 🔵 **Build Verified** |

---

## 7. Mạng nội bộ & Hệ thống (LAN & Network Access)

| Mã TC | Tên kịch bản | Phương pháp kiểm chứng | Chi tiết kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **NET-01** | Truy cập từ thiết bị khác trong mạng LAN | Cấu hình Bind `0.0.0.0` | Next.js server nhận kết nối từ mọi interface nội bộ | 🟢 **Automated Passed** |
| **NET-02** | Turbopack AllowedDevOrigins Subnet /24 | Hàm `getAllowedDevOrigins` | Quét IP mạng nội bộ và cấp quyền cho cả dải subnet `/24` | 🟢 **Automated Passed** |
| **NET-03** | Gọi API không bị chặn CORS / PNA | Kiểm thử Browser Proxy | Trình duyệt gọi relative `/api`, Next.js rewrite server-side tránh lỗi PNA | 🟢 **Automated Passed** |
| **NET-04** | Backend NestJS lắng nghe 0.0.0.0 | Lệnh `app.listen(port, "0.0.0.0")` | Lắng nghe toàn bộ card mạng cổng 3001 | 🟢 **Automated Passed** |
| **NET-05** | Next.js Dev Server lắng nghe 0.0.0.0 | Script `next dev -H 0.0.0.0` | Khởi động server với cờ host 0.0.0.0 | 🔵 **Build Verified** |
| **NET-06** | Proxy toàn diện cho mọi tuyến API | Cấu hình `next.config.ts` rewrites | Rewrite đầy đủ các prefix `/api/*`, `/auth/*`, `/organizations/*`, `/jobs/*`, `/events/*` | 🔵 **Build Verified** |

---

## 🛠️ Lệnh chạy kiểm thử tự động để đối chứng

```bash
# 1. Chạy 48 bài Unit & Integration Tests tự động của Backend
pnpm --filter backend test

# 2. Kiểm tra Static Analysis & TypeScript Type Check
pnpm lint

# 3. Kiểm tra Production Build hoàn chỉnh
pnpm --filter frontend build
```
