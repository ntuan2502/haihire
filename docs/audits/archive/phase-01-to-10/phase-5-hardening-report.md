# BÁO CÁO THẨM ĐỊNH PHASE 5: SYSTEM HARDENING
**Dự án:** HaiHire Recruitment Platform  
**Kỹ sư thực hiện:** Senior Backend Engineer  
**Ngày hoàn thành:** 01/10/2026  
**Trạng thái:** HOÀN THÀNH 100% (All Quality Gates Passed)

---

## 1. TỔNG QUAN THỰC HIỆN

Dựa trên kết quả từ cuộc kiểm tra độc lập **Phase 4 IV&V Report** (`docs/phase-4-verification-report.md`), Phase 5 thực hiện đóng triệt để 3 vấn đề cốt lõi:

1. **BUG-P4-01 (P2):** Thiếu Optimistic Locking trong Pipeline Stage Machine $\rightarrow$ Race condition giữa các request đồng thời, Last-Write-Wins.
2. **DESIGN-P4-02 (P3):** Hàm `validateMagicBytes` chỉ kiểm tra header 1024 bytes, bỏ sót PDF truncated/corrupted bị mất trailer `%%EOF`.
3. **DESIGN-P4-03 (P3):** `minio.service.ts::uploadFile` fallback về root namespace khi `tenantOrgId` là `null`/`undefined`/rỗng.

### Kết Quả Cốt Lõi:
* **Toàn bộ 3 bản sửa lỗi (Fixes)** đã được hoàn thiện đúng theo đặc tả.
* **100% Unit Tests & Integration Tests vượt qua:** **265/265 tests passed** (Backend: 160/160, Frontend: 105/105) — vượt mốc yêu cầu >255 tests.
* **11/11 kịch bản runtime Phase 3 không hồi quy (Zero Regression):** 100% PASS.
* **Không sửa bất kỳ file mã nguồn nghiệp vụ nào ngoài 3 khu vực quy định.**

---

## 2. BẢNG SO SÁNH BEFORE / AFTER CHO 3 VẤN ĐỀ

| Mã Vấn Đề | Thành Phần | Trước Khi Sửa (Before) | Sau Khi Sửa (After) | Error Code Mới |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-P4-01** | `applications.service.ts::updateStage` | Chỉ lọc theo `WHERE id = id`. Hai request đồng thời ghi đè nhau (Last-Write-Wins), cả 2 đều nhận `200 OK`. | Lọc đồng thời `WHERE id = id AND stage = oldStage`. Nếu `affectedRows === 0`, ném ngay `AppConflictException` (HTTP 409). | `APPLICATION_STAGE_CONFLICT` |
| **DESIGN-P4-02** | `upload-utils.ts::validateMagicBytes` & `validateUploadedFile` | Chỉ đọc 1024 bytes đầu tìm `%PDF-`. File bị cắt ngang (truncated 50% hoặc 99%) vẫn được coi là hợp lệ. | Vẫn kiểm tra `%PDF-` đầu file + duyệt ngược tối đa 2048 bytes cuối để tìm trailer `%%EOF`. File thiếu trailer bị từ chối ngay lập tức. | `UPLOAD_TRUNCATED_FILE` |
| **DESIGN-P4-03** | `minio.service.ts::uploadFile` | Nếu `tenantOrgId` là `null`/`undefined`/empty, tự động fallback lưu vào root namespace `resumes/...`. | Bắt buộc `tenantOrgId` hợp lệ. Nếu thiếu hoặc rỗng $\rightarrow$ ném ngay `AppBadRequestException` (HTTP 400). | `TENANT_ID_REQUIRED_FOR_UPLOAD` |

---

## 3. CHI TIẾT TRIỂN KHAI VÀ BẰNG CHỨNG (RAW EVIDENCE)

### 3.1. FIX 1: Optimistic Locking cho Stage Machine (BUG-P4-01)

#### A. Mã Nguồn Thay Đổi (`applications.service.ts`)
```typescript
// backend/src/applications/applications.service.ts
const updatedRecord = await this.prisma.db.orm.public.Application
  .where((a) => a.id.eq(id))
  .where((a) => a.stage.eq(oldStage))
  .update({
    stage: dto.stage,
    ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
  });

if (!updatedRecord) {
  throw new AppConflictException(
    APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
    `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
    { currentStage: oldStage, targetStage: dto.stage },
  );
}
```

#### B. Thêm Mã Lỗi Vào `@haihire/shared` (`packages/shared/src/errors.ts`)
```typescript
export const APP_ERROR_CODES = {
  // ...
  APPLICATION_STAGE_CONFLICT: "APPLICATION_STAGE_CONFLICT",
  UPLOAD_TRUNCATED_FILE: "UPLOAD_TRUNCATED_FILE",
  TENANT_ID_REQUIRED_FOR_UPLOAD: "TENANT_ID_REQUIRED_FOR_UPLOAD",
} as const;
```

#### C. Bằng Chứng Repro Trước Khi Sửa (Before Evidence)
Khi gửi 2 request đồng thời PATCH `/applications/:id/stage` từ `APPLIED` sang `SCREENING` và `REJECTED`:
```json
REPRO_BEFORE_FIX: {
  "res1Status": 200,
  "res2Status": 200,
  "res1Stage": "SCREENING",
  "res2Stage": "REJECTED",
  "finalDbStage": "REJECTED",
  "isBugReproduced": true
}
```

#### D. Bằng Chứng Runtime Sau Khi Sửa (After Evidence)
Khi 2 request đồng thời cùng đọc stage `APPLIED`:
```json
REPRO_AFTER_FIX: {
  "res1Status": 200,
  "res2Status": 409,
  "res1Stage": "SCREENING",
  "res2ErrorCode": "APPLICATION_STAGE_CONFLICT",
  "finalDbStage": "SCREENING",
  "isBugReproduced": false
}
```
**Raw Server Execution Log:**
```
[Nest] 41680  - 13:59:36 01/10/2026 LOG [ApplicationsService]
UPDATE_STAGE_STEP: { id: 'a2624e7f-...', oldStage: 'APPLIED', targetStage: 'SCREENING', updated: true }
UPDATE_STAGE_STEP: { id: 'a2624e7f-...', oldStage: 'APPLIED', targetStage: 'REJECTED', updated: false }
-> HTTP 409 Conflict thrown with code: APPLICATION_STAGE_CONFLICT
```

#### E. Unit Tests (`applications.service.spec.ts`)
Đã bổ sung 3 unit tests chuyên biệt:
1. `should allow sequential valid updates to next stages` $\rightarrow$ PASS.
2. `should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict` $\rightarrow$ PASS.
3. `should throw NotFoundException when updating non-existent application` $\rightarrow$ PASS.

---

### 3.2. FIX 2: PDF Integrity Validation (DESIGN-P4-02)

#### A. Mã Nguồn Thay Đổi (`upload-utils.ts`)
```typescript
// backend/src/common/upload-utils.ts
export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (extension === ".pdf") {
    // 1. Validate PDF header signature
    const headerValid = buffer.length >= 4 && buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    if (!headerValid) return false;

    // 2. Validate PDF trailer %%EOF
    const searchWindowSize = Math.min(buffer.length, 2048);
    const trailerChunk = buffer.subarray(buffer.length - searchWindowSize).toString("latin1");
    return trailerChunk.includes("%%EOF");
  }
  // ... (docx, doc, txt validation)
}

export function validateUploadedFile(file: Express.Multer.File): void {
  // ...
  const ext = "." + (file.originalname.split(".").pop()?.toLowerCase() || "");
  if (ext === ".pdf") {
    const hasHeader = file.buffer.length >= 4 && file.buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    if (hasHeader && !validateMagicBytes(file.buffer, ext)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.UPLOAD_TRUNCATED_FILE,
        "PDF file appears truncated or corrupt (missing %%EOF trailer in trailing 2048 bytes).",
      );
    }
  }
  // ...
}
```

#### B. Bằng Chứng Runtime Qua HTTP API (`POST /applications/apply`)
Chạy file script xác thực thực tế (`scratch/verify-edge6.ts`):
```
--- Testing Edge 6: Truncated PDF Upload ---
Using PUBLISHED job: 086e6926-70f4-44b5-95be-3421ddaca39f Fullstack Engineer
Edge 6 Result: {
  status: 400,
  code: 'UPLOAD_TRUNCATED_FILE',
  message: 'PDF file appears truncated or corrupt (missing %%EOF trailer in trailing 2048 bytes).',
  isCorrectlyRejected: true
}
Valid PDF Result: {
  status: 201,
  appId: 'b5724c28-9147-460f-b1cb-1ef977e287cc',
  isAccepted: true
}
```

#### C. Unit Tests (`upload-utils.spec.ts`)
Bổ sung đầy đủ 5 unit tests theo đặc tả:
1. `should accept valid PDF binary signature %PDF- with %%EOF trailer` $\rightarrow$ PASS.
2. `should reject PDF truncated 50% (missing %%EOF trailer)` $\rightarrow$ PASS.
3. `should reject PDF truncated 99% (only missing %%EOF)` $\rightarrow$ PASS.
4. `should accept valid PDF where %%EOF is outside last 1024 bytes but within 2048 bytes` $\rightarrow$ PASS.
5. `should reject truncated PDF via validateUploadedFile with UPLOAD_TRUNCATED_FILE` $\rightarrow$ PASS.

---

### 3.3. FIX 3: MinIO Tenant Key Defense (DESIGN-P4-03)

#### A. Mã Nguồn Thay Đổi (`minio.service.ts`)
```typescript
// backend/src/minio/minio.service.ts
async uploadFile(file: Express.Multer.File, folder = "resumes", tenantOrgId?: string | null): Promise<UploadResult> {
  if (!tenantOrgId || tenantOrgId.trim() === "") {
    throw new AppBadRequestException(
      APP_ERROR_CODES.TENANT_ID_REQUIRED_FOR_UPLOAD,
      "Tenant organization ID is required for file uploads to enforce tenant namespace isolation.",
    );
  }

  const safeTenant = tenantOrgId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = file.originalname.split(".").pop();
  const safeFilename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const objectName = `tenants/${safeTenant}/${folder}/${safeFilename}`;
  // ...
}
```

#### B. Audit Toàn Bộ 4 Call Sites
Đã grep toàn bộ codebase xác nhận không có bất kỳ điểm gọi nào bỏ sót `tenantOrgId`:
1. `candidates.service.ts:391`: Truyền `orgId` (từ authenticated user).
2. `candidates.service.ts:503`: Truyền `candidate.organizationId`.
3. `applications.service.ts:510`: Truyền `job.organizationId`.
4. `applications.service.ts:921`: Truyền `targetOrgId`.

#### C. Unit Tests (`minio.service.spec.ts`)
```typescript
describe("uploadFile Tenant Defense", () => {
  it("should throw AppBadRequestException when tenantOrgId is null", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", null)).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
  it("should throw AppBadRequestException when tenantOrgId is undefined", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", undefined)).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
  it("should throw AppBadRequestException when tenantOrgId is empty string", async () => {
    await expect(service.uploadFile(dummyFile, "resumes", "   ")).rejects.toThrow(
      "Tenant organization ID is required",
    );
  });
});
```
Tất cả 3 tests đều **PASS 100%**.

---

## 4. KẾT QUẢ KIỂM THỬ TỔNG THỂ (TEST SUITE VERIFICATION)

### 4.1. Backend Vitest Suite
```
$ pnpm --filter ./backend run test
$ vitest run

Test Files  20 passed (20)
     Tests  160 passed (160)
  Duration  13.72s
```

### 4.2. Frontend Vitest Suite
```
$ pnpm --filter ./frontend run test
$ vitest run

Test Files  21 passed (21)
     Tests  105 passed (105)
  Duration  14.23s
```

**TỔNG CỘNG: 265 / 265 TESTS PASS 100%** (Vượt yêu cầu tối thiểu >255 tests).

---

## 5. TÁI KIỂM CHỨNG RUNTIME (11 PHASE 3 + 10 PHASE 4 EDGE CASES)

### 5.1. 11 Kịch Bản Runtime Phase 3 (Zero-Regression Verification)
| Kịch Bản | Mục Tiêu Kiểm Thử | Trạng Thái | Raw Verdict |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | SSE Tenant Isolation (Cross-tenant event isolation) | **PASS** | Chỉ tenant mục tiêu nhận sự kiện |
| **Scenario 2** | Public Career Page (Chỉ hiển thị job PUBLISHED) | **PASS** | DRAFT/CLOSED/ARCHIVED trả 404 |
| **Scenario 3** | JWT HttpOnly Cookie Authentication | **PASS** | Cookie-based auth hoạt động hoàn hảo |
| **Scenario 4** | Stage State Machine Transitions | **PASS** | Tất cả bước nhảy bất hợp lệ bị 400 |
| **Scenario 5** | Rate Limiting (Redis Throttle) | **PASS** | Vượt ngưỡng trả HTTP 429, không có 500 |
| **Scenario 6** | File Magic Bytes Validation (Spoofing defense) | **PASS** | Script bash giả đuôi .pdf bị chặn ngay |
| **Scenario 7** | Path Traversal Defense trong Filename | **PASS** | Tên file được sanitize sạch ký tự `../` |
| **Scenario 8** | MinIO Tenant Isolation (Bucket namespace) | **PASS** | Key luôn bắt đầu bằng `tenants/<orgId>/` |
| **Scenario 9** | Email Organization Name Dynamic Resolution | **PASS** | Tên tổ chức thật, không có 'ATS Recruitment' |
| **Scenario 10**| Audit Log on Application Deletion | **PASS** | Ghi ActivityLog `APPLICATION_REMOVED` |
| **Scenario 11**| Không Duplicate Prisma Service Registration | **PASS** | Độc bản PrismaService trong Nest context |

### 5.2. 10 Edge Cases Phase 4
| Edge Case | Mô Tả | Trạng Thái Sau Phase 5 |
| :--- | :--- | :--- |
| **Edge 1** | SSE với Token Hết Hạn | **HANDLED** (Trả HTTP 401) |
| **Edge 2** | Public Career Page với slug không tồn tại | **HANDLED** (Trả HTTP 200, danh sách rỗng) |
| **Edge 3** | Cookie + Bearer Conflict (Hai token khác nhau) | **HANDLED** (Cookie ưu tiên theo chuẩn) |
| **Edge 4** | Stage Transition Race (2 PATCH đồng thời) | **RESOLVED / PASS** (1 thắng HTTP 200, 1 thua HTTP 409 `APPLICATION_STAGE_CONFLICT`) |
| **Edge 5** | Rate Limit Bypass qua X-Forwarded-For | **BLOCKED** (Redis Throttler chặn ở 429) |
| **Edge 6** | File PDF thật nhưng bị truncate 50% | **RESOLVED / PASS** (Bị reject với HTTP 400 `UPLOAD_TRUNCATED_FILE`) |
| **Edge 7** | MinIO key khi `tenantOrgId = null` | **RESOLVED / PASS** (Từ chối ngay lập tức với `TENANT_ID_REQUIRED_FOR_UPLOAD`) |
| **Edge 8** | Email Org Name khi Org bị soft-delete | **DOCUMENTED** (Soft-delete edge case) |
| **Edge 9** | ActivityLog khi Candidate bị soft-delete | **DOCUMENTED** (Cascade deletion contract) |
| **Edge 10**| Memory Stability Test (100 requests) | **STABLE** (Heap diff 6.47 MB, không leak) |

---

## 6. PHÁT HIỆN KỸ THUẬT QUAN TRỌNG (DISCOVERED DURING PHASE 5)

Trong quá trình thực hiện Phase 5, một phát hiện kỹ thuật đặc biệt tinh vi đã được tìm thấy và xử lý triệt để:

### ⚠️ Gotcha: Cú Pháp Của `@prisma/orm-postgres` Trong Multi-Predicate Where
* **Triệu chứng:** Ban đầu, khi viết:
  ```typescript
  // ❌ LỖI LOGIC DO JAVASCRIPT EVALUATION:
  this.prisma.db.orm.public.Application.where(
    (a) => a.id.eq(id) && a.stage.eq(oldStage)
  ).update({ ... });
  ```
  Trong JavaScript / TypeScript, toán tử `&&` giữa 2 biểu thức đối tượng `(expr1 && expr2)` sẽ trả về kết quả của `expr2` (`a.stage.eq(oldStage)`), làm **mất hoàn toàn điều kiện `a.id.eq(id)`**! Hậu quả là Prisma sinh ra truy vấn SQL `WHERE stage = oldStage`, vô tình cập nhật bản ghi đầu tiên trong bảng có stage đó thay vì bản ghi cụ thể theo `id`!
* **Giải Pháp Đúng Chuẩn (Senior Pattern):**
  Phải sử dụng phương thức chained `.where()` tuần tự:
  ```typescript
  // ✅ CHUẨN XÁC:
  this.prisma.db.orm.public.Application
    .where((a) => a.id.eq(id))
    .where((a) => a.stage.eq(oldStage))
    .update({ ... });
  ```
  Query Builder của `@prisma/orm-postgres` sẽ thu thập tất cả các bộ lọc và kết hợp lại bằng toán tử `AND` trong mệnh đề SQL: `WHERE "id" = $1 AND "stage" = $2`.

---

## 7. KẾT LUẬN

Phase 5 Hardening đã giải quyết triệt để 100% các điểm yếu được chỉ ra trong báo cáo Phase 4 IV&V:
- **Tính toàn vẹn của State Machine** được bảo vệ bởi Optimistic Locking (HTTP 409).
- **Tính toàn vẹn của tệp tải lên** được kiểm chứng cả đầu (header) và đuôi (trailer %%EOF).
- **Tính cô lập dữ liệu đa người thuê (Multi-Tenant Isolation)** trong MinIO được bảo vệ nghiêm ngặt ở tầng dịch vụ.

Hệ thống HaiHire Platform hiện tại đạt trạng thái ổn định, an toàn và sẵn sàng cho môi trường Production.
