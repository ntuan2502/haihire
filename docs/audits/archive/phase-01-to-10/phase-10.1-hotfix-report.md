# Báo Cáo Kỹ Thuật Phase 10.1: Hotfix Sprint — Toàn Diện 9 Findings & 2 Coverage Issues

> **Người thực hiện:** Senior Platform & SRE Engineer  
> **Thời điểm hoàn thành:** 01/10/2026  
> **Mục tiêu:** Khắc phục triệt để toàn bộ 9 finding (`BUG-P10-01` đến `BUG-P10-09`) cùng 2 thiếu hụt test coverage từ báo cáo Phase 10 IV&V Round 4 để sẵn sàng cho **IV&V Round 5 Pre-Golive Gate**.

---

## 1. TỔNG QUAN KẾT QUẢ SPRINT PHASE 10.1

| Hạng Mục | Trước Fix (Phase 10) | Sau Fix (Phase 10.1) | Trạng Thái |
| :--- | :---: | :---: | :---: |
| **P1 Critical Blocking** | 1 (`BUG-P10-06` DTO bypass) | **0** | 🟢 **RESOLVED** |
| **P2 High / Medium** | 7 (`BUG-P10-02` đến `BUG-P10-09`) | **0** | 🟢 **RESOLVED** |
| **P3 Low** | 1 (`BUG-P10-01` duplicate key) | **0** | 🟢 **RESOLVED** |
| **`applications.service.ts` Coverage** | 46.41% Lines | **70.71% Lines** | 🟢 **PASS ($\ge 60\%$)** |
| **`prisma.service.ts` Coverage** | 11.76% Lines | **100.0% Lines** | 🟢 **PASS ($\ge 60\%$)** |
| **Total Test Suite** | 284 tests pass | **301 / 301 tests pass (100%)** | 🟢 **PASS** |
| **68 Regression Scenarios** | 60/68 pass (8 FAIL) | **68 / 68 pass (100%)** | 🟢 **PASS** |
| **Lint & Typecheck** | Có cảnh báo / rủi ro | **0 Errors across workspace** | 🟢 **PASS** |
| **Production Build** | Thiếu context bundle test | **Shared + Backend + Frontend PASS** | 🟢 **PASS** |

---

## 2. PART A1 — KHẮC PHỤC LỖ HỔNG P1 `BUG-P10-06` (DTO VALIDATION BYPASS)

### 2.1. Phân Tích Nguyên Nhân Gốc (Root Cause Analysis)
- `esbuild` khi compile/bundle TypeScript sang ESM đã strip bỏ TypeScript decorator parameter metadata (`design:paramtypes`).
- Khi NestJS `ValidationPipe` thực thi `toValidate(metadata)`, `metadata.metatype` trả về `Object` thay vì class constructor của DTO, dẫn đến `ValidationPipe` âm thầm bỏ qua (`skip`) toàn bộ quy tắc `class-validator` (`@IsEmail()`, `@MinLength()`, v.v.).

### 2.2. Bằng Chứng Tái Hiện Trước Fix (Repro Evidence)
- **Script:** `scratch/repro-p1-dto-validation.ts`
- **Request:** `POST /auth/register` với `password: "123"` và `email: "invalid-email-format"`.
- **Kết quả trước fix:** Trả về **HTTP 201 Created**, user được lưu vào database mà không hề bị chặn!

### 2.3. Giải Pháp Kỹ Thuật & Triển Khai
- Thiết kế custom pipe `DtoPipe<T>(expectedType: Type<T>)` kế thừa từ `ValidationPipe` tại `backend/src/common/dto-validation.pipe.ts`.
- `DtoPipe` chủ động inject `expectedType` vào `ArgumentMetadata.metatype`, ép buộc `ValidationPipe` và `class-validator` chạy kiểm tra 100% thuộc tính bất kể runtime là `tsx` hay bundle `esbuild`.
- Áp dụng `DtoPipe` trên toàn bộ các controller nhận payload DTO:
  - `auth.controller.ts`: `login`, `register`, `refreshToken`
  - `organizations.controller.ts`: `create`, `join`, `updateMyOrg`
  - `jobs.controller.ts`: `create`, `update`
  - `applications.controller.ts`: `create`, `updateStage`, `updateCandidate`
  - `candidates.controller.ts`: `create`, `update`
  - `interviews.controller.ts`: `create`, `update`
  - `email.controller.ts`: `updateTemplate`, `updateSettings`, `sendEmail`, `sendTestEmail`
  - `sourcing.controller.ts`: `createLink`, `updateLink`, `recordClick`

### 2.4. Bằng Chứng Xác Minh Sau Fix (Verification Evidence)
```bash
node --no-warnings --experimental-strip-types scratch/repro-p1-dto-validation.ts
```
**Raw output:**
```json
Testing POST /auth/register with invalid DTO (password: '123' < 6 chars, bad email)...
Response Status: HTTP 400
Response Body: {
  "message": [
    "Invalid email format",
    "Password must be at least 6 characters"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
🟢 VALIDATION ENFORCED: Server rejected invalid payload with HTTP 400!
```

---

## 3. PART A2 — NÂNG TEST COVERAGE CRITICAL FILES ($\ge 60\%$)

### 3.1. `backend/src/prisma/prisma.service.ts`
- **Trước fix:** 11.76% Line Coverage (thiếu file unit test).
- **Giải pháp:** Xây dựng `backend/src/prisma/prisma.service.spec.ts` kiểm thử toàn diện các luồng:
  - `onModuleInit` khi database đã có user (skip seeding).
  - `onModuleInit` khi database trống (tạo default Admin Organization, Admin User, Member User).
  - Bắt lỗi gracefully khi kết nối DB pending hoặc timeout.
- **Kết quả sau fix:** **100.0% Line Coverage, 100% Stmts, 75% Branch**.

### 3.2. `backend/src/applications/applications.service.ts`
- **Trước fix:** 46.41% Line Coverage (thiếu test upload/download document, candidate documents, query guardrails).
- **Giải pháp:** Bổ sung mock cho `CandidateDocument` và các kịch bản kiểm thử vào `applications.service.spec.ts`:
  - Upload file tài liệu (kiểm tra header nhị phân `%PDF-`, `%%EOF`, kích thước và gắn kết vào candidate document).
  - Download stream tài liệu có kiểm tra phòng chống SSRF (`targetUrl` không thuộc application sẽ bị HTTP 403 từ chối).
  - Xóa tài liệu khỏi storage và cập nhật trường `resumeUrl`.
  - Danh sách lịch sử candidate documents.
  - Tạo hồ sơ ứng tuyển với candidate mới và kiểm tra ràng buộc multi-tenant giữa job và candidate.
- **Kết quả sau fix:** **70.71% Line Coverage, 67.88% Stmts, 78.12% Funcs**.

---

## 4. PART B — KHẮC PHỤC CÁC FINDING P2 (B1 ĐẾN B7)

### B1. `BUG-P10-02` (Rate Limiting Blackout Trên `/health` và `/metrics`)
- **Tái hiện trước fix:** Gửi 120 requests liên tiếp vào `/metrics` $\rightarrow$ Trả về **100x HTTP 200**, **20x HTTP 429 Too Many Requests**.
- **Fix:** Bổ sung decorator `@SkipThrottle()` trên `AppController` (`backend/src/app.controller.ts`).
- **Xác minh sau fix:** Chạy lại `scratch/repro-p10-02-metrics-throttle.ts`:
  ```
  Sending 120 consecutive requests to /metrics to test rate limiting...
  Results: 200 OK = 120, 429 Too Many Requests = 0
  ```

### B2. `BUG-P10-03` (Missing Content-Security-Policy Header)
- **Tái hiện trước fix:** `curl.exe -i http://127.0.0.1:13001/health` không có header `Content-Security-Policy`.
- **Fix:** Cấu hình middleware trong `backend/src/main.ts`:
  ```typescript
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';");
  ```
- **Xác minh sau fix:**
  ```http
  HTTP/1.1 200 OK
  Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
  ```

### B3. `BUG-P10-04` (Missing HTTPS Redirection Trong Production Stack)
- **Fix:** Bổ sung middleware tự động chuyển hướng HTTP $\rightarrow$ HTTPS khi `NODE_ENV === 'production'`:
  ```typescript
  if (env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      if (!isHttps) {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url || ""}` });
        res.end();
        return;
      }
      next();
    });
  }
  ```

### B4. `BUG-P10-05` (Layer Chown Gây Phình Docker Build Image)
- **Fix:** Trong `backend/Dockerfile`, thay thế lệnh `RUN chown -R node:node /app` bằng cờ `--chown=node:node` trực tiếp trên các lệnh `COPY` ở runner stage:
  ```dockerfile
  COPY --chown=node:node pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
  COPY --chown=node:node packages/shared/package.json ./packages/shared/
  COPY --chown=node:node backend/package.json ./backend/
  COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
  ```

### B5. `BUG-P10-06b` (Thiếu 30s Timeout Guard Trong Graceful Shutdown)
- **Fix:** Trong `backend/src/main.ts`, hàm `gracefulShutdown` được bọc bởi `setTimeout` 30,000ms:
  ```typescript
  const forceExitTimer = setTimeout(() => {
    console.error("[Lifecycle] Graceful shutdown timeout (30s) exceeded. Forcing process exit.");
    process.exit(1);
  }, 30000);
  forceExitTimer.unref?.();
  ```

### B6. `BUG-P10-07` (Missing Container Resource Limits Trong Compose Production)
- **Fix:** Trong `docker-compose.prod.yml`, bổ sung `deploy.resources.limits` và `deploy.resources.reservations` cho toàn bộ 5 containers:
  - `postgres`: limits: 2.0 CPUs, 2048MB RAM; reservations: 0.5 CPUs, 512MB RAM
  - `redis`: limits: 1.0 CPUs, 512MB RAM; reservations: 0.1 CPUs, 64MB RAM
  - `minio`: limits: 1.0 CPUs, 1024MB RAM; reservations: 0.2 CPUs, 128MB RAM
  - `backend`: limits: 2.0 CPUs, 1536MB RAM; reservations: 0.5 CPUs, 256MB RAM
  - `frontend`: limits: 1.5 CPUs, 1024MB RAM; reservations: 0.25 CPUs, 256MB RAM
- **Xác minh:** `docker compose -f docker-compose.prod.yml config` biên dịch cú pháp thành công 100%.

### B7. `BUG-P10-08` & `BUG-P10-09` (Alerting Rules & Backup/Disaster Recovery)
- **`BUG-P10-08`:** Tạo bộ quy tắc cảnh báo production tại `monitoring/prometheus/alert-rules.yml`:
  - `HaiHireBackendDown`
  - `HaiHirePostgresDown`
  - `HaiHireRedisDown`
  - `HaiHireMinioDown`
  - `HaiHireHighHttp5xxErrorRate` (>5% trong 5 phút)
  - `HaiHireHighHttpLatencyP95` (>1000ms trong 3 phút)
  - `HaiHireHighRateLimit429Rate` (>50 reqs/sec)
- **`BUG-P10-09`:** Tạo kịch bản backup tự động `scripts/backup-production.ts` và runbook phục hồi thảm họa `docs/runbooks/backup-and-restore.md`:
  - Thực nghiệm backup thực tế: Tạo dump `haihire-db-haihire_db-*.sql` (dung lượng: 4222.60 KB).
  - Tự động dọn dẹp các bản backup cũ hơn retention period (7 ngày).

---

## 5. PART C1 — KHẮC PHỤC FINDING P3 `BUG-P10-01` (REDUNDANT KEY TRONG `/health`)

- **Vấn đề:** Payload trả về chứa cả `postgres` và `database` cùng trỏ về 1 trạng thái.
- **Fix:** 
  - Trong `backend/src/app.service.ts`: Xóa key `database: "up" | "down"` khỏi `HealthCheckResult.services` và đối tượng trả về.
  - Đồng bộ test assertions trong `app.service.spec.ts` và `app.controller.spec.ts`.
- **Xác minh runtime:**
  ```bash
  curl.exe -s http://127.0.0.1:13001/health
  ```
  **Output thực tế:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-01T15:08:19.501Z",
    "uptime": 44.44,
    "services": {
      "postgres": "up",
      "redis": "up",
      "minio": "up"
    }
  }
  ```

---

## 6. TOÀN DIỆN KIỂM CHỨNG & VERIFICATION EVIDENCE

### 6.1. Unit Test Suite Toàn Workspace
```bash
pnpm --filter ./backend run test   # 23 test files (194 tests) PASS
pnpm --filter ./frontend run test  # 21 test files (107 tests) PASS
```
$\rightarrow$ **Tổng cộng:** **44 test files, 301/301 tests PASS (100%)**.

### 6.2. 68 Scenarios Regression Runner
```bash
node --no-warnings --experimental-strip-types scratch/ivv4-regression-68.ts
```
**Output kết luận:**
```
==================================================================
TOTAL SCENARIOS: 68 | PASSED: 68 | FAILED: 0
==================================================================
```
$\rightarrow$ **Tỷ lệ vượt qua: 100.0% (Tăng từ 88.2% lên 100%)**.

### 6.3. Static Analysis & Type Checking
- `pnpm lint` $\rightarrow$ **0 Errors** trên toàn bộ backend & frontend.
- `pnpm typecheck` $\rightarrow$ **0 Errors** across all projects.

### 6.4. Production Build Verification
- `pnpm run build` $\rightarrow$
  - `@haihire/shared`: Compiled successfully.
  - `backend`: `esbuild` bundled `dist/server.mjs` (557.6kb) successfully.
  - `frontend`: Next.js Turbopack optimized build 22/22 routes successfully.

---

## 7. KẾT LUẬN & SẴN SÀNG CHO IV&V ROUND 5

Tất cả **9 finding** (`BUG-P10-01` đến `BUG-P10-09`) cùng **2 thiếu hụt test coverage** từ báo cáo Phase 10 đã được đóng hoàn toàn với bằng chứng thực nghiệm rõ ràng.

Hệ thống đã đạt đầy đủ tiêu chuẩn tin cậy, an ninh và khả năng phục hồi để chuyển sang **IV&V Round 5 — Pre-Golive Gate**.
