# HaiHire Production Backup & Disaster Recovery Runbook

## 1. Overview
This runbook provides technical procedures for automated backups, data integrity verification, object storage replication, and disaster recovery drills for HaiHire production systems.

Target Services:
- **Relational Database:** PostgreSQL 17 (`haihire-postgres` / `haihire_db`)
- **Object Storage:** MinIO S3-compatible storage (`haihire-minio` / `haihire-resumes`)

---

## 2. Automated Enterprise Backup Pipeline

The production backup automation is maintained at:
[`scripts/backup-production.ts`](file:///c:/Workspaces/haihire/scripts/backup-production.ts)

### Execution Command:
```bash
# Run standalone with Node native strip-types:
node --no-warnings --experimental-strip-types scripts/backup-production.ts

# Optional environment variable overrides:
POSTGRES_CONTAINER=haihire-postgres \
MINIO_CONTAINER=haihire-minio \
BACKUP_RETENTION_DAYS=7 \
node --no-warnings --experimental-strip-types scripts/backup-production.ts
```

### Architectural Pipeline Steps:
1. **Pre-Flight Container Health Verification:**
   Verifies that both `haihire-postgres` and `haihire-minio` containers are actively running before attempting snapshot operations.
2. **PostgreSQL Dual Format Dump (No TTY, No PowerShell Redirection Corruption):**
   - Eliminates terminal TTY escape sequences by omitting `-t` flag (`docker exec -i`).
   - Generates dumps inside container filesystem (`-f /tmp/...`) and copies to host via `docker cp` to prevent PowerShell UTF-16LE BOM encoding corruption.
   - Generates two formats:
     - **Custom Archive (`.dump`, `-F c`):** Compressed, checksum-verified binary format for rapid restoration via `pg_restore`.
     - **Plain Text SQL (`.sql`, `-F p`):** Readable, diffable SQL statements.
3. **MinIO Object Storage Hot Archival:**
   - Archives MinIO `/data` volume into a compressed `.tar.gz` archive (`haihire-minio-{TIMESTAMP}.tar.gz`).
   - Copies archive to host backup directory and cleans up container temporary files.
4. **Integrity Verification via `pg_restore -l`:**
   - Executes Table of Contents (TOC) validation on the custom dump to ensure file headers, compression tables, and data blocks are intact.
   - Halts immediately if TOC validation fails.
5. **Live Automated Restore Drill:**
   - Drops any stale `haihire_restore_drill` database.
   - Creates clean temporary database `haihire_restore_drill`.
   - Restores the newly created `.dump` snapshot into `haihire_restore_drill` via `pg_restore`.
   - Executes validation queries (e.g. `SELECT count(*) FROM "user";`).
   - Upon successful verification, drops `haihire_restore_drill`.
   - If restoration drill fails, the script aborts, raises an alert, and keeps all dump artifacts intact for forensic inspection.
6. **Retention Pruning:**
   - Scans backup directory and automatically removes `.sql`, `.dump`, and `.tar.gz` files older than `BACKUP_RETENTION_DAYS` (default: 7 days).

---

## 3. Disaster Recovery & Manual Restoration Procedures

In the event of hardware failure, catastrophic data corruption, or regional failover, execute the following disaster recovery procedure:

### 3.1. Stop Inbound Traffic
```bash
docker compose -f docker-compose.prod.yml stop backend frontend
```

> **Note on Container Names:**
> - In Production (`docker-compose.prod.yml`): containers are named `haihire-prod-postgres`, `haihire-prod-minio`, and `haihire-prod-redis`.
> - In Local Development (`docker-compose.yml`): containers are named `haihire-postgres`, `haihire-minio`, and `haihire-valkey`.
> The examples below use the production container naming convention (`haihire-prod-*`).

### 3.2. Database Restoration (PostgreSQL)

#### Method A: Custom Archive Restoration (Recommended)
```bash
# Locate latest verified snapshot:
SNAPSHOT="./backups/haihire-db-haihire_db-YYYY-MM-DDTHH-mm-ss-sssZ.dump"

# Copy snapshot into postgres container:
docker cp "$SNAPSHOT" haihire-prod-postgres:/tmp/restore.dump

# Drop and recreate production database:
docker exec -i haihire-prod-postgres psql -U haihire_user -d postgres -c "DROP DATABASE haihire_db WITH (FORCE);"
docker exec -i haihire-prod-postgres psql -U haihire_user -d postgres -c "CREATE DATABASE haihire_db OWNER haihire_user;"

# Execute pg_restore:
docker exec -i haihire-prod-postgres pg_restore -U haihire_user -d haihire_db --no-owner --no-acl /tmp/restore.dump

# Clean up container file:
docker exec -i haihire-prod-postgres rm -f /tmp/restore.dump
```

#### Method B: Plain SQL Restoration
```bash
SNAPSHOT_SQL="./backups/haihire-db-haihire_db-YYYY-MM-DDTHH-mm-ss-sssZ.sql"
docker cp "$SNAPSHOT_SQL" haihire-prod-postgres:/tmp/restore.sql
docker exec -i haihire-prod-postgres psql -U haihire_user -d postgres -c "DROP DATABASE haihire_db WITH (FORCE);"
docker exec -i haihire-prod-postgres psql -U haihire_user -d postgres -c "CREATE DATABASE haihire_db OWNER haihire_user;"
docker exec -i haihire-prod-postgres psql -U haihire_user -d haihire_db -f /tmp/restore.sql
docker exec -i haihire-prod-postgres rm -f /tmp/restore.sql
```

### 3.3. MinIO Object Storage Restoration
```bash
MINIO_ARCHIVE="./backups/haihire-minio-YYYY-MM-DDTHH-mm-ss-sssZ.tar.gz"

# Copy archive to container and extract into /data:
docker cp "$MINIO_ARCHIVE" haihire-prod-minio:/tmp/minio-restore.tar.gz
docker exec -i haihire-prod-minio tar -xzf /tmp/minio-restore.tar.gz -C /data
docker exec -i haihire-prod-minio rm -f /tmp/minio-restore.tar.gz

# Restart MinIO container to ensure metadata re-index:
docker restart haihire-prod-minio
```

### 3.4. Service Resumption & Verification
```bash
# Restart application stack:
docker compose -f docker-compose.prod.yml start backend frontend

# Perform health check (Production default: 3001, Dev: 13001):
curl -i http://localhost:3001/health

# Verify metrics:
curl -s http://localhost:3001/metrics | grep http_requests_total
```

---

## 4. Complementary Maintenance Tasks
- **Orphan Object Cleanup:** Daily cron purging unreferenced resume files after a 30-day grace period. See [orphan-cleanup.md](file:///c:/Workspaces/haihire/docs/runbooks/orphan-cleanup.md).
- **Incident Response Runbook:** Prometheus alerts and SOPs for database/storage downtime. See [alerts.md](file:///c:/Workspaces/haihire/docs/runbooks/alerts.md).


