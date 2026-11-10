# BÁO CÁO TOÀN DIỆN: KHÁM PHÁ, ĐÁNH GIÁ KIẾN TRÚC & KẾ HOẠCH CẢI THIỆN CODEBASE HAIHIRE

- **Dự án:** HaiHire Enterprise ATS Monorepo (Applicant Tracking System)
- **Đường dẫn Workspace:** `C:\Workspaces\haihire`
- **Vai trò:** Senior Software Engineer / Software Architect
- **Thời gian lập báo cáo:** 2026-11-09
- **Trạng thái Git:** Branch `refactor/architecture-security-improvements` (Working tree hoàn toàn sạch - commit `6aecc11`)
- **Mục tiêu:** Đánh giá trung thực, phân tích sâu tận gốc rễ (root-cause), cung cấp bằng chứng code cụ thể (file:line) và xây dựng lộ trình cải tiến có kiểm soát rủi ro.

---

## MỤC LỤC

1. [GIAI ĐOẠN 1: KHÁM PHÁ VÀ PHÂN TÍCH HỆ THỐNG](#giai-đoạn-1-khám-phá-và-phân-tích-hệ-thống)
   - 1.1. [Dự án này là gì](#11-dự-án-này-là-gì)
   - 1.2. [Tech Stack và Kiến trúc Hệ thống](#12-tech-stack-và-kiến-trúc-hệ-thống)
   - 1.3. [Điểm mạnh đáng ghi nhận (Đáng giữ lại)](#13-điểm-mạnh-đáng-ghi-nhận-đáng-giữ-lại)
   - 1.4. [Điểm yếu và Vấn đề kỹ thuật (Phân loại & Bằng chứng cụ thể)](#14-điểm-yếu-và-vấn-đề-kỹ-thuật)
   - 1.5. [Nợ kỹ thuật (Technical Debt) & Rủi ro khi mở rộng](#15-nợ-kỹ-thuật-technical-debt--rủi-ro-khi-mở-rộng)
2. [GIAI ĐOẠN 2: KẾ HOẠCH CẢI THIỆN & LỘ TRÌNH THỰC THI (ROADMAP)](#giai-đoạn-2-kế-hoạch-cải-thiện--lộ-trình-thực-thi-roadmap)
   - 2.1. [Ma trận ưu tiên lộ trình cải tiến](#21-ma-trận-ưu-tiên-lộ-trình-cải-tiến)
   - 2.2. [Chi tiết các bước thực hiện (Step 1 đến Step 11)](#22-chi-tiết-các-bước-thực-hiện)
   - 2.3. [Phương án Refactor lớn & Giải pháp thay thế nhẹ hơn](#23-phương-án-refactor-lớn--giải-pháp-thay-thế-nhẹ-hơn)
   - 2.4. [Những thành phần TUYỆT ĐỐI KHÔNG NÊN ĐỤNG VÀO](#24-những-thành-phần-tuyệt-đối-không-nên-đụng-vào)
   - 2.5. [Danh sách câu hỏi làm rõ dành cho Product Owner / Tech Lead](#25-danh-sách-câu-hỏi-làm-rõ)
3. [GIAI ĐOẠN 3: NGUYÊN TẮC THỰC THI KHI ĐƯỢC PHÊ DUYỆT](#giai-đoạn-3-nguyên-tắc-thực-thi-khi-được-phê-duyệt)

---

# GIAI ĐOẠN 1: KHÁM PHÁ VÀ PHÂN TÍCH HỆ THỐNG

## 1.1. Dự án này là gì

### Mục đích & Đối tượng người dùng

HaiHire là một nền tảng **Enterprise Applicant Tracking System (ATS)** đa khách hàng (Multi-Tenant SaaS) phục vụ toàn bộ quy trình tuyển dụng từ đầu đến cuối (End-to-End Recruitment Lifecycle).

- **Đối tượng người dùng chính:**
  - **Doanh nghiệp / Nhà tuyển dụng (Tenants):** Quản trị viên nhân sự (ADMIN), Trưởng nhóm tuyển dụng (RECRUITER), Người phỏng vấn (INTERVIEWER), Thành viên xem xét hồ sơ (MEMBER).
  - **Ứng viên (Candidates):** Người tìm việc nộp đơn trực tiếp qua các Career Page công khai, tải lên CV và nhận thông báo kết quả qua email.

### Tính năng chính

1. **Quản trị Tổ chức & Đa Tenant (Multi-Tenant Management):** Tạo tổ chức, mời thành viên qua liên kết mời (Invite Link), chuyển đổi linh hoạt giữa các tổ chức (Tenant Switching), ma trận phân quyền động (Dynamic RBAC Overrides).
2. **Quản lý Vị trí Tuyển dụng (Job Posting & Pipeline):** Tạo bài đăng tuyển dụng, thiết lập quy trình phỏng vấn theo các giai đoạn (Stages: Applied, Screening, Interview, Offer, Hired, Rejected).
3. **Tiếp nhận & Quản lý Đơn Ứng tuyển (Applications & Talent Pool):** Portal nộp đơn cho ứng viên với Multer stream lên MinIO S3, lưu hồ sơ vào Talent Pool dùng chung của tổ chức, hỗ trợ xem trước (preview) và tải tài liệu CV.
4. **Quy trình Phỏng vấn & Đánh giá (Interview & Scorecarding):** Lên lịch phỏng vấn (lịch Google/ICS), gửi thông báo email, tạo phiếu đánh giá ứng viên (Scorecards) với tiêu chí chuẩn hóa.
5. **Hàng đợi & Tác vụ Bất đồng bộ (Queues & Workers):** BullMQ xử lý gửi email hàng loạt (Email Queue với Dead Letter Queue - DLQ), cron job định kỳ quét file mồ côi (Orphan Cleanup).
6. **Báo cáo & Giám sát (Analytics & Monitoring):** Tích hợp Prometheus metrics, Pushgateway, Grafana dashboards, và bảng theo dõi KPI tuyển dụng.

### Luồng hoạt động chính (End-to-End Flow)

```
[Ứng viên / Public Portal]
       │
       ▼  (POST /applications/apply + Multipart Resume)
[NestJS API: ApplicationsController]
       │
       ├─► [Multer Filter] ──► [MinIO S3 Bucket (haihire-resumes)]
       │
       ▼ (ApplicationsSagaService Transaction)
[PostgreSQL Database (Prisma ORM)]
  ├── Tạo/Cập nhật Candidate
  ├── Tạo Application
  ├── Tạo CandidateDocument
  └── Lưu Audit Activity Log
       │
       ▼ (Event / Queue Dispatch)
[BullMQ Worker: EmailQueue] ──► [Resend / SMTP Gateway] ──► [Ứng viên nhận Email xác nhận]
       │
       ▼
[Nhà tuyển dụng / Next.js Web Dashboard]
  ├── Xem Kanban Board theo Job
  ├── Kéo thả chuyển Stage (STAGE_CHANGED)
  ├── Lên lịch Phỏng vấn (Interviews)
  └── Đánh giá Scorecard & Quyết định tuyển dụng
```

---

## 1.2. Tech Stack và Kiến trúc Hệ thống

### Bảng tổng hợp công nghệ (Tech Stack)

| Layer / Thành phần     | Công nghệ / Thư viện chính                      | Ghi chú phiên bản / Đặc tả                                            |
| :--------------------- | :---------------------------------------------- | :-------------------------------------------------------------------- |
| **Monorepo Manager**   | Turborepo, pnpm workspaces                      | Quản lý đa gói (`apps/api`, `apps/web`, `packages/shared`, `scripts`) |
| **Backend API**        | NestJS 12, Node.js 26 (Alpine runtime)          | RESTful API, Class-validator, DTO Pipes, Passport JWT, SSE            |
| **Database & ORM**     | PostgreSQL 16+, Prisma ORM 9                    | Multi-tenant schema với quan hệ Foreign Keys đầy đủ                   |
| **Caching & Queues**   | Redis 7 (Alpine), BullMQ 5                      | Phục vụ Email queue, rate limiting, SSE pub/sub                       |
| **File Storage**       | MinIO (S3-compatible object storage)            | Bucket `haihire-resumes` lưu trữ CV, Cover Letter, chứng chỉ          |
| **Frontend Web**       | Next.js 16 (App Router), React 19, Tailwind CSS | TanStack Query v5, Zustand, Lucide React, i18n đa ngôn ngữ            |
| **Shared Contracts**   | TypeScript Package (`@haihire/shared`)          | Chứa chung DTOs, Enums (Role, Stage), RBAC Permission definitions     |
| **Testing & CI Gates** | Vitest 5+, Playwright, ESLint 9                 | 1268 tests tự động, 19 CI gates static analysis scripts               |

### Sơ đồ Kiến trúc Hệ thống (Mermaid)

```mermaid
graph TB
    subgraph Client Layer
        Web["Next.js 16 Web Dashboard (React 19 + TanStack Query)"]
        PublicPortal["Public Job Portal / Career Page"]
    end

    subgraph Gateway & Reverse Proxy
        Traefik["Reverse Proxy / Nginx / Traefik (TLS Termination)"]
    end

    subgraph Application Layer (NestJS 12 Monolith API)
        AuthMod["AuthModule (JWT, Cookie, TokenVersion)"]
        TenantMod["ActiveTenantGuard & Tenant Middleware"]
        JobMod["JobsModule"]
        AppMod["ApplicationsModule (Query, Stage, Saga, Download)"]
        CandMod["CandidatesModule (Profile, Documents, Crud)"]
        IntvMod["InterviewsModule"]
        OrgMod["OrganizationsModule (Dynamic RBAC)"]
        EmailMod["EmailModule (BullMQ Producer & Consumer)"]
    end

    subgraph Shared & Persistence Layer
        SharedPkg["@haihire/shared (DTOs, Roles, Permissions)"]
        PrismaSvc["PrismaService (PostgreSQL Connection Pool)"]
        Postgres[("PostgreSQL Database (Multi-tenant schema)")]
        RedisDB[("Redis 7 (BullMQ, RateLimit, Cache)")]
        MinIOStorage[("MinIO S3 (haihire-resumes bucket)")]
    end

    subgraph Background Services
        CronWorker["Orphan Cleanup Cron / CLI Scripts"]
        Prometheus["Prometheus & Pushgateway"]
    end

    Web -->|REST API / Cookies| Traefik
    PublicPortal -->|Multipart Upload| Traefik
    Traefik --> Application Layer

    Application Layer -.-> SharedPkg
    Application Layer --> PrismaSvc
    PrismaSvc --> Postgres
    EmailMod --> RedisDB
    AppMod --> MinIOStorage
    CronWorker --> MinIOStorage
    CronWorker --> Postgres
    Application Layer --> Prometheus
```

---

## 1.3. Điểm mạnh đáng ghi nhận (Đáng giữ lại)

1. **Bộ quy chuẩn kiểm soát CI/CD và Static Verification xuất sắc (19 Gates):** Hệ thống sở hữu 19 scripts tự động kiểm tra từ tính đồng bộ biến môi trường (`check-env-sync`), hợp đồng API (`check-api-contract-coverage`), 100% route được bọc `DtoPipe` (`check-dtopipe-coverage`), kiểm soát hardcoded string i18n (`check-error-code-i18n`), cho đến kiểm soát rò rỉ dữ liệu tenant (`check-tenant-scoping`).
2. **Bộ Test Suite phong phú và đáng tin cậy:** Với hơn 1.268 test cases tự động (unit, integration, E2E), độ bao phủ logic nghiệp vụ rất cao, giúp việc refactor có lưới an toàn vững chắc.
3. **Phân tách trách nhiệm ở Domain tầng Application rất rõ ràng:** Module `Applications` được tách thành các service chuyên trách: `ApplicationsQueryService` (chuyên đọc & format), `ApplicationsStageService` (chuyển đổi trạng thái Kanban), `ApplicationsSagaService` (xử lý transaction phức tạp khi nộp đơn), và `ApplicationsDownloadService` (stream file an toàn).
4. **Chia sẻ Type-safe Contract chặt chẽ (`@haihire/shared`):** Toàn bộ DTO, Enum, Error Code và Role Matrix đều được quản lý tại package dùng chung, ngăn chặn tối đa sự sai lệch kiểu dữ liệu giữa Backend và Frontend.
5. **Thiết kế Multi-Tenant có nhận thức sâu sắc về Tenant Scoping:** Các câu lệnh query đều được kiểm tra điều kiện `organizationId`, kết hợp cùng `ActiveTenantGuard` và middleware để đảm bảo không rò rỉ dữ liệu giữa các công ty.

---

## 1.4. Điểm yếu và Vấn đề kỹ thuật

### Bảng tóm tắt các phát hiện (Findings Summary)

| Mã      | Mức độ       | Nhóm vấn đề           | Tóm tắt lỗi                                                       | File & Dòng bằng chứng                                              |
| :------ | :----------- | :-------------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------ |
| **F01** | **CRITICAL** | Data Safety / Storage | Xóa nhầm toàn bộ CV trong MinIO khi DB lỗi/timeout                | `apps/api/src/common/orphan-cleanup.ts:44,96,189`                   |
| **F02** | **HIGH**     | Security / RBAC       | Thiếu phân quyền đọc Application làm lộ toàn bộ PII               | `apps/api/src/applications/applications.controller.ts:39,65,77`     |
| **F03** | **HIGH**     | Security / Auth       | Đổi mật khẩu làm văng session người dùng do không set cookie      | `apps/api/src/auth/auth.controller.ts:107`                          |
| **F04** | **HIGH**     | Security / Token      | Lưu Refresh Token 7 ngày trong `localStorage`, thiếu rotation     | `apps/web/src/context/auth-context.tsx:83`, `auth.service.ts:330`   |
| **F05** | **HIGH**     | Architecture / Pool   | Khai báo lại `PrismaService` tạo 8 Connection Pools độc lập       | `apps/api/src/prisma/prisma.module.ts:4`, 8 domain modules          |
| **F06** | **HIGH**     | DevOps / Docker       | Image Production thiếu mã nguồn `common`, cron job crash          | `apps/api/Dockerfile:54`, `docker-compose.prod.yml:236`             |
| **F07** | **HIGH**     | Database Operations   | Runbook Production hướng dẫn chạy `prisma db push` nguy hiểm      | `docs/runbooks/production-deployment-plan.md:71`                    |
| **F08** | **HIGH**     | Data Consistency      | Ghi audit log ngoài transaction, hardcode danh tính actor         | `applications-saga.service.ts:414`, `stage.service.ts:75`           |
| **F09** | **HIGH**     | DevOps / Config       | Docker Compose để `.env` ghi đè biến môi trường `.env.production` | `docker-compose.prod.yml:142,190,230`                               |
| **F10** | **MEDIUM**   | Multi-tenancy         | `User.organizationId` bị mutate trong DB gây rủi ro TOCTOU        | `apps/api/src/prisma/schema.prisma:178`, `auth.service.ts:245`      |
| **F11** | **MEDIUM**   | Frontend / RBAC       | Hook `useHasPermission` gọi endpoint Admin gây 403 cho Member     | `apps/web/src/hooks/use-has-permission.ts:15`, `org.controller:113` |
| **F12** | **MEDIUM**   | Frontend / Cache      | TanStack Query không xóa cache khi Logout/Switch Tenant           | `apps/web/src/context/auth-context.tsx:101-111`                     |
| **F13** | **MEDIUM**   | Storage / Security    | Iframe Preview chọc thẳng vào bucket MinIO thay vì presigned URL  | `apps/web/src/lib/api/client.ts:24`, `drawer-documents-tab.tsx:107` |
| **F14** | **MEDIUM**   | Performance           | Query `findByJob` không phân trang, client gửi `limit: 1000`      | `applications-query.service.ts:22`, `use-app-queries.ts:40`         |
| **F15** | **MEDIUM**   | CI / Code Quality     | Gate scripts dùng Regex lookahead nông, dễ lọt vi phạm            | `scripts/check-tenant-scoping.ts:25`, `check-dtopipe.ts`            |
| **F16** | **MEDIUM**   | Code Quality          | Constructor tách đôi (bifurcated) trong `CandidatesService`       | `apps/api/src/candidates/candidates.service.ts:30-55`               |
| **F17** | **MEDIUM**   | Dependencies          | Dependency `vite@8.3.1` dính CVE và cảnh báo `fast-uri`           | `pnpm-lock.yaml:403,9005`                                           |
| **F18** | **MEDIUM**   | Data Consistency      | Upload file MinIO mồ côi nếu tạo bản ghi DB thất bại              | `applications-saga.service.ts:320`                                  |
| **F19** | **LOW**      | Documentation         | Thống kê số lượng test và gate trong tài liệu bị lệch thực tế     | `README.md`, `docs/PROJECT_METRICS.md`                              |

---

### Chi tiết bằng chứng từng lỗi kỹ thuật

#### [F01] CRITICAL: Nguy cơ xóa nhầm toàn bộ CV ứng viên trong MinIO khi cơ sở dữ liệu gặp sự cố

- **Vị trí code:** `apps/api/src/common/orphan-cleanup.ts` (dòng 44, 96-105, 180-195)
- **Cơ chế lỗi:**
  Hàm `cleanupOrphans()` truy vấn cơ sở dữ liệu để lấy danh sách file đang được tham chiếu:
  ```typescript
  // apps/api/src/common/orphan-cleanup.ts:96
  try {
    const candidateDocs = activeDb.candidateDocument
      ? await activeDb.candidateDocument.findMany({ select: { url: true } })
      : ...;
    for (const doc of candidateDocs) { ... activeReferencedObjectNames.add(objName); }
  } catch (err) {
    console.warn("Could not query CandidateDocument references:", err);
  }
  ```
  Nếu PostgreSQL bị chậm, rớt kết nối hoặc lock table trong thời điểm cron chạy, khối `catch` chỉ ghi log `console.warn` mà **không dừng hàm**. Tập hợp `activeReferencedObjectNames` vẫn rỗng (`Set(0)`).
  Tiếp sau đó (dòng 180-195), script duyệt qua tất cả objects trong MinIO: bất kỳ file nào cũ hơn `thresholdDays` (mặc định 30 ngày) mà không có trong tập rỗng kia đều bị coi là "file mồ côi" và bị gọi `minioClient.removeObject(bucketName, obj.name)`!
- **Hậu quả:** Mất dữ liệu vĩnh viễn (Data Loss) toàn bộ CV gốc của ứng viên trên môi trường Production mà không thể phục hồi từ MinIO.

#### [F02] HIGH: Thiếu Guard RBAC trên các endpoint đọc Application làm lộ toàn bộ dữ liệu ứng viên

- **Vị trí code:** `apps/api/src/applications/applications.controller.ts:39, 65, 77`
- **Cơ chế lỗi:**
  ```typescript
  // applications.controller.ts:77
  @Get(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.applicationsService.findOne(id, req?.user?.organizationId);
  }
  ```
  Trong khi các phương thức ghi (`updateStage`, `documentUpload`, `delete`) đều được bảo vệ nghiêm ngặt bởi `@UseGuards(..., RolesGuard)` và `@RequirePermission(...)`, thì 3 endpoint đọc quan trọng nhất:
  - `GET /applications` (`findAll`)
  - `GET /applications/job/:jobId` (`findByJob`)
  - `GET /applications/:id` (`findOne`)
    hoàn toàn **không có `RolesGuard`** và **không yêu cầu quyền `application:view` hay `candidate:view`**.
- **Hậu quả:** Bất kỳ nhân viên nào trong công ty có tài khoản (kể cả role `MEMBER` hay cộng tác viên mới vào) đều có thể gọi API để lấy toàn bộ danh sách ứng viên, thông tin liên lạc cá nhân (PII), mức lương mong muốn, ghi chú nhạy cảm của phỏng vấn viên và đường dẫn CV.

#### [F03] HIGH: Đổi mật khẩu làm văng session người dùng do không cập nhật HttpOnly Cookie

- **Vị trí code:** `apps/api/src/auth/auth.controller.ts:107` so với `auth.service.ts:361`
- **Cơ chế lỗi:**
  Khi user đổi mật khẩu, `authService.changePassword` tăng `user.tokenVersion` trong cơ sở dữ liệu để vô hiệu hóa tất cả token cũ và trả về `accessToken` + `refreshToken` mới.
  Tuy nhiên, trong `auth.controller.ts`:
  ```typescript
  // auth.controller.ts:107
  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(ChangePasswordDto)) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
  ```
  Endpoint này thiếu `@Res({ passthrough: true }) res: Response` và không gọi `setAuthCookie(res, ...)` giống như các hàm `login`, `register`, `switchTenant`.
- **Hậu quả:** Trình duyệt vẫn lưu cookie `haihire_token` cũ (mang `tokenVersion` cũ). Ngay request kế tiếp, `jwt.strategy.ts:25` kiểm tra thấy lệch `tokenVersion` và trả về mã lỗi `401 Unauthorized`, khiến người dùng bị đẩy ra trang đăng nhập ngay lập tức sau khi đổi mật khẩu thành công.

#### [F04] HIGH: Refresh Token được lưu trong `localStorage` và thiếu cơ chế Single-Use Rotation

- **Vị trí code:** `apps/web/src/context/auth-context.tsx:83, 285` và `apps/api/src/auth/auth.service.ts:330`
- **Cơ chế lỗi:**
  Frontend lưu `refreshToken` trực tiếp vào `localStorage.setItem(REFRESH_TOKEN_KEY, ...)`. Phía Backend, hàm `refreshToken` chỉ đơn thuần ký một JWT mới có thời hạn 7 ngày nếu JWT cũ hợp lệ, không hề lưu trạng thái token vào DB/Redis, không có token family, và không thu hồi token cũ ngay khi đã sử dụng (Refresh Token Rotation - RTR).
- **Hậu quả:** Nếu ứng dụng web dính lỗi XSS hoặc extension độc hại trên trình duyệt, kẻ tấn công có thể lấy cắp refresh token và âm thầm tạo access token mới trong suốt 7 ngày mà nạn nhân không hề hay biết.

#### [F05] HIGH: Khai báo lại `PrismaService` tạo ra 8 Connection Pools độc lập làm cạn kiệt tài nguyên DB

- **Vị trí code:** `apps/api/src/prisma/prisma.module.ts:4` và 8 domain modules (`activities`, `applications`, `auth`, `candidates`, `email`, `interviews`, `jobs`, `organizations`)
- **Cơ chế lỗi:**
  `PrismaModule` đã được gắn decorator `@Global()` và export `PrismaService`. Tuy nhiên, trong mảng `providers` của 8 module chức năng trên, `PrismaService` lại tiếp tục được khai báo trực tiếp.
  Trong NestJS, việc khai báo lại một provider đã export từ Global Module sẽ khiến container tạo ra **một instance mới** cho từng module đó.
  Mỗi instance `PrismaService` khi khởi tạo đều chạy:
  ```typescript
  // prisma.service.ts:16
  const pool = new Pool({ connectionString, max: 20 });
  ```
- **Hậu quả:** Số lượng kết nối tối đa có thể mở tới PostgreSQL là `8 x 20 = 160 connections`, dễ dàng vượt qua giới hạn mặc định `max_connections = 100` của PostgreSQL, dẫn đến lỗi `FATAL: sorry, too many clients already`. Ngoài ra, ngữ cảnh AsyncLocalStorage (ALS) của tenant có nguy cơ bị phân mảnh giữa các instance.

#### [F06] HIGH: Dockerfile Runner Stage thiếu mã nguồn `common` khiến Container Cron mồ côi bị Crash

- **Vị trí code:** `apps/api/Dockerfile:54` và `docker-compose.prod.yml:236`
- **Cơ chế lỗi:**
  Trong `apps/api/Dockerfile` (Stage 2 runner), chỉ có thư mục `src/prisma` được copy:
  ```dockerfile
  COPY --chown=node:node --from=builder /app/apps/api/src/prisma ./apps/api/src/prisma
  ```
  Thư mục `apps/api/src/common` hoàn toàn **không được copy**.
  Trong khi đó, container cron `haihire-prod-orphan-cleanup` trong `docker-compose.prod.yml` chạy lệnh:
  ```bash
  node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts
  ```
  File `scripts/cleanup-orphan-minio.ts:4` lại import trực tiếp:
  ```typescript
  import { cleanupOrphans } from "../apps/api/src/common/orphan-cleanup";
  ```
- **Hậu quả:** Ngay khi cron kích hoạt lúc 04:00 sáng, tiến trình lập tức crash với lỗi `MODULE_NOT_FOUND`, khiến tính năng dọn dẹp file mồ côi trên production hoàn toàn tê liệt.

#### [F07] HIGH: Runbook Production chỉ định lệnh `prisma db push` gây nguy cơ mất dữ liệu schema

- **Vị trí code:** `docs/runbooks/production-deployment-plan.md:71` và `apps/api/package.json:14`
- **Cơ chế lỗi:**
  Runbook hướng dẫn người vận hành chạy `pnpm db:update`. Trong `apps/api/package.json:14`:
  ```json
  "db:update": "prisma db push --schema src/prisma/schema.prisma"
  ```
  `prisma db push` chỉ dành cho môi trường phát triển cục bộ (prototyping). Lệnh này không theo dõi bảng lịch sử di chuyển `_prisma_migrations`, không hỗ trợ rollback, và sẵn sàng drop cột/bảng nếu phát hiện thay đổi schema không tương thích ngược mà không yêu cầu phê duyệt di chuyển.
- **Hậu quả:** Rủi ro nghiêm trọng làm mất mát dữ liệu sản xuất khi cập nhật cấu trúc bảng. Tiêu chuẩn bắt buộc cho Production là `prisma migrate deploy`.

#### [F08] HIGH: Ghi Audit Activity Log nằm ngoài Transaction và hardcode danh tính người thực hiện

- **Vị trí code:** `apps/api/src/applications/services/applications-saga.service.ts:414` và `applications-stage.service.ts:75`
- **Cơ chế lỗi:**
  Hành động đổi stage hoặc submit hồ sơ được thực hiện trong DB transaction, nhưng lệnh ghi log:
  ```typescript
  // applications-stage.service.ts:75
  const updated = await this.query.findOne(id, tenantOrgId);
  await this.activitiesService.createActivity({
    ...,
    actorName: "HR Team",
    actorRole: "ADMIN"
  });
  ```
  lại nằm ngoài transaction và gán cứng danh tính là `"HR Team"` / `"ADMIN"`.
- **Hậu quả:** Nếu server gặp sự cố mạng hoặc tắt nguồn ngay sau khi commit đổi stage nhưng trước khi ghi activity, hệ thống sẽ bị mất dấu vết kiểm toán. Đồng thời, lịch sử bị sai lệch khi một `RECRUITER` hoặc `INTERVIEWER` thao tác lại bị ghi nhận là `ADMIN`.

#### [F09] HIGH: Thứ tự khai báo trong Docker Compose để file `.env` ghi đè cấu hình bí mật Production

- **Vị trí code:** `docker-compose.prod.yml:142, 190, 230`
- **Cơ chế lỗi:**
  Trong file compose production:
  ```yaml
  env_file:
    - path: ./.env.production
      required: false
    - path: ./.env
      required: false
  ```
  Theo quy tắc nạp biến của Docker Compose, file nằm bên dưới sẽ ghi đè các giá trị của file nằm bên trên.
- **Hậu quả:** Nếu trên server production vô tình tồn tại một file `.env` (thường chứa mật khẩu mặc định lúc dev), các cấu hình bí mật trong `.env.production` (như secret key, password DB, MinIO credentials) sẽ bị ghi đè hoàn toàn bởi giá trị dev.

---

## 1.5. Nợ kỹ thuật (Technical Debt) & Rủi ro khi mở rộng

1. **Khả năng phình to bộ nhớ (Memory Spikes / OOM) từ các câu truy vấn không giới hạn:**
   - Hàm `findByJob()` (`applications-query.service.ts:22`) không hỗ trợ phân trang; khi một vị trí có 5.000 ứng viên nộp hồ sơ, toàn bộ bản ghi kèm thông tin candidate và document được load hết vào RAM.
   - Frontend gửi tham số `limit: 1000` (`use-application-queries.ts:40`) để vẽ Kanban board, trong khi backend không thiết lập chặn trần (`Math.min(limit, 100)`).
2. **Cơ chế phân quyền động phía Frontend bị tê liệt đối với Non-Admin:**
   - Hook `useHasPermission()` trên giao diện liên tục gọi endpoint `GET /organizations/my/roles/permissions` (`use-organization-queries.ts:184`), nhưng endpoint này yêu cầu quyền `org:manage_roles` (`organizations.controller.ts:111`).
   - Kết quả: Các tài khoản vai trò `MEMBER`, `INTERVIEWER` liên tục nhận lỗi `403 Forbidden` ngầm trong Network tab và không áp dụng được ma trận quyền tùy biến.
3. **Lưu vết và rò rỉ dữ liệu giữa các phiên làm việc (Cross-Tenant Cache Bleed):**
   - Hàm `logout()` (`auth-context.tsx:101`) chỉ xóa `localStorage` và cookie mà không gọi `queryClient.clear()` của TanStack Query.
   - Khi chuyển đổi qua lại giữa các Organization hoặc nhiều người dùng dùng chung một máy tính, dữ liệu ứng viên của tổ chức cũ vẫn nằm trong bộ nhớ cache của trình duyệt và có thể hiển thị chớp nhoáng (flash state) trước khi query mới hoàn tất.
4. **Mô hình dữ liệu `User.organizationId` có nguy cơ TOCTOU (Time-of-Check to Time-of-Use):**
   - Model `User` lưu trực tiếp trường `organizationId String?` song song với bảng quan hệ nhiều-nhiều `OrganizationMember`. Mỗi khi user đổi tenant, bản ghi `User` bị cập nhật lại trường này. Nếu người dùng mở 2 tab làm việc trên 2 tổ chức khác nhau, các request đồng thời có thể ghi đè lẫn nhau và dẫn đến sai lệch phạm vi tenant.

---

# GIAI ĐOẠN 2: KẾ HOẠCH CẢI THIỆN & LỘ TRÌNH THỰC THI (ROADMAP)

## 2.1. Ma trận ưu tiên lộ trình cải tiến

Lộ trình được phân bổ theo 2 giai đoạn:

- **Giai đoạn A (Steps 1 – 6):** Các sửa lỗi khẩn cấp, bảo mật cao, tác động trực tiếp đến an toàn dữ liệu và tính ổn định của hệ thống nhưng có phạm vi hẹp, rủi ro thấp. **Đề xuất thực hiện ngay sau khi được phê duyệt.**
- **Giai đoạn B (Steps 7 – 11):** Các cải tiến kiến trúc mang tính chiến lược, cần xác nhận các ràng buộc thực tế từ phía Product / Infra trước khi triển khai.

| Bước        | Hạng mục / Mục tiêu                                                  | Mức độ     | Effort |   Rủi ro   | Tác động                                          |
| :---------- | :------------------------------------------------------------------- | :--------- | :----: | :--------: | :------------------------------------------------ |
| **Step 1**  | Vá F01: Chốt chặn an toàn cho Orphan Cleanup (Abort on DB error)     | Critical   | **S**  |  Rất thấp  | Triệt tiêu nguy cơ xóa nhầm CV trên MinIO         |
| **Step 2**  | Vá F06 & F09: Khắc phục Dockerfile Runner & Thứ tự `env_file`        | High       | **S**  |  Rất thấp  | Đảm bảo cron chạy thành công, bảo vệ secrets      |
| **Step 3**  | Vá F02: Bổ sung `RolesGuard` & `@RequirePermission` cho Applications | High       | **S**  |    Thấp    | Khóa chặt lỗ hổng rò rỉ PII ứng viên              |
| **Step 4**  | Vá F03: Cập nhật HttpOnly cookie trong `changePassword`              | High       | **S**  |  Rất thấp  | Ngăn chặn lỗi văng session sau khi đổi mật khẩu   |
| **Step 5**  | Vá F05: Loại bỏ khai báo trùng `PrismaService` tại 8 modules         | High       | **M**  |    Thấp    | Khắc phục cạn kiệt connection pool DB             |
| **Step 6**  | Vá F07: Chuẩn hóa Runbook & Scripts sang `prisma migrate deploy`     | High       | **S**  |    Thấp    | Đảm bảo an toàn cấu trúc cơ sở dữ liệu production |
| **Step 7**  | Vá F04: Tái cấu trúc Refresh Token sang HttpOnly Cookie + Rotation   | High       | **M**  | Trung bình | Chống đánh cắp token qua XSS                      |
| **Step 8**  | Vá F11: Chuẩn hóa quyền đọc ma trận Role Permissions cho Member      | Medium     | **M**  |    Thấp    | Chấm dứt lỗi 403 ngầm, kích hoạt dynamic RBAC     |
| **Step 9**  | Vá F12 & F13: Tenant-aware Query Cache & Secure Document Preview     | Medium     | **M**  | Trung bình | Xóa sạch rò rỉ cache UI và bảo mật tải file       |
| **Step 10** | Vá F14: Thiết lập trần Pagination & Phân trang cho Kanban            | Medium     | **L**  | Trung bình | Chống tràn RAM và nghẽn CPU khi dữ liệu lớn       |
| **Step 11** | Vá F10, F15, F16, F17, F18, F19: Dọn dẹp nợ kỹ thuật tồn đọng        | Medium/Low | **M**  |    Thấp    | Nâng cao chất lượng mã nguồn & tài liệu           |

---

## 2.2. Chi tiết các bước thực hiện

### [Step 1] Khắc phục chốt chặn an toàn cho MinIO Orphan Cleanup (F01)

- **Mục tiêu:** Đảm bảo hàm `cleanupOrphans` không bao giờ tiến hành xóa file trên MinIO nếu việc thu thập danh sách tham chiếu từ cơ sở dữ liệu gặp lỗi.
- **Files bị ảnh hưởng:** `apps/api/src/common/orphan-cleanup.ts`, `apps/api/src/common/orphan-cleanup.spec.ts`
- **Công sức ước tính:** **S** (Small - 1 đến 2 giờ)
- **Rủi ro:** Rất thấp. Logic dọn dẹp chỉ xóa khi có xác nhận 100% DB query thành công.
- **Cách kiểm chứng:**
  - Viết unit test giả lập `activeDb.candidateDocument.findMany` throw `Error("DB connection timeout")`.
  - Khẳng định `cleanupOrphans()` lập tức ném ngoại lệ hoặc trả về `aborted: true`, số lượng file xóa là `0`, và không có bất kỳ lệnh `minioClient.removeObject` nào được gọi.

### [Step 2] Sửa lỗi Dockerfile Runner Stage và thứ tự biến môi trường Compose (F06, F09)

- **Mục tiêu:** Đưa thư mục `src/common` vào Dockerfile runner stage và đảo ngược thứ tự `env_file` để ưu tiên `.env.production`.
- **Files bị ảnh hưởng:** `apps/api/Dockerfile`, `docker-compose.prod.yml`
- **Công sức ước tính:** **S** (Small - 1 giờ)
- **Rủi ro:** Rất thấp.
- **Cách kiểm chứng:**
  - Kiểm tra cú pháp Dockerfile và docker-compose.
  - Chạy `node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts --dry-run` trong môi trường tương đương container để xác nhận import thành công.

### [Step 3] Bổ sung Guard và Quyền truy cập cho các Endpoint đọc Application (F02)

- **Mục tiêu:** Ngăn chặn việc người dùng không có thẩm quyền truy cập danh sách và chi tiết hồ sơ ứng viên.
- **Files bị ảnh hưởng:** `apps/api/src/applications/applications.controller.ts`, `apps/api/src/applications/applications.controller.spec.ts`
- **Công sức ước tính:** **S** (Small - 2 giờ)
- **Rủi ro:** Thấp (Cần đảm bảo role `RECRUITER` và `ADMIN` giữ nguyên quyền đọc, role `INTERVIEWER` chỉ xem các đơn được giao).
- **Cách kiểm chứng:**
  - Chạy test controller với mock role `MEMBER` gọi `GET /applications/:id` -> Nhận `403 Forbidden`.
  - Chạy test với mock role `ADMIN` và `RECRUITER` -> Nhận `200 OK`.

### [Step 4] Đồng bộ cập nhật HttpOnly Cookie khi Đổi mật khẩu (F03)

- **Mục tiêu:** Giữ trạng thái đăng nhập liên tục cho người dùng sau khi đổi mật khẩu thành công.
- **Files bị ảnh hưởng:** `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.controller.spec.ts`
- **Công sức ước tính:** **S** (Small - 1 giờ)
- **Rủi ro:** Rất thấp.
- **Cách kiểm chứng:**
  - Gọi `POST /auth/change-password` và kiểm tra response header `Set-Cookie` chứa `haihire_token` mới với payload mang `tokenVersion` đã cập nhật.
  - Gọi tiếp `GET /auth/me` bằng cookie mới -> Nhận `200 OK`.

### [Step 5] Chuẩn hóa Singleton cho `PrismaService` tại 8 Feature Modules (F05)

- **Mục tiêu:** Loại bỏ hoàn toàn việc tạo 8 connection pool riêng biệt, đưa về đúng chuẩn `@Global()` Singleton của NestJS.
- **Files bị ảnh hưởng:**
  - `apps/api/src/activities/activities.module.ts`
  - `apps/api/src/applications/applications.module.ts`
  - `apps/api/src/auth/auth.module.ts`
  - `apps/api/src/candidates/candidates.module.ts`
  - `apps/api/src/email/email.module.ts`
  - `apps/api/src/interviews/interviews.module.ts`
  - `apps/api/src/jobs/jobs.module.ts`
  - `apps/api/src/organizations/organizations.module.ts`
- **Công sức ước tính:** **M** (Medium - 2 đến 3 giờ)
- **Rủi ro:** Thấp (Xóa `PrismaService` khỏi mảng `providers` của 8 module; NestJS DI tự động inject instance từ `@Global() PrismaModule`).
- **Cách kiểm chứng:**
  - Chạy toàn bộ test suite của backend (`pnpm --filter api test`).
  - Kiểm tra log khởi động NestJS đảm bảo `PrismaService` chỉ khởi tạo duy nhất 1 lần (1 pool).

### [Step 6] Chuẩn hóa Quy trình Di chuyển Cơ sở dữ liệu Production (F07)

- **Mục tiêu:** Thay thế hoàn toàn lệnh `prisma db push` bằng `prisma migrate deploy` trong các tài liệu vận hành và script triển khai.
- **Files bị ảnh hưởng:** `docs/runbooks/production-deployment-plan.md`, `package.json`, `apps/api/package.json`
- **Công sức ước tính:** **S** (Small - 1 giờ)
- **Rủi ro:** Thấp.
- **Cách kiểm chứng:**
  - Kiểm tra lệnh `pnpm db:status` và `pnpm db:migrate` hoạt động chính xác với thư mục `src/prisma/migrations`.

---

## 2.3. Phương án Refactor lớn & Giải pháp thay thế nhẹ hơn

### Refactor Lớn 1: Kiến trúc Lưu trữ & Luân chuyển Token (F04)

- **Tại sao cần:** Lưu Refresh Token trong `localStorage` vi phạm tiêu chuẩn bảo mật OWASP, có nguy cơ bị đánh cắp tài khoản vĩnh viễn qua XSS.
- **Trạng thái mong muốn (Target State):**
  - Cả Access Token và Refresh Token đều được lưu trong HttpOnly, Secure, SameSite Cookie.
  - Bảng `user_refresh_tokens` trong PostgreSQL hoặc Redis lưu trữ hash của refresh token.
  - Áp dụng Single-Use Refresh Token Rotation: mỗi khi dùng refresh token, hủy token cũ và phát hành token mới. Nếu một token cũ đã dùng bị gửi lại, hệ thống nhận diện tấn công (Replay Attack) và lập tức vô hiệu hóa toàn bộ session family của user đó.
- **Phương án thay thế nhẹ hơn (Lighter Alternative):**
  - Giữ cơ chế JWT hiện tại nhưng chuyển Refresh Token từ `localStorage` sang lưu hoàn toàn trong HttpOnly Cookie (`haihire_refresh_token`).
  - Không cần tạo thêm bảng Redis/DB mới ngay lập tức; quản lý việc thu hồi tập trung thông qua việc tăng `tokenVersion` trong bảng `User`.

### Refactor Lớn 2: Tái cấu trúc Truy vấn & Hiển thị Kanban Board Ứng viên (F14)

- **Tại sao cần:** `findByJob` tải toàn bộ ứng viên không giới hạn số lượng vào RAM. Bảng Kanban phía web render toàn bộ thẻ ứng viên dẫn đến giật lag giao diện và nghẽn CPU khi số lượng hồ sơ vượt quá 500.
- **Trạng thái mong muốn (Target State):**
  - Tách API Kanban thành endpoint chuyên dụng hỗ trợ phân trang theo từng cột Stage (`GET /applications/kanban?jobId=...&stage=SCREENING&page=1&limit=20`).
  - Phía Web áp dụng Virtualized Columns (như `@tanstack/react-virtual`) kết hợp Infinite Scroll cho từng cột của Kanban board.
- **Phương án thay thế nhẹ hơn (Lighter Alternative):**
  - Đặt giới hạn trần cứng cáp phía backend: `const limit = Math.min(options?.limit || 20, 100)`.
  - Phía Frontend, nếu vượt quá 100 ứng viên mỗi job, hiển thị thanh phân trang chuyển trang thay vì render toàn bộ cùng một lúc.

---

## 2.4. Những thành phần TUYỆT ĐỐI KHÔNG NÊN ĐỤNG VÀO

1. **Gói chia sẻ `@haihire/shared` (Không sửa đổi các DTO và Enum cốt lõi):**
   - _Lý do:_ Đây là nguồn chân lý (Single Source of Truth) đang được liên kết chặt chẽ với cả Backend, Frontend và 19 static gates. Bất kỳ thay đổi cấu trúc nào tại đây sẽ gây hiệu ứng domino làm hỏng toàn bộ build và tests.
2. **Các Model cốt lõi trong `schema.prisma` (`Job`, `Application`, `Candidate`, `Interview`):**
   - _Lý do:_ Cấu trúc quan hệ Foreign Key đang rất ổn định. Không được tự ý xóa hoặc đổi tên các cột hiện có nếu không có kế hoạch migration tương thích ngược qua nhiều phiên bản.
3. **19 Static Verification Scripts trong thư mục `scripts/`:**
   - _Lý do:_ Đây là chốt chặn bảo vệ tính toàn vẹn của mã nguồn. Không được hạ tiêu chuẩn kiểm tra (relax gates) chỉ để vượt qua CI.
4. **Hệ thống từ điển đa ngôn ngữ i18n (`apps/web/src/i18n/`):**
   - _Lý do:_ Đang hoạt động hoàn hảo với cơ chế kiểm tra 2 chiều nghiêm ngặt (zero hardcoded strings).

---

## 2.5. Danh sách câu hỏi làm rõ dành cho Product Owner / Tech Lead

Trước khi triển khai Giai đoạn B (Steps 7 – 11), kính đề nghị giải đáp các câu hỏi kỹ thuật sau:

1. **Về chiến lược quản lý Session và Refresh Token:**
   - Đội ngũ muốn duy trì Refresh Token trong `localStorage` để phục vụ các client khác (như mobile app/CLI trong tương lai) hay đồng ý chuyển hẳn sang lưu trong HttpOnly Cookie để đạt chuẩn bảo mật cao nhất?
   - Hệ thống đã sẵn sàng hạ tầng Redis cluster để lưu whitelist/blacklist cho Refresh Token Rotation chưa?
2. **Về quyền hạn của Role `MEMBER` đối với Ma trận Quyền:**
   - Người dùng có role `MEMBER` có được phép xem ma trận quyền của tổ chức (ở chế độ Read-Only) để giao diện hiển thị đúng các nút chức năng hay không?
3. **Về tính năng Xem trước Hồ sơ (Document Preview):**
   - MinIO trên môi trường thật có nằm sau mạng nội bộ an toàn (Private Network) không? Nếu có, hệ thống có muốn chuyển cơ chế preview sang sử dụng Presigned URL ngắn hạn (5 phút) có xác thực quyền từ Backend không?
4. **Về hành vi khi Người dùng thuộc Nhiều Tổ chức (Multi-Tenant User):**
   - Tổ chức hiện tại (Active Tenant) nên được quyết định 100% dựa trên Session JWT của request hay cần tiếp tục lưu trường `organizationId` trong bảng `User` làm mặc định?

---

# GIAI ĐOẠN 3: NGUYÊN TẮC THỰC THI KHI ĐƯỢC PHÊ DUYỆT

Sau khi nhận được sự đồng ý của bạn đối với kế hoạch trên, quá trình sửa code sẽ tuân thủ nghiêm ngặt các nguyên tắc:

1. **Làm việc trên branch riêng:** Đang ở branch `refactor/architecture-security-improvements`, cam kết không commit trực tiếp vào `main`.
2. **Kiểm thử trước khi sửa (Test-Driven Safety):** Đảm bảo test case hiện tại pass 100% trước khi chạm vào logic; bổ sung characterization test cho mọi trường hợp chưa có test bao phủ.
3. **Commit nguyên tử (Atomic Commits):** Mỗi bước (Step) là một commit nhỏ gọn, độc lập, có thể review và revert dễ dàng kèm commit message chuẩn Conventional Commits.
4. **Xác minh liên tục:** Sau mỗi bước, chạy tự động kiểm tra `pnpm typecheck`, `pnpm lint` và `pnpm test` để đảm bảo không làm gãy bất kỳ tính năng nào.
5. **Giữ nguyên hợp đồng ngoại vi:** Không thay đổi API Contract bên ngoài và giữ working tree luôn trong tầm kiểm soát.

---

_Báo cáo được xuất tự động vào hệ thống tài liệu: `docs/reports/codebase-discovery-and-improvement-report.md`._
