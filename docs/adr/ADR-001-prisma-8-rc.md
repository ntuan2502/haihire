# ADR-001: Chấp Nhận 11 High CVEs Từ Prisma 8 RC / Alchemy Làm Known Limitation Cho Release v0.3.0

## Trạng Thái (Status)

**Accepted** (Đã phê duyệt bởi Chủ dự án & Lead Architect DeepSeek - Ngày: 21/10/2026)

---

## Bối Cảnh (Context)

1. **Lựa chọn công nghệ cốt lõi:**
   - Nền tảng HaiHire chủ động lựa chọn kiến trúc cơ sở dữ liệu hiện đại dựa trên **Prisma 8 RC** (`@prisma/orm-postgres@8.0.0-rc.13`, `prisma@8.0.0-rc.19`) cùng hệ sinh thái công cụ hỗ trợ `@prisma/composer@0.29.1` và `@prisma/composer-prisma-cloud@0.29.1`.
   - Mục đích kiến trúc: Tận dụng tính năng TypedSQL, AsyncLocalStorage transaction scoping, và cấu trúc schema module hóa thế hệ mới.
2. **Nguồn gốc phát sinh CVE:**
   - Bản thân dependency trực tiếp `alchemy@2.0.0-beta.79` trong [`backend/package.json`](../../backend/package.json) đã được xác minh là dead dependency và **đã bị xóa bỏ hoàn toàn** trong Phần 2.1.
   - Tuy nhiên, gói `@prisma/composer-prisma-cloud@0.29.1` phụ thuộc bắc cầu vào `@prisma/composer@0.29.1` $\rightarrow$ kéo theo `alchemy@2.0.0-beta.78`.
   - Gói `alchemy@2.0.0-beta.78` phụ thuộc gián tiếp vào framework `hono < 4.12.4` và `@hono/node-server`.
   - Khi chạy kiểm tra an ninh `pnpm audit --audit-level=high --prod`, npm/pnpm audit cảnh báo **11 lỗ hổng High CVE** liên quan đến DoS và cookie parsing trong các phiên bản Hono cũ này.
3. **Thực nghiệm nâng cấp:**
   - Đã nâng override `effect` thành công từ `"4.0.0-rc.111"` lên `"4.0.0-rc.118"` trong [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) và kiểm thử thành công 100% test suite (948/948 tests pass).
   - Tuy nhiên, nhánh phụ thuộc transitively vào Hono thông qua `@prisma/composer-prisma-cloud` không thể can thiệp đơn phương bằng override mà không gây xung đột nội bộ với các contract của Prisma CLI Engine.

---

## Quyết Định (Decision)

**Chấp thuận Phương án 1A:**
Chấp nhận 11 High CVEs bắc cầu này là một **Known Limitation** được kiểm soát và ghi nhận chính thức cho bản phát hành `v0.3.0`.

---

## Hệ Quả & Yêu Cầu Bắt Buộc (Consequences & Mitigations)

### 1. Biện pháp giảm thiểu bắt buộc (Mandatory Mitigations)

- **Network & Runtime Isolation:**
  - `@prisma/composer` và `@prisma/composer-prisma-cloud` là tooling hỗ trợ build-time / CLI của Prisma.
  - Trong runtime production của NestJS backend, không có bất kỳ endpoint nào khởi tạo HTTP server Hono hoặc expose cổng của Composer ra Internet.
  - Production Docker image được build dưới dạng compiled JavaScript của NestJS (`backend/dist/src/main.js`), cổng dịch vụ duy nhất được mở ra bên ngoài là cổng backend NestJS (`PORT=3001`).
- **Web Application Firewall (WAF):**
  - Mọi traffic đi vào hệ thống đều được lọc qua reverse proxy (Caddy) và WAF ở tầng network/ingress, triệt tiêu khả năng khai thác DoS từ HTTP headers hoặc cookie malformed nhắm vào tầng ứng dụng bên trong.

### 2. Tiêu chí kết thúc rủi ro (Exit Criteria)

- Ngay khi Prisma phát hành **Prisma 8 GA (General Availability)** và phát hành phiên bản Composer GA chính thức (dự kiến Q4/2026):
  1. Gỡ bỏ trạng thái RC của Prisma.
  2. Cập nhật `@prisma/composer` lên bản GA sạch CVE.
  3. Xóa bỏ hoàn toàn custom filter trong [`.github/workflows/ci-main.yml`](../../.github/workflows/ci-main.yml) để chuyển sang `pnpm audit --audit-level=high` trực tiếp làm mandatory blocking gate.

### 3. Trách nhiệm & Lịch trình rà soát (Governance)

- **Owner chịu trách nhiệm:** Chủ dự án HaiHire & Lead Architect.
- **Tần suất rà soát:** Đánh giá định kỳ hàng tháng (Monthly Security Review) hoặc ngay lập tức khi Prisma phát hành bản phát hành mới (RC update / GA).

---

## Các Phương Án Đã Xem Xét & Bị Bác Bỏ (Alternatives Considered)

1. **Phương án 1B — Block tag release v0.3.0 vô thời hạn:**
   - _Lý do bác bỏ:_ Prisma 8 GA phụ thuộc vào lịch trình release của team Prisma Core bên ngoài. Việc dừng toàn bộ chu kỳ phát hành v0.3.0 của sản phẩm trong khi rủi ro an ninh thực tế ở runtime đã được cô lập là không hợp lý về mặt kinh doanh và vận hành.
2. **Phương án 1C — Ép pnpm override hạ hoặc nâng phiên bản `alchemy` / `hono`:**
   - _Lý do bác bỏ:_ Chưa có phiên bản Hono/Alchemy nào tương thích ngược hoàn toàn với `@prisma/composer-prisma-cloud@0.29.1`. Việc ép override gây phá vỡ cơ chế sinh code Prisma và lỗi biên dịch TypeScript.
