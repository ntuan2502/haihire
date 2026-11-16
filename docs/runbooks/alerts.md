# Alerts & Incident Triage Runbook

Standard operating procedures for all Prometheus alert rules defined in [monitoring/prometheus/alert-rules.yml](../../monitoring/prometheus/alert-rules.yml) and validated by [monitoring/prometheus/alert-rules.spec.ts](../../monitoring/prometheus/alert-rules.spec.ts).

---

## 1. Metrics Endpoint Verification

`apps/api` exposes Prometheus metrics on `GET /metrics` authenticated with `Authorization: Bearer <METRICS_TOKEN>` (`crypto.timingSafeEqual`). When `METRICS_TOKEN` is unset in `production`, `GET /metrics` returns `404`.

```bash
curl -fsS -H "Authorization: Bearer $METRICS_TOKEN" http://127.0.0.1:3001/metrics
curl -fsS http://127.0.0.1:3001/health
```

---

## 2. Production Alert Rules Matrix (`14` Rules)

| Alert Rule                          | Expression Trigger                                | `for` |  Severity  | Linked SOP                                                                            |
| :---------------------------------- | :------------------------------------------------ | :---: | :--------: | :------------------------------------------------------------------------------------ |
| `HaiHireBackendDown`                | `up{job="haihire-backend"} == 0`                  | `1m`  | `critical` | Inspect `haihire-prod-api` logs & `/health`                                           |
| `HaiHirePostgresDown`               | `haihire_service_health{service="postgres"} == 0` | `30s` | `critical` | Inspect Postgres container, `DATABASE_URL`, [Backup & Restore](backup-and-restore.md) |
| `HaiHireRedisDown`                  | `haihire_service_health{service="redis"} == 0`    | `30s` | `critical` | [Valkey / Redis Recovery](redis-recovery.md)                                          |
| `HaiHireMinioDown`                  | `haihire_service_health{service="minio"} == 0`    | `1m`  |   `high`   | Check `haihire-minio` `/minio/health/live` & volume space                             |
| `HaiHireHighHttp5xxErrorRate`       | HTTP 5xx > `5%` over `5m`                         | `2m`  |   `high`   | Correlate via `x-correlation-id` in API logs                                          |
| `HaiHireHighHttpLatencyP95`         | `p95 > 1000ms`                                    | `3m`  | `warning`  | Check DB pool saturation, slow queries, Redis RTT                                     |
| `HaiHireHighRateLimit429Rate`       | 429 rate > `50/s`                                 | `2m`  | `warning`  | Inspect brute-force IPs & `ThrottlerGuard` (`100/60s`)                                |
| `HaiHireBullMqDlqGrowing`           | `orphan-cleanup-dlq` waiting > `10`               | `5m`  | `warning`  | [DLQ Recovery](dlq-recovery.md)                                                       |
| `HaiHireBullMqDlqCritical`          | `orphan-cleanup-dlq` waiting > `100`              | `2m`  | `critical` | [DLQ Recovery](dlq-recovery.md)                                                       |
| `BullMQDLQNotEmpty`                 | `bullmq_dlq_size > 0`                             | `5m`  | `warning`  | [DLQ Recovery](dlq-recovery.md)                                                       |
| `BullMQDLQGrowing`                  | `rate(bullmq_dlq_size[15m]) > 0`                  | `5m`  | `critical` | [DLQ Recovery](dlq-recovery.md)                                                       |
| `HaiHireEmailQueueBacklog`          | `email-queue` waiting > `500`                     | `10m` | `warning`  | [Email Queue Operations](email-queue.md)                                              |
| `HaiHireBullMqRedisDown`            | `bullmq_queue_depth` == `-1`                      | `2m`  | `critical` | [Valkey / Redis Recovery](redis-recovery.md)                                          |
| `HaiHireOrphanCleanupSpikeWarning`  | `minio_orphan_cleanup_orphans_found_total > 50`   | `0m`  | `warning`  | [Orphan Cleanup](orphan-cleanup.md)                                                   |
| `HaiHireOrphanCleanupSpikeCritical` | `minio_orphan_cleanup_orphans_found_total > 500`  | `0m`  | `critical` | [Orphan Cleanup](orphan-cleanup.md) & halt upload regressions                         |
| `HaiHireOrphanCleanupCronMissing`   | `time() - last_run > 90000` (`>25h`)              | `5m`  | `critical` | [Orphan Cleanup](orphan-cleanup.md) (verify scheduled job)                            |

---

## 3. Initial Triage Flow

1. Check `/health` on API to isolate Postgres, Valkey/Redis, or MinIO subsystem failures.
2. Search container logs by `correlationId` (`CorrelationLogger`) to isolate tenant ID (`organizationId`) and exception code.
3. Follow the specialized runbook linked in the table above; never delete DLQ or orphan jobs blindly before inspecting error reasons.
