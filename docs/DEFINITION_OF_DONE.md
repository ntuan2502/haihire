# DEFINITION OF DONE (DoD) — Release v1.0.0

> Checklist chung cho tất cả PR trong đợt hardening v1.0.0.
> Mỗi PR phải đạt TẤT CẢ các mục dưới đây trước khi được merge.

## 1. HYGIENE — Vệ sinh code

- [ ] Branch name đúng convention: `feat/task-NN-<slug>` hoặc `chore/task-NN-<slug>`
- [ ] Commit message theo Conventional Commits: `type(scope): description`
  - Chữ thường, tiếng Anh, không dấu chấm cuối câu
  - Ví dụ: `feat(observability): add DLQ slack webhook alert`
- [ ] Không có file rác: `console.log` debug, comment-out code, `*.bak`
- [ ] Không có TODO/FIXME mới (trừ khi có ticket link kèm theo)
- [ ] Diff gọn gàng: chỉ chứa thay đổi cần thiết cho task, không drive-by refactor

## 2. TESTING — Kiểm thử

- [ ] Unit test cho logic mới (mỗi function/service method mới có ≥1 test)
- [ ] Test cho happy path + error path
- [ ] Test cho edge case (empty input, null/undefined, boundary values)
- [ ] Integration test nếu task chạm vào module có integration test
- [ ] Test naming mô tả behavior, không mô tả implementation
  - ✅ `should not throw when Slack webhook is down`
  - ❌ `test fetch call`
- [ ] Test coverage không giảm so với baseline

## 3. TYPE SAFETY — An toàn kiểu

- [ ] Không có `any` mới (trừ khi có comment giải thích lý do bất khả kháng)
- [ ] Không có `@ts-ignore` / `@ts-expect-error` mới
- [ ] `pnpm tsc --noEmit` pass ở cả `backend/` và `frontend/`
- [ ] Public interface có JSDoc cho function/service quan trọng
- [ ] Error type cụ thể: throw `AppException` subclass, không throw `new Error()` chung chung

## 4. SECURITY — Bảo mật

- [ ] Không hardcode secret — mọi config đọc từ `env.ts`
- [ ] Không log PII — nếu log payload, phải scrub email/phone/name
- [ ] Không expose internal error ra ngoài — dùng `AppException`, không leak stack trace
- [ ] Tenant scoping: nếu query DB trong module tenant-scoped → có `organizationId` filter
- [ ] Input validation: mọi `@Body()` mới phải có `DtoPipe(<Dto>)`

## 5. OBSERVABILITY — Khả năng quan sát

- [ ] Structured logging cho action quan trọng (dùng `this.logger.log/.warn/.error`)
- [ ] Metrics có `# HELP` và `# TYPE` comment, labels không cardinality cao
- [ ] Alert rules có `summary` + `description` + `severity` + `team` label
- [ ] Duration của alert rule hợp lý (for: Xm)

## 6. i18n — Đa ngôn ngữ (Frontend)

- [ ] Không hardcode text trong JSX, dùng `t("key.path")`
- [ ] Key mới thêm vào cả 3 file: `types.ts`, `vi.ts`, `en.ts`
- [ ] Error code mới thêm vào `APP_ERROR_CODES` + `vi.ts` + `en.ts`
- [ ] `pnpm check:i18n` pass

## 7. DOCUMENTATION — Tài liệu

- [ ] Update `PROJECT_CONTEXT.md` nếu có module/service/dependency mới
- [ ] Update runbook trong `docs/runbooks/` nếu có alert rule mới
- [ ] Comment WHY, không comment WHAT
  - ✅ `// Non-throwing: webhook fail must not crash DLQ flow`
  - ❌ `// Call fetch`

## 8. CI GATES — Cổng kiểm tra

- [ ] `pnpm check:all:fast` pass
- [ ] `pnpm test` pass
- [ ] `pnpm lint:env-sync` pass (nếu có env mới)
- [ ] `pnpm lint:dtopipe` pass (nếu có controller mới)
- [ ] `pnpm lint:error-i18n` pass (nếu có error code mới)
- [ ] `pnpm test:e2e` pass locally (nếu task là E2E)
- [ ] Cron chạy manual 1 lần verify output (nếu task là cron)

## 9. ACCEPTANCE CRITERIA — Tiêu chí chấp nhận

- [ ] Mọi acceptance criteria trong spec của task đều PASS
- [ ] Có evidence: screenshot / log output / test report

## 10. REPORT — Báo cáo cho DeepSeek & Chủ dự án

Sau khi xong, gửi báo cáo theo format sau:

### Task #N: <tên task>

**1. Summary**
- Branch: <name>
- Files created/changed: <list với số dòng>
- Total diff: +X / -Y

**2. Implementation Notes**
- Deviation from spec: <có/không> — nếu có, giải thích WHY
- Design decisions: <nếu có điểm cần lưu ý>

**3. Test Coverage**
- Unit tests: <số case>, file: <path>
- Integration tests: <số case>
- E2E tests: <số case> (nếu có)
- Coverage change: X% → Y%

**4. Verification Evidence**
- `pnpm check:all:fast`: PASS / FAIL
- `pnpm test`: PASS / FAIL (X passing, Y failing)
- Acceptance criteria: <checklist với ✅/❌>

**5. Open Questions**
- <câu hỏi cho DeepSeek nếu có>
- <điểm cần chủ dự án xác nhận nếu có>

**6. Files for Review**
- <path của file chính cần review kỹ>
