# Production Release Checklist

Runbook checklist and release validation gates for production deployments of HaiHire Platform.

## Pre-Release Environment Checks

- [ ] `SYSTEM_EMAIL_PROVIDER` ≠ `SIMULATED` trong `.env.production` (Must be configured to `SMTP`, `RESEND`, or `SENDGRID`)
- [ ] `pnpm check:prod-email-provider` pass
- [ ] Production database migrations verified (`pnpm db:status`)
- [ ] Environment variable parity audit pass (`pnpm lint:env-sync`)
- [ ] Full CI/CD fast pipeline pass (`pnpm check:all:fast`)
- [ ] All unit, integration, and E2E suites pass (`pnpm test`)

## Verification Commands

```bash
# Verify email provider gate for production
NODE_ENV=production SYSTEM_EMAIL_PROVIDER=RESEND pnpm check:prod-email-provider

# Verify full fast CI gate suite
pnpm check:all:fast
```
