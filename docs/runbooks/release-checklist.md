# Production Release Checklist

Runbook checklist and release validation gates for production deployments of HaiHire Platform.

## Pre-Release Environment Checks

- [ ] `SYSTEM_EMAIL_PROVIDER` ≠ `SIMULATED` trong `.env.production` (Must be configured to `SMTP`, `RESEND`, or `SENDGRID`)
- [ ] `pnpm check:prod-email-provider` pass
- [ ] Cross-tenant test pass: pnpm test:e2e -- cross-tenant
- [ ] Prometheus alert rules validate: pnpm lint:prometheus-rules
- [ ] Full test suite pass: pnpm test (927+ tests, 0 failed)
- [ ] CI gates pass: pnpm check:all:fast (12/12 gates)
- [ ] Production database migrations verified (`pnpm db:status`)
- [ ] Environment variable parity audit pass (`pnpm lint:env-sync`)

## Verification Commands

```bash
# Verify email provider gate for production
NODE_ENV=production SYSTEM_EMAIL_PROVIDER=RESEND pnpm check:prod-email-provider

# Verify cross-tenant isolation test suite (Vitest in backend)
pnpm test:backend -- cross-tenant
# (Note: pnpm test:e2e targets Playwright browser tests; backend isolation suite runs via Vitest above)

# Verify Prometheus alert rules compliance (CI Gate 6)
pnpm lint:prometheus-rules

# Verify full test suite across workspace (927+ tests)
pnpm test

# Verify full fast CI gate suite (12/12 gates)
pnpm check:all:fast
```

---

## Post-Release Backlog (v1.0.1+)

1. **Mở rộng Cross-Tenant Test cho 5 modules còn lại**: Bổ sung kịch bản kiểm thử cách ly tổ chức cho `jobs`, `interviews`, `users`, `settings/members`, `activities`.
2. **Refactor & Tách Test Suite Cross-Tenant**: Cân nhắc đổi tên hoặc chia tách kiểm thử giữa "data isolation" (negative tests) và "guard correctness" (positive test như Case 7).
3. **Chú thích Prometheus Metric Type**: Thêm ghi chú trong comment mã nguồn làm rõ `bullmq_dlq_size` bắt buộc phải là Prometheus Gauge (không dùng Counter) vì hàm cảnh báo `deriv()` trong PromQL chỉ áp dụng hợp lệ cho Gauge.
