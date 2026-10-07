# BÁO CÁO CONTEXT DỰ ÁN: HAIHIRE ENTERPRISE ATS
> **Nguồn Sự Thật Duy Nhất (Single Source of Truth) cho Antigravity, DeepSeek & Chủ Dự Án**  
> **Phiên bản:** 1.0.0  
> **Cập nhật ngày:** 2026-10-06  
> **Tác giả:** Antigravity (Senior Software Engineer / Lead Maintainer)

---

## 1. TỔNG QUAN
- **Tên dự án:** HaiHire Enterprise ATS Platform (`haihire-platform`).
- **Mục đích:** Nền tảng quản lý quy trình tuyển dụng ứng viên (Applicant Tracking System - ATS) đa tổ chức (multi-tenant) thế hệ mới dành cho doanh nghiệp. Hệ thống tối ưu hóa toàn bộ vòng đời tuyển dụng từ tạo tin tuyển dụng, phân phối link tracking đa kênh, tiếp nhận hồ sơ ứng viên (Saga upload CV), quản lý Kanban pipeline kéo thả, chấm điểm phỏng vấn (scorecard), đến gửi email tự động hóa.
- **Loại dự án:** Full-stack Monorepo (`pnpm workspace`) gồm 3 package cốt lõi:
  - `backend`: REST API Server xây dựng bằng NestJS 12.
  - `frontend`: Web Application xây dựng bằng Next.js 16 App Router.
  - `packages/shared`: Thư viện hợp đồng dữ liệu dùng chung (`@haihire/shared` bao gồm types, enums, `APP_ERROR_CODES`, brand config).
- **Trạng thái:** **Phiên bản 1.0.0** — Chuẩn bị phát hành Production (Đã hoàn thành 22 Phase hardening, trải qua 10 chu kỳ Independent Verification & Validation - IV&V với điểm độ tin cậy đạt 99.0% - 100%).
- **Ai là người dùng cuối:**
  1. *Recruiter / HR / Hiring Manager / Tenant Admin*: Đăng nhập vào cổng nội bộ (`/dashboard`) để quản lý công việc, pipeline ứng viên, lịch phỏng vấn, mẫu email, và link sourcing.
  2. *Ứng viên (Candidate)*: Truy cập cổng tuyển dụng công khai (`/careers/[orgSlug]/[jobSlug]`) để xem JD và nộp hồ sơ trực tuyến.

---

## 2. TECH STACK
- **Ngôn ngữ + version:** TypeScript `6.0.3` (Toàn bộ dự án áp dụng chính sách **100% Pure TypeScript**, cấm dùng file `.js` thuần, cấm kiểu `any` — tham chiếu `.agents/memory/project-conventions.md:L13-19`).
- **Framework chính + version:**
  - **Backend:** NestJS `12.1.2` (chạy trên Express platform adapter, tham chiếu `backend/package.json:L33-38`).
  - **Frontend:** Next.js `16.3.8` (App Router, React Server Components kết hợp Client Components) + React `19.3.0` (tham chiếu `frontend/package.json:L30-33`).
- **Runtime:**
  - Node.js: `26.x` Active LTS baseline (Docker image `node:26-alpine`).
  - Package Engine: `pnpm@12.6.0` (Node 26 đã gỡ bỏ Corepack, cài đặt pnpm trực tiếp qua npm).
- **Thư viện quan trọng:**
  - *UI & Styling:* Tailwind CSS `v4`, Base UI (`@base-ui/react ^1.8.0`), Radix UI Primitives (Dialog, Dropdown, Select, Slot), Lucide React (`^1.49.0`), `sonner` (toast notifications), `@dnd-kit` (`^6.3.1` core & sortable cho Kanban board).
  - *Client State & Cache:* `@tanstack/react-query` `^5.104.0` (quản lý server state với query key factory).
  - *ORM & Data Access:* Prisma 8 RC (`@prisma/orm-postgres` `8.0.0-rc.13`, `prisma` `8.0.0-rc.19` Contract-first architecture).
  - *Authentication:* Passport.js `^0.7.0`, `passport-jwt` `^4.0.1`, `bcryptjs` `^3.0.3`, HttpOnly JWT Cookies (`haihire_token`).
  - *Async Queues:* BullMQ `^6.3.11` + `@nestjs/bullmq` `^12.0.0` (quản lý job gửi mail và bù trừ xóa file mồ côi).
  - *Object Storage SDK:* MinIO Node SDK `^8.0.7` (S3-compatible API).
  - *Validation:* Zod `^4.6.5` (centralized schemas), `class-validator` `^0.15.1` + `class-transformer` `^0.5.1` thông qua custom pipe `DtoPipe`.
  - *Testing:* Vitest `5.0.3` (unit/integration test), Playwright `1.63.0` (browser E2E), `@testing-library/react` `16.3.3`, `jsdom` `30.1.1`.
- **Database / Storage / Cache / Queue:**
  - *Database:* PostgreSQL `17.6-alpine` (Host dev port: `15432`, container: `5432`).
  - *Cache & Queue:* Valkey `8.0.2-alpine` (thay thế Redis nhằm tuân thủ bản quyền RSALv2/SSPLv1; host dev port: `16379`, container: `6379`).
  - *Object Storage:* MinIO S3 (`alpine/minio` pinned digest; host dev API port: `19000`, console: `19001`).
- **DevOps:**
  - *Docker & Container Registry:* Docker Compose v2 (`docker-compose.yml` cho dev infra, `docker-compose.prod.yml` cho production kéo image từ GitHub Container Registry - GHCR).
  - *Reverse Proxy:* Caddy `2.8-alpine` (xử lý TLS termination & reverse proxy).
  - *CI/CD:* GitHub Actions (`.github/workflows/ci-cd.yml`, `docker-publish.yml`, `e2e-nightly.yml`, `release.yml`) với 7 Architecture Quality Gates.
  - *Monitoring:* Prometheus Metrics endpoint nội bộ tại `/metrics` qua `MetricsService`.
- **Package Manager:** `pnpm` `12.6.0` (workspace configuration tại `pnpm-workspace.yaml`).

---

## 3. KIẾN TRÚC
- **Pattern kiến trúc:**
  - **Modular Monolith** trên Backend (NestJS chia theo 9 domain modules độc lập, giao tiếp nội bộ).
  - **Distributed Saga Pattern** xử lý giao dịch phân tán giữa MinIO (Object Storage) và PostgreSQL (Database) kèm BullMQ Dead-Letter Queue (DLQ).
  - **AsyncLocalStorage Transaction Propagation:** Quản lý giao dịch lồng nhau xuyên suốt các service mà không cần truyền biến `tx` thủ công (`backend/src/prisma/prisma.service.ts:L13-34`).
  - **Hybrid Next.js Architecture:** Public routes (`/careers/*`) dựng bằng pure **React Server Components (RSC)** tối ưu SEO/GEO (Schema JSON-LD `JobPosting`); Private routes (`/dashboard/*`) là Client SPA tương tác cao với `@tanstack/react-query`.
- **Sơ đồ thư mục chính:**
```text
haihire/
├── .agents/                 # AG Kit AI agent rules, memory persistence (MEMORY.md), workflows
├── .github/workflows/       # 4 GitHub Actions workflows: CI/CD 7-gate, GHCR publish, nightly E2E
├── backend/                 # NestJS 12 REST API Server
│   ├── migrations/          # Prisma database migrations
│   ├── src/
│   │   ├── activities/      # Audit trail logging (bất đồng bộ, scrub PII)
│   │   ├── applications/    # Quản lý hồ sơ ứng viên, nộp đơn, Kanban stage transitions
│   │   ├── auth/            # JWT authentication, HttpOnly cookies, RBAC RolesGuard
│   │   ├── candidates/      # Talent pool, hồ sơ ứng viên, tài liệu đính kèm
│   │   ├── common/          # Exceptions chuẩn, custom DtoPipe, date utils, encryption AES-256
│   │   ├── config/          # Centralized fail-fast Zod schema (env.ts)
│   │   ├── email/           # Email worker (BullMQ), template interpolation, anti-XSS
│   │   ├── events/          # Internal event emitters & SSE notifications
│   │   ├── interviews/      # Lịch phỏng vấn, Google/Outlook meet links, scorecards
│   │   ├── jobs/            # CRUD tin tuyển dụng, public career listings
│   │   ├── metrics/         # Prometheus latency & request metrics collector
│   │   ├── minio/           # S3 client wrapper, magic-byte inspection, presigned URLs
│   │   ├── organizations/   # Multi-tenant management, memberships, invite links
│   │   ├── prisma/          # Prisma 8 contract-first ORM, ALS transaction engine, seed.ts
│   │   ├── sourcing/        # Link tracking UTM 5 tham số, đếm click chống lặp
│   │   └── main.ts          # Backend bootstrap entry point
├── frontend/                # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/             # App Router: /auth, /careers (RSC), /dashboard (Kanban, Tables)
│   │   ├── components/      # 5-layer modular architecture: ui, shared, layout, providers, features
│   │   ├── context/         # AuthContext (quản lý session, switch organization)
│   │   ├── hooks/           # Domain TanStack Query hooks (use-*-queries.ts) + query-keys.ts
│   │   ├── i18n/            # Dual-language engine (vi/en), I18nProvider, translation keys
│   │   ├── lib/             # Axios client với URL gatekeeper, api-error parser, domain API clients
│   │   └── types/           # Frontend TypeScript view model definitions
├── packages/
│   └── shared/              # @haihire/shared: APP_ERROR_CODES, enums, DTO contracts, BRAND_CONFIG
├── docs/                    # Tài liệu kiến trúc (architecture/), API specs (api/), runbooks/, audits/
├── monitoring/              # Prometheus alert rules và configuration
└── scripts/                 # Bộ công cụ kiểm định CI (check-all.ts, check-dtopipe, check-env-sync...)
```
- **Luồng dữ liệu/request chính:**
  1. **Public Request (Ứng viên truy cập JD):** Client $\rightarrow$ Caddy Reverse Proxy $\rightarrow$ Next.js Server Component (`/careers/[orgSlug]/[jobSlug]`) $\rightarrow$ Fetch trực tiếp từ Backend nội bộ (`INTERNAL_API_URL`) $\rightarrow$ Render HTML + thẻ JSON-LD `JobPosting` chuẩn SEO $\rightarrow$ Trả về trình duyệt không có API waterfall.
  2. **Dashboard Request (Recruiter tương tác):** Trình duyệt gọi `/api/*` (được Next.js proxy rewrite về Backend) $\rightarrow$ Axios Interceptor Gatekeeper kiểm tra URL $\rightarrow$ Backend `ThrottlerGuard` (rate limit) $\rightarrow$ `JwtAuthGuard` (đọc HttpOnly cookie `haihire_token`) $\rightarrow$ `TenantGuard` (xác thực `organizationId` của user) $\rightarrow$ Controller $\rightarrow$ `DtoPipe` validation $\rightarrow$ Service.
  3. **Candidate Application Submission (Saga Workflow):**
     - *Bước 1 (Upload MinIO):* File CV được kiểm tra magic bytes và upload vào MinIO tại `tenants/${orgId}/resumes/${filename}`.
     - *Bước 2 (Transactional DB Write):* Gọi `PrismaService.executeTx()`, ghi nguyên tử `Candidate`, `Application`, `CandidateDocument`, `ActivityLog`.
     - *Bước 3 (Compensating Rollback):* Nếu bước DB lỗi, kích hoạt xóa file vừa upload trên MinIO.
     - *Bước 4 (DLQ Fallback):* Nếu lệnh xóa MinIO thất bại, đẩy job vào BullMQ `orphan-cleanup-queue` thử lại 5 lần kèm cảnh báo DLQ (`backend/src/applications/applications.service.ts:L673-710`).
- **Các module/domain chính và quan hệ:**
  - `Organizations`: Quản lý thực thể Tenant gốc. Mọi dữ liệu tuyển dụng đều bị cô lập bởi `organizationId`.
  - `Auth` & `Users`: Quản lý tài khoản, phân quyền RBAC (`ADMIN` vs `MEMBER`).
  - `Jobs`: Tin tuyển dụng thuộc về `Organization`.
  - `Candidates`: Hồ sơ ứng viên thuộc về `Organization`, duy nhất theo `(organizationId, email)`.
  - `Applications`: Cầu nối `(Candidate, Job)` theo dõi stage (APPLIED $\rightarrow$ SCREENING $\rightarrow$ INTERVIEW $\rightarrow$ OFFER $\rightarrow$ HIRED/REJECTED).
  - `Interviews`: Gắn với `Application`, lưu scorecard đánh giá và link họp.
  - `Sourcing`: Tạo `TrackingLink` (chứa 5 tham số UTM) gắn vào `Application` để đo lường hiệu quả chuyển đổi kênh.
  - `Activities`: Ghi nhật ký audit trail bất đồng bộ cho mọi biến động của Candidate/Application.
- **Điểm vào (entry points):**
  - Backend: `backend/src/main.ts` (khởi động NestJS, CORS, Helmet headers, Global Pipes, Filters, lắng nghe port `PORT=3001`).
  - Frontend: `frontend/src/app/layout.tsx` (RootLayout, nhúng theme script `beforeInteractive`, bọc `I18nProvider`, `QueryClientProvider`, `AuthProvider`).

---

## 4. CONVENTION & PATTERN (ĐỌC TỪ CODE THỰC TẾ)
- **Naming Conventions:**
  - *Tệp tin:* `kebab-case` toàn diện (`wizard-header.tsx`, `dto-validation.pipe.ts`, `query-keys.ts`).
  - *Biến & Hàm:* `camelCase` (`executeTx`, `getApiErrorMessage`, `downloadAuthenticatedFile`).
  - *React Components:* `PascalCase` (`WizardHeader`, `MetricCard`, `CustomSelect`).
  - *Classes & DTOs:* `PascalCase` (`CreateJobDto`, `PrismaService`, `GlobalExceptionFilter`).
  - *Database Schema:* PostgreSQL table name map theo `snake_case` trong `backend/src/prisma/contract.prisma` (ví dụ: `@@map("job")`, `@@map("candidate")`).
- **Cấu trúc 1 file điển hình:**
  - *Frontend Component:*
    ```typescript
    "use client"; // (Nếu là Client Component)
    // 1. React / Next.js imports
    import { useState, useMemo } from "react";
    import Link from "next/link";
    // 2. Third-party UI / icons / utilities
    import { cn } from "cn"; // Chuẩn: import directly from "cn", cấm clsx/tailwind-merge
    import { ArrowLeft } from "lucide-react";
    // 3. Project components & hooks
    import { Button } from "@/components/ui/button";
    import { useI18n } from "@/i18n";
    // 4. Types
    import type { Job } from "@/types";
    // 5. Props Interface
    interface ComponentProps { ... }
    // 6. Component export
    export function Component({ ... }: ComponentProps) { ... }
    ```
  - *Backend Controller:*
    ```typescript
    import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
    import { AuthGuard } from "@nestjs/passport";
    import { RolesGuard } from "../auth/roles.guard";
    import { DtoPipe } from "../common/dto-validation.pipe"; // Bắt buộc cho @Body()
    import { CreateJobDto } from "./dto/create-job.dto";
    import { JobsService } from "./jobs.service";

    @Controller("jobs")
    export class JobsController {
      constructor(private readonly jobsService: JobsService) {}
      @Post()
      @UseGuards(AuthGuard("jwt"), RolesGuard)
      create(@Body(DtoPipe(CreateJobDto)) dto: CreateJobDto, @Request() req: any) { ... }
    }
    ```
- **Cách quản lý state:**
  - *Server State:* Quản lý 100% bằng `@tanstack/react-query` v5. Định nghĩa query keys tập trung tại `frontend/src/hooks/query-keys.ts`. Mọi mutation hook bắt buộc phải gọi `queryClient.invalidateQueries({ queryKey: queryKeys.<domain>(...) })` để chống stale state.
  - *Global Client State:* Dùng React Context chuyên biệt: `AuthContext` (session & tenant), `I18nContext` (ngôn ngữ).
  - *Local UI State:* Sử dụng React hook chuẩn (`useState`, `useReducer`, `useMemo`).
- **Cách gọi API:**
  - Thông qua Axios client singleton tại `frontend/src/lib/api/client.ts` (`api = axios.create({ baseURL: getApiBaseUrl(), withCredentials: true })`).
  - **Client-Side Gatekeeper:** Có interceptor chủ động chặn các request URL chứa chuỗi `[object Object]` hoặc `%5Bobject` trước khi gửi ra network (`client.ts:L38-45`).
  - Các hàm API chia theo domain trong `frontend/src/lib/api/<domain>.ts` (tuyệt đối không gộp thành monolithic file).
- **Cách xử lý error & logging:**
  - *Backend:* Ném ngoại lệ kế thừa `AppException` với mã lỗi thuộc `APP_ERROR_CODES` (`packages/shared/src/errors.ts`). `GlobalExceptionFilter` bắt toàn bộ lỗi, định dạng envelope chuẩn: `{ statusCode, code, message, params, timestamp, path }`. Logging HTTP ra console dạng structured JSON, tự động ẩn tham số nhạy cảm (PII scrubbing).
  - *Frontend:* Xử lý lỗi qua `getApiErrorMessage(err, t)` (`frontend/src/lib/api-error.ts`), dịch mã lỗi máy sang ngôn ngữ người dùng (`errors.<CODE>`). **Nghiêm cấm** dùng `alert()` hoặc in `JSON.stringify(err)` ra giao diện (được kiểm tra tự động bởi CI Gate 5).
- **Cách validation:**
  - *Backend Request Payload:* Dùng `class-validator` + `class-transformer` nhưng **bắt buộc** phải bọc qua `DtoPipe(<DtoClass>)` ở decorator `@Body()` để tránh hiện tượng esbuild/SWC lược bỏ decorator metadata làm mất validation (`backend/src/common/dto-validation.pipe.ts`).
  - *Environment Variables:* Schema Zod nghiêm ngặt tại `backend/src/config/env.ts` và `frontend/src/lib/env.ts`. Triết lý **Zero Fallback & Fail Fast** (thiếu biến môi trường hoặc sai định dạng là crash server ngay lập tức với `process.exit(1)`).
- **Cách viết test:**
  - *Framework:* Vitest trên cả 2 package; Playwright cho E2E.
  - *Vị trí & Naming:* Nằm cạnh file thực thi hoặc trong thư mục `tests/` với đuôi `*.spec.ts` hoặc `*.spec.tsx`.
  - *Pattern:* AAA (Arrange - Act - Assert). Với form HTML5 constraint trong JSDOM, bắt buộc kích hoạt bằng `fireEvent.submit(form)` thay vì click nút submit để tránh JSDOM nuốt event.
- **Cách đặt tên branch/commit:**
  - *Branch:* `feature/[task-slug]`, `fix/[bug-slug]`, `refactor/[task-slug]`, `perf/[task-slug]`, `docs/[task-slug]`.
  - *Commit:* Conventional Commits chuẩn có scope bắt buộc: `type(scope): description` (chữ thường, tiếng Anh, không dấu chấm cuối câu, ví dụ: `feat(jobs): add multi-channel sourcing tracker`). Enforced bởi Husky hook `.husky/commit-msg`.
- **Linter / Formatter:**
  - ESLint 10 phẳng (`eslint.config.mjs`).
  - TypeScript Compiler (`tsc --noEmit`) bật `strict: true`.

---

## 5. LỆNH THƯỜNG DÙNG
| Thao tác | Lệnh thực thi | Ghi chú quan trọng |
| :--- | :--- | :--- |
| **Cài đặt dependencies** | `pnpm install` | Bắt buộc dùng Node >= 26 và pnpm 12. Cấm dùng `corepack enable`. |
| **Khởi động hạ tầng Docker** | `pnpm docker:infra:up` | Bật PostgreSQL (`15432`), Valkey (`16379`), MinIO (`19000/19001`). |
| **Khởi tạo Database & Seed** | `pnpm db:setup` | Chạy `prisma db update` và seed tài khoản demo/dữ liệu mẫu. |
| **Chạy Development** | `pnpm dev` | Chạy song song Backend (`13001`) và Frontend (`13000`). |
| **Build toàn bộ ứng dụng** | `pnpm build` | Build tuần tự: `@haihire/shared` $\rightarrow$ `backend` (esbuild) $\rightarrow$ `frontend` (Next.js). |
| **Chạy kiểm thử Unit & Int** | `pnpm test` | Chạy toàn bộ 379 test cases bằng Vitest. |
| **Chạy End-to-End browser** | `pnpm test:e2e` | Chạy 10 kịch bản Playwright E2E browser journeys. |
| **Kiểm tra 7 cổng CI đầy đủ** | `pnpm check:all` | Chạy toàn bộ 7 CI Architecture Quality Gates. |
| **Kiểm tra CI nhanh (Pre-commit)**| `pnpm check:all:fast` | Bỏ qua smoke/load test, chỉ chạy static gates + test diff (~38s). |
| **Kiểm tra đồng bộ Env** | `pnpm lint:env-sync` | So khớp 100% key parity giữa 5 file `.env` và Docker Compose. |
| **Kiểm tra i18n & Hardcode** | `pnpm check:i18n` | Đảm bảo không có chữ hardcode trong JSX và đủ key vi/en. |
| **Kiểm tra DtoPipe Coverage**| `pnpm lint:dtopipe` | Kiểm tra 100% `@Body()` trong controllers có `DtoPipe`. |
| **Kiểm tra Mã Lỗi i18n** | `pnpm lint:error-i18n` | Đảm bảo mọi mã trong `APP_ERROR_CODES` được dịch trong `vi.ts`/`en.ts`. |
| **Đồng bộ / Tăng phiên bản** | `pnpm version:sync` / `pnpm version:bump [patch\|minor]` | Đồng bộ lockstep phiên bản trên toàn bộ 4 file `package.json`. |
| **Khởi chạy Production Docker**| `pnpm docker:prod:up` | Khởi chạy container production với `.env.production`. |

---

## 6. ĐIỂM CẦN LƯU Ý (QUAN TRỌNG NHẤT)
- **File / Module "nhạy cảm" — Không nên sửa tùy tiện:**
  1. `backend/src/prisma/contract.prisma` & `contract.json`: Hợp đồng ORM của Prisma 8 RC. Mọi thay đổi schema phải chạy `pnpm contract:emit` và `pnpm db:update`. Sai cú pháp sẽ làm gãy tầng data runtime `@prisma/orm-postgres`.
  2. `backend/src/common/dto-validation.pipe.ts`: Cầu nối bảo vệ validation pipe không bị esbuild làm rụng metatype. Nếu gỡ bỏ `DtoPipe` ở bất kỳ endpoint nào, `pnpm lint:dtopipe` sẽ báo FAIL ngay lập tức.
  3. `frontend/src/app/layout.tsx`: Chứa script chống chớp nháy giao diện (FOUC) `<Script id="theme-init" strategy="beforeInteractive">`. Tuyệt đối không thay thế bằng thẻ `<script>` trần của JSX (React 19 sẽ sinh lỗi hydration mismatch).
  4. `backend/src/applications/applications.service.ts`: Trọng tâm luồng Saga nộp hồ sơ. Logic bù trừ rollback file MinIO và đẩy DLQ BullMQ nằm ở đây; sửa sai sẽ làm tràn ngập file mồ côi không quản lý được.
- **Nợ kỹ thuật đang tồn tại (Technical Debt):**
  1. *5 Monolithic "God Files" vượt 400 dòng (có file > 1,000 dòng):*
     - `frontend/src/components/applications/applications-data-table.tsx` (~1,611 dòng).
     - `backend/src/applications/applications.service.ts` (~1,188 dòng).
     - `backend/src/organizations/organizations.service.ts` (~1,170 dòng).
     - `backend/src/sourcing/sourcing.service.ts` (~988 dòng).
     - `frontend/src/components/jobs/job-list.tsx` (~900 dòng).
  2. *Quy ước đặt tên Database table:* Có 9 bảng trong `contract.prisma` đang mang chỉ thị `@@map` theo `camelCase` từ code cũ (`organizationMember`, `inviteLink`, `emailTemplate`, `emailSetting`, `emailLog`, `activityLog`, `candidateDocument`, `trackingLink`, `trackingClick`) thay vì `snake_case`. Kế hoạch migrate đã được hoãn sang giai đoạn bảo trì sau phát hành.
- **TODO / FIXME / Anti-pattern đáng chú ý:**
  - Còn 1 chỗ dùng `// eslint-disable-next-line @next/next/no-img-element` tại `frontend/src/app/dashboard/settings/members/page.tsx:L616` để hiển thị avatar thay vì dùng `<Image />`.
  - Một số component header (như `wizard-header.tsx:L48`) vẫn còn class `max-w-7xl mx-auto` dù quy ước chung của dự án yêu cầu bố cục Full-Width canvas.
- **Điểm dễ gây bug nếu sửa:**
  - *React SyntheticEvent Leakage:* Khi truyền callback vào `onClick`, nếu hàm nhận tham số tùy chọn (ví dụ `onDelete(id?: string)`), tuyệt đối **không** viết `onClick={onDelete}` vì React sẽ đẩy sự kiện `MouseEvent` vào tham số đầu tiên, biến ID thành chuỗi `"[object Object]"` dẫn tới URL `/api/candidates/[object%20Object]`. Bắt buộc viết: `onClick={() => onDelete(id)}`.
  - *Xử lý đường dẫn file giữa Windows và Linux:* Tuyệt đối không dùng `path.basename()` để làm sạch tên file upload. Hàm này không lọc được dấu `\` của Windows khi chạy trên server Linux CI, dẫn đến lỗ hổng path traversal và fail test. Phải dùng regex trung lập: `.replace(/^.*[/\\]/, "")` (`.agents/memory/project-conventions.md:L248-257`).

---

## 7. QUY TẮC BẤT THÀNH VĂN
Những điều AI khác nếu không đọc kỹ sẽ rất dễ làm sai:
1. **Không xâu chuỗi lệnh shell bằng `&&` trên Windows PowerShell:** Hệ điều hành máy phát triển là Windows PowerShell. Dùng `&&` có thể gây lỗi cú pháp parser. Phải chạy từng lệnh riêng biệt hoặc dùng dấu chấm phẩy `;`.
2. **Không bao giờ tự ý chạy `pnpm run seed` (hoặc `pnpm db:setup`):** Script seed sẽ xóa sạch (wipe) toàn bộ database hiện tại và nạp lại dữ liệu demo ban đầu. Luôn luôn phải hỏi người dùng xác nhận trước khi chạy seed.
3. **Cấm hardcode chuỗi text trên Frontend:** Mọi từ ngữ hiển thị, placeholder, nhãn nút bấm bắt buộc phải lấy qua hook `useI18n()` với hàm `t("key.path")`. Nếu thêm text mới, phải thêm đồng thời vào cả 3 file: `frontend/src/i18n/types.ts`, `frontend/src/i18n/locales/vi.ts` và `frontend/src/i18n/locales/en.ts`. Nếu không, lệnh CI `pnpm check:i18n` sẽ chặn merge.
4. **Không tạo file proxy trùng tên khi tách thư mục:** Khi modularize mã nguồn (ví dụ thư mục `frontend/src/lib/api/`), file `index.ts` bên trong thư mục là nguồn export duy nhất. Tuyệt đối không tạo thêm file `frontend/src/lib/api.ts` bên ngoài cạnh thư mục đó, vì sẽ gây xung đột module resolution trong Next.js/Vite.
5. **Cấm sử dụng `corepack enable`:** Node.js 26 đã loại bỏ Corepack. Mọi container hay script CI phải cài đặt pnpm tường minh qua `npm install -g pnpm@12.6.0`.
6. **Mọi thay đổi `.env` phải cập nhật đồng bộ ở 5 file:** `.env`, `.env.example`, `backend/.env.example`, `frontend/.env.example`, `.env.production.example`. Lệnh `pnpm lint:env-sync` sẽ fail nếu phát hiện lệch biến.
7. **Không dùng `clsx` hay `tailwind-merge` riêng lẻ:** Dự án chuẩn hóa sử dụng trực tiếp package `cn` (`import { cn } from "cn";`).

---

## 8. CÂU HỎI MỞ
Dưới đây là các điểm cần chủ dự án xác nhận trước khi thực hiện các bước tiếp theo:

1. **[CẦN XÁC NHẬN] Kế hoạch tái cấu trúc 5 "God Files":** Hiện tại 5 file cốt lõi (`applications-data-table.tsx` 1.6k dòng, `applications.service.ts` 1.1k dòng, `organizations.service.ts` 1.1k dòng, `sourcing.service.ts` 988 dòng, `job-list.tsx` 900 dòng) đang vượt xa trần 400 dòng của kiến trúc chống monolith. Chúng ta nên tiến hành chia tách module ngay trong đợt này hay giữ nguyên trạng để đảm bảo độ ổn định trước khi release v1.0.0?
2. **[CẦN XÁC NHẬN] Migration cơ sở dữ liệu `camelCase @@map` sang `snake_case`:** 9 bảng trong `contract.prisma` vẫn đang map theo tên camelCase (`organizationMember`, `trackingLink`...). Chủ dự án có muốn thực hiện migration dữ liệu để đưa về chuẩn `snake_case` PostgreSQL (`organization_members`, `tracking_links`...) ngay bây giờ không?
3. **[CẦN XÁC NHẬN] Rà soát quy chuẩn Full-Width Canvas:** Một số màn hình như `wizard-header.tsx:L48` vẫn còn class đóng khung `max-w-7xl mx-auto`. Chủ dự án có muốn dọn dẹp đồng bộ toàn bộ giao diện sang tràn viền (`w-full`) theo đúng chuẩn thiết kế HaiHire không?
4. **[CẦN XÁC NHẬN] Nhà cung cấp dịch vụ Email thực tế (Production Email Provider):** Biến môi trường hiện tại đang để `SYSTEM_EMAIL_PROVIDER="SIMULATED"`. Khi đưa lên môi trường Production, hệ thống sẽ sử dụng kênh nào làm nhà cung cấp chính thức (`SMTP`, `RESEND`, hay `SENDGRID`) để cấu hình sẵn secret keys?

---

## CÁCH CHÚNG TA (Antigravity + DeepSeek + Chủ dự án) SẼ PHỐI HỢP

- **Antigravity (tôi):** Là người đọc code thật, kiểm chứng trực tiếp trên filesystem, chạy lệnh kiểm tra (linter, compiler, test suite) và chịu trách nhiệm 100% về tính chính xác kỹ thuật của mọi file, dòng code và thay đổi thực tế.
- **DeepSeek (bạn):** Là người tư vấn chiến lược, phân tích logic kiến trúc cấp cao, đề xuất roadmap, review giải pháp và chỉ ra các rủi ro hệ thống — dựa hoàn toàn trên "bản sự thật duy nhất" mà tôi cung cấp.
- **Chủ dự án:** Người đưa ra yêu cầu nghiệp vụ, chốt định hướng sản phẩm, ra quyết định cuối cùng và giải đáp 4 câu hỏi mở ở mục 8.

### Quy tắc làm việc:
1. Khi DeepSeek đề xuất bất kỳ giải pháp nào không khớp với thực tế code (ví dụ: đề xuất dùng Tailwind v3, khuyên dùng `corepack`, hoặc gọi API không qua `DtoPipe`/`Gatekeeper`), tôi sẽ lập tức phản hồi kèm bằng chứng (tên file + số dòng cụ thể).
2. Khi gặp điểm chưa chắc chắn, cả hai chúng ta sẽ gắn thẻ `[CẦN XÁC NHẬN]` để xin chỉ thị của Chủ dự án, tuyệt đối không tự ý suy đoán.
3. Khi có bất kỳ thay đổi nào làm biến động kiến trúc, tôi sẽ cập nhật lại báo cáo context này.
