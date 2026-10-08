# Runbook: Valkey / Redis Recovery & Queue Restoration

**System:** HaiHire Enterprise ATS  
**Related Documentation:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)  
**Alert Rules:** `HaiHireRedisDown` (Critical), `HaiHireBullMqRedisDown` (Critical)  
**Responsible Teams:** SRE & Infrastructure Engineering (`team: sre`)

---

## Alert Triggers & Conditions

- **`HaiHireBullMqRedisDown` (Critical):**
  > Metric `bullmq_queue_depth` returns `-1` continuously for $> 2$ minutes.  
  > `MetricsService` failed to query queue status from Redis within the 2.5s timeout.  
  > All asynchronous workers (Orphan Cleanup, Email Queue) are halted.
- **`HaiHireRedisDown` (Critical):**
  > Health check endpoint reports Redis ping connection timeout $> 30$s.

---

## Step 1: Verify Incident

1. **Verify Valkey / Redis Container Status:**
   ```bash
   # Production
   docker compose -f docker-compose.prod.yml ps redis

   # Development
   docker ps --filter "name=redis"
   ```

2. **Test Direct Ping via redis-cli / valkey-cli:**
   ```bash
   # Development (port 16379)
   docker exec -it haihire-redis redis-cli ping

   # Production (internal network)
   docker exec -it haihire-prod-redis redis-cli ping
   ```

3. **Check Prometheus Metric:**
   ```bash
   curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | head -n 5
   # If all queues return -1 -> Redis connection blackout confirmed
   ```

---

## Step 2: Diagnose Root Cause

1. **Inspect Valkey / Redis Container Logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs redis --tail=100
   ```
2. **Inspect Host Memory and Swap Resources:**
   ```bash
   free -m
   docker stats --no-stream haihire-prod-redis
   ```
   *Note:* Valkey/Redis crashes are commonly caused by the Linux OOMKiller when memory exceeds `deploy.resources.limits.memory` (default: 512MB).
3. **Inspect AOF / RDB Disk Persistence Space:**
   ```bash
   df -h /var/lib/docker/volumes/haihire_redis_data
   ```

---

## Step 3: Mitigate (Short-Term Action)

1. **If Container Has Exited: Restart Immediately:**
   ```bash
   docker compose -f docker-compose.prod.yml start redis
   # or
   docker restart haihire-prod-redis
   ```
2. **If Container Is Hanging or Saturated at 100% CPU:**
   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   ```
3. **Restart Backend Container if ioredis Connections Fail to Resynchronize:**
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

---

## Step 4: Resolve (Long-Term Fix)

1. **Configure Appropriate `maxmemory` and Eviction Policy:**
   - Ensure Redis configuration enables key eviction:
     `maxmemory-policy volatile-lru` or `allkeys-lru`.
2. **Increase Resource Limits in `docker-compose.prod.yml`:**
   - Scale to `memory: 1024M` under heavy queue payloads or session spikes.
3. **Dedicated Cache and Queue Separation:**
   - Consider separating the Redis instance dedicated to BullMQ from the application caching instance when sustained traffic exceeds 10,000 requests/minute.

---

## Step 5: Post-Mortem & Incident Closure

- [ ] Command `redis-cli ping` returns `PONG`.
- [ ] Metric `bullmq_queue_depth` on `/metrics` restores to `0` or positive integers (no longer `-1`).
- [ ] Both `HaiHireRedisDown` and `HaiHireBullMqRedisDown` alerts transition to `RESOLVED`.
- [ ] Verify zero stalled or lost jobs in BullMQ queues.
- [ ] Document infrastructure incident root cause in post-mortem report.
