# PHASE 15B: HARSH ARCHITECTURAL AUDIT REPORT
**Tài liệu:** `docs/audits/phase-15b-harsh-architectural-report.md`  
**Dự án:** HaiHire Enterprise ATS Platform  
**Vai trò:** Senior Software Architect + Code Reviewer Khắt Khe (20+ năm kinh nghiệm)  
**Ngày thực hiện:** 02/10/2026  
**Nguyên tắc:** Nói thẳng, không nể nang, 100% dựa trên bằng chứng kỹ thuật (evidence-based). Không đọc `docs/audits/` trước Part K.

---

## 1. EXECUTIVE SUMMARY

### 1.1. Đánh giá tổng thể (Overall Verdict)
```
╔═════════════════════════════════════════════════════════════════════════════╗
║                                                                             ║
║                     ARCHITECTURAL VERDICT: [ B ]                            ║
║                                                                             ║
║       "OK VỀ TÍNH NĂNG NHƯNG CẦN REFACTOR 25 - 30% MỚI BẢO TRÌ ĐƯỢC"        ║
║                                                                             ║
║  Codebase chạy được, compile sạch, UI mượt, nhưng chứa đựng sự mục ruỗng     ║
║  kiến trúc nghiêm trọng: Fat God-Services, God-Components 1,700 dòng,       ║
║  0 database transactions, 100% SPA-mode trên Next.js App Router,             ║
║  và hệ thống test tự viết lại SQL engine trong mock.                       ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

- **A) Production-grade, có thể scale:** KHÔNG ĐẠT. Hệ thống không thể scale an toàn khi thiếu database transactions và 100% Client Components.
- **B) OK nhưng cần refactor 20-30%:** **CHỌN (B)**. Codebase có nền tảng TypeScript strict, UI chỉn chu, schema rõ ràng, nhưng bị phân mảnh cấu trúc và dồn nén logic vào các file khổng lồ.
- **C) Cần refactor 50%+ mới dùng được:** Không đến mức này vì luồng nghiệp vụ end-to-end hoạt động tốt.
- **D) Đập đi xây lại:** Không cần thiết. Việc đập đi xây lại là lãng phí công sức khi các module core (Auth, MinIO, Sourcing, RBAC) đã chạy ổn.

### 1.2. TOP 10 Vấn đề Nghiêm trọng Nhất (Critical Findings)
1. **ZERO Database Transactions (Toàn bộ Backend):** Toàn bộ `backend/src` có đúng **0** transaction (`$transaction`). Luồng nộp đơn, tạo ứng viên, tải file lên MinIO, cập nhật link nguồn và ghi log diễn ra tuần tự rời rạc. Nếu bước 4 lỗi, ứng viên bị "treo" (orphan records) trong DB và file rác tồn tại vĩnh viễn trên MinIO.
2. **God-Components & God-Services khổng lồ (>1,000 dòng):**
   - Frontend: `applications-data-table.tsx` dài **1,707 dòng**! `job-list.tsx` dài **957 dòng**!
   - Backend: `organizations.service.ts` dài **1,346 dòng**! `applications.service.ts` dài **1,152 dòng**! `sourcing.service.ts` dài **1,092 dòng**!
   - Tuyên bố "Anti-Monolith Policy (<300-400 lines)" trong tài liệu nội bộ bị vi phạm thô bạo.
3. **Lạm dụng `"use client"` tuyệt đối (100% Client Components):** Trong tổng số **30/30** file `page.tsx`, không có bất kỳ Server Component nào. Ngay cả các trang tuyển dụng công khai (`/careers/[orgSlug]/[jobSlug]`) cần SEO, OpenGraph và TTFB cực nhanh cũng bị biến thành Client-rendered SPA.
4. **Mock Smell: Tự viết lại ORM Engine trong Unit Test:** Các file test (`auth.service.spec.ts`, `applications.service.spec.ts`) lồng mock tới **11 tầng** (`level 11 nesting`) để mô phỏng lại logic `.select().where().first()` của Prisma. Đây là anti-pattern "Mocking the Database Engine" cực kỳ mong manh và tốn công bảo trì vô ích.
5. **75.5% File Backend không có Test & 0/11 Controller được Test:** Có **71/94** file `.ts` trong `backend/src` không có file `.spec.ts` đi kèm. Cả **11 Controller** của hệ thống có **0** unit test! `candidates.service.ts` (695 dòng logic nghiệp vụ lõi) hoàn toàn không có test spec.
6. **3 Circular Type Dependencies trong `@haihire/shared`:**
   - `applications.ts` $\leftrightarrow$ `candidates.ts`
   - `applications.ts` $\leftrightarrow$ `jobs.ts`
   - `applications.ts` $\leftrightarrow$ `interviews.ts`
   Dù là type import, vòng lặp phụ thuộc cho thấy mô hình dữ liệu bị coupling chặt chẽ và thiếu lớp entity abstraction trung gian.
7. **Database Naming Anti-Pattern (camelCase Table Names trong PostgreSQL):** Các bảng được map thành camelCase: `@@map("organizationMember")`, `@@map("inviteLink")`, `@@map("emailSetting")`, `@@map("activityLog")`, `@@map("trackingClick")`. Trong PostgreSQL, điều này buộc mọi raw query hoặc công cụ BI phải dùng double quotes (`"organizationMember"`), vi phạm quy chuẩn chuẩn hóa cơ sở dữ liệu quan hệ.
8. **Ghost Dependencies & Rác Nâng Cấp:** Đã migrate sang `@base-ui/react`, nhưng vẫn để nguyên 4 gói `@radix-ui/*`, `@dnd-kit/*` (không dùng dòng nào), `alchemy` và `passport` trong `package.json`.
9. **Fake CI/CD "Theater" Deployments & Duplicate Workflows:** `ci.yml` và `ci-cd.yml` chạy trùng lặp 100% công việc kiểm thử trên cùng nhánh push/PR. Bước deploy staging/prod trong `ci-cd.yml` chỉ là lệnh `echo "Deploying..."` giả tạo.
10. **Hardcoded Strings & Hardcoded Credentials:**
    - `@haihire/shared/src/email-templates.ts` hardcode toàn bộ nội dung email tiếng Việt thay vì dùng i18n key.
    - `DEMO_PASSWORD = "[REDACTED_DEMO_PASSWORD]"` và email admin được hardcode trực tiếp trong cả frontend lẫn backend constants.

### 1.3. Khuyến nghị Hành Động (Ship / Refactor / Rewrite)
- **KHÔNG SHIP NGAY LẬP TỨC CHO PRODUCTION DOANH NGHIỆP LỚN.**
- Cần **1 Sprint Refactor Kiến trúc (2 tuần)** để giải quyết dứt điểm: Transactions, Tách God-components, Xóa bỏ Mock DB engine, và Bật Server Components cho Career site.

---

## 2. PART A — FOLDER STRUCTURE AUDIT

### 2.1. Đánh giá Cây Thư mục Repo (Depth 5)

#### Cấu trúc Tổng thể Hiện tại:
```
haihire/
├── .agents/                    # Bộ quy chuẩn, skills, memory
├── .github/workflows/          # ci.yml, ci-cd.yml (TRÙNG LẶP)
├── backend/
│   ├── .agents/skills/prisma-8 # RÁC PHÁT SINH TỪ CLI PRISMA (NÊN XÓA/GITIGNORE)
│   ├── module.ts               # TÊN MẬP MỜ (Prisma Composer module)
│   ├── service.ts              # TÊN MẬP MỜ (Prisma Composer service)
│   ├── prisma.config.ts        # Config Prisma
│   ├── prisma-composer.config.ts
│   └── src/
│       ├── common/             # DUMP FOLDER (Kitchen Sink Anti-Pattern)
│       │   ├── guards/
│       │   ├── app-exception.ts
│       │   ├── date.util.ts    # BẤT NHẤT TÊN (date.util vs doc-utils)
│       │   ├── doc-utils.ts
│       │   ├── dto-validation.pipe.ts
│       │   ├── encryption.service.ts # SERVICE NẰM TRONG COMMON
│       │   ├── http-exception.filter.ts
│       │   ├── temporal.d.ts   # TYPE D.TS NẰM TRONG COMMON
│       │   └── upload-utils.ts
│       ├── metrics/            # THIẾU MODULE & CONTROLLER (CHỈ CÓ SERVICE)
│       └── [domain-modules]/   # activities, applications, auth, candidates...
├── frontend/
│   └── src/
│       ├── app/                # App Router (100% Client Components)
│       ├── components/         # 14 THƯ MỤC CÙNG CẤP (VI PHẠM QUY TẮC 5-LAYER)
│       │   ├── ui/
│       │   ├── shared/         # CHỨA CẢ DOMAIN-SPECIFIC BADGES
│       │   ├── layout/
│       │   ├── providers/
│       │   └── [domain]/       # applications, candidates, jobs, sourcing...
│       ├── constants/          # CHỈ CÓ 1 FILE DUY NHẤT (auth.constants.ts)
│       ├── context/            # CHỈ CÓ 1 FILE DUY NHẤT (auth-context.tsx)
│       ├── hooks/              # Flat hooks directory
│       ├── i18n/               # locales/en.ts & vi.ts (1,821 DÒNG MỖI FILE)
│       ├── lib/
│       │   ├── api/            # API clients
│       │   └── [helpers]       # jobs.ts, stages.ts, email-templates.ts
│       └── types/              # DƯ THỪA: CHỈ RE-EXPORT SHARED (7 DÒNG)
├── packages/
│   └── shared/                 # Contract types, errors, enums
├── backups/                    # THƯ MỤC RỖNG TRÊN ROOT (NÊN XÓA)
├── monitoring/prometheus/      # Alert rules
└── scripts/                    # Các scripts kiểm tra CI & backup
```

### 2.2. So sánh với Best Practices

| Tiêu chí | Best Practice | Hiện trạng HaiHire | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Monorepo Strategy** | Turborepo / Nx kèm pipeline caching và task orchestration | `pnpm` workspace thuần, chạy script thủ công nối `--filter` | **Chưa tối ưu**. Build lần nào cũng chạy lại từ đầu, không cache build artifact giữa frontend/backend. |
| **Backend Architecture** | Modular Domain / Clean Architecture hoặc Hexagonal | Layer-based trộn lẫn trong NestJS module. God-Services ôm trọn data access + business logic. | **Fat Service Smell**. Controller quá mỏng, Service quá dày, không có Repository layer. |
| **Frontend Architecture** | Feature-based (`features/[domain]/{components, hooks, api}`) | Bị phân mảnh theo loại file (`components/jobs`, `hooks/use-job-queries`, `lib/api/jobs`, `lib/jobs.ts`). | **Fractured Architecture**. Làm 1 tính năng phải nhảy qua 5 thư mục khác nhau ở root `src`. |
| **Next.js App Router** | Server Components by default, Client Components at the leaves | 30/30 pages dùng `"use client"` | **Sai tôn chỉ App Router**. Biến Next.js thành Vite SPA một cách lãng phí tài nguyên. |

### 2.3. Chỉ định Tái Cấu Trúc Cụ Thể (Folder Action Plan)
1. **Xóa (Delete):**
   - `backups/`: Thư mục rỗng để ở root, không có tác dụng và làm bẩn git.
   - `frontend/src/types/`: Folder chỉ chứa 1 file `index.ts` dài 7 dòng để `export * from "@haihire/shared"`. Developer nên import thẳng từ `@haihire/shared`.
   - `backend/.agents/`: Rác phát sinh từ câu lệnh `prisma skills sync` trong postinstall. Cần thêm vào `.gitignore`.
2. **Đổi tên (Rename):**
   - `backend/module.ts` $\rightarrow$ `backend/prisma-composer.module.ts`: Tránh hiểu nhầm đây là NestJS root module.
   - `backend/service.ts` $\rightarrow$ `backend/prisma-composer.service.ts`: Tránh hiểu nhầm đây là NestJS root service.
   - `backend/src/common/date.util.ts` $\rightarrow$ `date-utils.ts`: Đồng bộ với `doc-utils.ts` và `upload-utils.ts`.
3. **Tách (Split):**
   - `backend/src/common/`: Tách thành 4 thư mục chuyên biệt:
     - `backend/src/common/utils/`: Pure functions (`date-utils`, `doc-utils`, `upload-utils`).
     - `backend/src/common/filters/`: `http-exception.filter.ts`.
     - `backend/src/common/pipes/`: `dto-validation.pipe.ts`.
     - `backend/src/security/`: Đưa `encryption.service.ts` và `guards/tenant.guard.ts` về đúng module bảo mật thay vì vứt vào `common`.
   - `frontend/src/i18n/locales/`: Tách `en.ts` và `vi.ts` (1,821 dòng) thành các domain translation files: `auth.json`, `jobs.json`, `candidates.json`, `applications.json`, `errors.json`.
4. **Gộp (Merge / Relocate):**
   - Gộp `components/[domain]`, `hooks/use-[domain]-queries`, `lib/api/[domain]` vào một thư mục thống nhất: `frontend/src/features/[domain]/`.
   - Di chuyển `job-status-badge.tsx` và `stage-badge.tsx` từ `components/shared/` về `features/jobs/` và `features/applications/` vì chúng chứa business domain logic, không phải generic shared UI.
   - Bổ sung `MetricsModule` và `MetricsController` cho `backend/src/metrics/metrics.service.ts` thay vì đăng ký trực tiếp vào `AppModule`.

---

## 3. PART B — FILE NAMING & LOCATION AUDIT

### 3.1. Bảng Kiểm Toán File (File Issues & Recommendations)

| File Path | Vấn đề Phát hiện | Mức độ | Khuyến nghị (Recommendation) |
| :--- | :--- | :--- | :--- |
| `frontend/src/components/applications/applications-data-table.tsx` | **File quá dài (1,707 dòng)**. Ôm toàn bộ logic bảng, drawer, modal phỏng vấn, modal xem tài liệu, xóa đơn, chuyển stage. | **CRITICAL** | Tách thành: `ApplicationsTable.tsx`, `ApplicationDrawer.tsx`, `useApplicationTableState.ts`. |
| `backend/src/organizations/organizations.service.ts` | **File quá dài (1,346 dòng)**. Xử lý từ CRUD org, chuyển workspace, quản lý member, role, invite links, đến seed default templates. | **CRITICAL** | Tách thành `OrganizationsService`, `OrganizationMembersService`, `OrganizationInvitesService`. |
| `backend/src/applications/applications.service.ts` | **File quá dài (1,152 dòng)**. Ôm toàn bộ workflow, upload file, chuyển stage, ghi log, notification email. | **CRITICAL** | Tách logic chuyển stage sang State Machine handler và tách upload document sang use-case riêng. |
| `backend/src/sourcing/sourcing.service.ts` | **File quá dài (1,092 dòng)**. Xử lý từ click tracking, regex domain parser, tính toán conversion rate, attribution analytics. | **CRITICAL** | Tách module `TrackingClickProcessor` và `SourcingAnalyticsService`. |
| `frontend/src/components/jobs/job-list.tsx` | **File quá dài (957 dòng)**. Chứa toàn bộ giao diện danh sách việc làm, bộ lọc, card, modal, action menu. | **HIGH** | Tách `JobFilterBar`, `JobCardGrid`, `JobActionMenu`. |
| `frontend/src/app/dashboard/candidates/[id]/page.tsx` | **File quá dài (941 dòng)**. Page component ôm đồm toàn bộ giao diện hồ sơ, timeline, upload tài liệu, phỏng vấn. | **HIGH** | Đưa toàn bộ UI con vào `features/candidates/CandidateDetailView`. Page chỉ giữ vai trò render container. |
| `frontend/src/i18n/locales/vi.ts` & `en.ts` | **File quá dài (1,821 dòng)**. Một file từ điển nguyên khối khổng lồ, dễ gây merge conflict khi nhiều dev cùng sửa. | **HIGH** | Chia nhỏ thành các file JSON theo domain module. |
| `backend/src/prisma/seed.ts` | **File quá dài (1,777 dòng)**. Chứa dữ liệu seed hardcoded khổng lồ. | **MEDIUM** | Tách data fixtures ra các file `.json` riêng trong `backend/src/prisma/fixtures/`. |
| `backend/module.ts` & `backend/service.ts` | Tên file mập mờ, dễ nhầm với core NestJS class. | **MEDIUM** | Đổi tên thành `prisma-composer.module.ts` và `prisma-composer.service.ts`. |
| `backend/src/common/date.util.ts` vs `doc-utils.ts` | Naming convention bất nhất trong cùng 1 folder (`.util.` vs `-utils.`). | **LOW** | Đổi thành `date-utils.ts`. |
| `frontend/src/constants/auth.constants.ts` | File chứa hardcoded production demo credentials (`admin@tun.io.vn` / `[REDACTED_DEMO_PASSWORD]`). | **HIGH** | Xóa bỏ hoặc chuyển vào mock data môi trường test. Không đưa vào production bundle. |
| `frontend/src/types/index.ts` | File quá ngắn (7 dòng), chỉ là pass-through re-export. | **LOW** | Xóa file, import trực tiếp `@haihire/shared`. |
| `packages/shared/src/applications.ts` | Import vòng (Circular dependency) với `candidates.ts`, `jobs.ts`, `interviews.ts`. | **HIGH** | Tách các shared core interfaces sang `packages/shared/src/models.ts`. |

---

## 4. PART C — ARCHITECTURE PATTERN AUDIT

### 4.1. Backend Architecture: "Anemic Domain + Fat God-Services"
- **Clean Architecture / DDD / Hexagonal:** Hoàn toàn **KHÔNG ÁP DỤNG**. 
- **Mô hình thực tế:** Hệ thống chạy theo mô hình 2 tầng truyền thống của NestJS (Controller $\rightarrow$ Fat Service $\rightarrow$ Prisma ORM).
- **Vấn đề cốt lõi:**
  1. **Không có Repository Layer:** Mọi service gọi thẳng `this.prisma.db.model.findMany()`, `create()`, `update()`. Không có sự trừu tượng hóa truy vấn, dẫn đến việc lặp đi lặp lại các mệnh đề `where: { organizationId, deletedAt: null }` ở hàng trăm chỗ.
  2. **Thiếu Unit of Work / Transaction:** Khi một nghiệp vụ chạm vào 3-4 bảng (vd: nộp đơn $\rightarrow$ lưu candidate $\rightarrow$ lưu document $\rightarrow$ lưu application $\rightarrow$ ghi activity log), nếu bước cuối lỗi thì các bước trước không được rollback.
  3. **Không có Domain Event Bus:** Thay vì phát event `ApplicationSubmittedEvent` để EmailModule và ActivityModule tự lắng nghe và xử lý bất đồng bộ, `ApplicationsService` lại tiêm trực tiếp `EmailService`, `MinioService`, `ActivitiesService` vào constructor của mình, tạo nên sự phụ thuộc chằng chịt (tight coupling).

### 4.2. Frontend Architecture: "App Router Giả Cầy (SPA in Disguise)"
- **Lạm dụng Client Components:** 30/30 trang là `"use client"`. Toàn bộ dữ liệu được tải từ trình duyệt thông qua TanStack Query (`useQuery`).
- **Hệ quả kiến trúc:**
  - Bỏ phí hoàn toàn tính năng React Server Components (RSC) của Next.js 16.
  - Trang tuyển dụng công khai (`/careers/[orgSlug]/[jobSlug]`) tải một bundle JS nặng về máy người dùng rồi mới gọi API lấy dữ liệu. Web crawlers (Googlebot, Facebook bot, LinkedIn scraper) không đọc được nội dung tuyển dụng ngay trong HTML đầu tiên, gây tổn hại trực tiếp đến SEO và OpenGraph preview.
- **State Management & Data Fetching:** Điểm sáng là team dùng TanStack Query rất bài bản, có centralized `QUERY_KEYS` và chuẩn hóa mutation invalidation. Tuy nhiên, việc thiếu Server Components khiến bundle client bị phình to.

### 4.3. Shared Package Architecture: Phụ Thuộc Vòng & Hardcoded Tiếng Việt
- **Khả năng Share:** Gói `@haihire/shared` làm tốt nhiệm vụ chia sẻ kiểu dữ liệu và mã lỗi giữa backend và frontend.
- **Lỗi Kiến Trúc Nghiêm Trọng:**
  1. **Circular Dependency:** Type graph của `applications.ts`, `candidates.ts`, `jobs.ts`, `interviews.ts` tạo thành 3 chu trình khép kín.
  2. **Vi phạm i18n:** `DEFAULT_EMAIL_TEMPLATES` được hardcode hoàn toàn bằng văn bản tiếng Việt trong file TypeScript của shared package. Shared package nên là agnostic về mặt ngôn ngữ hoặc chỉ chứa mã template key.

### 4.4. Monorepo Strategy
- Hiện tại dùng `pnpm workspace` thuần kết hợp scripts thủ công trong root `package.json` (`pnpm --filter ./backend --filter ./frontend --parallel run ...`).
- **Điểm yếu:** Không có build pipeline caching. Mỗi lần chạy CI hoặc build production, toàn bộ các bước đều build lại từ con số 0.
- **Khuyến nghị:** Bổ sung **Turborepo** (`turbo.json`). Turborepo tương thích 100% với pnpm workspace hiện tại, không yêu cầu thay đổi cấu trúc thư mục, nhưng sẽ đem lại khả năng cache build, lint, typecheck tức thì.

---

## 5. PART D — NAMING & CONVENTION AUDIT

### 5.1. Database Naming (Prisma Contract)
- **Table Names:** Hỗn hợp vô nguyên tắc giữa singular lowercase và camelCase:
  - Bảng đơn: `organization`, `user`, `job`, `candidate`, `application`, `interview` (singular lowercase).
  - Bảng ghép: `organizationMember`, `inviteLink`, `emailTemplate`, `emailSetting`, `emailLog`, `activityLog`, `candidateDocument`, `trackingLink`, `trackingClick` (camelCase!).
  - **Hậu quả:** PostgreSQL mặc định ép chữ thường. Bảng `organizationMember` tạo ra trong Postgres bắt buộc phải truy vấn bằng dấu ngoặc kép: `SELECT * FROM "organizationMember"`. Đây là lỗi sơ đẳng trong thiết kế database PostgreSQL.
- **Khuyến nghị:** Chuyển toàn bộ `@@map` sang chuẩn `snake_case`: `organization_members`, `invite_links`, `email_templates`, `activity_logs`, `candidate_documents`, `tracking_links`, `tracking_clicks`.

### 5.2. API Naming (RESTful Inconsistencies)
- **Hành vi RPC trá hình trong REST:**
  - `POST /applications/apply`: Đặt động từ `apply` vào URL thay vì chuẩn RESTful `POST /applications`.
  - `GET /applications/job/:jobId`: Lọc theo JobId bằng sub-path thay vì query parameter `GET /applications?jobId=:jobId`.
  - `GET /activities/candidate/:candidateId` và `GET /activities/application/:applicationId`: Lẽ ra phải là `GET /activities?candidateId=...`.
- **Query Parameter cho Xóa Tài Nguyên:**
  - `DELETE /candidates/:id/documents?documentId=...`: Lẽ ra phải là `DELETE /candidates/:id/documents/:documentId` hoặc `DELETE /documents/:documentId`.

---

## 6. PART E — OVER-ENGINEERING AUDIT

### 6.1. Chi tiết các Điểm Over-Engineering Cần Cắt Giảm
1. **Hệ thống "System Email" Backend Không Ai Dùng:**
   - Backend xây dựng trọn bộ 4 endpoint: `GET /email/system/config`, `POST /email/system/test`, `POST /email/system/send`, `GET /email/system/logs` kèm theo DTO `send-system-email.dto.ts`.
   - **Thực tế:** Frontend hoàn toàn không có bất kỳ màn hình nào gọi đến các endpoint này! Đây là code chết (dead code) do vẽ thêm tính năng ngoài phạm vi yêu cầu.
   - **Khuyến nghị:** Xóa bỏ hoặc đóng băng các endpoint này cho đến khi có spec quản trị cấp hệ thống (Super Admin).
2. **Re-export Pass-Through Indirection (`frontend/src/types/index.ts`):**
   - Tạo ra thư mục `types/` chỉ để chứa 1 file 7 dòng export lại `@haihire/shared`. Developer phải nhớ import lúc thì từ `@/types`, lúc thì từ `@haihire/shared`.
   - **Khuyến nghị:** Xóa file này, chuẩn hóa import trực tiếp từ `@haihire/shared`.
3. **Quá nhiều Script Kiểm Tra "Hàng Rào" Thủ Công:**
   - Trong `scripts/`: Có tới 4 script CI tự viết: `check-api-contract-coverage.ts`, `check-dtopipe-coverage.ts`, `check-error-code-i18n.ts`, `check-test-count.ts`.
   - Trong khi đó, các controller chính và service lõi lại **thiếu unit test thật sự**. Team đang dành quá nhiều thời gian viết script kiểm tra code của chính mình thay vì viết test kiểm tra nghiệp vụ cho khách hàng!
4. **CI Workflow Trùng Lặp (`ci.yml` và `ci-cd.yml`):**
   - Hai file chạy song song trên cùng sự kiện push vào `main` và `develop`, cùng khởi tạo Postgres 17 và Valkey 8 để chạy test và lint. Lãng phí 50% thời gian và tài nguyên GitHub Actions runner.
   - **Khuyến nghị:** Xóa bỏ `ci.yml`, chỉ giữ lại `ci-cd.yml`.

---

## 7. PART F — UNDER-ENGINEERING AUDIT

### 7.1. Chi tiết các Điểm Thiếu Hụt Nghiêm Trọng (Under-Engineering)
1. **Thiếu Database Transactions Hoàn Toàn:**
   - Không có bất kỳ `$transaction` nào được sử dụng trong codebase.
   - **Rủi ro:** Khi xóa một Job kèm cascade applications, hoặc khi nộp đơn kèm lưu tài liệu, nếu server gặp sự cố giữa chừng, dữ liệu sẽ rơi vào trạng thái bất nhất không thể cứu vãn.
   - **Khuyến nghị:** Bọc toàn bộ các thao tác ghi dữ liệu nhiều bước vào `prisma.$transaction`.
2. **Khoảng Trống Unit Test Khổng Lồ (Test Blindspots):**
   - **0/11 Controller** có unit test. Không có test nào xác thực xem HTTP Decorators, Pipes, Guards, Roles có hoạt động đúng trên controller hay không.
   - `backend/src/candidates/candidates.service.ts` (695 dòng) **hoàn toàn không có test spec**.
   - Gói `@haihire/shared` có **0 unit test**.
3. **Thiếu Client-Side Centralized Logging & Error Tracking:**
   - Có tới **57 câu lệnh `console.error`** rải rác trong `frontend/src`.
   - Khi người dùng gặp lỗi ngoài môi trường production, lỗi chỉ in ra console của trình duyệt mà không được gửi về bất kỳ hệ thống thu thập log tập trung nào (Sentry / Datadog / OpenTelemetry).

---

## 8. PART G — CODE SMELL AUDIT

### 8.1. Bảng Chi Tiết Code Smell

| File | Line | Loại Smell | Chi tiết & Đề xuất |
| :--- | :--- | :--- | :--- |
| `frontend/src/lib/utils.ts` | 79-155 | **God Helper & Regex Parsing** | Hàm `parseCandidateNotes` dùng regex phức tạp để bóc tách `FirstName: ... \| Gender: ...` ra khỏi text notes. Đây là hệ quả của việc chắp vá lưu trữ dữ liệu có cấu trúc vào trường text tự do. |
| `frontend/src/lib/utils.ts` | 348-387 | **In-Memory Client Aggregation** | Hàm `aggregateCandidates` phải tự gom nhóm ứng viên bằng `Map` trên client vì backend không cung cấp endpoint aggregate sạch. |
| `frontend/src/components/applications/applications-data-table.tsx` | 1-1707 | **God Component** | 1,707 dòng gom mọi nghiệp vụ hiển thị, drawer, form inline, modal xóa, modal interview, column toggle vào chung 1 component. |
| `backend/src/auth/auth.service.spec.ts` | 47-75 | **Mock Engine Overload** | Mock Prisma AST query lồng tới 11 tầng (`level 11 nesting`). Đề xuất dùng test DB thật thay vì tự lập trình lại ORM trong mock. |
| `frontend/src/app/dashboard/settings/members/page.tsx` | 616 | **eslint-disable** | `// eslint-disable-next-line @next/next/no-img-element`. Dùng thẻ `<img>` thô thay vì component `<Image />` tối ưu của Next.js. |
| `scripts/check-test-count.ts` | 58 | **any type** | `} catch (err: any) {`. Vi phạm quy chuẩn "Zero any" được tuyên bố trong memory của dự án. |
| `frontend/src/app/auth/login/page.tsx` | 85, 103 | **console.error** | Bắt lỗi async nhưng chỉ `console.error(err)` mà không ghi nhận telemetry. |
| `backend/src/common/encryption.service.ts` | 11 | **Sync Crypto Blocking** | Sử dụng `crypto.scryptSync` đồng bộ. Khi có nhiều request giải mã/mã hóa secret cùng lúc, CPU của Node.js event loop sẽ bị block hoàn toàn. Nên đổi sang `crypto.scrypt` bất đồng bộ. |

---

## 9. PART H — DEPENDENCY AUDIT

### 9.1. Bảng Rà Soát Dependencies

| Gói Phụ Thuộc (Package) | Vị trí | Tình trạng | Khuyến nghị (Recommendation) |
| :--- | :--- | :--- | :--- |
| `@radix-ui/react-dialog` | `frontend/package.json` | **GHOST DEPENDENCY** (0 file import). UI đã chuyển sang `@base-ui/react`. | **GỠ BỎ NGAY** (`pnpm remove`) |
| `@radix-ui/react-dropdown-menu`| `frontend/package.json` | **GHOST DEPENDENCY** (0 file import). | **GỠ BỎ NGAY** |
| `@radix-ui/react-select` | `frontend/package.json` | **GHOST DEPENDENCY** (0 file import). | **GỠ BỎ NGAY** |
| `@radix-ui/react-slot` | `frontend/package.json` | **GHOST DEPENDENCY** (0 file import). | **GỠ BỎ NGAY** |
| `@dnd-kit/core` | `frontend/package.json` | **UNUSED** (0 file import). Kanban pipeline tự viết hoặc không dùng. | **GỠ BỎ NGAY** |
| `@dnd-kit/sortable` | `frontend/package.json` | **UNUSED** (0 file import). | **GỠ BỎ NGAY** |
| `@dnd-kit/utilities` | `frontend/package.json` | **UNUSED** (0 file import). | **GỠ BỎ NGAY** |
| `shadcn` | `frontend/package.json` | **CLI TOOL IN RUNTIME DEPS**. Không nên để trong dependencies. | Chuyển sang devDependencies hoặc gỡ bỏ. |
| `alchemy` (`2.0.0-beta.79`) | `backend/package.json` | **UNUSED** (0 file import). Không rõ mục đích sử dụng. | **GỠ BỎ NGAY** |
| `passport` | `backend/package.json` | **REDUNDANT**. Đã có `@nestjs/passport` và `passport-jwt`. | **GỠ BỎ NGAY** |

---

## 10. PART I — TEST QUALITY AUDIT

### 10.1. Đánh giá Chất lượng Test Suite

1. **Quy chuẩn Đặt Tên & Vị trí:**
   - **Nhất quán 100%:** Toàn bộ 48 file test đều đặt tên chuẩn `.spec.ts` hoặc `.spec.tsx` (không có file `.test.ts` lạc loài).
   - Test được đặt cạnh file source (`co-located`), ngoại trừ 2 file e2e đặt trong `backend/src/test/`. Đây là cấu trúc tốt.
2. **"Tautology Assertions" (Test rỗng không mang ý nghĩa xác thực):**
   - Trong `frontend/src/components/sourcing/tracking-link-modal.spec.tsx`: **15/15 assertions** đều là `expect(screen.getByText(...)).toBeDefined()`. Lệnh `getByText` vốn đã tự quăng lỗi nếu không tìm thấy phần tử; việc assert `.toBeDefined()` không đem lại bất kỳ giá trị kiểm thử nào và không hề kiểm tra logic tương tác nhập form hay submit dữ liệu.
   - Trong `link-details.spec.tsx`: **11/12 assertions** có tình trạng tương tự.
3. **Mocking the Database Engine (Ảo tưởng Coverage):**
   - Các bài test backend như `auth.service.spec.ts` hay `applications.service.spec.ts` pass 100% nhưng thực chất chỉ đang pass trên **một cơ chế mô phỏng DB bằng array Javascript tự chế**. Nếu câu lệnh Prisma thực tế ngoài production gặp lỗi cú pháp SQL, foreign key constraint, hay locking timeout, các bài unit test này hoàn toàn không phát hiện được.

---

## 11. PART J — "ĐẬP ĐI XÂY LẠI" ANALYSIS

### J1. Có phần nào cần VIẾT LẠI TỪ ĐẦU không?
1. **Toàn bộ Lớp Mock Database trong Unit Test:** Cần đập bỏ toàn bộ 1,500 dòng code mock Prisma query thủ công lồng 11 tầng. Thay thế bằng integration test chạy trên PostgreSQL container thực tế (sử dụng Testcontainers hoặc docker compose test instance có sẵn trong CI).
2. **Next.js Rendering Architecture cho Public Careers:** Viết lại hai trang `app/careers/[orgSlug]/page.tsx` và `app/careers/[orgSlug]/[jobSlug]/page.tsx` thành **React Server Components (RSC)** để fetch dữ liệu từ phía server, sinh thẻ `metadata` (OpenGraph/Twitter card) động và render HTML tĩnh cho SEO.
3. **CI/CD Workflows:** Đập bỏ sự trùng lặp giữa `ci.yml` và `ci-cd.yml`. Thay thế các bước deploy giả (`echo`) bằng script deploy thật hoặc loại bỏ hoàn toàn để không gây ngộ nhận.

### J2. Có phần nào cần REFACTOR LỚN không?
1. **Các God-Services của Backend:** Chia nhỏ `organizations.service.ts` (1,346 dòng), `applications.service.ts` (1,152 dòng), `sourcing.service.ts` (1,092 dòng) theo nguyên tắc Single Responsibility Principle (SRP).
2. **Các God-Components của Frontend:** Tách `applications-data-table.tsx` (1,707 dòng) và `job-list.tsx` (957 dòng) thành các sub-components độc lập.
3. **Bổ sung Database Transactions:** Rà soát và bọc toàn bộ các flow ghi dữ liệu nhiều bảng vào `$transaction`.
4. **Database Table Mapping:** Đổi toàn bộ `camelCase` table map trong `contract.prisma` sang `snake_case`.

### J3. Có phần nào nên GIỮ NGUYÊN không?
1. **Kiến trúc Sourcing & UTM Attribution:** Mô hình lưu cookie phiên, header tracking, giải mã UTM 5 tham số và ghi nhận click rate được thiết kế rất thông minh, chặt chẽ và không bị rò rỉ dữ liệu giữa các phiên.
2. **Email Transporter Strategy Pattern:** `EmailTransporterFactory` kết hợp các adapter (SMTP, Resend, Sendgrid, Simulated) viết rất gãy gọn, chuẩn thiết kế OOP.
3. **Base UI & Tailwind v4 Styling:** Giao diện đẹp, hiện đại, token CSS thống nhất, hỗ trợ Dark/Light mode tự nhiên.
4. **Zod Environment Validation:** Cơ chế fail-fast khi khởi động thiếu biến môi trường hoạt động hoàn hảo.

### J4. Nếu bắt đầu lại từ đầu, Architect 20 năm sẽ làm gì khác?
1. **Dùng Feature-First Structure ngay từ ngày đầu:** Tổ chức code theo `features/{jobs, candidates, applications}` trên cả frontend lẫn backend thay vì chia vụn theo layer.
2. **PostgreSQL Chuẩn Chỉ:** Tên bảng và cột bắt buộc 100% `snake_case`.
3. **Thiết kế Next.js Chuẩn RSC:** Tách biệt rõ ràng Server Component (Data fetching, SEO) và Client Component (Interactive UI).
4. **Áp dụng Unit of Work / Repository Pattern:** Ngăn không cho Service gọi thẳng ORM một cách tùy tiện, đảm bảo giao dịch DB luôn luôn atomic.
5. **Chọn Turborepo Ngay Từ Đầu:** Cấu hình pipeline caching để CI chạy dưới 2 phút thay vì build lại từ đầu.

---

## 12. PART K — SO SÁNH VỚI TEAM SELF-ASSESSMENT

> *Chỉ mở và đọc `docs/audits/` tại bước này.*

### 12.1. Đánh giá Credibility của Team Self-Assessment: **45 / 100**

Đội ngũ đã sản xuất tới **20 báo cáo audit** (từ Phase 1 đến Phase 15A.1), liên tục gắn nhãn:
- `FINAL GATE VERDICT: [ GO ]`
- `HỆ THỐNG ĐẠT 100% TIÊU CHUẨN AN TOÀN ĐỂ TIẾN HÀNH GO-LIVE`
- `Mức độ vi phạm P0/P1/P2: 0`

Tuy nhiên, đây là trường hợp điển hình của **"Self-Confirmation Bias" (Tự ru ngủ bằng audit)**. Team tạo ra hàng loạt script CI tự động để kiểm tra những thứ bề mặt (đếm số dòng dịch, cấm `JSON.stringify`, cấm `alert()`), nhưng lại hoàn toàn mù quáng trước những khiếm khuyết cốt lõi của một hệ thống Enterprise.

### 12.2. Bảng So Sánh Đối Chiếu (Team Claims vs Architect Findings)

| Hạng mục | Tuyên bố của Team trong `docs/audits/` | Thực tế Kiến trúc (Architect Audit) | Nhận định Thẳng thắn |
| :--- | :--- | :--- | :--- |
| **Độ sẵn sàng Go-Live** | Đạt 100% tiêu chuẩn an toàn, Zero P0/P1/P2 (Phase 14). | Backend có **0 database transaction**; nộp đơn lỗi sinh rác dữ liệu; 11 controller không có test; table name sai chuẩn Postgres. | **Báo cáo láo / Ảo tưởng an toàn**. Go-live với 0 transaction trên hệ thống tuyển dụng là tự sát vận hành. |
| **Kiến trúc Modular & Anti-Monolith** | Tuyên bố tuân thủ quy tắc 5-layer (`features/`), file không quá 300-400 dòng (Memory & Phase 11). | Hoàn toàn không có thư mục `features/`! File `applications-data-table.tsx` dài **1,707 dòng**, `organizations.service.ts` dài **1,346 dòng**. | **Nói một đằng làm một nẻo**. Viết quy tắc vào file Memory nhưng code thực tế vi phạm 300%. |
| **Next.js & Hiệu năng Frontend** | Ứng dụng Next.js 16 hiện đại, tối ưu hóa triệt để. | **100% các trang là Client Components** (`use client`). Public careers không có SSR/SSG, phá hủy SEO. | **Dùng sai công nghệ**. Dùng Next.js App Router nhưng tư duy viết code là Create React App năm 2018. |
| **Chất lượng Test Suite** | "349/349 tests pass, 100% không hồi quy, phủ toàn diện 34 mutation endpoints" (Phase 14 & 15A.1). | 71/94 file backend không có test; 0/11 controller có test; `candidates.service.ts` 0 test; test sourcing toàn assertion rỗng (`toBeDefined`). | **Bệnh thành tích số lượng**. Test nhiều nhưng test vào những thứ vô nghĩa (mock lại Prisma query) thay vì test nghiệp vụ thực. |
| **Quy chuẩn i18n & No Hardcoded Strings** | "Verify Internationalization & No Hardcoded Strings: PASS 100%" (Phase 14 CI Gate). | Gói `@haihire/shared` hardcode toàn bộ nội dung template email bằng tiếng Việt. Constants chứa mật khẩu demo plain text. | **Script kiểm tra có lỗ hổng**. Script CI chỉ quét frontend mà bỏ quên shared package và constants. |
| **CI/CD Pipeline** | Có pipeline CI/CD hoàn chỉnh từ QA đến Docker build, Staging và Production (Phase 9 & 14). | Hai file CI chạy trùng lặp; bước deploy Staging và Production chỉ là lệnh `echo` vô thưởng vô phạt. | **Deployment kịch nghệ (Theater CI/CD)**. Chưa hề có cơ chế deploy thực tế nào được thiết lập. |
| **Quản lý Dependencies** | Đã dọn dẹp sạch sẽ qua các đợt audit. | Còn sót 10 gói rác/ghost dependencies (`@radix-ui/*`, `@dnd-kit/*`, `alchemy`, `passport`). | **Audit hời hợt**. Chỉ nhìn vào code chạy được hay không mà không kiểm tra độ phình của `node_modules`. |

---

## 13. PART L — ACTIONABLE RECOMMENDATIONS

### Priority 1: Phải Sửa Ngay Trước Khi Nhận Người Dùng Thật (Must Fix)
1. **Thiết lập Database Transactions (`prisma.$transaction`):** Bọc các quy trình ghi dữ liệu nhiều bước (Nộp đơn ứng tuyển, Xóa Job, Xóa Ứng viên, Onboarding) vào giao dịch nguyên tử.
2. **Khắc phục Lỗi Bảng camelCase trong PostgreSQL:** Sửa `contract.prisma` chuyển các `@@map("camelCase")` sang `snake_case`, chạy migration update database.
3. **Chuyển Đổi Public Careers sang Server Components:** Gỡ bỏ `"use client"` ở `app/careers/[orgSlug]/page.tsx` và `app/careers/[orgSlug]/[jobSlug]/page.tsx`. Thực hiện fetch data tại server và render metadata OpenGraph chuẩn.
4. **Bảo Mật Demo Credentials:** Xóa bỏ `DEMO_PASSWORD = "[REDACTED_DEMO_PASSWORD]"` trong `auth.constants.ts` ở cả frontend và backend. Chuyển sang nạp qua biến môi trường hoặc tài liệu hướng dẫn riêng.

### Priority 2: Cần Sửa Sớm Trong Sprint Tới (Should Fix)
1. **Tách Rời Các God-Files:**
   - Cắt `applications-data-table.tsx` (1,707 dòng) thành 4 component nhỏ.
   - Cắt `organizations.service.ts` (1,346 dòng) và `applications.service.ts` (1,152 dòng) thành các sub-services chuyên biệt.
2. **Gỡ Bỏ Toàn Bộ Ghost Dependencies:**
   - Chạy lệnh gỡ bỏ `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `alchemy`, `passport`.
3. **Bổ Sung Unit Test Cho Controller & CandidatesService:**
   - Viết test suite cho `candidates.service.ts`.
   - Viết controller test tối thiểu kiểm tra guards và validation pipe cho các endpoint chính.
4. **Dọn Rác CI & Thư Mục:**
   - Xóa bỏ `ci.yml`, chỉ giữ lại `ci-cd.yml`.
   - Xóa bỏ thư mục rỗng `backups/`.
   - Thêm `backend/.agents/` vào `.gitignore`.

### Priority 3: Nên Cải Thiện Để Nâng Cao Chất Lượng Code (Nice to Have)
1. **Cấu trúc lại Frontend theo Feature-First:** Chuyển các thư mục rải rác trong `components/`, `hooks/`, `lib/api/` về `features/[domain]`.
2. **Tách File Từ Điển i18n:** Chia nhỏ `vi.ts` và `en.ts` (1,821 dòng) thành các file JSON theo module.
3. **Chuyển Encryption sang Bất Đồng Bộ:** Thay `crypto.scryptSync` bằng `crypto.scrypt` trong `encryption.service.ts`.
4. **Tích Hợp Turborepo:** Thêm `turbo.json` để tăng tốc thời gian build và lint trong monorepo.

### Priority 4: Tạm Thời Bỏ Qua / Không Cần Làm (Ignore)
1. Không cần nâng cấp TypeScript 7 hay PostgreSQL 18 vào thời điểm này (đúng như đề xuất hoãn lại của Phase 15A.1).
2. Không cần đập đi viết lại toàn bộ backend bằng Clean Architecture/DDD phức tạp; chỉ cần refactor chia nhỏ Service và thêm Transaction là đủ đáp ứng tải cho 50,000+ ứng viên.

---
*Báo cáo được thực hiện độc lập bởi Senior Software Architect — Không chịu ảnh hưởng bởi các kết luận tự đánh giá trước đó của đội ngũ phát triển.*
