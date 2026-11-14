# MinIO Orphan File Cleanup Runbook

> Automated and manual garbage collection for unreferenced MinIO S3 objects in HaiHire.

---

## 1. Architecture Overview

Resume uploads and candidate document replacements happen via MinIO S3 (`MINIO_BUCKET_NAME`, default `haihire-resumes`, production example `haihire-production-resumes`). When an upload fails mid-flight or a stale draft object loses its database row, it becomes an orphaned object.

HaiHire pairs a core cleanup module with a standalone cron script and Pushgateway telemetry:

| Component                     | Source                                                                               | Responsibility                                                                                                                                                                                                                               |
| :---------------------------- | :----------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cleanup Engine**            | [apps/api/src/common/orphan-cleanup.ts](../../apps/api/src/common/orphan-cleanup.ts) | Scans live bucket objects, collects active DB references (`CandidateDocument.url`, `Application.resumeUrl`, `Candidate.resumeUrl`), normalizes paths via `extractObjectNameFromUrl()`, and enforces the age grace window (`30` days default) |
| **CLI & Telemetry Runner**    | [scripts/cleanup-orphan-minio.ts](../../scripts/cleanup-orphan-minio.ts)             | Parses CLI flags (`--dry-run`, `--threshold-days=N`), initializes MinIO + Prisma clients, prints summary metrics, and pushes Prometheus metrics to `PUSHGATEWAY_URL`                                                                         |
| **Production Cron Container** | [docker-compose.prod.yml](../../docker-compose.prod.yml) (`orphan-cleanup`)          | Executes `scripts/cleanup-orphan-minio.ts` daily at `04:00` via BusyBox `crond -f -l 2`                                                                                                                                                      |
| **Prometheus Alert Rules**    | [monitoring/prometheus/alert-rules.yml](../../monitoring/prometheus/alert-rules.yml) | Alerts when cleanup jobs stop reporting or push `minio_orphan_cleanup_success 0`                                                                                                                                                             |

---

## 2. Production Cron Schedule

In [docker-compose.prod.yml](../../docker-compose.prod.yml), the `orphan-cleanup` service reuses the `haihire-api` image and installs the following root crontab entry on startup:

```cron
0 4 * * * cd /app && node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts >> /var/log/orphan-cleanup.log 2>&1
```

Key container behaviors:

- Depends on healthy `postgres` and `minio` containers (`condition: service_healthy`).
- Connects over `haihire-prod-network` using `MINIO_ENDPOINT=minio`, `MINIO_PORT=9000`, and `PUSHGATEWAY_URL` (`http://pushgateway:9091`).
- Grace period defaults to `30` days (`thresholdDays = 30`), preventing deletion of freshly uploaded files still awaiting transaction completion.

---

## 3. Manual Execution & Dry-Run Inspection

Always run a `--dry-run` simulation before performing an out-of-band cleanup in production.

### Dry-Run inside Production Container

```bash
docker exec haihire-prod-orphan-cleanup \
  node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts --dry-run
```

### Custom Threshold Window (e.g., `14` days)

```bash
docker exec haihire-prod-orphan-cleanup \
  node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts --dry-run --threshold-days=14
```

### Live Out-of-Band Run

```bash
docker exec haihire-prod-orphan-cleanup \
  node --no-warnings --experimental-strip-types scripts/cleanup-orphan-minio.ts
```

Local development run (against local Compose infrastructure):

```bash
npx tsx scripts/cleanup-orphan-minio.ts --dry-run
```

---

## 4. Pushgateway Telemetry & Failure Handling

When `PUSHGATEWAY_URL` is configured, [scripts/cleanup-orphan-minio.ts](../../scripts/cleanup-orphan-minio.ts) publishes job status to `/metrics/job/minio_orphan_cleanup`:

- **Pushgateway unreachable:** Logged as non-fatal (`[ERROR] Failed to push metrics to Pushgateway`), allowing the cleanup job itself to exit `0` if deletions succeeded.
- **Cleanup exception (DB / MinIO error):** Logs error, calls `pushFailureMetric()` to post `minio_orphan_cleanup_success 0`, and exits with code `1`.

### Inspecting Cron Logs

```bash
docker exec haihire-prod-orphan-cleanup tail -n 100 /var/log/orphan-cleanup.log
```

---

## 5. Incident Response Checklist

1. Check container status and logs: `docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 orphan-cleanup`.
2. Verify `postgres`, `minio`, and `pushgateway` healthchecks in `docker ps`.
3. Confirm `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, and `DATABASE_URL` inside `haihire-prod-orphan-cleanup`.
4. Run `--dry-run` manually and confirm `Active DB References` count looks sane (`> 0` in populated environments) before re-running live deletion.

---

## 6. Related Documentation

- [Alerts Runbook](alerts.md)
- [Backup and Restore Runbook](backup-and-restore.md)
- [Production Deployment Plan](production-deployment-plan.md)
