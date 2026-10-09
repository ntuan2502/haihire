# Runbook: BullMQ Dead-Letter Queue Recovery (DLQ Recovery)

**System:** HaiHire Enterprise ATS  
**Related Documentation:** [`monitoring/prometheus/alert-rules.yml`](../../monitoring/prometheus/alert-rules.yml), [`docs/runbooks/orphan-cleanup.md`](orphan-cleanup.md)  
**Alert Rules:** `HaiHireBullMqDlqGrowing` (Warning), `HaiHireBullMqDlqCritical` (Critical), `HaiHireOrphanCleanupSpikeWarning` (Warning), `HaiHireOrphanCleanupSpikeCritical` (Critical), `HaiHireOrphanCleanupCronMissing` (Critical)  
**Responsible Teams:** SRE & Backend Engineering (`team: sre`)

---

## When Orphan Cleanup Spike Occurs

Triggered by: `HaiHireOrphanCleanupSpikeWarning` / `HaiHireOrphanCleanupSpikeCritical`

### Verify

Run:
```bash
curl -s http://pushgateway:9091/metrics | grep minio_orphan_cleanup
```

Check:
- `orphans_found_total`: Number of orphan files detected
- `preserved_total`: Number of files in grace period
- `last_run_timestamp_seconds`: Last run timestamp

### Diagnose

1. If `orphans_found` > 50 suddenly → possible causes:
   - Bug in CV upload flow (Saga rollback did not delete file)
   - MinIO connectivity issue → upload succeeded but DB write failed
   - Test data uploaded incorrectly
2. Check backend logs:
   ```bash
   docker logs haihire-prod-backend --since 24h | grep -i "orphan\|minio"
   ```
3. Check DLQ backlog:
   ```bash
   curl -s localhost:3001/metrics | grep bullmq_queue_depth
   ```

### Mitigate

1. If spike is small (<100 files): monitor for 1-2 more days.
2. If spike is large (>100 files):
   - Pause cron cleanup (to preserve files as evidence)
   - Investigate root cause
   - After fix → run manual cleanup:
     ```bash
     docker exec -it haihire-prod-orphan-cleanup node --import tsx scripts/cleanup-orphan-minio.ts
     ```

### Resolve

1. Fix root cause (Saga logic, MinIO config)
2. Verify no new orphans for next 24h
3. Run manual cleanup to clear accumulated orphans

### Post-mortem

- Count exactly how many orphan files were cleaned
- Verify no valid files were accidentally deleted
- Update monitoring if additional metrics are needed

---

## Alert Triggers & Conditions

- **`HaiHireBullMqDlqGrowing` (Warning):**
  > Dead-Letter Queue `orphan-cleanup-dlq` has $> 10$ jobs in `waiting` state for $> 5$ minutes.  
  > Investigate MinIO connectivity and DLQ worker status.
- **`HaiHireBullMqDlqCritical` (Critical):**
  > Dead-Letter Queue `orphan-cleanup-dlq` has $> 100$ jobs in `waiting` state for $> 2$ minutes.  
  > Risk of storage leakage in MinIO and backlog in orphan file purge worker. Immediate escalation required.

---

## Step 1: Verify Incident

Inspect actual queue depth in DLQ via the Prometheus Metrics endpoint:

```bash
# Check waiting job count in DLQ (Production)
curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq

# Check on Development environment
curl -s http://localhost:13001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq
```

Inspect backend service logs directly for failed job traces:

```bash
# View orphan cleanup processor and DLQ logs
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -E "OrphanCleanup|DLQ"
```

---

## Step 2: Diagnose Root Cause

1. **Check MinIO Object Storage Health:**
   ```bash
   # Check if MinIO container is running
   docker ps --filter "name=minio"

   # Probe MinIO live health check
   curl -I http://localhost:9000/minio/health/live
   ```

2. **Verify MinIO Connectivity and Target Bucket:**
   ```bash
   # Check haihire-resumes bucket reachability
   docker exec -it haihire-prod-backend node -e "
     const { Client } = require('minio');
     const client = new Client({
       endPoint: process.env.MINIO_ENDPOINT || 'minio',
       port: parseInt(process.env.MINIO_PORT || '9000'),
       useSSL: process.env.MINIO_USE_SSL === 'true',
       accessKey: process.env.MINIO_ACCESS_KEY,
       secretKey: process.env.MINIO_SECRET_KEY,
     });
     client.bucketExists(process.env.MINIO_BUCKET_NAME || 'haihire-resumes', (err, exists) => {
       if (err) console.error('MinIO Error:', err.message);
       else console.log('Bucket exists:', exists);
     });
   "
   ```

3. **Identify Failure Cause of Jobs in DLQ:**
   - Common causes:
     - `S3 NoSuchKey` / `NoSuchBucket`: File was purged prior to processing or bucket was renamed.
     - `MinIO Connection Refused` / `Socket Timeout`: MinIO experiencing IOPS saturation or disk exhaustion.
     - `Invalid Access Key / Secret Key`: Mismatched MinIO credentials following environment updates.

---

## Step 3: Mitigate (Short-Term Action)

1. **Restart MinIO Container if Unresponsive:**
   ```bash
   docker compose -f docker-compose.prod.yml restart minio
   ```

2. **Restart Backend Container to Reconnect Workers:**
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

3. **Trigger Manual Orphan Cleanup Scan to Reclaim Storage:**
   ```bash
   # Run manual orphan cleanup script
   docker exec -it haihire-prod-backend node --import tsx scripts/cleanup-orphan-minio.ts
   ```

---

## Step 4: Resolve (Long-Term Fix)

1. **Fix Configuration & Credentials:**
   - Ensure `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` in `.env.production` match MinIO server configuration.
2. **Expand MinIO Volume Capacity:**
   - Inspect volume usage: `df -h /var/lib/docker/volumes/haihire_minio_data`
   - Expand volume disk if utilization exceeds 90%.
3. **Tune BullMQ Worker Concurrency and Retry Backoff:**
   - If workers are overwhelmed by high upload volume, adjust `concurrency` in `OrphanCleanupProcessor`.

---

## Step 5: Post-Mortem & Incident Closure

- [ ] Metric `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"}` drops to `0` or $< 5$.
- [ ] Alerts `HaiHireBullMqDlqGrowing` and `HaiHireBullMqDlqCritical` transition to `RESOLVED`.
- [ ] Run dry-run scan: `node --import tsx scripts/cleanup-orphan-minio.ts --dry-run` to verify zero lingering orphan files.
- [ ] Document root cause and remediation steps in internal post-incident review.
