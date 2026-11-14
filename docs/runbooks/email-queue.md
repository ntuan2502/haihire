# Email Queue & Provider Operations Runbook

Transactional candidate communications and system emails dispatch asynchronously through BullMQ `email-queue` (`EmailProcessor` in [apps/api/src/email/email.processor.ts](../../apps/api/src/email/email.processor.ts)).

---

## 1. Architecture & Transporters

- **Queues:** `email-queue` -> on exhausted retry attempts, failed payload moves to `email-dlq-queue` + fires optional DLQ webhook notifications.
- **Supported Providers:**
  - `SIMULATED` (development/test only — rejected in production checks by [scripts/check-prod-email-provider.ts](../../scripts/check-prod-email-provider.ts))
  - `SMTP` (`nodemailer`, tested against SSRF / non-public destination hazards)
  - `RESEND` (`SYSTEM_EMAIL_RESEND_API_KEY` or encrypted per-org key)
  - `SENDGRID` (`SYSTEM_EMAIL_SENDGRID_API_KEY` or encrypted per-org key; parses `Display Name <email>` via `parseSendGridFrom`)

---

## 2. Responding to `HaiHireEmailQueueBacklog`

Triggered when `bullmq_queue_depth{queue="email-queue",state="waiting"} > 500` for `10m`:

1. Verify API container logs (`EmailProcessor`) for SMTP timeouts, DNS resolution issues, or HTTP `401`/`429` responses from Resend/SendGrid.
2. Verify Valkey/Redis availability ([Valkey / Redis Recovery](redis-recovery.md)) and confirm worker processes are not paused or starved.
3. Inspect recent `email_log` rows (`status = 'FAILED'`) in PostgreSQL to identify whether failures affect one tenant's custom credentials (`EmailSetting`) or the system-wide fallback (`SYSTEM_EMAIL_PROVIDER`).
4. Temporarily pause offending broken custom org configurations if one misconfigured SMTP host stalls worker concurrency, fix credentials, and replay any `email-dlq-queue` items per [DLQ Recovery](dlq-recovery.md).
