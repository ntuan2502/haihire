# BÁO CÁO XÁC MINH KỸ THUẬT #01: KIẾN TRÚC & TEST COVERAGE
> **Tài liệu gửi DeepSeek & Chủ Dự Án (Single Source of Truth - Technical Verification)**  
> **Dự án:** HaiHire Enterprise ATS Platform  
> **Người lập:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Thời gian:** 2026-10-06  
> **Mã báo cáo:** `DOCS-REP-01`

---

## MỤC LỤC BÁO CÁO
1. [EMAIL ADAPTER] Cấu trúc trừu tượng `EmailProvider` trong `backend/src/email/`
2. [DLQ MONITORING] Tình trạng Prometheus Alert Rules cho BullMQ Queue Size & DLQ Size
3. [TENANT ISOLATION TEST] Test cô lập Multi-Tenant giữa Org A và Org B
4. [PRISMA PIN] Cơ chế khóa chặt phiên bản Prisma 8 RC
5. [SAGA ROLLBACK TEST] Test bù trừ giao dịch phân tán (MinIO Compensating Delete & DLQ Enqueue)
6. [TỔNG KẾT & KHUYẾN NGHỊ] Các hành động kỹ thuật đề xuất cho DeepSeek

---

## 1. [EMAIL ADAPTER] Cấu trúc trừu tượng `EmailProvider` trong `backend/src/email/`

### 1.1 Kết quả khảo sát
- **Có interface trừu tượng không?** **CÓ**. Dự án định nghĩa interface [`IEmailTransporter`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts#L15-L17) tại [`backend/src/email/transporters/transporter.interface.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts).
- **`SIMULATED` là gì?** `SIMULATED` là một **implementation cụ thể** ([`SimulatedTransporter`](file:///c:/Workspaces/haihire/backend/src/email/transporters/simulated.transporter.ts)) implement đầy đủ interface `IEmailTransporter`.
- **Mô hình triển khai:** Áp dụng **Factory Pattern** thông qua class [`EmailTransporterFactory`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts#L7-L21) tại [`backend/src/email/transporters/transporter.factory.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts). Service chính ([`EmailService`](file:///c:/Workspaces/haihire/backend/src/email/email.service.ts)) gọi factory để tạo transporter theo cấu hình động của từng Organization hoặc System settings.

### 1.2 Cây thư mục module Email
```text
backend/src/email/
├── dto/
│   ├── send-email.dto.ts
│   └── update-email-setting.dto.ts
├── transporters/                             # TẦNG TRỪU TƯỢNG VÀ CÁC IMPLEMENTATION
│   ├── transporter.interface.ts              # Interface IEmailTransporter, TransporterConfig
│   ├── transporter.factory.ts                # EmailTransporterFactory.create(config)
│   ├── simulated.transporter.ts              # class SimulatedTransporter implements IEmailTransporter
│   ├── smtp.transporter.ts                   # class SmtpTransporter implements IEmailTransporter
│   ├── resend.transporter.ts                 # class ResendTransporter implements IEmailTransporter
│   └── sendgrid.transporter.ts               # class SendGridTransporter implements IEmailTransporter
├── email.controller.ts                       # REST API Controller
├── email.module.ts                           # NestJS Module
├── email.processor.ts                        # BullMQ Worker xử lý gửi email bất đồng bộ
├── email.service.ts                          # Business logic, ghi nhận emailLogs
├── variable-registry.ts                      # Template context interpolation & Anti-XSS sanitization
└── email.service.spec.ts                     # Unit test suite
```

### 1.3 Dẫn chứng mã nguồn
Trích đoạn interface trong [`transporter.interface.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.interface.ts#L15-L20):
```typescript
export interface IEmailTransporter {
  send(payload: EmailSendPayload): Promise<EmailSendResult>;
}

export interface TransporterConfig {
  provider: "SIMULATED" | "SMTP" | "RESEND" | "SENDGRID" | string;
  fromName: string;
  fromEmail: string;
  smtpHost?: string | null;
  // ...
}
```

Trích đoạn Factory trong [`transporter.factory.ts`](file:///c:/Workspaces/haihire/backend/src/email/transporters/transporter.factory.ts#L7-L21):
```typescript
export class EmailTransporterFactory {
  static create(config: TransporterConfig): IEmailTransporter {
    switch (config.provider) {
      case "SMTP":
        return new SmtpTransporter(config);
      case "RESEND":
        return new ResendTransporter(config);
      case "SENDGRID":
        return new SendGridTransporter(config);
      case "SIMULATED":
      default:
        return new SimulatedTransporter();
    }
  }
}
```

---

## 2. [DLQ MONITORING] Tình trạng Prometheus Alert Rules cho BullMQ & DLQ

### 2.1 Kết quả khảo sát
- **Trong file alert rules:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml) hiện có đúng **7 alert rules**, bao gồm:
  1. `HaiHireBackendDown` (Dòng 4-11): Phát hiện NestJS instance unreachable (>1m).
  2. `HaiHirePostgresDown` (Dòng 13-20): Healthcheck database Postgres thất bại (>30s).
  3. `HaiHireRedisDown` (Dòng 22-29): Ping Valkey/Redis thất bại (>30s).
  4. `HaiHireMinioDown` (Dòng 31-38): Healthcheck MinIO bucket thất bại (>1m).
  5. `HaiHireHighHttp5xxErrorRate` (Dòng 40-47): Tỷ lệ lỗi 5xx vượt 5% trong 5 phút.
  6. `HaiHireHighHttpLatencyP95` (Dòng 49-56): P95 HTTP latency vượt 1000ms trong 3 phút.
  7. `HaiHireHighRateLimit429Rate` (Dòng 58-65): Số lượng request bị rate-limit vượt 50 req/s.
- ⚠️ **KẾT LUẬN QUAN TRỌNG:** **Hiện tại CHƯA CÓ alert rule nào cho BullMQ queue size hoặc Dead-Letter Queue (DLQ) size.**
- **Trong service metrics:** Tại [`backend/src/metrics/metrics.service.ts:L49-51`](file:///c:/Workspaces/haihire/backend/src/metrics/metrics.service.ts#L49-L51), metric `bullmq_queue_depth` chỉ mới được khai báo là **gauge tĩnh với giá trị 0**, chưa kết nối với các queue thực tế (`orphan-cleanup-queue`, `email-queue`).

```typescript
// backend/src/metrics/metrics.service.ts:L49-51
"# HELP bullmq_queue_depth Estimated depth of BullMQ async jobs queue.",
"# TYPE bullmq_queue_depth gauge",
"bullmq_queue_depth 0",
```

---

## 3. [TENANT ISOLATION TEST] Test cô lập Multi-Tenant giữa Org A và Org B

### 3.1 Kết quả khảo sát
Dự án có test suite chuyên biệt mô phỏng 2 organizations (`org-alpha` và `org-beta`) và assert việc chặn truy cập trái phép bằng HTTP 403 (`AppForbiddenException`).

### 3.2 Dẫn chứng file test & các test case cụ thể

#### Tệp chính: [`backend/src/test/tenant-isolation.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/tenant-isolation.spec.ts) (3 test cases)
- **Cấu hình dữ liệu giả lập (Dòng 21-39):**
  - Khởi tạo 2 tổ chức: `org-alpha` ("Alpha Tech Corp") và `org-beta` ("Beta Financials").
  - Khởi tạo 2 admin: `usr-alpha` (thuộc Org Alpha) và `usr-beta` (thuộc Org Beta).
  - Khởi tạo các jobs và candidates thuộc riêng từng tổ chức.
- **Case 1 (Dòng 89-102):** `permits requests when user accesses their own organization resources`
  - User `usr-alpha` gọi tài nguyên với `query: { organizationId: "org-alpha" }` $\rightarrow$ `expect(allowed).toBe(true)`.
- **Case 2 (Dòng 104-137):** `rejects cross-tenant requests with AppForbiddenException when Org Alpha tries to access Org Beta`
  - User `usr-alpha` cố tình gọi API kèm tham số `query: { organizationId: "org-beta" }`.
  - **Assert:** Ném `AppForbiddenException` (HTTP 403).
  ```typescript
  // tenant-isolation.spec.ts:L134-136
  await expect(restrictedGuard.canActivate(crossTenantContext)).rejects.toThrow(
    AppForbiddenException
  );
  ```
- **Case 3 (Dòng 141-146):** `returns empty result set when organizationId is missing or invalid`
  - `candidatesService.findAll(undefined)` trả về `{ data: [], total: 0 }`, không để lộ dữ liệu toàn cục.

#### Các test case cross-tenant ở tầng Service domain:
- **Tệp: [`backend/src/interviews/interviews.service.spec.ts`](file:///c:/Workspaces/haihire/backend/src/interviews/interviews.service.spec.ts):**
  - Dòng 321: `should throw AppForbiddenException when scheduling interview across different organizations`.
  - Dòng 349-350: `should throw AppForbiddenException when accessing an interview belonging to another organization` (gọi `service.findOne("intv-1", "other-org")` $\rightarrow$ assert `AppForbiddenException`).
  - Dòng 368-377: `should throw AppForbiddenException when updating an interview from another organization`.
  - Dòng 380-381: `should throw AppForbiddenException when deleting an interview from another organization`.

---

## 4. [PRISMA PIN] Cơ chế khóa chặt phiên bản Prisma 8 RC

### 4.1 Kết quả khảo sát
Prisma 8 RC được khóa bằng **EXACT VERSION (tuyệt đối không dùng caret `^` hay tilde `~`)** đồng bộ trên cả 3 file quản lý dependency: `package.json`, `pnpm-workspace.yaml`, và `pnpm-lock.yaml`.

### 4.2 Dẫn chứng dòng cụ thể

1. **[`backend/package.json`](file:///c:/Workspaces/haihire/backend/package.json):**
   - Dòng 40: `"@prisma/composer": "0.25.0"` (exact)
   - Dòng 41: `"@prisma/composer-prisma-cloud": "0.25.0"` (exact)
   - Dòng 42: `"@prisma/orm-postgres": "8.0.0-rc.13"` (exact, **không có `^`**)
   - Dòng 69: `"prisma": "8.0.0-rc.19"` (exact, **không có `^`**)

2. **[`pnpm-workspace.yaml`](file:///c:/Workspaces/haihire/pnpm-workspace.yaml):**
   - Dòng 11: `minimumReleaseAgeExclude: - "@prisma/*"` (loại trừ Prisma khỏi cơ chế tự động giữ phiên bản cũ của pnpm)
   - Dòng 26: `minimumReleaseAgeExclude: - prisma@8.0.0-rc.19`
   - Dòng 29: `overrides: "@prisma/cli-engine": "0.6.1"` (ép buộc engine CLI cố định)

3. **[`pnpm-lock.yaml`](file:///c:/Workspaces/haihire/pnpm-lock.yaml):**
   - Dòng 9: `overrides: '@prisma/cli-engine': 0.6.1`
   - Dòng 66-67:
     ```yaml
     '@prisma/orm-postgres':
       specifier: 8.0.0-rc.13
       version: 8.0.0-rc.13(...)
     ```
   - Dòng 142-143:
     ```yaml
     prisma:
       specifier: 8.0.0-rc.19
       version: 8.0.0-rc.19(...)
     ```

---

## 5. [SAGA ROLLBACK TEST] Test bù trừ giao dịch phân tán

### 5.1 Kết quả khảo sát
Cả hai trường hợp kiểm thử (MinIO rollback khi DB lỗi, và Enqueue vào DLQ khi MinIO rollback thất bại) đều đã được cài đặt và kiểm chứng độc lập.

### 5.2 Dẫn chứng file test & các test case cụ thể

#### Kịch bản 1: MinIO upload OK $\rightarrow$ DB write FAIL $\rightarrow$ Assert file MinIO bị xóa
- **File:** [`backend/src/test/transactions.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/transactions.spec.ts)
- **Tên test:** `Failure Scenario & Repro: DB failure triggers transaction rollback AND MinIO compensating delete`
- **Vị trí:** [Dòng 407 đến 461](file:///c:/Workspaces/haihire/backend/src/test/transactions.spec.ts#L407-L461)
- **Cơ chế thực thi:**
  - Dòng 421: Giả lập lỗi ghi database: `Application.create = vi.fn().mockRejectedValue(new Error("Simulated DB Crash on Application write"))`.
  - Dòng 440-449: Gọi `appService.create(...)`, assert việc ném lỗi DB Crash.
  - Dòng 452-456: Assert rollback toàn bộ transaction DB (không có record Candidate hay Application nào bị lưu).
  - Dòng 457-460: **Saga verification:** Assert hàm delete MinIO đã được kích hoạt và xóa đúng file vừa upload:
  ```typescript
  // transactions.spec.ts:L458-460
  expect(minioUploadedFiles.length).toBe(1);
  expect(minioDeletedFiles.length).toBe(1);
  expect(minioDeletedFiles[0]).toBe(minioUploadedFiles[0]);
  ```

#### Kịch bản 2: MinIO delete FAIL $\rightarrow$ Assert job được đẩy vào DLQ với 5 attempts
- **File:** [`backend/src/test/orphan-cleanup.spec.ts`](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts)
- **Tên test:** `Test 2: When compensating delete fails (MinIO down), file is pushed to DLQ queue with 5 attempts`
- **Vị trí:** [Dòng 186 đến 225](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts#L186-L225)
- **Cơ chế thực thi:**
  - Dòng 196-197: Giả lập DB transaction crash, đồng thời MinIO `deleteFile` ném lỗi `503 Service Unavailable`.
  - Dòng 216: Xác nhận đã cố gắng gọi `minio.deleteFile`.
  - Dòng 218-224: **Assert:** Job được đẩy vào `orphanCleanupQueue` với tham số retry 5 lần và backoff exponential:
  ```typescript
  // orphan-cleanup.spec.ts:L218-224
  expect(enqueuedJobs.length).toBe(1);
  expect(enqueuedJobs[0].name).toBe("cleanup");
  expect(enqueuedJobs[0].data.objectName).toBe("tenants/org-1/resumes/test.pdf");
  expect(enqueuedJobs[0].data.reason).toBe("transaction-rollback-compensation-failed");
  expect(enqueuedJobs[0].opts?.attempts).toBe(5);
  expect(enqueuedJobs[0].opts?.backoff?.type).toBe("exponential");
  ```
- **Test bổ trợ (Test 4 - DLQ Terminal Failure):** Tại [Dòng 256-277](file:///c:/Workspaces/haihire/backend/src/test/orphan-cleanup.spec.ts#L256-L277) (`Test 4: Worker terminal failure — after 5 attempts, moves to Dead-Letter Queue (DLQ) & alerts`), kiểm tra sau 5 lần thử lại thất bại thì job chính thức chuyển vào Dead-Letter Queue `dead-letter-cleanup`.

---

## 6. [TỔNG KẾT & KHUYẾN NGHỊ] Action Items cho DeepSeek & Chủ Dự Án

| Hạng mục | Thực trạng codebase | Khuyến nghị hành động (Action Item) |
| :--- | :--- | :--- |
| **Email Transporter** | Đã hoàn thiện Factory Pattern & 4 Transporters (Simulated, SMTP, Resend, SendGrid). | Quyết định provider chính thức cho Production để cấu hình secret keys. |
| **DLQ Monitoring** | `alert-rules.yml` **thiếu** rule giám sát DLQ; `MetricsService` đang hardcode `bullmq_queue_depth 0`. | **CẦN BỔ SUNG:** Viết thêm Prometheus rule `HaiHireBullMqDlqGrowing` và kết nối metrics động từ BullMQ Queue trong `MetricsService`. |
| **Tenant Isolation** | Đã có test guard & service layer (403 `AppForbiddenException`). | Đạt chuẩn bảo mật đa người thuê. Có thể bổ sung thêm test E2E cross-tenant ở tầng HTTP route. |
| **Prisma Pinning** | Khóa cứng exact version `8.0.0-rc.13` & `8.0.0-rc.19` kèm `overrides`. | Giữ nguyên khóa này. Không chạy `pnpm update` cho Prisma trước khi phiên bản GA chính thức ra mắt. |
| **Saga Compensations** | Đã test 100% cả 2 nhánh: rollback thành công và đẩy DLQ khi rollback thất bại. | Cơ chế đã đạt chuẩn Enterprise reliability. |
