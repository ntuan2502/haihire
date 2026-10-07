# Báo Cáo Kỹ Thuật: Task #5 — Tenant Scoping Static Analysis Gate

**Dự án:** HaiHire Enterprise ATS  
**Tác giả:** Senior Software Engineer / Antigravity Agent  
**Ngày thực hiện:** 07/10/2026  
**Trạng thái:** ✅ HOÀN THÀNH 100% — SẴN SÀNG CHỜ DEEPSEEK REVIEW  
**Tài liệu tham chiếu:** [docs/reports/14-task-04-followup-and-task-05-kickoff-survey-report.md](file:///c:/Workspaces/haihire/docs/reports/14-task-04-followup-and-task-05-kickoff-survey-report.md), [docs/DEFINITION_OF_DONE.md](file:///c:/Workspaces/haihire/docs/DEFINITION_OF_DONE.md)

---

### Task #5: Tenant Scoping Static Analysis

**1. Summary**
- **Branch:** `feat/task-05-tenant-scoping-static-analysis`
- **Commit:** `2b0340c` (`feat(ci): add tenant scoping static analysis gate`)
- **Remote:** Đã push lên `origin/feat/task-05-tenant-scoping-static-analysis`
- **Files created/changed:**
  - `scripts/tenant-scoping.config.ts`: Config 4 danh mục whitelists (+55 lines)
  - `scripts/check-tenant-scoping.ts`: Engine static analysis và formatter báo cáo (+238 lines)
  - `scripts/check-tenant-scoping.spec.ts`: Test suite Vitest 9 unit/integration test cases (+224 lines)
  - `scripts/check-all.ts`: Tích hợp CI Gate #10 (+7 lines)
  - `package.json`: Thêm lệnh `lint:tenant-scope` (+1 line)
  - `.github/workflows/ci-cd.yml`: Thêm CI Gate 10 vào pipeline GitHub Actions (+3 lines)
  - `backend/vitest.config.ts`: Đăng ký `../scripts/**/*.{test,spec}.ts` vào backend test runner (+4 lines)
- **Total diff:** +597 / -1 lines

---

**2. Implementation Notes**
- **Deviation from spec:** KHÔNG CÓ sai lệch logic. Engine hỗ trợ linh hoạt cả việc chạy từ root workspace và từ các thư mục con (ví dụ khi Vitest chạy từ `backend/`) nhờ cơ chế tự động định vị repository root `getWorkspaceRoot()`.
- **Hiệu năng:** Tốc độ thực thi trung bình chỉ **~0.35 giây**, thỏa mãn tuyệt đối tiêu chí fast gate (< 2.0 giây).
- **Không có phụ thuộc mới:** Sử dụng thuần Node.js `fs`, `path` và regex, không cài bất kỳ thư viện AST hay parser bên thứ ba nào.
- **Không sửa đổi mã nguồn backend:** Không đụng chạm vào bất kỳ file nào trong `backend/src/`.

---

**3. Phân Loại Queries & Whitelists**

#### 3.1. Thống kê truy vấn
- **Tổng số service scanned:** 8 files (toàn bộ 8 module tenant-scoped)
- **Tổng số queries ORM kiểm tra:** **213 queries**
- **Safe queries:** **213 (100%)**
- **Unsafe queries:** **0**
- **Chi tiết phân loại:**
  - `104 queries` có explicit `organizationId` hoặc `targetOrgId` filter trực tiếp trong câu lệnh/context window.
  - `75 queries` thuộc 4 model vật lý không có cột `organizationId` trong schema (được bảo vệ qua quan hệ cha hoặc PK).
  - `34 queries` được bảo vệ bằng parent guard ở đầu hàm (`.organizationId !==`, `.organizationId ===`, hoặc `throw new AppForbiddenException`).
  - `0 queries` không an toàn.

#### 3.2. Danh sách Whitelist Entries & Rationale
1. **`MODELS_WITHOUT_ORG_COLUMN`:**
   - `Interview`: Schema DB không có cột `organizationId`; kế thừa tenant context qua `applicationId -> job.organizationId`.
   - `Application`: Schema DB không có cột `organizationId`; kế thừa tenant context qua `jobId -> job.organizationId` và `candidateId`.
   - `TrackingClick`: Schema DB không có cột `organizationId`; kế thừa tenant context qua `trackingLinkId -> trackingLink.organizationId`.
   - `Organization`: Khóa chính là `id`, truy vấn theo `id: targetOrgId` hoặc `slug: targetOrgSlug`.
2. **`NON_TENANT_SCOPED_FILES`:**
   - `auth.service.ts`: Chưa có org context khi xác thực danh tính/đăng nhập.
   - `users.service.ts`: Đọc danh sách người dùng mẫu toàn hệ thống.
   - Các dịch vụ hạ tầng không mang dữ liệu nghiệp vụ: `app.service.ts`, `common/encryption.service.ts`, `common/webhook/webhook-notifier.service.ts`, `email.service.ts`, `events.service.ts`, `metrics.service.ts`, `minio.service.ts`, `prisma.service.ts`.
   - `jobs.public.service.ts`: Endpoint công khai cho ứng viên xem tin tuyển dụng không cần đăng nhập.
3. **`SAFE_QUERY_PATTERNS`:**
   - `/findBySlug/`: Query xem tin tuyển dụng công khai theo slug của công ty.
   - `/healthCheck/`: Liveness probe của hệ thống.

---

**4. Test Coverage & Negative Test**
- **Unit & Integration tests:** **9 test cases** trong [`scripts/check-tenant-scoping.spec.ts`](file:///c:/Workspaces/haihire/scripts/check-tenant-scoping.spec.ts)
  1. `Test 1:` Parse danh mục service chuẩn xác, tìm đúng 8 tenant-scoped files.
  2. `Test 2:` Phát hiện query có filter `organizationId` -> SAFE.
  3. `Test 3:` Phát hiện query thiếu `organizationId` trong ngữ cảnh tenant -> UNSAFE.
  4. `Test 4:` Whitelist model (`Interview`) -> SAFE kể cả khi không có `organizationId`.
  5. `Test 5:` Whitelist file (`auth.service.ts`, `users.service.ts`) -> bỏ qua.
  6. `Test 6:` Query sau khi đã verify parent (`.organizationId !==`) -> SAFE.
  7. `Test 7:` Định dạng output báo cáo khớp chuẩn `[CI GATE PASSED]` và `[CI GATE FAILED]`.
  8. `Test 8:` Phát hiện vi phạm trả về `compliant: false` và chi tiết lỗi.
  9. `Test 9:` Safe pattern query (`/findBySlug/`) -> SAFE.
- **Tổng số tests toàn hệ thống:** **524 tests passed** (156 frontend + 368 backend).

#### 4.1. Kết quả Negative Test thực tế:
Tạo file tạm `backend/src/applications/test-unsafe.service.ts` với câu lệnh:
```ts
return this.prisma.db.orm.public.Candidate.all();
```
Kết quả chạy `pnpm lint:tenant-scope`:
```text
==================================================================
      CI ARCHITECTURE GATE: TENANT SCOPING AUDIT                  
==================================================================
Scanned files: 9
Total queries inspected: 214
Safe queries: 213
Unsafe queries: 1
------------------------------------------------------------------
[CI GATE FAILED] Found 1 unsafe queries:

1. backend/src/applications/test-unsafe.service.ts:9
   Query: return this.prisma.db.orm.public.Candidate.all();
   Reason: No organizationId filter and parent not verified.

ACTION REQUIRED:
  - Add organizationId filter to the query, OR
  - Verify parent object (e.g. .organizationId !== tenantOrgId) before the query, OR
  - Add to whitelist in scripts/tenant-scoping.config.ts with reason.
==================================================================
Command failed with exit code 1.
```
-> Script bắt lỗi chính xác 100%, trả về exit code 1 và chỉ rõ dòng mã vi phạm. Sau khi xóa file tạm, script trở lại trạng thái `PASS`.

---

**5. Verification Evidence**

#### 5.1. Raw Output chạy `pnpm lint:tenant-scope`:
```text
$ tsx scripts/check-tenant-scoping.ts
==================================================================
      CI ARCHITECTURE GATE: TENANT SCOPING AUDIT                  
==================================================================
Scanned files: 8
Total queries inspected: 213
Safe queries: 213
Unsafe queries: 0
------------------------------------------------------------------
[CI GATE PASSED] All 213 tenant-scoped queries are properly isolated!
  • 104 queries have explicit organizationId/targetOrgId filter
  • 4 models whitelisted (no org column in schema): Interview, Application, TrackingClick, Organization (75 queries)
  • 34 queries verified via parent object guard
==================================================================
```

#### 5.2. Raw Output chạy `pnpm check:all:fast` (10 CI Gates):
```text
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.36s
  2. Two-Way i18n & Zero Hardcoded Strings      [PASS]    0.80s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   13.54s
  4. TypeScript Type Safety                     [PASS]    7.93s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.22s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.40s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.35s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.42s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.36s
 10. Test Count Delta & Anti-Regression         [PASS]    0.34s
──────────────────────────────────────────────────────────────────
 Total Time: 24.74s
 Status: 🟢 ALL CHECKS PASSED (10/10) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

#### 5.3. Checklist Acceptance Criteria
- [x] `scripts/tenant-scoping.config.ts` tạo với 4 mục whitelist/patterns.
- [x] `scripts/check-tenant-scoping.ts` implement detection logic theo spec.
- [x] Script pass trên codebase hiện tại (213/213 queries SAFE, 0 unsafe).
- [x] Script FAIL với exit code 1 khi test file có query thiếu org filter.
- [x] Output format có `CI GATE PASSED` và `CI GATE FAILED` rõ ràng, actionable.
- [x] Exit code 0/1 chuẩn hóa.
- [x] Tích hợp vào `package.json` (`lint:tenant-scope`), `scripts/check-all.ts` (Gate 10), và `.github/workflows/ci-cd.yml`.
- [x] Test spec `scripts/check-tenant-scoping.spec.ts` pass 9/9 cases.
- [x] `pnpm check:all:fast` pass 10/10 gates.
- [x] `pnpm test` pass 524/524 tests.
- [x] Mọi mục trong `docs/DEFINITION_OF_DONE.md` đều PASS.

---

**6. Files for Review**
- [`scripts/tenant-scoping.config.ts`](file:///c:/Workspaces/haihire/scripts/tenant-scoping.config.ts)
- [`scripts/check-tenant-scoping.ts`](file:///c:/Workspaces/haihire/scripts/check-tenant-scoping.ts)
- [`scripts/check-tenant-scoping.spec.ts`](file:///c:/Workspaces/haihire/scripts/check-tenant-scoping.spec.ts)
- [`scripts/check-all.ts`](file:///c:/Workspaces/haihire/scripts/check-all.ts)
- [`.github/workflows/ci-cd.yml`](file:///c:/Workspaces/haihire/.github/workflows/ci-cd.yml)
- [`package.json`](file:///c:/Workspaces/haihire/package.json)
