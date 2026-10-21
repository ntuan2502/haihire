# REALITY CHECK — HAIHIRE ENTERPRISE ATS

## Metadata

- **Người yêu cầu:** Chủ dự án HaiHire
- **Người thực hiện:** Antigravity (AI coding agent)
- **Mục đích:** Thu thập reality của codebase làm đầu vào cho audit drift giữa code và documentation
- **Người nhận báo cáo:** DeepSeek (Senior Software Architect & Technical Reviewer)
- **Ngày thực hiện:** 21/10/2026
- **Phiên bản codebase:** `a12ffa8`

---

## 1. Tech stack thực tế

### Dependencies & devDependencies chính theo từng workspace

#### A. Root Workspace (`package.json`)

- **Package Manager:** pnpm 12.6.0 (khai báo tại `backend/package.json:4` và `frontend/package.json:56`).
- **Monorepo Engine & Script Runner:** `tsx` `^4.23.15` (`package.json:76`).
- **E2E Testing:** `@playwright/test` `^1.64.0` (`package.json:71`).
- **Git Hooks & Quality Linter:** `husky` `^9.1.7` (`package.json:73`), `lint-staged` `^17.6.0` (`package.json:74`), `@commitlint/cli` `^21.2.3` (`package.json:69`), `@commitlint/config-conventional` `^21.2.3` (`package.json:70`), `eslint` `^10.12.0` (`package.json:72`), `prettier` `^3.9.10` (`package.json:75`).

#### B. Backend Service (`backend/package.json`)

- **Framework:** NestJS v12 (`@nestjs/core` `^12.1.3` [`backend/package.json:26`], `@nestjs/common` `^12.1.3` [`backend/package.json:24`], `@nestjs/platform-express` `^12.1.3` [`backend/package.json:29`], `@nestjs/config` `^12.0.1` [`backend/package.json:25`]).
- **ORM & DB Client:** Prisma 8 Release Candidate (`prisma` `8.0.0-rc.19` [`backend/package.json:60`], `@prisma/orm-postgres` `8.0.0-rc.13` [`backend/package.json:33`], `@prisma/composer` `0.29.1` [`backend/package.json:31`], `@prisma/composer-prisma-cloud` `0.29.1` [`backend/package.json:32`]).
- **In-Memory Cache & Redis Driver:** `ioredis` `^6.0.0` (`backend/package.json:40`).
- **Asynchronous Queue:** BullMQ (`bullmq` `^6.3.15` [`backend/package.json:36`], `@nestjs/bullmq` `^12.0.0` [`backend/package.json:23`]).
- **Object Storage:** MinIO SDK (`minio` `^8.0.7` [`backend/package.json:41`]).
- **Auth & Security:** `@nestjs/jwt` `^12.0.3` (`backend/package.json:27`), `@nestjs/passport` `^12.0.0` (`backend/package.json:28`), `passport` `^0.7.0` (`backend/package.json:43`), `passport-jwt` `^4.0.1` (`backend/package.json:44`), `bcryptjs` `^3.0.3` (`backend/package.json:35`).
- **Rate Limiting:** `@nestjs/throttler` `^6.7.1` (`backend/package.json:30`).
- **Email Service:** `nodemailer` `^10.1.0` (`backend/package.json:42`).
- **Validation:** Dual-validation layer: `zod` `^4.6.7` (`backend/package.json:47`) cho Env config + `class-validator` `^0.15.1` (`backend/package.json:38`) & `class-transformer` `^0.5.1` (`backend/package.json:37`) cho Controller DTOs.
- **Build Tool:** `esbuild` `^0.28.2` (`backend/package.json:57`), `typescript` `^6.0.3` (`backend/package.json:62`).
- **Testing:** `vitest` `^5.0.4` (`backend/package.json:64`), `@vitest/coverage-v8` `5.0.4` (`backend/package.json:56`).
- **Linter & Static Analysis:** `eslint` `^10.12.0` (`backend/package.json:58`), `typescript-eslint` `^8.71.2` (`backend/package.json:63`).
- **Phụ thuộc đặc biệt/Bất thường:** `alchemy` `2.0.0-beta.79` (`backend/package.json:34`).

#### C. Frontend Web App (`frontend/package.json`)

- **Framework:** Next.js `16.4.0` (`frontend/package.json:31`) (App Router), React `19.3.0` (`frontend/package.json:33`), React DOM `19.3.0` (`frontend/package.json:34`).
- **Data Fetching & Server State:** `@tanstack/react-query` `^5.104.2` (`frontend/package.json:26`), `axios` `^1.20.0` (`frontend/package.json:27`).
- **UI Components & Primitives:** `@base-ui/react` `^1.9.0` (`frontend/package.json:17`), `@radix-ui/react-dialog` `^1.3.1` (`frontend/package.json:22`), `@radix-ui/react-dropdown-menu` `^2.2.1` (`frontend/package.json:23`), `@radix-ui/react-select` `^2.4.1` (`frontend/package.json:24`), `@radix-ui/react-slot` `^1.5.0` (`frontend/package.json:25`), `shadcn` `^4.21.4` (`frontend/package.json:35`), `lucide-react` `^1.56.0` (`frontend/package.json:30`), `sonner` `^2.0.8` (`frontend/package.json:36`).
- **Drag & Drop:** `@dnd-kit/core` `^6.3.1` (`frontend/package.json:18`), `@dnd-kit/sortable` `^10.0.0` (`frontend/package.json:19`), `@dnd-kit/utilities` `^3.2.2` (`frontend/package.json:20`).
- **Styling:** `tailwindcss` `^4` (`frontend/package.json:52`), `@tailwindcss/postcss` `^4` (`frontend/package.json:41`), `tw-animate-css` `^1.4.0` (`frontend/package.json:37`), `class-variance-authority` `^0.7.1` (`frontend/package.json:28`), `cn` `^0.4.0` (`frontend/package.json:29`), `next-themes` `^0.4.6` (`frontend/package.json:32`).
- **Validation:** `zod` `^4.6.7` (`frontend/package.json:38`).
- **Testing:** `vitest` `^5.0.4` (`frontend/package.json:54`), `@vitest/coverage-v8` `5.0.4` (`frontend/package.json:48`), `@testing-library/react` `^16.3.3` (`frontend/package.json:43`), `@testing-library/jest-dom` `^7.0.1` (`frontend/package.json:42`), `jsdom` `^30.1.2` (`frontend/package.json:51`).
- **Linter:** `eslint` `^10.12.0` (`frontend/package.json:49`), `eslint-config-next` `16.4.0` (`frontend/package.json:50`).

#### D. Shared Package (`packages/shared/package.json`)

- **Package Name:** `@haihire/shared` `0.2.0` (`packages/shared/package.json:2-3`).
- **TypeScript:** `typescript` `^6.0.3` (`packages/shared/package.json:19`).

---

## 2. Cấu trúc thực tế

### Số lượng file theo từng thư mục lớn (không tính `node_modules`, `.next`, `dist`)

- `frontend/src`: **340 files**
- `backend/src`: **187 files**
- `shared`: **KHÔNG CÓ THƯ MỤC NÀY Ở ROOT**. Thư mục thực tế là `packages/shared`: **22 files** (trong đó `packages/shared/src`: **12 files**).
- `scripts`: **23 files**
- `monitoring`: **2 files** (`monitoring/prometheus/alert-rules.yml` và `monitoring/prometheus/alert-rules.spec.ts`)
- `.github/workflows`: **7 files**

### Module/chức năng chính trong `backend/src` (Dẫn chứng: `backend/src/app.module.ts:6-26, 59-75`)

1. **Core & Infrastructure:**
   - `prisma` (`backend/src/prisma/`): Database connection pool, Prisma 8 client, graceful connection handling.
   - `redis` (`backend/src/redis/`): Valkey/Redis client kết nối BullMQ và caching.
   - `minio` (`backend/src/minio/`): S3 object storage upload, download authenticated files, presigned URLs.
   - `metrics` (`backend/src/metrics/`): Prometheus metrics exporter (`/metrics`).
   - `config` (`backend/src/config/env.ts`): Fail-fast Zod environment parsing.
   - `common` (`backend/src/common/`): Global HTTP filters, Correlation ID middleware, TenantGuard, DtoPipe, file upload magic bytes validator, orphan cleanup logic.
2. **Business Domain Modules:**
   - `auth` (`backend/src/auth/`): Passport JWT, login, register, onboarding, refresh token, HttpOnly cookie setter.
   - `organizations` (`backend/src/organizations/`): Tenant management, organization members, invitations, multi-tenancy context.
   - `jobs` (`backend/src/jobs/`): Job requisitions CRUD, slug generator, pipeline stages definition, public careers view.
   - `candidates` (`backend/src/candidates/`): Candidate profiles, talent pool, document attachment, soft-delete.
   - `applications` (`backend/src/applications/`): Recruitment workflow, application submission with resume upload, stage transition saga (`applications-saga.service.ts`), notes, scorecards.
   - `interviews` (`backend/src/interviews/`): Interview scheduling, Google/Outlook calendar link generation, scorecard evaluation.
   - `activities` (`backend/src/activities/`): Timeline audit logs cho ứng viên và hồ sơ ứng tuyển.
   - `email` (`backend/src/email/`): BullMQ async email queue, variable interpolation registry (`variable-registry.ts`), SMTP / Resend / SendGrid providers.
   - `sourcing` (`backend/src/sourcing/`): UTM parameters generator, tracking link attribution, click telemetry.
   - `webhook-settings` (`backend/src/webhook-settings/`): Webhook integrations (Telegram, Discord, Generic webhook) kèm AES-256 encrypted tokens.
   - `events` (`backend/src/events/`): Server-Sent Events (SSE) notification streaming tới frontend client.
   - `users` (`backend/src/users/`): User profile, password management.

### Route / Page chính trong `frontend/src`

- **Loại Router:** **Next.js App Router** (toàn bộ nằm trong `frontend/src/app`, không sử dụng Pages Router — `frontend/src/app/page.tsx`).
- **Danh sách 32 `page.tsx` routes thực tế:**
  1. Root Landing Page: `/` (`frontend/src/app/page.tsx`)
  2. Auth:
     - `/auth/login` (`frontend/src/app/auth/login/page.tsx`)
     - `/auth/register` (`frontend/src/app/auth/register/page.tsx`)
     - `/auth/onboarding` (`frontend/src/app/auth/onboarding/page.tsx`)
     - `/auth/join/[token]` (`frontend/src/app/auth/join/[token]/page.tsx`)
  3. Public Careers Portal:
     - `/careers` (`frontend/src/app/careers/page.tsx`)
     - `/careers/[orgSlug]` (`frontend/src/app/careers/[orgSlug]/page.tsx`)
     - `/careers/[orgSlug]/[jobSlug]` (`frontend/src/app/careers/[orgSlug]/[jobSlug]/page.tsx`)
  4. ATS Dashboard Core:
     - `/dashboard` (`frontend/src/app/dashboard/page.tsx`)
     - `/dashboard/applications` (`frontend/src/app/dashboard/applications/page.tsx`)
     - `/dashboard/applications/[id]` (`frontend/src/app/dashboard/applications/[id]/page.tsx`)
     - `/dashboard/candidates` (`frontend/src/app/dashboard/candidates/page.tsx`)
     - `/dashboard/candidates/new` (`frontend/src/app/dashboard/candidates/new/page.tsx`)
     - `/dashboard/candidates/[id]` (`frontend/src/app/dashboard/candidates/[id]/page.tsx`)
     - `/dashboard/candidates/[id]/edit` (`frontend/src/app/dashboard/candidates/[id]/edit/page.tsx`)
     - `/dashboard/interviews` (`frontend/src/app/dashboard/interviews/page.tsx`)
     - `/dashboard/jobs` (`frontend/src/app/dashboard/jobs/page.tsx`)
     - `/dashboard/jobs/new` (`frontend/src/app/dashboard/jobs/new/page.tsx`)
     - `/dashboard/jobs/[id]` (`frontend/src/app/dashboard/jobs/[id]/page.tsx`)
     - `/dashboard/jobs/[id]/pipeline` (`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx`)
     - `/dashboard/jobs/[id]/settings` (`frontend/src/app/dashboard/jobs/[id]/settings/page.tsx`)
     - `/dashboard/jobs/[id]/table` (`frontend/src/app/dashboard/jobs/[id]/table/page.tsx`)
     - `/dashboard/jobs/[id]/tracking` (`frontend/src/app/dashboard/jobs/[id]/tracking/page.tsx`)
     - `/dashboard/source-tracking` (`frontend/src/app/dashboard/source-tracking/page.tsx`)
     - `/dashboard/source-tracking/[id]` (`frontend/src/app/dashboard/source-tracking/[id]/page.tsx`)
  5. Settings:
     - `/dashboard/settings` (`frontend/src/app/dashboard/settings/page.tsx`)
     - `/dashboard/settings/[tab]` (`frontend/src/app/dashboard/settings/[tab]/page.tsx`)
     - `/dashboard/settings/members` (`frontend/src/app/dashboard/settings/members/page.tsx`)
     - `/dashboard/settings/integrations` (`frontend/src/app/dashboard/settings/integrations/page.tsx`)
     - `/dashboard/settings/email-templates` (`frontend/src/app/dashboard/settings/email-templates/page.tsx`)
     - `/dashboard/settings/email-templates/logs` (`frontend/src/app/dashboard/settings/email-templates/logs/page.tsx`)
     - `/dashboard/settings/email-templates/settings` (`frontend/src/app/dashboard/settings/email-templates/settings/page.tsx`)

---

## 3. CI gates thực tế

### A. Chi tiết các workflow và trạng thái Gate

| Workflow              | Job                 | Lệnh chạy                                                                                       | Script / Nơi định nghĩa                                                        | Tính chất                                    | Dẫn chứng file:line                         |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------- |
| `ci-feature.yml`      | `fast-checks`       | `pnpm lint:doc-links`                                                                           | `scripts/verify-doc-links.ts`                                                  | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:91`       |
|                       |                     | `pnpm lint:env-sync`                                                                            | `scripts/check-env-sync.ts`                                                    | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:95`       |
|                       |                     | `pnpm lint:i18n`                                                                                | `frontend/scripts/check-i18n.ts`                                               | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:99`       |
|                       |                     | `pnpm lint`                                                                                     | `pnpm --filter ./backend --filter ./frontend --parallel run lint`              | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:103`      |
|                       |                     | `pnpm typecheck`                                                                                | `tsc --noEmit` (backend + frontend)                                            | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:107`      |
|                       |                     | `pnpm audit --audit-level=high --prod \|\| true`                                                | pnpm audit CLI                                                                 | **CẢNH BÁO** (có `\|\| true`)                | `.github/workflows/ci-feature.yml:115`      |
|                       | `unit-tests`        | `pnpm --filter backend test`<br>`pnpm --filter frontend test`                                   | `vitest run` (node + jsdom)                                                    | **BLOCK MERGE**                              | `.github/workflows/ci-feature.yml:156-160`  |
| `ci-dev.yml`          | `ci-gates`          | `pnpm check:all:fast`                                                                           | `scripts/check-all.ts --fast` (chạy 12 architectural quality gates)            | **BLOCK MERGE**                              | `.github/workflows/ci-dev.yml:130`          |
|                       | `unit-tests`        | `node --experimental-strip-types scripts/check-test-count.ts HEAD~1 HEAD \|\| true`             | `scripts/check-test-count.ts`                                                  | **CẢNH BÁO** (có `\|\| true`)                | `.github/workflows/ci-dev.yml:210`          |
|                       |                     | `pnpm test`                                                                                     | vitest monorepo                                                                | **BLOCK MERGE**                              | `.github/workflows/ci-dev.yml:213`          |
|                       | `docs-verify`       | `pnpm lint:doc-links`<br>`pnpm lint:i18n`                                                       | Verify links + translation dictionary                                          | **BLOCK MERGE** (khi docs-only)              | `.github/workflows/ci-dev.yml:244-247`      |
| `ci-staging.yml`      | `ci-gates`          | `pnpm check:all:fast`                                                                           | `scripts/check-all.ts --fast`                                                  | **BLOCK MERGE**                              | `.github/workflows/ci-staging.yml:130`      |
|                       | `unit-tests`        | `pnpm --filter ./backend run test --coverage`<br>`pnpm --filter ./frontend run test --coverage` | `vitest run --coverage`                                                        | **BLOCK MERGE**                              | `.github/workflows/ci-staging.yml:214-215`  |
|                       | `e2e`               | `pnpm test:e2e`                                                                                 | `playwright test` (10 user journeys với Postgres, Redis, MinIO container thật) | **BLOCK MERGE**                              | `.github/workflows/ci-staging.yml:365`      |
|                       | `build`             | `pnpm build`                                                                                    | `tsc` + `esbuild` + `next build`                                               | **BLOCK MERGE**                              | `.github/workflows/ci-staging.yml:425`      |
| `ci-main.yml`         | `full-check`        | `pnpm check:all`                                                                                | `scripts/check-all.ts` (12 gate + 563 unit tests)                              | **BLOCK MERGE**                              | `.github/workflows/ci-main.yml:89`          |
|                       | `security-audit`    | Inline node script lọc trực tiếp Critical/High direct dependencies                              | `ci-main.yml` script kiểm tra direct CVEs                                      | **BLOCK MERGE** (exit code 1 nếu direct CVE) | `.github/workflows/ci-main.yml:112-136`     |
|                       | `e2e`               | `pnpm test:e2e`                                                                                 | `playwright test`                                                              | **BLOCK MERGE**                              | `.github/workflows/ci-main.yml:281`         |
|                       | `docker-verify`     | `docker/build-push-action@v6` (dry-run, push: false)                                            | `backend/Dockerfile`, `frontend/Dockerfile`                                    | **BLOCK MERGE**                              | `.github/workflows/ci-main.yml:305-321`     |
| `cd-release.yml`      | `publish-images`    | `docker/build-push-action@v6` (push: true)                                                      | Build và đẩy image lên GHCR                                                    | **BLOCK DEPLOY**                             | `.github/workflows/cd-release.yml:73-104`   |
|                       | `trivy-scan`        | `aquasecurity/trivy-action@master`                                                              | Scan CVE container image                                                       | **CẢNH BÁO** (`continue-on-error: true`)     | `.github/workflows/cd-release.yml:137, 158` |
|                       | `create-release`    | `softprops/action-gh-release@v2`                                                                | Tạo GitHub Release tag kèm changelog                                           | **BLOCK DEPLOY**                             | `.github/workflows/cd-release.yml:187-195`  |
| `e2e-weekly.yml`      | `e2e`               | `pnpm test:e2e`                                                                                 | Playwright chạy định kỳ 03:00 UTC thứ 2                                        | **CẢNH BÁO/ALERT**                           | `.github/workflows/e2e-weekly.yml:157`      |
| `security-weekly.yml` | `audit`             | `pnpm audit --audit-level=moderate --json > audit-report.json \|\| true`                        | Moderate & High CVE scan                                                       | **CẢNH BÁO** (có `\|\| true`)                | `.github/workflows/security-weekly.yml:36`  |
|                       | `tenant-isolation`  | `pnpm lint:tenant-scope`                                                                        | `scripts/check-tenant-scoping.ts`                                              | **BLOCK CI**                                 | `.github/workflows/security-weekly.yml:68`  |
|                       | `dependency-check`  | `pnpm outdated > outdated-report.txt \|\| true`                                                 | Kiểm tra thư viện lỗi thời                                                     | **CẢNH BÁO** (có `\|\| true`)                | `.github/workflows/security-weekly.yml:90`  |
|                       | `notify-on-failure` | Webhook dispatch tới Slack                                                                      | `curl -X POST ...`                                                             | **ALERT DISPATCH**                           | `.github/workflows/security-weekly.yml:114` |

### B. Danh sách 12 Architectural Gates bên trong `scripts/check-all.ts:41-134`

1. `lint:env-sync`: `scripts/check-env-sync.ts` — Đối chiếu 100% key parity giữa `.env` và `.env.example`, Docker compose variable coverage (`scripts/check-all.ts:43-48`).
2. `lint:i18n`: `frontend/scripts/check-i18n.ts` — Kiểm tra tính đồng nhất 2 chiều giữa từ điển `vi.ts` / `en.ts` và quét string JSX không dùng hàm `t()` (`scripts/check-all.ts:50-56`).
3. `lint`: `pnpm lint` — ESLint toàn monorepo (`scripts/check-all.ts:58-63`).
4. `typecheck`: `pnpm typecheck` — TypeScript compiler strict checking (`tsc --noEmit`) (`scripts/check-all.ts:65-70`).
5. `lint:dtopipe`: `scripts/check-dtopipe-coverage.ts` — Đảm bảo 100% tham số `@Body()` trong Controller được bọc bởi `DtoPipe` (`scripts/check-all.ts:72-78`).
6. `lint:error-i18n`: `scripts/check-error-code-i18n.ts` — Kiểm tra toàn bộ 51 mã lỗi nghiệp vụ của `APP_ERROR_CODES` đều có bản dịch trong `vi.ts` và `en.ts` (`scripts/check-all.ts:80-85`).
7. `lint:api-contract`: `scripts/check-api-contract-coverage.ts` — Audit API contract coverage, cấm rò rỉ mã lỗi raw và cấm dùng hàm `alert()` trên browser (`scripts/check-all.ts:87-93`).
8. `lint:prometheus-rules`: `scripts/check-prometheus-rules.ts` — Xác thực cú pháp file Prometheus `alert-rules.yml` và nhãn `team: sre` (`scripts/check-all.ts:95-101`).
9. `lint:tenant-scope`: `scripts/check-tenant-scoping.ts` — Static AST analysis đảm bảo 100% câu truy vấn Prisma trong tenant module có lọc theo `organizationId` (`scripts/check-all.ts:103-109`).
10. `lint:doc-links`: `scripts/verify-doc-links.ts` — Kiểm tra toàn vẹn liên kết Markdown tài liệu (`scripts/check-all.ts:111-117`).
11. `check:prod-email-provider`: `scripts/check-prod-email-provider.ts` — Chặn khởi động production nếu `SYSTEM_EMAIL_PROVIDER` vẫn để `SIMULATED` (`scripts/check-all.ts:119-125`).
12. `test:diff`: `scripts/check-test-count.ts` — Chống suy giảm số lượng test case so với commit trước (`scripts/check-all.ts:127-133`).

---

## 4. Test coverage thực tế

### Phân bổ số lượng file test (tổng cộng: 110 files)

- **Backend:** **44 files** (chứa 406 test cases, ví dụ: `backend/src/jobs/jobs.service.spec.ts`, `backend/src/test/tenant-isolation.spec.ts`).
- **Frontend Unit/Component:** **54 files** (chứa 200 test cases, ví dụ: `frontend/src/components/jobs/job-list.spec.tsx`, `frontend/src/components/applications/applications-data-table.spec.tsx`).
- **Frontend E2E (Playwright):** **8 files** (nằm tại `frontend/tests/e2e/`, ví dụ: `frontend/tests/e2e/login-flow.spec.ts`, `frontend/tests/e2e/kanban-drag-drop.spec.ts`).
- **Shared (`packages/shared`):** **0 files** (không có file test nào trong `packages/shared/src/`).
- **Monitoring:** **1 file** (`monitoring/prometheus/alert-rules.spec.ts`).
- **Scripts:** **3 files** (`scripts/check-prod-email-provider.spec.ts`, `scripts/check-tenant-scoping.spec.ts`, `scripts/cleanup-orphan-minio.spec.ts`).

### File test bị `.skip`, `.todo`, `xit`, `fit`

- `test.skip`: Có **duy nhất 1 file** chứa lệnh `test.skip` có điều kiện:
  - `frontend/tests/e2e/tenant-security.spec.ts:45`:
    `test.skip(true, \`Skipping tenant security test: ${setupError}\`);`*(Chỉ skip khi bước đăng nhập khởi tạo`beforeEach` của E2E runner thất bại).*
- `.todo`, `xit`, `fit`: **0 trường hợp** (không có file nào bị skip vĩnh viễn hoặc đánh dấu todo).

### Config coverage threshold

- **Thực tế:** **KHÔNG CÓ cấu hình coverage threshold nào** trong toàn bộ codebase.
  - Tại `backend/vitest.config.ts:5-15` và `frontend/vitest.config.mts:5-19`, Vitest chỉ cấu hình `environment`, `include`, `setupFiles` và `alias`, hoàn toàn không có thuộc tính `coverage.thresholds` (`lines`, `functions`, `branches`, `statements`).
  - Mặc dù workflow `ci-staging.yml` chạy `pnpm --filter ./backend run test --coverage` (`ci-staging.yml:214-215`), nhưng Vitest không đặt điều kiện chặn khi độ phủ giảm dưới một ngưỡng % nhất định.

---

## 5. Env vars thực tế

### Danh sách 28 biến trong `.env.example` (`.env.example:15-99`)

| STT | Tên biến                  | Mục đích suy ra từ code                                                 | Bắt buộc (Code validation)                     | Nơi sử dụng & Dẫn chứng                |
| --- | ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| 1   | `NODE_ENV`                | Xác định môi trường thực thi (`development`, `production`, `test`)      | Có (default `development`)                     | `backend/src/config/env.ts:14`         |
| 2   | `BACKEND_PORT`            | Cổng HTTP listener của Backend NestJS                                   | Có (bắt buộc số 1-65535, fallback 3001)        | `backend/src/config/env.ts:15-19, 128` |
| 3   | `FRONTEND_PORT`           | Cổng dev server của Next.js                                             | Có (dùng trong rewrites & CORS origin)         | `frontend/next.config.ts:14`           |
| 4   | `POSTGRES_USER`           | Tên user kết nối PostgreSQL                                             | Không (Dùng bởi Docker Compose & fallback URL) | `docker-compose.yml:16`                |
| 5   | `POSTGRES_PASSWORD`       | Mật khẩu user PostgreSQL                                                | Không (Dùng bởi Docker Compose & fallback URL) | `docker-compose.yml:17`                |
| 6   | `POSTGRES_DB`             | Tên cơ sở dữ liệu PostgreSQL                                            | Không (Dùng bởi Docker Compose & fallback URL) | `docker-compose.yml:18`                |
| 7   | `POSTGRES_PORT`           | Cổng kết nối PostgreSQL của host máy chủ                                | Không (Dùng để rewrite localhost port)         | `backend/src/config/env.ts:130-138`    |
| 8   | `DATABASE_URL`            | Chuỗi URI kết nối PostgreSQL cho Prisma 8                               | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:20`         |
| 9   | `REDIS_PORT`              | Cổng kết nối Valkey / Redis                                             | Không (fallback 6379 tại Nest BullMQ)          | `backend/src/app.module.ts:53`         |
| 10  | `REDIS_PASSWORD`          | Mật khẩu xác thực Redis / Valkey                                        | Không (tùy chọn)                               | `backend/src/app.module.ts:54`         |
| 11  | `MINIO_ENDPOINT`          | Hostname của MinIO server                                               | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:28`         |
| 12  | `MINIO_PORT`              | Cổng API của MinIO                                                      | **Bắt buộc** (`z.coerce.number().int()`)       | `backend/src/config/env.ts:29`         |
| 13  | `MINIO_CONSOLE_PORT`      | Cổng giao diện Web MinIO Console                                        | Không (Dùng trong Docker Compose)              | `docker-compose.yml:44`                |
| 14  | `MINIO_USE_SSL`           | Cờ kích hoạt SSL cho MinIO client                                       | **Bắt buộc** (`true/false/1/0`)                | `backend/src/config/env.ts:30-32`      |
| 15  | `MINIO_ACCESS_KEY`        | Access key xác thực MinIO                                               | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:33`         |
| 16  | `MINIO_SECRET_KEY`        | Secret key xác thực MinIO                                               | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:34`         |
| 17  | `MINIO_BUCKET_NAME`       | Tên bucket chứa hồ sơ ứng viên                                          | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:35`         |
| 18  | `MINIO_PUBLIC_URL`        | URL công khai của MinIO download                                        | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:36`         |
| 19  | `JWT_SECRET`              | Secret key ký và giải mã JWT token                                      | **Bắt buộc** (`min(16)`)                       | `backend/src/config/env.ts:21-23`      |
| 20  | `ENCRYPTION_SECRET`       | Khóa giải mã AES-256 webhook/SMTP secrets                               | **Bắt buộc** (`min(32)`)                       | `backend/src/config/env.ts:24-26`      |
| 21  | `DEMO_SEED_PASSWORD`      | Mật khẩu seed cho các tài khoản demo                                    | Không (Dùng bởi seed script và test)           | `backend/src/prisma/seed.ts:38`        |
| 22  | `FRONTEND_URL`            | Whitelist CORS cho phép frontend gọi backend                            | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:27`         |
| 23  | `INTERNAL_API_URL`        | Địa chỉ backend dùng cho Next.js SSR                                    | **Bắt buộc trên SSR** (`min(1)`)               | `frontend/src/lib/env.ts:13-16`        |
| 24  | `NEXT_PUBLIC_API_URL`     | Địa chỉ API công khai phía browser                                      | Không (mặc định rỗng để dùng proxy rewrites)   | `frontend/src/lib/env.ts:7`            |
| 25  | `NEXT_PUBLIC_MINIO_URL`   | Prefix URL tải resume trên browser                                      | Không (default `/haihire-resumes`)             | `frontend/src/lib/env.ts:8`            |
| 26  | `SYSTEM_EMAIL_PROVIDER`   | Provider gửi email hệ thống (`SIMULATED`, `SMTP`, `RESEND`, `SENDGRID`) | **Bắt buộc** (`z.enum`)                        | `backend/src/config/env.ts:38`         |
| 27  | `SYSTEM_EMAIL_FROM_NAME`  | Tên hiển thị người gửi email                                            | **Bắt buộc** (`z.string().min(1)`)             | `backend/src/config/env.ts:39`         |
| 28  | `SYSTEM_EMAIL_FROM_EMAIL` | Địa chỉ email người gửi hệ thống                                        | **Bắt buộc** (`z.string().email()`)            | `backend/src/config/env.ts:40`         |

_(Ghi chú: Các biến phụ thuộc SMTP/Resend/SendGrid như `SYSTEM_EMAIL_SMTP_HOST`, `SYSTEM_EMAIL_SMTP_USER`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_RESEND_API_KEY`, `SYSTEM_EMAIL_SENDGRID_API_KEY` được validate có điều kiện tại `backend/src/config/env.ts:85-123` khi provider tương ứng được bật)._

### Drift ngược: Biến được dùng trong code nhưng KHÔNG có trong `.env.example`

1. **`REDIS_HOST`**: Dùng tại `backend/src/app.module.ts:52` và `backend/src/app.service.ts:42` (`configService.get("REDIS_HOST", "localhost")`). Trong `.env.example` chỉ có `REDIS_PORT` và `REDIS_PASSWORD`, hoàn toàn thiếu `REDIS_HOST`.
2. **`BACKEND_HOST`**: Dùng tại `frontend/next.config.ts:17-18` để dựng URL rewrites khi chạy container (`http://${process.env.BACKEND_HOST}:${backendPort}`).
3. **`MINIO_HOST`**: Dùng tại `frontend/next.config.ts:20-21` để rewrite proxy sang MinIO (`http://${process.env.MINIO_HOST}:${minioPort}`).
4. **`NEXT_PUBLIC_DEMO_SEED_PASSWORD`**: Dùng tại `frontend/src/constants/auth.constants.ts:2` để gán password mặc định cho tài khoản demo. Trong `.env.example:59` biến này lại có tên là `DEMO_SEED_PASSWORD` (không có prefix `NEXT_PUBLIC_`).
5. **`PORT`**: Dùng làm fallback tại `frontend/next.config.ts:14` và `backend/src/config/env.ts:128`.
6. **`POSTGRES_HOST`**, **`BACKUP_DIR`**, **`BACKUP_RETENTION_DAYS`**, **`POSTGRES_CONTAINER`**, **`MINIO_CONTAINER`**: Dùng trong script sao lưu tại `scripts/backup-production.ts:27-34`.
7. **`GITHUB_REPOSITORY_OWNER`**, **`IMAGE_TAG`**, **`FRONTEND_API_URL`**: Có xuất hiện trong `.env.production.example:16-17, 64` nhưng bị bỏ sót trong `.env.example`.

---

## 6. Dependencies đáng chú ý

### A. Packages ở trạng thái Release Candidate (RC) / Beta / Alpha

- `@prisma/orm-postgres`: `8.0.0-rc.13` (`backend/package.json:33`).
- `prisma`: `8.0.0-rc.19` (`backend/package.json:60`, `pnpm-workspace.yaml:26`).
- `alchemy`: `2.0.0-beta.79` (`backend/package.json:34`).
- `effect`: `4.0.0-rc.111` (Bị override tại `pnpm-workspace.yaml:28`).

### B. Trạng thái cập nhật package (Dựa trên `pnpm outdated`)

Chạy `pnpm outdated` cho thấy hầu hết các package được ghim rất sát phiên bản mới nhất. Chỉ có 4 devDependencies có bản cập nhật patch nhỏ:

- `@commitlint/cli`: `21.2.3` -> `21.2.4` (`package.json:69`)
- `@commitlint/config-conventional`: `21.2.3` -> `21.2.4` (`package.json:70`)
- `@playwright/test`: `1.64.0` -> `1.64.1` (`package.json:71`)
- `eslint`: `10.12.0` -> `10.13.0` (`package.json:72`)

### C. Known Vulnerabilities (Kết quả chạy thực tế `pnpm audit`)

- **Kết quả:** Phát hiện **61 lỗ hổng** (`3 low`, `47 moderate`, `11 high`).
- **Nguồn gốc:** Toàn bộ lỗ hổng High đều xuất phát từ dependency con gián tiếp của `alchemy: 2.0.0-beta.79` và `@prisma/composer: 0.29.1`:
  - `hono < 4.12.4` (GHSA-q5qw-h33p-qvwr - Arbitrary file access qua `serveStatic`).
  - `@hono/node-server` (GHSA-hm8q-7f3q-5f36 - Authorization bypass cho static paths).
  - Chuỗi dependency: `backend > @prisma/composer > alchemy > @prisma/dev > hono`.
- **Dẫn chứng xử lý trong CI:** Do tồn tại các lỗ hổng gián tiếp này, workflow `ci-main.yml:110-136` phải viết một script custom chỉ lọc các lỗ hổng của _direct dependencies_ (`!p.includes('>')`), bỏ qua các cảnh báo do `alchemy` gây ra.

### D. Package trùng lặp chức năng & Thừa thãi

1. **Trùng lặp UI Primitives:** Cài đặt đồng thời cả `@base-ui/react: ^1.9.0` (`frontend/package.json:17`) và họ `@radix-ui/react-*` (`frontend/package.json:22-25`).
2. **Trùng lặp Validation:** Backend sử dụng song song cả `zod: ^4.6.7` (`backend/package.json:47`) lẫn `class-validator: ^0.15.1` + `class-transformer: ^0.5.1` (`backend/package.json:37-38`).
3. **Dependency thừa (Dead Dependency):** `alchemy: 2.0.0-beta.79` (`backend/package.json:34`) được khai báo trong dependencies nhưng **hoàn toàn không được import ở bất kỳ file nào trong `backend/src/`**. Package này chính là nguồn cơn kéo theo 61 lỗ hổng bảo mật của Hono đã nêu ở trên.

---

## 7. Code patterns thực tế

### A. Cách gọi API từ frontend

- **Mô hình kết hợp:** Khởi tạo instance `axios` tập trung (`api`) tại `frontend/src/lib/api/client.ts:33-54`, thiết lập `withCredentials: true`, gắn request interceptor kiểm tra và từ chối các URL lỗi chứa `[object Object]`.
- Phía trên Axios là các module API nghiệp vụ (`jobsApi`, `candidatesApi`, `applicationsApi` trong `frontend/src/lib/api/`).
- Phía UI gọi thông qua các custom query hook bọc `@tanstack/react-query` (`useQuery`, `useMutation`), sử dụng centralized `queryKeys`.
- **Dẫn chứng:** `frontend/src/hooks/use-job-queries.ts:29-50`.

### B. Cách quản lý state

- **Server State:** Quản lý tập trung 100% bằng TanStack Query v5 (`@tanstack/react-query`). Tất cả mutation đều kích hoạt hủy và làm mới cache thông qua `queryClient.invalidateQueries`.
- **Client / Session State:** Sử dụng chuẩn React Context API thuần:
  - Auth State: `frontend/src/context/auth-context.tsx:28-45` lưu trữ session user, active organization, SSE connection.
- **Theme State:** `next-themes` (`frontend/src/providers/theme-provider.tsx`).
- **URL & Table State:** Đồng bộ filter, pagination, sorting trực tiếp vào URL query params qua custom hook `frontend/src/hooks/use-table-params.ts`.
- **Không sử dụng:** Hoàn toàn **không dùng Redux hay Zustand** (cả hai thư viện đều không có trong `frontend/package.json`).

### C. Cách viết test

- **Framework & Runner:** Vitest v5 (`vitest run`).
- **Mô hình kiểm thử:** Áp dụng chặt chẽ mẫu **AAA (Arrange - Act - Assert)**.
- **Mock Strategy Backend:** Tự định nghĩa in-memory state repository (Mock datasets `mockJobs`, `mockApps`) kết hợp `vi.fn()` để mock Prisma service thay vì kết nối database thật trong unit test.
  - **Dẫn chứng:** `backend/src/jobs/jobs.service.spec.ts:36-50`.
- **Component Test Frontend:** `@testing-library/react` render trong môi trường `jsdom`, mô phỏng user interaction thông qua `fireEvent` và kiểm tra DOM assertions bằng `@testing-library/jest-dom`.
  - **Dẫn chứng:** `frontend/src/components/jobs/job-list.spec.tsx:50-80`.
- **E2E Test:** Playwright (`@playwright/test`) thực thi các kịch bản trình duyệt hoàn chỉnh (`chromium`), kiểm tra cookie HttpOnly, chuyển đổi workspace và kéo thả Kanban.
  - **Dẫn chứng:** `frontend/tests/e2e/login-flow.spec.ts:1-40`.

### D. Cách xử lý error

- **Backend Global Filter:** Toàn bộ exception được gom qua `GlobalExceptionFilter` đăng ký tại `backend/src/common/http-exception.filter.ts:11-54`.
  - Phân loại lỗi Throttler (HTTP 429) -> trả về `TOO_MANY_REQUESTS`.
  - Chuẩn hóa lỗi `HttpException` và Duck-typed NestJS exception (do ảnh hưởng của ESM/CJS hazard).
  - Lỗi không xác định chuyển thành HTTP 500 (`Internal server error`).
- **Frontend Error Envelope & i18n:** Hàm `getApiErrorMessage` tại `frontend/src/lib/api-error.ts:15-50` đọc payload mã lỗi chuẩn hóa (`APP_ERROR_CODES`), map trực tiếp sang translation key `errors.${payload.code}` trong từ điển đa ngôn ngữ kèm dynamic parameter substitution.

### E. Cách validate input

- **Controller DTOs (Backend):** Sử dụng `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, `@IsEmail()`, `@IsEnum()`) kết hợp `class-transformer` (`@Type()`).
  - Đặc biệt, do sử dụng `esbuild` khi compile bundle làm mất runtime TypeScript decorator metadata, toàn bộ `@Body()` parameter trong controller được ép chặt metatype thông qua custom factory `DtoPipe(TargetDto)`.
  - **Dẫn chứng:** `backend/src/common/dto-validation.pipe.ts:8-14` và `backend/src/jobs/jobs.controller.ts:86, 101`.
- **Environment & Schemas (Backend & Frontend):** Sử dụng `zod` (`z.object({...})`) với cơ chế fail-fast ngay khi khởi động app:
  - **Dẫn chứng:** `backend/src/config/env.ts:13-64` và `frontend/src/lib/env.ts:6-16`.

---

## 8. Điểm đáng ngờ

### A. TODO / FIXME / HACK / XXX

- **Kết quả quét toàn repo:** **0 dòng** (không tìm thấy bất kỳ comment `TODO`, `FIXME`, `HACK`, `XXX` nào trong các file code nguồn và config).

### B. Dead code nghi ngờ

1. **`alchemy` dependency:** Khai báo tại `backend/package.json:34`, không được import hay sử dụng ở bất kỳ dòng code nào trong `backend/src/`.
2. **Thư mục script lưu trữ không còn sử dụng:** Thư mục `scripts/archive/` chứa `list-doc-inventory.ts` và `test-valkey-bullmq.ts` vẫn được lưu trữ trong git tree.
3. **Thư mục `shared/` ảo:** Không có thư mục `shared/` tại thư mục gốc như mô tả trong một số tài liệu; thư mục mã nguồn thực tế là `packages/shared/`.

### C. File có độ dài vượt quá 500 dòng code (LOC)

_(Không tính file `contract.d.ts` do Prisma generate dài 6,218 dòng, và các file từ điển i18n `vi.ts`/`en.ts` dài ~2,100 dòng)_:

**Source Code (> 500 LOC):**

1. `backend/src/prisma/seed.ts` — **1,918 dòng** (Script seed database khổng lồ).
2. `frontend/src/app/dashboard/settings/members/page.tsx` — **747 dòng**.
3. `frontend/src/app/dashboard/interviews/page.tsx` — **716 dòng**.
4. `frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx` — **684 dòng**.
5. `backend/src/sourcing/services/sourcing-metrics.service.ts` — **666 dòng**.
6. `frontend/src/components/landing/landing-ats-preview.tsx` — **656 dòng**.
7. `frontend/src/app/dashboard/settings/integrations/page.tsx` — **605 dòng**.
8. `backend/src/interviews/interviews.service.ts` — **586 dòng**.
9. `frontend/src/components/careers/job-details-client.tsx` — **583 dòng**.
10. `frontend/src/components/jobs/wizard/wizard-step-details.tsx` — **577 dòng**.
11. `frontend/src/components/interviews/interviews-table-view.tsx` — **515 dòng**.

**Test/Spec Code (> 500 LOC):**

1. `frontend/src/hooks/mutation-onerror.spec.ts` — **841 dòng**.
2. `backend/src/email/email.service.spec.ts` — **671 dòng**.
3. `backend/src/applications/applications.service.spec.ts` — **664 dòng**.
4. `backend/src/webhook-settings/webhook-settings.service.spec.ts` — **661 dòng**.
5. `frontend/src/components/applications/applications-data-table.spec.tsx` — **609 dòng**.
6. `backend/src/organizations/organizations.service.spec.ts` — **579 dòng**.
7. `backend/src/test/transactions.spec.ts` — **553 dòng**.
8. `frontend/src/components/interviews/interviews-calendar-view.spec.tsx` — **553 dòng**.
9. `backend/src/applications/services/applications-saga.service.spec.ts` — **516 dòng**.

### D. Hardcoded strings quan trọng & Magic numbers

1. **Hardcoded Demo Accounts & Password:**
   - `frontend/src/constants/auth.constants.ts:2, 7, 14`:
     Hardcoded tài khoản `admin@tun.io.vn` và `member@tun.io.vn` kèm fallback password `"dev-seed-password-2026"`.
2. **Hardcoded File Size Limit (10MB):**
   - Giá trị `10 * 1024 * 1024` được hardcode lặp lại ở 4 controller endpoints:
     - `backend/src/applications/applications.controller.ts:85, 124`
     - `backend/src/candidates/candidates.controller.ts:73, 105`
3. **Hardcoded Role Names:**
   - String literals `"ADMIN"` và `"MEMBER"` xuất hiện hardcoded trực tiếp trong Decorator `@Roles("ADMIN")` (`backend/src/jobs/jobs.controller.ts:84, 98, 109`) và trong logic so khớp của `backend/src/auth/roles.guard.ts:16, 30`.
4. **Magic Numbers trong Graceful Shutdown:**
   - Timeout 30 giây (`30000` ms) hardcoded tại `backend/src/main.ts:133-138`.

### E. console.log / console.error còn sót

- **`console.log` trong runtime code:**
  - `backend/src/prisma/prisma.service.ts:88-90`: In ra log demo accounts khi khởi tạo database.
- **`console.error` rải rác:**
  - Có 38 vị trí gọi `console.error` trong các khối `catch` của frontend components (ví dụ: `frontend/src/app/dashboard/settings/members/page.tsx:132, 163, 181, 203`, `frontend/src/app/dashboard/jobs/page.tsx:121, 141`, `frontend/src/components/careers/job-details-client.tsx:201`) thay vì đẩy vào error tracking service (như Sentry).

### F. Khoảng trống chuẩn Enterprise `[ENTERPRISE-GAP]`

1. **`[ENTERPRISE-GAP]` — Thiếu Hệ thống Audit Log Tuân thủ (SOC2 / ISO 27001):**
   - Bảng `ActivityLog` (`backend/src/activities/activities.service.ts:8-15, 48-60`) chỉ phục vụ hiển thị timeline của ứng viên (`APPLIED`, `STAGE_CHANGED`, `NOTE_ADDED`).
   - Hệ thống **hoàn toàn không có Audit Trail** cho các hành động quản trị tối quan trọng của Enterprise ATS: không ghi log đăng nhập/đăng xuất của user, không log thay đổi quyền hạn/mời thành viên, không log thao tác xóa Job Requisition, không log thay đổi cấu hình Webhook hay email integration, không log việc export dữ liệu ứng viên.
2. **`[ENTERPRISE-GAP]` — Mô hình Phân quyền (RBAC) Nhị phân thô sơ:**
   - `backend/src/auth/roles.guard.ts:16-36` chỉ hỗ trợ 2 vai trò: `"ADMIN"` và `"MEMBER"` (trong đó `MEMBER` bị khóa read-only hoàn toàn).
   - Một Enterprise ATS tiêu chuẩn yêu cầu ma trận phân quyền linh hoạt theo vị trí tuyển dụng: _Hiring Manager_ (chỉ xem job của bộ phận mình), _Recruiter_ (được tạo/sửa job và ứng viên nhưng không được đổi cấu hình tổ chức), _Interviewer_ (chỉ được chấm điểm Scorecard theo buổi phỏng vấn được giao, bị ẩn thông tin lương/PII nhạy cảm). Hiện tại, nếu là `MEMBER`, người phỏng vấn không thể submit Scorecard; nếu set thành `ADMIN`, họ sẽ thấy toàn bộ thông tin nhạy cảm của tổ chức.
3. **`[ENTERPRISE-GAP]` — Chưa có Mã hóa Dữ liệu Nhạy cảm Ứng viên (Field-Level PII Encryption):**
   - Service `EncryptionService` (`backend/src/common/encryption.service.ts:14-31`) chỉ được dùng để mã hóa mật khẩu SMTP và webhook secret (`backend/src/webhook-settings/webhook-settings.service.ts:166`).
   - Toàn bộ dữ liệu PII của ứng viên (họ tên, email cá nhân, số điện thoại, ghi chú phỏng vấn) được lưu dưới dạng plain-text trong PostgreSQL, chưa đáp ứng tiêu chuẩn khắt khe về quyền riêng tư như GDPR (Right to Erasure / Pseudonymization at rest).
4. **`[ENTERPRISE-GAP]` — Mức độ rủi ro chuỗi cung ứng khi dùng Prisma 8 RC & Beta Engine:**
   - Hệ thống phụ thuộc vào Prisma 8 chưa ra mắt bản chính thức (`prisma@8.0.0-rc.19` [`backend/package.json:60`] và `@prisma/orm-postgres@8.0.0-rc.13` [`backend/package.json:33`]), kèm dependency `alchemy: 2.0.0-beta.79` [`backend/package.json:34`] kéo theo 61 lỗ hổng bảo mật. Điều này gây rủi ro lớn về tính ổn định và tính tuân thủ bảo mật trong môi trường Production của doanh nghiệp.

---

## 9. Câu hỏi (5 điều chưa hiểu)

1. **Tại sao backend lại cài đặt dependency `alchemy: 2.0.0-beta.79` khi không hề sử dụng?**
   - _Dẫn chứng:_ Khai báo tại `backend/package.json:34`, nhưng tìm kiếm toàn bộ mã nguồn trong `backend/src/` không có bất kỳ dòng import nào. Gói này kéo theo `@prisma/dev` và các phiên bản `hono` cũ dính 61 cảnh báo lỗ hổng bảo mật trong `pnpm audit`. Có thể gỡ bỏ hoàn toàn package này được không?
2. **Tại sao frontend lại bundle mật khẩu demo và tra cứu sai tên biến môi trường?**
   - _Dẫn chứng:_ Tại `frontend/src/constants/auth.constants.ts:1-3`, code tra cứu `process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD || "dev-seed-password-2026"`. Trong khi đó, file cấu hình mẫu `.env.example:59` lại đặt tên biến là `DEMO_SEED_PASSWORD`. Việc hardcode fallback password này có nguy cơ rò rỉ credential trên client bundle ở production không?
3. **Tại sao `PrismaService` lại tự động seed tài khoản demo vào database ngay khi backend khởi động?**
   - _Dẫn chứng:_ Tại `backend/src/prisma/prisma.service.ts:70-91`, trong hook `onModuleInit()`, mỗi khi `NODE_ENV !== "test"`, service sẽ tự động chạy lệnh `upsert` để tạo tài khoản `admin@tun.io.vn` và `member@tun.io.vn`. Tại sao logic này không được tách riêng vào lệnh `pnpm db:seed` mà lại chạy ngầm trong lifecycle khởi động của server NestJS?
4. **Tại sao Next.js rewrites lại proxy các route nghiệp vụ không có tiền tố `/api` trực tiếp về backend?**
   - _Dẫn chứng:_ Tại `frontend/next.config.ts:98-117`, Next.js cấu hình rewrite cho `/organizations/:path*`, `/jobs/:path*`, `/applications/:path*`, `/users/:path*`, `/events/:path*` trực tiếp sang backend, song song với `/api/:path*`. Cấu hình này có nguy cơ gây xung đột định tuyến với các trang giao diện của App Router (như `/dashboard/jobs` hoặc `/dashboard/applications`) và làm khó khăn cho việc đặt API Gateway / WAF phía trước không?
5. **Cơ chế phân quyền cho người phỏng vấn (Interviewer) hoạt động thế nào trong thực tế?**
   - _Dẫn chứng:_ Tại `backend/src/auth/roles.guard.ts:16-36`, bất kỳ user nào có role `"MEMBER"` đều bị chặn với thông báo `"Members have read-only access. Only Admins can perform this action."`. Trong khi đó, các thao tác chấm điểm phỏng vấn (`POST /interviews/:id/scorecard`) hay ghi chú ứng viên đều là thao tác ghi (`POST`/`PATCH`). Phải chăng mọi nhân viên tham gia phỏng vấn hiện đều bắt buộc phải cấp quyền `ADMIN`?
