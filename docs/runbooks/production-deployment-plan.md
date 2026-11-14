# Production Deployment Plan

> Step-by-step release, Docker Compose topology, verification, and rollback procedures for HaiHire production.

---

## 1. Production Stack Topology (`docker-compose.prod.yml`)

| Service          | Container Name                | Image / Baseline                                                           | Port / Network                           | Healthcheck                             |
| :--------------- | :---------------------------- | :------------------------------------------------------------------------- | :--------------------------------------- | :-------------------------------------- |
| `postgres`       | `haihire-prod-postgres`       | `postgres:17.6-alpine`                                                     | `haihire-prod-network` (internal `5432`) | `pg_isready`                            |
| `redis`          | `haihire-prod-redis`          | `valkey/valkey:8.0.2-alpine` (`noeviction`, AOF `everysec`, `384mb` limit) | `haihire-prod-network` (internal `6379`) | `redis-cli ping`                        |
| `minio`          | `haihire-prod-minio`          | `alpine/minio`                                                             | `haihire-prod-network` (internal `9000`) | HTTP `/minio/health/live`               |
| `api`            | `haihire-prod-api`            | `ghcr.io/<owner>/haihire-api:<IMAGE_TAG>`                                  | `${BACKEND_PORT:-3001}:3001`             | HTTP `GET /health`                      |
| `web`            | `haihire-prod-web`            | `ghcr.io/<owner>/haihire-web:<IMAGE_TAG>`                                  | `${FRONTEND_PORT:-3000}:3000`            | Starts after healthy `api`              |
| `orphan-cleanup` | `haihire-prod-orphan-cleanup` | `ghcr.io/<owner>/haihire-api:<IMAGE_TAG>` (`crond` daily `04:00`)          | `haihire-prod-network`                   | Depends on healthy `postgres` + `minio` |
| `pushgateway`    | `haihire-prod-pushgateway`    | `prom/pushgateway:v1.10.0`                                                 | `${PUSHGATEWAY_PORT:-9091}:9091`         | HTTP `/-/healthy`                       |

Persistent named volumes in [docker-compose.prod.yml](../../docker-compose.prod.yml): `haihire_prod_postgres_data`, `haihire_prod_redis_data`, `haihire_prod_minio_data`.

---

## 2. Pre-Deployment Checklist

1. **CI Release Readiness:** Confirm GitHub Actions CI ([ci-main.yml](../../.github/workflows/ci-main.yml)) and CD ([cd-release.yml](../../.github/workflows/cd-release.yml)) completed cleanly with images published to GHCR and zero blocking Trivy findings.
2. **Release Tag Alignment:** Confirm target `IMAGE_TAG` (e.g., `v1.0.0`) matches the immutable Git tag and version in [CHANGELOG.md](../../CHANGELOG.md).
3. **Environment Configuration:** Verify `.env.production` follows [`.env.production.example`](../../.env.production.example), has `chmod 600` permissions, sets `SEED_DEMO_ON_BOOT=false`, `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`, strong `JWT_SECRET`, `ENCRYPTION_SECRET`, `METRICS_TOKEN` (>= 32 chars), and a non-`SIMULATED` `SYSTEM_EMAIL_PROVIDER`.
4. **Render Validation:**

```bash
pnpm docker:prod:config > /dev/null
```

5. **Mandatory Pre-Deploy Backup:** Take a consistent backup of PostgreSQL and MinIO prior to applying schema changes or swapping images (see [Backup and Restore Runbook](backup-and-restore.md)):

```bash
pnpm db:backup
```

---

## 3. Deployment Execution

### Step 1: Pull Target Release Images

Update `IMAGE_TAG` in `.env.production`, then pull signed images from GHCR:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull api web orphan-cleanup
```

### Step 2: Apply Database Schema / Migrations (When Required)

Inspect migration status before applying:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npx prisma migrate status
```

Apply pending migrations if clean:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

### Step 3: Start / Recreate Stack

```bash
pnpm docker:prod:up
```

Verify all containers stabilize cleanly and report `healthy`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

---

## 4. Post-Deploy Verification (`scripts/smoke-and-load-test.ts`)

Run [scripts/smoke-and-load-test.ts](../../scripts/smoke-and-load-test.ts) against the target environment (staging or pre-cutover endpoint; note it creates a synthetic `smoke_<timestamp>@prod.test` organization/job):

- Verifies `GET /health` returns HTTP `200` with `status: "ok"`.
- Verifies `/metrics` exposes `http_requests_total` when accessible.
- Verifies registration, organization creation, login, job creation, and subsequent flow endpoints.
- Executes a `500`-request / `50`-concurrency benchmark asserting `p95 < 500ms` and `0` failed requests.

Also confirm:

- Web SSR root loads cleanly (`http://localhost:${FRONTEND_PORT:-3000}`).
- `GET /health` returns `200`.
- Active Prometheus alert dashboard shows zero firing critical alerts ([Alerts Runbook](alerts.md)).

---

## 5. Rollback Procedure

### Application-Only Rollback (No Incompatible Schema Change)

1. Revert `IMAGE_TAG` in `.env.production` to the previous known-good release tag.
2. Recreate `api`, `web`, and `orphan-cleanup`:

```bash
pnpm docker:prod:up
```

### Full Rollback (After Destructive / Non-Backward-Compatible Migration)

1. Stop `api`, `web`, and `orphan-cleanup` (`docker compose --env-file .env.production -f docker-compose.prod.yml stop api web orphan-cleanup`).
2. Restore PostgreSQL and MinIO from the pre-deploy backup taken in Section 2 following [Backup and Restore Runbook](backup-and-restore.md).
3. Set `IMAGE_TAG` back to the prior release tag and start the stack (`pnpm docker:prod:up`).

---

## 6. Related Documentation

- [CI/CD Runbook](ci-cd.md)
- [Environment Management Runbook](env-management.md)
- [Versioning Runbook](versioning.md)
- [Backup and Restore Runbook](backup-and-restore.md)
- [Redis Recovery Runbook](redis-recovery.md)
