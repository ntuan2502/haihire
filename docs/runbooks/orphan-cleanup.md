# Runbook: MinIO Orphan Object Cleanup Operation

**System:** HaiHire Enterprise ATS  
**Automation Schedule:** Daily at 04:00 AM UTC (`0 4 * * *`)  
**Objective:** Scan and safely purge unreferenced candidate resume files from the MinIO storage bucket (`haihire-resumes`) that lack database references (`CandidateDocument`, `Application`, `Candidate`), reclaiming enterprise storage capacity without risk of data loss.

---

## 1. Operating Principles & Safety Threshold (Grace Period)

1. **Mandatory 30-Day Grace Period:**
   - Any storage object uploaded or modified within the past 30 days (`age < 30 days`) is **strictly preserved**, even if no database reference currently exists.
   - This prevents race conditions with in-flight application submissions, multi-step candidate onboarding, or uncommitted database transactions.
2. **Deletion Criteria:**
   - File is located under bucket path `haihire-resumes/tenants/*/resumes/*`.
   - Zero database references exist across:
     - `CandidateDocument.url`
     - `Application.resumeUrl`
     - `Candidate.resumeUrl`
   - Object `lastModified` timestamp $\ge$ 30 days old.

---

## 2. Manual Execution Runbook

### Step 1: Safe Simulation (Dry-Run Mode)
Before initiating any real deletion in production, **always** execute the dry-run mode to audit candidate objects and verify deletion counts without modifying object storage:

```bash
# Execute dry-run from repo root
pnpm exec tsx scripts/cleanup-orphan-minio.ts --dry-run

# Or customize threshold days (e.g., audit files older than 60 days)
pnpm exec tsx scripts/cleanup-orphan-minio.ts --dry-run --threshold-days=60
```

**Expected Sample Output:**
```text
==================================================================
       HAIHIRE ENTERPRISE ATS: MINIO ORPHAN CLEANUP CRON          
==================================================================
Execution Mode:       DRY-RUN (Safe Simulation - No Deletions)
Age Threshold:        30 days
Target Bucket:        haihire-resumes
------------------------------------------------------------------
Total Objects Scanned:     142
Active DB References:      135
Orphan Objects Found:      7
  - Preserved (< 30d):     5
  - Eligible for Deletion: 2
Storage Space Freed:       4.12 MB (4320140 bytes)
==================================================================
```

### Step 2: Live Deletion Execution
Once the dry-run summary has been reviewed and verified:

```bash
pnpm exec tsx scripts/cleanup-orphan-minio.ts --threshold-days=30
```

---

## 3. Production Automated Cron Configuration

The automated cleanup container `orphan-cleanup` is defined in [docker-compose.prod.yml](../../docker-compose.prod.yml):
- **Cron Schedule:** `0 4 * * *` (04:00 AM UTC daily).
- **Log Target:** `/var/log/orphan-cleanup.log`
- **Inspect Service Logs:**
  ```bash
  docker compose -f docker-compose.prod.yml logs orphan-cleanup --tail=100
  ```

---

## 4. Disaster Recovery & Rollback Procedure

If a valid file was inadvertently purged:

1. **Halt Automated Cron Service:**
   ```bash
   docker compose -f docker-compose.prod.yml stop orphan-cleanup
   ```
2. **Locate Latest Verified MinIO Snapshot:**
   Production MinIO snapshots are generated daily by [scripts/backup-production.ts](../../scripts/backup-production.ts) and stored under `backups/haihire-minio-*.tar.gz`.
3. **Extract & Restore Target Objects:**
   ```bash
   # Extract snapshot to staging location
   mkdir -p /tmp/restore-minio
   tar -xzf backups/haihire-minio-YYYY-MM-DDTHH-mm-ss-sssZ.tar.gz -C /tmp/restore-minio/

   # Copy restored file back into MinIO via MinIO Client (mc)
   mc cp /tmp/restore-minio/tenants/<orgId>/resumes/<filename>.pdf local-minio/haihire-resumes/tenants/<orgId>/resumes/
   ```
4. **Data Integrity Verification:**
   - Log in to the recruiter portal at `http://localhost:13000` (or production domain).
   - Navigate to the affected candidate profile.
   - Click "Download Resume" to confirm the PDF downloads and renders correctly.

---

**Responsible Teams:** Senior Backend Engineering + Site Reliability Engineering (SRE)
