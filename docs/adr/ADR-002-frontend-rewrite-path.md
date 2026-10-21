# ADR-002: Quản Lý Next.js Proxy Rewrites Không Có Prefix /api Và Lộ Trình Chuẩn Hóa /api/v1 Cho Release v0.4.0

## Trạng Thái (Status)

**Accepted** (Đã phê duyệt bởi Chủ dự án & Lead Architect DeepSeek - Ngày: 21/10/2026)

---

## Bối Cảnh (Context)

1. **Hiện trạng cấu hình Proxy trong Next.js:**
   - Trong tệp cấu hình [`frontend/next.config.ts`](../../frontend/next.config.ts), hàm `rewrites()` đang chuyển tiếp các request từ Next.js frontend sang backend NestJS và MinIO storage:
     ```typescript
     async rewrites() {
       return [
         { source: "/api/:path*", destination: `${backendUrl}/:path*` },
         { source: "/organizations/:path*", destination: `${backendUrl}/organizations/:path*` },
         { source: "/jobs/:path*", destination: `${backendUrl}/jobs/:path*` },
         { source: "/applications/:path*", destination: `${backendUrl}/applications/:path*` },
         { source: "/users/:path*", destination: `${backendUrl}/users/:path*` },
         { source: "/events/:path*", destination: `${backendUrl}/events/:path*` },
         { source: "/haihire-resumes/:path*", destination: `${minioUrl}/haihire-resumes/:path*` },
       ];
     }
     ```
2. **Nguồn gốc lịch sử:**
   - Trong giai đoạn đầu phát triển nền tảng (v0.1.0 - v0.2.0), một số client service phía frontend gọi trực tiếp URL tương đối không có tiền tố `/api` (ví dụ: `axios.get('/organizations')`, `axios.get('/jobs')`).
   - Cấu hình rewrites này được thêm vào nhằm cho phép cả 2 cơ chế URL (`/api/*` và direct path) hoạt động song song mà không cần can thiệp tái cấu trúc toàn diện cùng một lúc.
3. **Rủi ro kỹ thuật & Xung đột tiềm ẩn:**
   - **Xung đột định tuyến (Routing Collision Risk):** Next.js App Router sử dụng cấu trúc thư mục làm route. Khi tồn tại các page routes như `/dashboard/jobs/[id]`, `/careers/[id]`, hoặc trong trường hợp tương lai mở rộng route root `/jobs/*`, việc rewrite direct namespace dễ dẫn đến hành vi bất định giữa xử lý SSR/RSC của Next.js và HTTP reverse proxy request.
   - **Vi phạm tiêu chuẩn API Gateway:** Việc thiếu tiền tố version chuẩn hóa (`/api/v1/...`) làm phức tạp cấu hình reverse proxy ở tầng network edge (như Caddy hoặc Nginx trong production) và khó áp dụng policy WAF/Rate Limiting riêng biệt cho API traffic so với Web page traffic.

---

## Quyết Định (Decision)

1. **Giữ nguyên cấu hình Rewrites cho Release v0.3.0:**
   - Không thực hiện thay đổi cấu hình `frontend/next.config.ts` hay đổi tên URL gọi API ngay trong release v0.3.0 để đảm bảo tính ổn định tối đa (100% trong số 963 tests pass, toàn bộ luồng E2E không bị xáo trộn).
   - Ghi nhận đặc điểm kiến trúc này là một **Known Limitation** chính thức của phiên bản v0.3.0.
2. **Cam kết chuẩn hóa toàn diện trên Release v0.4.0:**
   - Toàn bộ backend routes sẽ chuyển dịch về tiền tố thống nhất `/api/v1/*`.
   - Toàn bộ frontend API callers sẽ trỏ tập trung qua `client.ts` với `baseURL = '/api/v1'`.
   - Loại bỏ các rewrite rules direct path (`/jobs/*`, `/organizations/*`...).

---

## Lộ Trình Di Chuyển (Migration Plan cho v0.4.0)

### Giai đoạn 1: Backend Versioning

- Trong `backend/src/main.ts`, kích hoạt NestJS Global Prefix:
  ```typescript
  app.setGlobalPrefix("api/v1");
  ```
- Đảm bảo các route hệ thống như `/health`, `/metrics` được cấu hình exclude khỏi prefix hoặc map tương ứng trong Prometheus scraper.

### Giai đoạn 2: Frontend Unified Client Alignment

- Cập nhật biến môi trường `NEXT_PUBLIC_API_URL` và `frontend/src/lib/api/client.ts` để mọi HTTP request tự động có tiền tố `/api/v1`.
- Cập nhật `frontend/next.config.ts` để chỉ cần duy nhất 2 rules rewrites:
  1. `/api/v1/:path*` $\rightarrow$ `${backendUrl}/api/v1/:path*`
  2. `/api/v1/storage/:path*` (hoặc `/haihire-resumes/:path*`) $\rightarrow$ `${minioUrl}/haihire-resumes/:path*`

### Giai đoạn 3: Deprecation Window & Cleanup

- Thiết lập middleware cảnh báo deprecation trong 1 chu kỳ release nếu có client ngoài gọi các direct paths cũ.
- Xóa bỏ triệt để các direct path rewrite rules khi phát hành bản v0.5.0.

---

## Trách Nhiệm & Giám Sát (Governance)

- **Owners:** Lead Frontend Engineer & Lead Backend Engineer.
- **Thời điểm rà soát:** Ngay khi khởi động Sprint v0.4.0 Architecture Planning.
