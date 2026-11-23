# Backup and Restore Runbook

HaiHire persists authoritative relational state in **PostgreSQL 17.6** and uploaded candidate documents in **MinIO (`haihire-resumes`)**. Automated backup orchestration lives in [scripts/backup-production.ts](../../scripts/backup-production.ts).

---

## 1. Automated Backup Script (`scripts/backup-production.ts`)

`backup-production.ts` reads configuration from root `.env` / environment variables:

- `BACKUP_DIR` (default `./backups`)
- `BACKUP_RETENTION_DAYS` (default `7`)
- `POSTGRES_HOST` (`localhost`), `POSTGRES_PORT` (`15432` script fallback / `5432` in Compose), `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_CONTAINER` (`haihire-postgres`)
- `MINIO_CONTAINER` (`haihire-minio`)

Concurrence safety uses a `.backup.lock` file inside `BACKUP_DIR` with automatic `30m` stale lock expiration.

```bash
pnpm --filter api exec tsx ../../scripts/backup-production.ts
```

---

## 2. Manual PostgreSQL Backup & Restore Drill

### Dump (`pg_dump`)

```bash
docker exec -t haihire-prod-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file=/tmp/haihire.dump
docker cp haihire-prod-postgres:/tmp/haihire.dump ./backups/haihire-$(date +%Y%m%d).dump
```

### Restore Drill (`pg_restore` into Isolated Verification DB)

```bash
docker cp ./backups/haihire-latest.dump haihire-prod-postgres:/tmp/restore.dump
docker exec -t haihire-prod-postgres pg_restore -U "$POSTGRES_USER" -d "${POSTGRES_DB}_verify" --clean --if-exists /tmp/restore.dump
```

Never overwrite live production databases without first stopping API write traffic and validating table row counts in a staging/verification database.

---

## 3. MinIO Object Storage Backup

- Synchronize the `haihire-resumes` bucket (`tenants/<orgId>/...` prefix structure) using `mc mirror` against off-site encrypted S3-compatible storage or snapshot the `minio_data` Docker volume during maintenance windows.
- After restoring MinIO + PostgreSQL together, execute a dry-run of [Orphan MinIO Cleanup](orphan-cleanup.md) to confirm DB references and S3 keys match cleanly.
