# BullMQ Dead-Letter Queue (DLQ) Recovery Runbook

HaiHire isolates permanent worker failures into dedicated BullMQ Dead-Letter Queues so transactional email bugs or transient MinIO outages never cause silent data loss.

---

## 1. DLQ Inventory

| Primary Queue          | Dead-Letter Queue (`DLQ`) | Producer / Consumer                                                                                                  |
| :--------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| `email-queue`          | `email-dlq-queue`         | [apps/api/src/email/email.processor.ts](../../apps/api/src/email/email.processor.ts)                                 |
| `orphan-cleanup-queue` | `orphan-cleanup-dlq`      | [apps/api/src/applications/orphan-cleanup.processor.ts](../../apps/api/src/applications/orphan-cleanup.processor.ts) |

---

## 2. Triggered Alerts

- `HaiHireBullMqDlqGrowing`: `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 10` for `5m` (`warning`)
- `HaiHireBullMqDlqCritical`: `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 100` for `2m` (`critical`)
- `BullMQDLQNotEmpty` / `BullMQDLQGrowing`: generic DLQ depth > `0` or growing over `15m`

---

## 3. Triage & Inspection

1. **Check Backing Services First:**
   - For `orphan-cleanup-dlq`: inspect `haihire-minio` connectivity, credentials (`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`), and disk saturation.
   - For `email-dlq-queue`: inspect SMTP/Resend/SendGrid provider status, API key validity (`ENCRYPTION_SECRET` decryption), and recent `EmailLog` records (`status = FAILED`).
2. **Inspect Queued Payloads in Valkey (`haihire-redis`):**

```bash
docker exec -it haihire-prod-redis valkey-cli LLEN bull:orphan-cleanup-dlq:wait
docker exec -it haihire-prod-redis valkey-cli LLEN bull:email-dlq-queue:wait
```

---

## 4. Safe Replay Procedure

1. Resolve the underlying root cause (network route, MinIO outage, invalid API key) and confirm `GET /health` reports all services healthy.
2. Execute a controlled Node/BullMQ replay script inside the maintenance shell to inspect failed job data (`originalJobId`, `data`, `failedReason`), re-enqueue valid payloads back to `email-queue` or `orphan-cleanup-queue`, and remove replayed DLQ entries only after downstream completion succeeds.
3. For stale orphan files in `orphan-cleanup-dlq`, optionally run [Orphan MinIO Cleanup](orphan-cleanup.md) in dry-run mode afterward to confirm storage hygiene.
