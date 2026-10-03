# Báo Cáo Thẩm Định Độc Lập Phase 19.1 (IV&V Round 10) — Zero Trust Verification

> **Dự Án:** HaiHire Enterprise ATS Platform  
> **Giai Đoạn Thẩm Định:** Phase 19.1 — IV&V Round 10 (Independent Verification & Validation)  
> **Đối Tượng Thẩm Định:** Toàn bộ kết quả kỹ thuật và báo cáo Phase 19 (Theme Script Fix, Next.js Script, E2E Suite, Rate Limiting)  
> **Vai Trò:** Independent IV&V Engineer  
> **Ngày Thẩm Định:** 03/10/2026  
> **Triết Lý Thẩm Định:** **Zero Trust** — Không tin bất kỳ con số hay claim nào trong Phase 19 nếu chưa có bằng chứng thực chứng (empirical evidence) độc lập.  
> **Kết Luận Cuối Cùng:** 🟢 **READY TO SHIP (SHIP WITH CONDITIONS — 1 P3 MINOR CONVENTION FINDING)**

---

## 1. Executive Summary

Sau chu kỳ 3 lần claim "READY TO SHIP" nhưng phát sinh khiếm khuyết (Phase 16A $\rightarrow$ Phase 18 nuốt warning $\rightarrow$ Phase 18.1 đặt script thô vào layout.tsx $\rightarrow$ bug tái diễn lần thứ 3 tại URL người dùng), nhóm phát triển đã tiến hành Phase 19. 

Đợt thẩm định độc lập **IV&V Round 10 (Phase 19.1)** được kích hoạt với tôn chỉ Zero Trust nhằm kiểm tra chéo 7 hạng mục quan trọng nhất, độc lập với framework test nội bộ và đo đạc trực tiếp trên runtime môi trường Production và Development.

### Bảng Tổng Hợp Kết Quả 7 Hạng Mục Thẩm Định

| Hạng Mục | Yêu Cầu Thẩm Định | Kết Quả Thực Chứng | Phán Quyết IV&V |
| :--- | :--- | :--- | :---: |
| **VERIFY 1** | Rate Limit Production (5 req/phút) | 5 req đầu trả HTTP 401; req thứ 6 trả **HTTP 429 Too Many Requests** (`Retry-After: 60`) | 🟢 **PASS** |
| **VERIFY 2** | Số Lượng Test Thực Tế | **369 Unit/Int** (233 Backend + 136 Frontend) + **10 Playwright E2E** = **379 tests** | 🟢 **PASS** |
| **VERIFY 3** | URL Người Dùng Báo Cáo (Curl Độc Lập) | 0 warning thẻ script trong HTML; 4 lần xuất hiện tiêu đề job; 2 khối JSON-LD | 🟢 **PASS** |
| **VERIFY 4** | Rà Soát Không Che Đậy (Grep Raw) | 0 monkey-patch console; `suppressHydrationWarning` duy nhất trên `<html>`; 0 raw `<script>` | 🟢 **PASS** |
| **VERIFY 5** | Console Trình Duyệt Thực Tế | 0 script warning; 0 hydration error; class `dark` gán đồng bộ 0ms; chuyển đổi mượt mà | 🟢 **PASS** |
| **VERIFY 6** | Scope Creep Đổi Rate Limit | Hành vi hợp lý cho test, nhưng vi phạm convention gọi `process.env` trực tiếp trong Controller | 🟡 **NEEDS REVIEW (P3)** |
| **VERIFY 7** | Chất Lượng Test E2E | Lắng nghe console thô; kiểm chứng 3 lượt chạy liên tiếp đạt **10/10 PASS (0% flakiness)** | 🟢 **PASS** |

---

## 2. VERIFY 1: Rate Limit Production Vẫn Hoạt Động

### 2.1 Code Snippet Thô Trong `backend/src/auth/auth.controller.ts`
Tại dòng 42 và dòng 54 của `backend/src/auth/auth.controller.ts`:
```typescript
  @Throttle({ default: { limit: process.env.NODE_ENV === "production" ? 5 : 100, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(...)

  @Throttle({ default: { limit: process.env.NODE_ENV === "production" ? 5 : 100, ttl: 60000 } })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(...)
```

### 2.2 Quy Trình Kiểm Thử Thực Tế Môi Trường Production
1. Biên dịch backend cho môi trường production: `pnpm run build:backend` $\rightarrow$ tạo `backend/dist/server.mjs`.
2. Khởi chạy tiến trình với biến môi trường `$env:NODE_ENV = "production"`.
3. Gửi 6 HTTP POST request liên tiếp tới `http://127.0.0.1:13001/auth/login` kèm header `-H "X-Forwarded-Proto: https"` (do middleware production bắt buộc HTTPS redirection).

### 2.3 Kết Quả Thực Nghiệm Raw (HTTP Status Codes)
```text
Request 1 : HTTP 401
Request 2 : HTTP 401
Request 3 : HTTP 401
Request 4 : HTTP 401
Request 5 : HTTP 401
Request 6 : HTTP 429
```

### 2.4 Payload Trả Về Của Request Thứ 6
```http
HTTP/1.1 429 Too Many Requests
X-Powered-By: Express
Retry-After: 60
Content-Type: application/json; charset=utf-8
Content-Length: 114

{"statusCode":429,"code":"TOO_MANY_REQUESTS","message":"Too many requests. Please slow down and try again later."}
```
*Đánh Giá:* Ngưỡng rate limit 5 req/phút của Production hoàn toàn hoạt động chính xác.  
*Phán Quyết:* 🟢 **PASS**.

---

## 3. VERIFY 2: Kiểm Chứng Số Lượng Test Thực Tế

### 3.1 Raw Output Của `pnpm test` (Unit & Integration)
```text
backend test:  Test Files  27 passed (27)
backend test:       Tests  233 passed (233)
backend test:    Duration  13.78s

frontend test:  Test Files  24 passed (24)
frontend test:       Tests  136 passed (136)
frontend test:    Duration  14.32s

Total: 51 test files, 369 passed (100% PASS)
```

### 3.2 Raw Output Của `pnpm test:e2e` (Playwright E2E)
```text
$ playwright test
Running 10 tests using 7 workers

  ok  5 [chromium] › careers-page.spec.ts:111:3 › SSR HTML content verification (1.2s)
  ok  6 [chromium] › careers-page.spec.ts:87:3  › theme flicker test (<50ms) (928ms)
  ok  1 [chromium] › apply-form.spec.ts:6:3     › invalid email validation (2.9s)
  ok  7 [chromium] › careers-page.spec.ts:60:3  › Phase 19 user-reported URL verification (2.6s)
  ok  4 [chromium] › careers-page.spec.ts:6:3   › unmasked console audit (2.6s)
  ok  3 [chromium] › apply-form.spec.ts:44:3    › valid application creation (3.0s)
  ok  9 [chromium] › login-flow.spec.ts:4:3     › authentication & cookie redirect (2.4s)
  ok  2 [chromium] › apply-form.spec.ts:91:3    › EC4: file > 10MB limit error (3.7s)
  ok 10 [chromium] › theme-toggle.spec.ts:4:3   › theme toggle & reload persistence (2.7s)
  ok  8 [chromium] › kanban-drag-drop.spec.ts:10:3 › kanban state machine drag-drop (6.9s)

  10 passed (9.3s)
```

### 3.3 So Sánh Đối Chiếu Với Phase 18.1
- **Phase 18.1:** 369 Unit/Int + 9 E2E = 378 tests.
- **Phase 19:** 369 Unit/Int + 10 E2E = **379 tests**.
- **Kiểm tra Git Diff (`git diff 1fac6ac HEAD -- "*.spec.ts"`):**
  - Trong `careers-page.spec.ts`: Bổ sung đúng 1 test declaration mới (`test("Phase 19 verification: user-reported URL...")`).
  - Trong `kanban-drag-drop.spec.ts`: Không đổi tên test, chỉ thay đổi cơ chế quét pipeline động.
  - Không có bất kỳ bài test nào bị xóa hay đổi tên nhằm làm sai lệch số liệu.
*Phán Quyết:* 🟢 **PASS**.

---

## 4. VERIFY 3: Kiểm Tra Độc Lập URL Người Dùng Báo Cáo Bằng Lệnh Curl

Kiểm tra trực tiếp endpoint:  
`http://localhost:13000/careers/admin/senior-technical-recruiter-hr?ref=lnk-techinasia-fair`

### Kết Quả Phân Tích File HTML Tải Về (`scratch/user-url.html` — 109,384 bytes)
```powershell
Script warnings: 0 (expected: 0)
Job title matches: 4 (expected: > 0)
JSON-LD scripts: 2 (expected: > 0)
Next.js theme-init script: 2 (expected: > 0)
```
- Chuỗi cảnh báo `"Encountered a script"` trong mã nguồn HTML: **0** (Hoàn toàn sạch).
- Chức danh `"Senior Technical Recruiter"` xuất hiện ở 4 vị trí (OpenGraph meta, title, semantic fallback và interactive client heading).
- Thẻ Schema.org JSON-LD và script `<Script id="theme-init">` được đưa vào tài liệu đúng chuẩn.
*Phán Quyết:* 🟢 **PASS**.

---

## 5. VERIFY 4: Khẳng Định Codebase Không Còn Hành Vi Che Giấu Cảnh Báo

Rà soát AST và toàn bộ text bằng ripgrep trên thư mục `frontend/src`:

### 5.1 Rà Soát Ghi Đè `console.error`
```powershell
Get-ChildItem -Path frontend/src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "console\.error\s*="
```
$\rightarrow$ **0 matches (Hoàn toàn không có monkey-patching).**

### 5.2 Rà Soát `suppressHydrationWarning`
```powershell
Get-ChildItem -Path frontend/src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "suppressHydrationWarning"
```
$\rightarrow$ **Chỉ duy nhất 1 kết quả:** tại dòng 31 của `frontend/src/app/layout.tsx` trên thẻ `<html lang="en" suppressHydrationWarning>`. Không còn xuất hiện trên bất kỳ component con nào.

### 5.3 Rà Soát Thẻ `<script` Thô Trong Thư Mục `frontend/src/app`
```powershell
Get-ChildItem -Path frontend/src/app -Recurse -Include *.tsx | Select-String -Pattern "<script"
```
$\rightarrow$ **2 kết quả hợp lệ:**
- `careers/[orgSlug]/[jobSlug]/page.tsx:116`: `<script type="application/ld+json">` (inert data block theo chuẩn React 19).
- `app/layout.tsx:35`: `<Script id="theme-init" strategy="beforeInteractive">` (Component chính thức của Next.js).
$\rightarrow$ **0 thẻ `<script>` thực thi JavaScript thô nào tồn tại trong cây JSX.**
*Phán Quyết:* 🟢 **PASS**.

---

## 6. VERIFY 5: Thẩm Định Console Trình Duyệt Thực Tế & Thao Tác Thủ Công

Khởi chạy phiên tự động hóa trình duyệt Chromium trực tiếp và lắng nghe mọi luồng console:

```text
Navigating to: http://localhost:13000/careers/admin/senior-technical-recruiter-hr?ref=lnk-techinasia-fair...
[BROWSER info] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
[BROWSER log] [HMR] connected
HTTP Status: 200
Heading H1: "Senior Technical Recruiter (HR) at Admin"

Script warnings found in console: 0
Hydration errors found in console: 0

Testing theme toggle interaction...
Reloading page with dark theme in localStorage...
Is 'dark' class applied at domcontentloaded: true
Is 'dark' class applied after networkidle: true
Is 'light' applied after switching: true
```
- Số lượng cảnh báo thẻ script phát hiện trong console: **0**.
- Số lượng lỗi hydration mismatch: **0**.
- Khởi tạo theme đồng bộ: class `dark` được gắn ngay tại sự kiện `domcontentloaded` trước khi trang kịp hydrate, ngăn chặn 100% hiện tượng chớp trắng (FOUC).
*Phán Quyết:* 🟢 **PASS**.

---

## 7. VERIFY 6: Đánh Giá Scope Creep Của Việc Thay Đổi Rate Limit

### 7.1 Bối Cảnh & Lý Do Thay Đổi
Trong Phase 19, tác giả đã sửa đổi decorator tại `backend/src/auth/auth.controller.ts`:
Từ: `@Throttle({ default: { limit: 5, ttl: 60000 } })`  
Thành: `@Throttle({ default: { limit: process.env.NODE_ENV === "production" ? 5 : 100, ttl: 60000 } })`

### 7.2 Phân Tích Tính Chính Đáng (Justification) & Rủi Ro
- **Tính Chính Đáng:** Trong môi trường kiểm thử tự động E2E, 7 worker Playwright chạy song song thực hiện nhiều thao tác đăng nhập liên tục trong vòng vài giây. Hạn mức cứng 5 req/phút khiến các test E2E bị nghẽn ngẫu nhiên bởi lỗi HTTP 429. Việc nới lỏng hạn mức ở môi trường development/test lên 100 req/phút là cần thiết để test suite chạy ổn định.
- **Rủi Ro Production:** Ở môi trường production, hạn mức được duy trì nghiêm ngặt ở mức 5 req/phút như đã được chứng minh qua thực nghiệm ở VERIFY 1.
- **Phát Hiện Vi Phạm Quy Ước Kiến Trúc (P3 Finding):**
  Trong tài liệu quy ước dự án [.agents/memory/project-conventions.md](file:///c:/Workspaces/haihire/.agents/memory/project-conventions.md), phần *Environment Variable & Configuration Conventions* quy định rõ:
  > *"Consumer Files: Never call process.env directly in feature modules, services, or test configs. Always import the validated, type-safe env object."*
  
  Mặc dù `auth.controller.ts` đã import `env` từ `../config/env` tại dòng 4 và dùng `env.NODE_ENV` tại dòng 34, nhưng tại dòng 42 và 54, tác giả lại gọi trực tiếp `process.env.NODE_ENV`.
- **Khuyến Nghị Khắc Phục:** 
  Cần refactor `process.env.NODE_ENV` thành `env.NODE_ENV === "production" ? 5 : 100` để đảm bảo tính nhất quán 100% với quy ước của dự án.
*Phán Quyết:* 🟡 **NEEDS REVIEW (P3 — NON-BLOCKING FOR SHIP, BUT REQUIRES REFACTOR)**.

---

## 8. VERIFY 7: Đánh Giá Chất Lượng Bộ Test Playwright E2E

### 8.1 Tính Chân Thực Của Bộ Test
Kiểm tra mã nguồn `frontend/tests/e2e/careers-page.spec.ts`:
Bộ lắng nghe console được triển khai ở dạng thô:
```typescript
page.on("console", (msg) => {
  rawConsoleLogs.push({ type: msg.type(), text: msg.text() });
});
```
Hoàn toàn không có bộ lọc chuỗi hay can thiệp trước khi lưu mảng. Việc khẳng định `scriptTagErrors.length === 0` phản ánh đúng 100% sự kiện phát ra từ trình duyệt.

### 8.2 Kiểm Chứng Độ Ổn Định (Flakiness Audit) Qua 3 Lần Chạy Độc Lập
| Lần Chạy | Số Lượng Test | Kết Quả | Thời Lượng |
| :---: | :---: | :---: | :---: |
| **Lần 1** | 10 tests | 10 Passed / 0 Failed | 9.3s |
| **Lần 2** | 10 tests | 10 Passed / 0 Failed | 8.9s |
| **Lần 3** | 10 tests | 10 Passed / 0 Failed | 8.7s |

- Tỷ lệ thành công tổng hợp: **30/30 lượt test (100%)**.
- Tỷ lệ không ổn định (Flakiness): **0%**.
*Phán Quyết:* 🟢 **PASS**.

---

## 9. Danh Sách Lỗi & Khiếm Khuyết Phát Hiện (Findings)

1. **FINDING 1 (P3 — Code Style / Convention):**
   - **Vị trí:** `backend/src/auth/auth.controller.ts:42, 54`.
   - **Mô tả:** Gọi trực tiếp `process.env.NODE_ENV` thay vì dùng đối tượng đã được validate `env.NODE_ENV` từ `../config/env`.
   - **Mức độ ảnh hưởng:** Thấp (không gây lỗi runtime vì `NODE_ENV` luôn tồn tại trong Node.js, nhưng vi phạm quy ước zero-direct-process-env của codebase).
   - **Trạng thái:** *Ghi nhận để refactor, không chặn phát hành.*

---

## 10. Đánh Giá Độ Tin Cậy (Credibility Assessment)

| Giai Đoạn | Điểm Tin Cậy | Đánh Giá Của IV&V |
| :--- | :---: | :--- |
| **Phase 15B** | 94.1 / 100 | Báo cáo kiến trúc nghiêm khắc, phát hiện god-files |
| **Phase 16A** | 98.5 / 100 | Chuyển đổi RSC, phát sinh lỗi Theme Script do React 19 AST |
| **Phase 18** | **0.0 / 100 (REJECTED)** | Nuốt warning qua `console.error` (Anti-pattern che giấu triệu chứng) |
| **Phase 18.1** | 96.0 / 100 | Đặt script thô vào `<head>` của `RootLayout` gây tái diễn lỗi |
| **Phase 19.1** | **99.0 / 100** | **Xử lý dứt điểm nguyên nhân gốc rễ bằng Next.js `<Script>`, kiểm chứng thực tế đạt 7/7 hạng mục** |

---

## 11. PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)

# 🟢 PHÁN QUYẾT: SHIP WITH CONDITIONS (READY TO SHIP)

Toàn bộ **7/7 hạng mục thẩm định** đều đạt tiêu chuẩn kỹ thuật thực chứng:
1. Nguyên nhân gốc rễ của Theme Script lỗi trên React 19 đã được triệt tiêu hoàn toàn nhờ Next.js `<Script strategy="beforeInteractive">`.
2. Không còn bất kỳ đoạn mã che giấu triệu chứng hay monkey-patch console nào.
3. URL người dùng báo cáo hoạt động hoàn hảo, không có cảnh báo script trong cả HTML trả về lẫn console trình duyệt thực tế.
4. Cơ chế Rate Limit ở môi trường Production được kiểm chứng hoạt động chính xác (chặn ở request thứ 6 với mã HTTP 429).
5. Bộ test suite 379 tests (369 unit/integration + 10 E2E) đạt 100% pass với tỷ lệ flakiness bằng 0%.

---

## 12. Production Go-Live Checklist

- [x] Docker Container Infrastructure (PostgreSQL 17, Valkey 8, MinIO) đạt trạng thái healthy.
- [x] Lệnh kiểm tra toàn diện `pnpm check:all` đạt 9/9 bước kiểm tra.
- [x] Bản build production `pnpm run build` thành công trên cả shared, backend và frontend.
- [x] Cổng CI Architecture Gates (6/6 Gates) đạt tuyệt đối.
- [ ] *(Đề xuất cho sprint tiếp theo)* Refactor `process.env.NODE_ENV` thành `env.NODE_ENV` trong `auth.controller.ts`.
