# 🗺️ ATS Platform - Roadmap & Product Horizon

> **Tài liệu tổng quan lộ trình phát triển của hệ thống Quản lý Tuyển dụng (Applicant Tracking System - ATS).**  
> **Phiên bản hiện tại:** `v1.0.0-beta`  
> **Cập nhật:** Tháng 09/2026  
> **Trạng thái:** Sẵn sàng vận hành thử nghiệm (Beta Production-Ready)

---

## 🧭 Tổng quan kiến trúc hệ thống (System Architecture)

- **Mô hình**: Monorepo (`pnpm workspaces`)
- **Backend**:
  - Framework: **NestJS 11** (Modular Architecture) + Express + TypeScript
  - Database: **PostgreSQL** thông qua **Prisma 8** (Contract-First với `@prisma/composer`, `@prisma/orm-postgres`)
  - Storage: **MinIO Object Storage** (S3-compatible) cho tài liệu và hồ sơ ứng viên
  - Real-time: **Server-Sent Events (SSE)** thông qua RxJS Subject cho đồng bộ dữ liệu tức thì
  - Bảo mật: Mã hóa **AES-256-GCM** cho mật khẩu SMTP & API keys, JWT Authentication, Bcrypt Password Hashing
  - Email Service: Multi-provider (Simulated In-App, SMTP Server, Resend API, SendGrid API) + Trigger Hooks tự động
- **Frontend**:
  - Framework: **Next.js 15+** (App Router, Server & Client Components) + **React 19**
  - Styling: **Tailwind CSS**, Lucide Icons, Responsive UI
  - State & Data Fetching: **TanStack Query (React Query)**
  - Đa ngôn ngữ (i18n): Hỗ trợ **Tiếng Việt & Tiếng Anh** với 100% placeholder/label completeness
  - Hỗ trợ mạng nội bộ (LAN): Lắng nghe `0.0.0.0`, tự động cấp quyền subnet `/24`, tích hợp Reverse Proxy Next.js cho MinIO & Backend API tránh lỗi CORS và PNA (Private Network Access)

---

## 📍 Bản đồ trạng thái tính năng (Feature Status Matrix)

| Trạng thái | Ký hiệu | Ý nghĩa |
| :--- | :---: | :--- |
| **Đã hoàn thành (Released)** | 🟢 | Tính năng đã được xây dựng hoàn chỉnh, có test tự động và hoạt động trên UI |
| **Đang chuẩn bị (Next Horizon - Q4/2026)** | 🟡 | Tính năng cốt lõi tiếp theo, có kế hoạch kỹ thuật cụ thể |
| **Tương lai đề xuất (Future Vision - 2027)** | 🔵 | Định hướng mở rộng dài hạn cho phân khúc Enterprise & Tự động hóa |

---

## 🟢 PHẦN 1: CÁC TÍNH NĂNG ĐÃ PHÁT HÀNH (RELEASED - v1.0.0-BETA)

Hệ thống hiện tại đã hoàn thiện trọn vẹn quy trình tuyển dụng cốt lõi từ lúc đăng tin, nhận ứng viên, sàng lọc Kanban, phỏng vấn, đánh giá Scorecard cho tới gửi email tự động:

### 1. Phân hệ Xác thực & Quản lý người dùng (Authentication & Session)
- 🟢 **Đăng ký & Đăng nhập**: Xác thực JWT an toàn, mã hóa mật khẩu Bcrypt.
- 🟢 **Quick Login**: Chế độ đăng nhập nhanh tài khoản Admin/Member cho môi trường phát triển & kiểm thử.
- 🟢 **Khôi phục phiên (Session Persistence)**: Tự động duy trì đăng nhập qua `/auth/me`, xử lý khi token hết hạn.
- 🟢 **Bảo vệ tuyến đường (Route Guard)**: Middleware Next.js bảo vệ các trang `/dashboard/*`, tự động chuyển hướng người dùng chưa đăng nhập.

### 2. Quản lý Tổ chức & Đa khách hàng (Organization & Multi-Tenancy)
- 🟢 **Onboarding & Khởi tạo Workspace**: Quy trình dẫn dắt tạo tổ chức ban đầu với slug duy nhất.
- 🟢 **Mời thành viên (Invite System)**: Tạo liên kết mời bảo mật kèm cấu hình thời hạn hết hạn (`expiresAt`), giới hạn số lượt sử dụng (`maxUses`), và theo dõi số lần dùng thực tế (`usesCount`).
- 🟢 **Quản trị thành viên (Member Management)**: Danh sách thành viên, chuyển đổi vai trò (`ADMIN` $\leftrightarrow$ `MEMBER`), thu hồi quyền truy cập hoặc xóa thành viên.
- 🟢 **Đồng bộ thời gian thực (SSE Synchronization)**:
  - Khi thành viên bị xóa khỏi tổ chức $\rightarrow$ lập tức nhận tín hiệu SSE và bị đẩy về trang onboarding.
  - Khi thành viên được nâng/hạ quyền $\rightarrow$ giao diện tự động ẩn/hiện các nút tác vụ nhạy cảm mà không cần F5.
  - Tự động invalidate cache React Query khi có cập nhật trong tổ chức.

### 3. Quản lý Tin tuyển dụng (Job Management)
- 🟢 **CRUD Tin tuyển dụng**: Quản lý đầy đủ chức danh, phòng ban, địa điểm, mã bưu chính, loại hình làm việc (Toàn thời gian, Bán thời gian, Hợp đồng, Thực tập), hình thức (Tại văn phòng, Hybrid, Từ xa), mức độ kinh nghiệm (Mới đi làm, Trung cấp, Cao cấp, Trưởng nhóm, Giám đốc), mô tả, yêu cầu và dải lương.
- 🟢 **Trạng thái tin (Job Status)**: Bản nháp (`DRAFT`), Đã xuất bản (`PUBLISHED`), Đóng tuyển dụng (`CLOSED`), Lưu trữ (`ARCHIVED`).
- 🟢 **Giao diện hiển thị kép (Card / Table View)**: Chuyển đổi linh hoạt giữa dạng lưới thẻ trực quan và bảng dữ liệu chuyên sâu.
- 🟢 **Bộ lọc & Tìm kiếm**: Lọc theo phòng ban, trạng thái tuyển dụng, tìm kiếm tức thì theo từ khóa.
- 🟢 **Trang Tuyển dụng Công khai (Public Career Portal)**:
  - Tuyến `/careers/[orgSlug]`: Hiển thị danh sách tất cả các vị trí đang mở tuyển của công ty.
  - Tuyến `/careers/[orgSlug]/[jobSlug]`: Trang chi tiết công việc kèm biểu mẫu nộp CV trực tuyến cho ứng viên vãng lai.

### 4. Quy trình Tuyển dụng & Quản lý Ứng viên (Candidate & Pipeline)
- 🟢 **Pipeline Kanban 6 giai đoạn chuẩn**:
  - `APPLIED` (Ứng tuyển mới)
  - `SCREENING` (Sàng lọc hồ sơ)
  - `INTERVIEW` (Phỏng vấn)
  - `OFFER` (Đề nghị nhận việc)
  - `HIRED` (Đã tuyển dụng)
  - `REJECTED` (Từ chối)
- 🟢 **Kéo thả tương tác (Drag & Drop)**: Kéo thẻ ứng viên giữa các cột Kanban để cập nhật trạng thái tuyển dụng tức thì.
- 🟢 **Bảng dữ liệu ứng viên nâng cao (Candidate Data Table)**:
  - Tìm kiếm toàn văn theo họ tên, email, vị trí.
  - Sắp xếp đa cột (Sorting), phân trang (Pagination).
  - Tùy chỉnh ẩn/hiện cột hiển thị (Column Visibility Toggle).
  - Menu tác vụ nhanh (Quick Action) đổi vòng tuyển dụng chỉ với 1 click.
- 🟢 **Chi tiết hồ sơ ứng viên (Candidate Profile)**: Quản lý thông tin liên hệ, ghi chú nội bộ, lịch sử ứng tuyển, và danh sách tài liệu đính kèm.

### 5. Quản lý Hồ sơ & Lưu trữ Tập trung (Resume & MinIO Storage)
- 🟢 **Tích hợp S3/MinIO**: Tải lên và quản lý tập tin CV, thư ngỏ, bằng cấp với độ an toàn cao.
- 🟢 **Trình xem trước PDF tại chỗ (In-App PDF Modal Viewer)**: Mở và đọc nội dung CV trực tiếp trên trình duyệt mà không cần tải file về máy.
- 🟢 **Xử lý tên file tiếng Việt UTF-8**: Tự động mã hóa chuẩn `Content-Disposition` giữ nguyên dấu tiếng Việt khi tải xuống.
- 🟢 **Reverse Proxy an toàn**: Tuyến `/ats-resumes/*` được chuyển tiếp server-side, bảo vệ MinIO khỏi truy cập trực tiếp từ Internet công cộng.

### 6. Lịch phỏng vấn & Đánh giá ứng viên (Interviews & Scorecards)
- 🟢 **Đặt lịch phỏng vấn đa vòng**:
  - Loại hình: Sàng lọc nhân sự (`HR_SCREENING`), Chuyên môn kỹ thuật (`TECHNICAL`), Văn hóa (`CULTURE_FIT`), Vòng cuối (`FINAL_ROUND`), Bài kiểm tra năng lực (`ASSESSMENT`).
  - Hình thức họp: Google Meet (`MEET`), Zoom (`ZOOM`), Microsoft Teams (`TEAMS`), Trực tiếp tại văn phòng (`OFFICE`).
- 🟢 **Giao diện Lịch (Calendar View)**: Chế độ xem theo Tháng (Month) và theo Tuần (Week), trực quan hóa các buổi phỏng vấn cùng huy hiệu hình thức họp và liên kết phòng họp.
- 🟢 **Hệ thống Phiếu đánh giá (Scorecard System)**:
  - Đánh giá từ 1 đến 5 sao theo 4 tiêu chí cốt lõi (Chuyên môn, Giao tiếp, Tư duy giải quyết vấn đề, Mức độ phù hợp văn hóa).
  - Khuyến nghị tuyển dụng 5 mức: Tuyệt đối nên nhận (`Strong Yes`), Nên nhận (`Yes`), Trung lập (`Neutral`), Không nên nhận (`No`), Tuyệt đối từ chối (`Strong No`).
  - Lưu trữ ghi chú chi tiết của hội đồng phỏng vấn.

### 7. Hệ thống Email & Tự động hóa (Email & Communication Engine)
- 🟢 **4 Mẫu thư mặc định có sẵn (Pre-seeded Templates)**:
  - Thư xác nhận tiếp nhận hồ sơ (`APPLICATION_CONFIRMATION`)
  - Thư mời tham dự phỏng vấn (`INTERVIEW_INVITATION`)
  - Thư từ chối lịch sự (`REJECTION`)
  - Thư mời nhận việc (`OFFER`)
  - Hỗ trợ mẫu thư tùy biến tự do (`CUSTOM`)
- 🟢 **Bộ máy chèn biến động (Dot-Notation Variable Engine)**:
  - Hỗ trợ biến phẳng và biến lồng: `{{candidate.name}}`, `{{job.title}}`, `{{company.name}}`, `{{interview.date}}`, `{{interview.link}}`, v.v.
  - API `/email/variables` cung cấp danh sách biến sẵn có cho bộ soạn thảo.
- 🟢 **Trình tùy biến mẫu thư (Template Customizer)**:
  - Chỉnh sửa tiêu đề và nội dung HTML chuyên nghiệp.
  - Xem trước hiển thị trực tiếp (Live Preview) trên cả 2 khung màn hình **Máy tính (Desktop)** và **Điện thoại (Mobile)**.
  - Bật/tắt chế độ tự động kích hoạt gửi cho từng loại thư.
- 🟢 **4 Chế độ gửi thư (Delivery Providers)**:
  - `SIMULATED`: Mô phỏng trong hệ thống (phục vụ thử nghiệm không tốn chi phí).
  - `SMTP`: Kết nối máy chủ thư doanh nghiệp (Gmail Workspace, Zoho, Postmark, Outlook).
  - `RESEND`: Tích hợp dịch vụ hiện đại Resend API.
  - `SENDGRID`: Tích hợp hạ tầng gửi thư quy mô lớn SendGrid API.
- 🟢 **Két an toàn thông tin nhạy cảm (AES-256-GCM Vault)**: Mật khẩu SMTP và API Key được mã hóa trước khi lưu vào DB, trả về frontend dạng che dấu `••••••••`.
- 🟢 **Kích hoạt tự động theo vòng đời ứng viên (Lifecycle Hooks)**:
  - Ứng viên nộp hồ sơ thành công $\rightarrow$ tự động gửi mail xác nhận.
  - Đổi trạng thái sang `REJECTED` $\rightarrow$ tự động gửi thư từ chối.
  - Lên lịch phỏng vấn (tích chọn gửi mail) $\rightarrow$ tự động gửi thư mời kèm link họp.
- 🟢 **Soạn thư thủ công (Manual Send Email Modal)**: Gửi thư nhanh cho ứng viên từ trang chi tiết với bản xem trước động.
- 🟢 **Nhật ký hộp thư đi (Email Outbox Logs)**: Phân trang, tìm kiếm theo người nhận, lọc trạng thái gửi (`SENT`, `SIMULATED`, `FAILED`) và thông điệp lỗi chi tiết.

### 8. Dòng thời gian hoạt động (Candidate Activity Timeline)
- 🟢 **Nhật ký kiểm toán thống nhất (`ActivityLog`)**: Tự động ghi nhận mọi sự kiện phát sinh: ứng tuyển, chuyển stage, gửi email, lên lịch phỏng vấn, cập nhật kết quả đánh giá, thêm ghi chú.
- 🟢 **Component `CandidateTimeline`**: Hiển thị dòng thời gian trực quan theo trục dọc, có bộ lọc theo từng nhóm sự kiện (Tất cả, Email, Phỏng vấn, Đổi trạng thái) và hỗ trợ phân trang dữ liệu.

### 9. Hạ tầng, Đa ngôn ngữ & Khả năng kết nối
- 🟢 **Song ngữ Việt - Anh (i18n)**: Toàn bộ nhãn, placeholder, tooltip được quản lý tập trung và kiểm định tự động qua lệnh `pnpm check:i18n`.
- 🟢 **Vận hành trên mạng LAN**: Cho phép các máy tính/điện thoại khác trong cùng mạng nội bộ kết nối trực tiếp đến IP máy chủ mà không bị lỗi bảo mật CORS hoặc Private Network Access.

---

## 🟡 PHẦN 2: LỘ TRÌNH TÍNH NĂNG TƯƠNG LAI (FUTURE HORIZON ROADMAP)

Dựa trên cấu trúc hiện tại và khoảng trống trong các tab Settings (`integrations`, `ai-configuration`, `privacy-retention`), dưới đây là lộ trình các tính năng chiến lược được phân bổ theo từng giai đoạn phát triển:

```mermaid
timeline
    title Lộ trình phát triển ATS Platform
    section Giai đoạn 2 (Q4/2026)
        AI Trích xuất CV (Parsing) : Tự động đọc PDF thành thông tin
        AI Chấm điểm phù hợp (Matching) : So khớp CV và JD
        Đồng bộ Google & Outlook Calendar : Tránh xung đột lịch
    section Giai đoạn 3 (Q1/2027)
        Ứng viên tự đặt lịch (Self-scheduling) : Link chọn giờ phỏng vấn
        Thông báo Slack / Teams Webhook : Cảnh báo khi có ứng viên mới
        Phân quyền chuyên sâu (RBAC) : Hiring Manager, Recruiter, Interviewer
    section Giai đoạn 4 (Q2/2027)
        Phân tích tuyển dụng (Funnel Analytics) : Báo cáo Time-to-Hire, Phễu tuyển
        Trình dựng trang tuyển dụng (Site Builder) : Tùy chỉnh màu sắc, banner công ty
        Biểu mẫu tùy biến (Custom Screening Forms) : Câu hỏi sàng lọc cho từng vị trí
    section Giai đoạn 5 (H2/2027)
        Đăng nhập Doanh nghiệp SSO : Google Workspace, Azure AD, SAML 2.0
        Chính sách bảo mật dữ liệu (GDPR/NĐ13) : Tự động ẩn danh hồ sơ quá hạn
        Cổng thông tin ứng viên (Candidate Portal) : Ứng viên tra cứu tiến độ hồ sơ
```

---

### 🚀 Giai đoạn 2: Trí tuệ nhân tạo & Tự động hóa thông minh (Q4/2026)
*Mục tiêu: Giảm 70% thời gian nhập liệu thủ công và nâng cao tốc độ phản hồi hồ sơ.*

#### 1. Trích xuất CV tự động bằng AI (AI Resume Parsing)
- **Vấn đề giải quyết**: Hiện tại khi ứng viên nộp CV hoặc HR upload CV, thông tin kinh nghiệm, học vấn, kỹ năng vẫn phải xem bằng mắt qua PDF.
- **Giải pháp**: Tích hợp OpenAI / Claude / Gemini API (qua tab `ai-configuration`):
  - Tự động bóc tách: Họ tên, số điện thoại, email, địa chỉ, số năm kinh nghiệm, các công ty từng làm việc, kỹ năng chuyên môn (Skills).
  - Tự động điền vào hồ sơ ứng viên chỉ sau vài giây tải file PDF.
- **Độ ưu tiên**: 🔴 Cao (P0)

#### 2. AI Đánh giá mức độ phù hợp (`matchScore` thông minh)
- **Vấn đề giải quyết**: Hiện tại trường `matchScore` trên bảng `Application` đang để trống hoặc tính toán cơ bản.
- **Giải pháp**:
  - Phân tích ngữ nghĩa (Semantic Matching) giữa Yêu cầu công việc (JD) và CV của ứng viên.
  - Chấm điểm phù hợp từ 0 - 100 điểm kèm bản tóm tắt: "Điểm mạnh", "Điểm còn thiếu" và "Gợi ý câu hỏi phỏng vấn khai thác sâu".
- **Độ ưu tiên**: 🟡 Trung bình cao (P1)

#### 3. AI Hỗ trợ viết thư & Tinh chỉnh Email (AI Email Copilot)
- Tích hợp nút **"Viết lại bằng AI"** trong modal gửi thư (`SendEmailModal`):
  - Viết lại thư từ chối với văn phong ấm áp, tôn trọng ứng viên.
  - Tùy chỉnh thư mời phỏng vấn hoặc thư gửi đề nghị (Offer) theo phong cách trang trọng hoặc hiện đại.
- **Độ ưu tiên**: 🟢 Trung bình (P2)

---

### 🔗 Giai đoạn 3: Tích hợp Lịch & Kênh cộng tác nội bộ (Q1/2027)
*Mục tiêu: Đưa ATS trở thành trung tâm kết nối, không còn phải chuyển qua lại giữa các ứng dụng bên ngoài.*

#### 1. Đồng bộ 2 chiều với Google Calendar & Microsoft 365
- **Mục tiêu**: Kích hoạt tab `settings/integrations`.
- **Tính năng**:
  - Kết nối tài khoản Google Workspace hoặc Microsoft Outlook của người phỏng vấn.
  - Khi tạo phỏng vấn trong ATS $\rightarrow$ tự động tạo sự kiện trên Calendar của người phỏng vấn và ứng viên.
  - Tự động sinh link Google Meet / Microsoft Teams thực tế mà không cần tạo thủ công rồi dán URL vào.
  - Hiển thị tình trạng bận/rảnh (Busy/Free) của người phỏng vấn để tránh trùng lịch.
- **Độ ưu tiên**: 🔴 Cao (P0)

#### 2. Ứng viên tự chọn lịch phỏng vấn (Candidate Self-Scheduling)
- Tương tự mô hình Calendly / SavvyCal:
  - Hệ thống gửi email chứa liên kết độc nhất cho ứng viên.
  - Ứng viên tự chọn khung thời gian rảnh phù hợp từ các slot trống mà hội đồng phỏng vấn đã thiết lập.
  - Giảm thiểu việc trao đổi email qua lại nhiều lần chỉ để chốt giờ họp.
- **Độ ưu tiên**: 🟡 Trung bình (P1)

#### 3. Tích hợp Thông báo Slack / Microsoft Teams Webhooks
- Nhận thông báo tức thì trên kênh làm việc nội bộ của công ty:
  - Thông báo khi có ứng viên mới nộp hồ sơ vào vị trí quan trọng.
  - Nhắc nhở người phỏng vấn trước 30 phút buổi họp.
  - Thông báo khi người phỏng vấn nộp Scorecard đánh giá xong.
- **Độ ưu tiên**: 🟢 Trung bình (P2)

---

### 👥 Giai đoạn 4: Phân quyền chuyên sâu (RBAC) & Trải nghiệm Tuyển dụng (Q2/2027)
*Mục tiêu: Đáp ứng quy mô doanh nghiệp vừa và lớn với nhiều phòng ban tham gia phỏng vấn.*

#### 1. Hệ thống Phân quyền chi tiết (Granular RBAC)
Hiện tại hệ thống đang có 2 quyền `ADMIN` và `MEMBER`. Cần mở rộng thành 4 vai trò chuẩn ATS quốc tế:
- **Super Admin (Quản trị viên cấp cao)**: Toàn quyền cấu hình công ty, billing, tích hợp và bảo mật.
- **Recruiter (Chuyên viên tuyển dụng)**: Quản lý tất cả jobs, xem toàn bộ ứng viên, gửi thư, đặt lịch phỏng vấn, xem dải lương.
- **Hiring Manager (Trưởng bộ phận chuyên môn)**: Chỉ xem các Jobs và ứng viên thuộc phòng ban mình phụ trách, xem Scorecards, phê duyệt đề xuất Offer, không xem được cấu hình hệ thống.
- **Interviewer (Người phỏng vấn)**: Chỉ xem hồ sơ của ứng viên mà mình được phân công phỏng vấn, chỉ điền phiếu Scorecard của mình, bị ẩn dải lương và thông tin cá nhân nhạy cảm.
- **Độ ưu tiên**: 🔴 Cao (P0)

#### 2. Tùy biến trang tuyển dụng công ty (Career Site Customizer)
- Kích hoạt tab `settings/career-page`:
  - Cho phép tải lên Banner, Logo công ty, Video giới thiệu môi trường làm việc.
  - Cấu hình màu sắc chủ đạo của thương hiệu (Primary Brand Color).
  - Thêm phần "Tại sao nên gia nhập chúng tôi" (Why Join Us), Phúc lợi công ty (Perks & Benefits), hình ảnh văn phòng.
  - Tùy biến tên miền riêng (Custom Domain: `careers.yourcompany.com`).
- **Độ ưu tiên**: 🟡 Trung bình cao (P1)

#### 3. Biểu mẫu ứng tuyển tùy biến (Custom Application Forms)
- Cho phép tạo các câu hỏi sàng lọc riêng cho từng vị trí tuyển dụng:
  - Câu hỏi trắc nghiệm (VD: "Bạn có thể đi làm ngay không?", "Bạn có kinh nghiệm NestJS trên 2 năm không?").
  - Đính kèm liên kết danh mục sản phẩm (Portfolio, GitHub, Behance, LinkedIn).
  - Tự động loại (Auto-reject) hoặc gắn nhãn ưu tiên nếu ứng viên trả lời đúng/sai các câu hỏi sàng lọc cốt lõi.
- **Độ ưu tiên**: 🟡 Trung bình (P1)

---

### 📊 Giai đoạn 5: Báo cáo phân tích & Hiệu suất tuyển dụng (Q3/2027)
*Mục tiêu: Cung cấp dữ liệu định lượng cho Giám đốc nhân sự (CHRO) và Ban lãnh đạo.*

#### 1. Phễu tuyển dụng & Tỷ lệ chuyển đổi (Recruitment Funnel Analytics)
- Báo cáo trực quan dạng phễu: Số lượng và tỷ lệ chuyển đổi qua các vòng:
  $$\text{Ứng tuyển} \rightarrow \text{Sàng lọc} \rightarrow \text{Phỏng vấn} \rightarrow \text{Nhận Offer} \rightarrow \text{Đi làm}$$
- Phát hiện nhanh các "điểm nghẽn" (bottleneck): Vòng nào đang có tỷ lệ rớt bất thường hoặc bị ngâm hồ sơ quá lâu.
- **Độ ưu tiên**: 🟡 Trung bình cao (P1)

#### 2. Chỉ số Tốc độ Tuyển dụng (Hiring Velocity Metrics)
- **Time-to-Hire**: Thời gian trung bình từ khi ứng viên nộp hồ sơ đến khi chấp nhận Offer.
- **Time-to-Fill**: Thời gian trung bình từ khi đăng tin tuyển dụng đến khi có người nhận việc.
- **Cost-per-Hire**: Chi phí trung bình để tuyển được một nhân sự.
- **Độ ưu tiên**: 🟡 Trung bình (P1)

#### 3. Phân tích Nguồn ứng viên (Source Quality Tracking)
- Đo lường hiệu quả các nguồn nộp hồ sơ: Website công ty, LinkedIn, Facebook, Giới thiệu nội bộ (Referral), TopCV, VietnamWorks.
- Thống kê nguồn nào mang lại ứng viên chất lượng cao nhất (tỷ lệ Hired cao nhất).
- Xuất báo cáo thống kê định dạng Excel, CSV, PDF.
- **Độ ưu tiên**: 🟢 Trung bình (P2)

---

### 🛡️ Giai đoạn 6: Bảo mật Doanh nghiệp & Tuân thủ (Enterprise & Compliance) (Q4/2027)
*Mục tiêu: Đạt chuẩn bảo mật cho khách hàng Doanh nghiệp và Tập đoàn đa quốc gia.*

#### 1. Đăng nhập một chạm Doanh nghiệp (Enterprise Single Sign-On - SSO)
- Kích hoạt tab `settings/sso`:
  - Hỗ trợ giao thức SAML 2.0 và OpenID Connect (OIDC).
  - Tích hợp trực tiếp với Google Workspace, Microsoft Azure Active Directory, Okta, OneLogin.
  - Tự động tạo và phân quyền tài khoản theo nhóm người dùng trong tổ chức (JIT Provisioning).
- **Độ ưu tiên**: 🟡 Trung bình (P1)

#### 2. Chính sách Lưu trữ & Xóa dữ liệu (Privacy & Retention Policy)
- Kích hoạt tab `settings/privacy-retention`:
  - Tuân thủ Quy định bảo vệ dữ liệu cá nhân (GDPR của Châu Âu và Nghị định 13/2023/NĐ-CP của Việt Nam).
  - Tự động thông báo và xin chấp thuận của ứng viên về việc lưu trữ CV.
  - Thiết lập quy tắc tự động ẩn danh hoặc xóa hẳn hồ sơ sau một khoảng thời gian quy định (ví dụ: 6 tháng hoặc 12 tháng kể từ khi từ chối).
  - Cung cấp nút "Yêu cầu xóa dữ liệu của tôi" cho ứng viên.
- **Độ ưu tiên**: 🟡 Trung bình (P1)

#### 3. Cổng thông tin ứng viên (Candidate Self-Service Portal)
- Cung cấp một trang tra cứu tiến độ ứng tuyển dành riêng cho ứng viên:
  - Đăng nhập bảo mật qua Magic Link hoặc mã OTP gửi về email.
  - Xem hồ sơ hiện tại đang ở giai đoạn nào (Đang duyệt, Đã lên lịch phỏng vấn, v.v.).
  - Cập nhật thông tin liên hệ hoặc bổ sung chứng chỉ mới mà không cần gửi email riêng cho HR.
- **Độ ưu tiên**: 🟢 Tương lai (P2)

---

## 🎯 Bảng tóm tắt các tính năng tương lai theo Mức độ ưu tiên

| Tính năng | Phân hệ | Độ phức tạp kỹ thuật | Giá trị mang lại | Ưu tiên |
| :--- | :--- | :---: | :---: | :---: |
| **AI Resume Parsing (Bóc tách CV tự động)** | AI & Automation | Trung bình | ⭐⭐⭐⭐⭐ Cực cao | 🔴 **P0** |
| **Google / Outlook Calendar 2-way Sync** | Integrations | Trung bình | ⭐⭐⭐⭐⭐ Cực cao | 🔴 **P0** |
| **Hệ thống phân quyền nâng cao (4 vai trò RBAC)** | Security & Team | Thấp - Trung bình | ⭐⭐⭐⭐⭐ Cực cao | 🔴 **P0** |
| **AI Candidate Matching & Scoring** | AI & Automation | Trung bình | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Candidate Self-Scheduling (Tự đặt lịch)** | Interviews | Trung bình | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Slack / MS Teams Webhook Alert** | Integrations | Thấp | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Career Site Builder (Tùy biến trang tuyển dụng)** | Public Portal | Thấp - Trung bình | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Phễu tuyển dụng & Time-to-Hire Analytics** | Analytics | Trung bình | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Chính sách dữ liệu GDPR / Nghị định 13** | Compliance | Trung bình | ⭐⭐⭐⭐ Cao | 🟡 **P1** |
| **Enterprise SSO (SAML 2.0 / Okta / Azure AD)** | Security | Trung bình - Cao | ⭐⭐⭐ Khá | 🔵 **P2** |
| **Cổng thông tin ứng viên (Candidate Portal)** | Experience | Trung bình | ⭐⭐⭐ Khá | 🔵 **P2** |

---

> 💡 *Tài liệu này là căn cứ chiến lược để định hướng các Sprint phát triển tiếp theo của dự án ATS Platform. Nội dung có thể được điều chỉnh linh hoạt theo nhu cầu thực tế của người dùng và định hướng mở rộng của doanh nghiệp.*
