# Redis (Valkey) Recovery Runbook

> Triage and disaster recovery procedures for HaiHire's Valkey 8.0.2 instance backing BullMQ queues and real-time SSE pub/sub.

---

## 1. Configuration Baseline

Production runs **Valkey `8.0.2-alpine`** (`redis` service, container `haihire-prod-redis`) configured in [docker-compose.prod.yml](../../docker-compose.prod.yml):

| Parameter           | Value                                                       | Why                                                       |
| :------------------ | :---------------------------------------------------------- | :-------------------------------------------------------- |
| **Image**           | `valkey/valkey:8.0.2-alpine`                                | Redis-compatible in-memory store for BullMQ + SSE         |
| **Max Memory**      | `--maxmemory 384mb` (container limit `512M`)                | Leaves OS/overhead headroom inside container              |
| **Eviction Policy** | `--maxmemory-policy noeviction`                             | Prevents silent dropping of BullMQ delayed/retry/DLQ keys |
| **Persistence**     | `--appendonly yes --appendfsync everysec`                   | Caps AOF data loss on crash to at most ~1 second          |
| **Volume**          | `redis_data` (`haihire_prod_redis_data` mounted at `/data`) | Persists AOF across container restarts                    |
| **Auth**            | `REDIS_PASSWORD` (optional env var passed via `ARGS`)       | Authenticated `redis-cli` healthcheck & BullMQ/API access |

Triggers from [monitoring/prometheus/alert-rules.yml](../../monitoring/prometheus/alert-rules.yml):

- `HaiHireRedisDown` (`severity: critical`) — Redis healthcheck unreachable from API.
- `HaiHireBullMqRedisDown` (`severity: critical`) — BullMQ workers (`email-queue`, `orphan-cleanup-queue`) lost Redis connectivity.

---

## 2. Diagnostic Triage

Run diagnostics directly against `haihire-prod-redis`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 redis
```

Check ping, memory usage, and persistence state (pass `-a "$REDIS_PASSWORD"` when auth is enabled):

```bash
docker exec haihire-prod-redis sh -c '
  if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -a "$REDIS_PASSWORD" PING && redis-cli -a "$REDIS_PASSWORD" INFO memory persistence
  else
    redis-cli PING && redis-cli INFO memory persistence
  fi
'
```

Inspect queue key footprint if approaching `384mb` (`OOM command not allowed` errors):

```bash
docker exec haihire-prod-redis sh -c '
  if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -a "$REDIS_PASSWORD" INFO keyspace
  else
    redis-cli INFO keyspace
  fi
'
```

---

## 3. Recovery Scenarios

### Scenario A: Container Restart / Transient Network Drop

1. Restart the `redis` container and confirm healthy status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart redis
docker compose --env-file .env.production -f docker-compose.prod.yml ps redis
```

2. Check API logs (`docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api`) to verify BullMQ workers and SSE pub/sub reconnected cleanly; restart `api` if connection backoff appears stalled:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart api
```

### Scenario B: Memory Exhaustion (`noeviction` OOM Errors)

Because `noeviction` refuses writes once `384mb` is full:

1. Inspect `api` & BullMQ completed/failed job accumulation via [DLQ Recovery Runbook](dlq-recovery.md) and [Email Queue Runbook](email-queue.md).
2. Clear archived DLQ/completed jobs using safe BullMQ / `EmailLog` reconciliation steps rather than flushing the whole DB with `FLUSHALL`.
3. If memory capacity is genuinely undersized for traffic, plan a vertical bump to `--maxmemory` and container `deploy.resources.limits.memory` in [docker-compose.prod.yml](../../docker-compose.prod.yml).

### Scenario C: Corrupt Append-Only File (AOF) Blocking Startup

If container logs report AOF corruption preventing Valkey from booting:

1. Copy `/data` volume contents to a temporary backup directory on the host first.
2. Stop `redis` (`docker compose --env-file .env.production -f docker-compose.prod.yml stop redis`).
3. Run Valkey/Redis AOF check/repair against the volume (`valkey-check-aof --fix` or `redis-check-aof --fix`) via a one-off container mounting `redis_data:/data`.
4. Start `redis` and `api` cleanly, then reconcile any failed/unsent emails using `EmailLog` records per [DLQ Recovery Runbook](dlq-recovery.md).

---

## 4. Impact During Redis Outage

- **Read/Write Core ATS APIs:** Database-backed endpoints remain operational except enqueueing async jobs or real-time push.
- **SSE Events:** Connected clients may fall back cleanly on degraded polling / manual refresh until pub/sub recovers.
- **Email & Cleanup Queues:** New jobs fail to enqueue until Valkey recovers; check `EmailLog` (`FAILED` / `PENDING`) after restoration.

---

## 5. Related Documentation

- [Alerts Runbook](alerts.md)
- [DLQ Recovery Runbook](dlq-recovery.md)
- [Email Queue Runbook](email-queue.md)
- [Production Deployment Plan](production-deployment-plan.md)
