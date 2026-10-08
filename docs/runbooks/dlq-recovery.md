# Runbook: BullMQ Dead-Letter Queue Recovery (DLQ Recovery)

**System:** HaiHire Enterprise ATS  
**Related Documentation:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml), [`docs/runbooks/orphan-cleanup.md`](file:///c:/Workspaces/haihire/docs/runbooks/orphan-cleanup.md)  
**Alert Rules:** `HaiHireBullMqDlqGrowing` (Warning), `HaiHireBullMqDlqCritical` (Critical), `HaiHireOrphanCleanupSpikeWarning` (Warning), `HaiHireOrphanCleanupSpikeCritical` (Critical), `HaiHireOrphanCleanupCronMissing` (Critical)  
**Responsible Teams:** SRE & Backend Engineering (`team: sre`)

---

## Khi Orphan Cleanup Spike (HaiHireOrphanCleanupSpikeWarning/Critical)

### Verify
```bash
curl -s http://pushgateway:9091/metrics | grep minio_orphan_cleanup
```

Xem:
- `orphans_found_total`: số file orphan phát hiện
- `preserved_total`: số file trong grace period
- `last_run_timestamp_seconds`: lần chạy cuối

### Diagnose
1. Nếu `orphans_found` > 50 đột ngột → có thể do:
   - Bug ở luồng upload CV (Saga rollback không xóa file).
   - MinIO connectivity issue → upload thành công nhưng DB write fail.
   - Test data được upload không đúng cách.
2. Kiểm tra log backend gần đây:
   ```bash
   docker logs haihire-prod-backend --since 24h | grep -i "orphan\|minio"
   ```
3. Kiểm tra DLQ có tích tụ job không:
   ```bash
   curl -s localhost:3001/metrics | grep bullmq_queue_depth
   ```

### Mitigate
1. Nếu spike nhỏ (<100 files): theo dõi thêm 1-2 ngày.
2. Nếu spike lớn (>100 files): 
   - Tạm dừng cron cleanup (để giữ file làm evidence).
   - Điều tra root cause.
   - Sau khi fix → chạy manual cleanup:
     ```bash
     docker exec -it haihire-prod-orphan-cleanup node --import tsx scripts/cleanup-orphan-minio.ts
     ```

### Resolve
1. Fix root cause (Saga logic, MinIO config).
2. Verify no new orphans trong 24h tiếp theo.
3. Chạy manual cleanup để dọn file orphan tích tụ.

### Post-mortem
- Đếm chính xác số file orphan đã dọn.
- Verify không có file hợp lệ bị xóa nhầm.
- Update monitoring nếu cần thêm metric.

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
