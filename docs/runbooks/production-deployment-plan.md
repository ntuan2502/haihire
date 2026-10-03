# HaiHire Production Deployment & Rollback Plan

## 1. Overview & Maintenance Window
This runbook provides the canonical deployment plan, pre-flight checklists, operational execution sequences, rollback strategies, and post-deployment monitoring guidelines for releasing the HaiHire ATS Enterprise Platform to production.

* **Target Release:** Version 1.0.0 (Production General Availability)
* **Designated Maintenance Window:** `02:00 - 04:00 UTC` (Period of lowest global candidate traffic)
* **Estimated Downtime:** `0 minutes` (Zero-downtime rolling update via Docker Compose / Reverse Proxy) or maximum 2 minutes maintenance drain during database migration execution.
* **On-Call SRE Leads:** Senior Backend Engineer + Infrastructure SRE Engineer

---

## 2. Pre-Deployment Checklist (T-24h to T-1h)

Before commencing deployment operations, verify each item:

- [ ] **Data Safety Snapshot:**
  Execute pre-release full backup across PostgreSQL and MinIO:
  ```bash
  node --no-warnings --experimental-strip-types scripts/backup-production.ts
  ```
  Verify output displays: `Backup & Restore Drill Completed Successfully!`.
- [ ] **Clean Codebase Verification:**
  - `pnpm test` and `pnpm test:e2e` reporting 379/379 tests passing (233 Backend + 136 Frontend + 10 E2E).
  - All 7 CI Architecture Gates reporting 100% PASS (`pnpm check:all:fast`).
  - `pnpm lint:env-sync` reporting 100% key parity and complete compose variable coverage.
- [ ] **Container Image Availability on GHCR:**
  Verify immutable production images published by GitHub Actions workflow exist in GitHub Container Registry (GHCR):
  ```bash
  export GITHUB_REPOSITORY="ntuan2502/haihire"
  export IMAGE_TAG="v1.0.0" # Never use 'latest' in production

  docker pull ghcr.io/${GITHUB_REPOSITORY}/haihire-backend:${IMAGE_TAG}
  docker pull ghcr.io/${GITHUB_REPOSITORY}/haihire-frontend:${IMAGE_TAG}
  ```
- [ ] **Stakeholder & Tenant Notification:**
  Broadcast scheduled maintenance window notice via platform status dashboard at `status.haihire.com`.

---

## 3. Deployment Steps (T-0)

Execute sequential deployment commands during the designated maintenance window:

### Step 1: Pre-Flight Verification & Traffic Isolation
```bash
# 1.1 SSH into production server
ssh sre-admin@prod-cluster.haihire.internal

# 1.2 Inspect cluster resource headroom (Memory > 4GB free, Disk > 20GB free)
free -m
df -h /var/lib/docker

# 1.3 Ensure .env.production has immutable IMAGE_TAG and GITHUB_REPOSITORY set
# Example in .env.production:
# GITHUB_REPOSITORY=ntuan2502/haihire
# IMAGE_TAG=v1.0.0
grep -E "^(GITHUB_REPOSITORY|IMAGE_TAG)=" .env.production

# 1.4 Verify production configuration validity
pnpm docker:prod:config
# or: docker compose --env-file .env.production -f docker-compose.prod.yml config
```

### Step 2: Database Migration Check
```bash
# Verify backward-compatibility of schema before stopping application
pnpm run migration:status
pnpm run migrate
```

### Step 3: Progressive Rolling Deployment (Zero Local Build)
```bash
# 3.1 Pull verified immutable images from GHCR
docker compose --env-file .env.production -f docker-compose.prod.yml pull backend frontend orphan-cleanup

# 3.2 Audit & record image digests for deployment tracking
docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/${GITHUB_REPOSITORY:-ntuan2502/haihire}/haihire-backend:${IMAGE_TAG:-v1.0.0}
docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/${GITHUB_REPOSITORY:-ntuan2502/haihire}/haihire-frontend:${IMAGE_TAG:-v1.0.0}

# 3.3 Deploy Backend with zero-build container start
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend

# 3.4 Verify backend health before updating frontend
curl -f -s http://localhost:3001/health | grep '"status":"ok"' || exit 1

# 3.5 Deploy Frontend with zero-build container start
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps frontend

# 3.6 Restart background worker services
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps orphan-cleanup
```

### Step 4: Post-Deployment Smoke Test
Run automated synthetic smoke test suite against live production instance:
```bash
node --no-warnings --experimental-strip-types scripts/smoke-and-load-test.ts
```
Verify:
1. `GET /health` returns HTTP 200 with all 3 services (`postgres`, `redis`, `minio`) in `up` state.
2. Authenticate recruiter user $\rightarrow$ HTTP 200 + valid JWT.
3. Candidate application submission $\rightarrow$ HTTP 201 + MinIO CV storage.
4. Kanban stage transition $\rightarrow$ HTTP 200 + Activity log recorded.

---

## 4. Rollback Plan (Contingency Procedure)

If unrecoverable critical failures occur (P0/P1 bugs, database deadlock, or error rate > 1%), execute emergency rollback within 15 minutes of detection:

### 4.1. Rollback Trigger Criteria
* Backend `/health` endpoint remains down > 60 seconds after startup.
* HTTP error rate exceeds 1% of total requests on `/metrics`.
* Latency p95 exceeds 500ms for more than 5 consecutive minutes.

### 4.2. Rollback Commands
```bash
# Step 1: Revert container image to N-1 verified release tag (Immutable Tag Policy: NEVER use latest)
export PREVIOUS_STABLE_TAG="v0.9.9"

# Update IMAGE_TAG in .env.production or pass via environment override:
IMAGE_TAG=${PREVIOUS_STABLE_TAG} docker compose --env-file .env.production -f docker-compose.prod.yml pull backend frontend
IMAGE_TAG=${PREVIOUS_STABLE_TAG} docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend

# Step 2: In the event of schema incompatibility, restore from pre-deployment snapshot:
# (Only if migrations made breaking structural changes)
SNAPSHOT="./backups/haihire-db-haihire_db-PRE_DEPLOY.dump"
docker cp "$SNAPSHOT" haihire-postgres:/tmp/rollback.dump
docker exec -i haihire-postgres pg_restore -U haihire_user -d haihire_db --clean --if-exists /tmp/rollback.dump
docker exec -i haihire-postgres rm -f /tmp/rollback.dump

# Step 3: Verify restored state
curl -i http://localhost:3001/health
```

---

## 5. Post-Deployment Monitoring (48 Hours Observation Window)

Establish continuous SRE observation protocol across four operational milestones:

| Time Window | Monitoring Focus | Verification Actions & Targets |
| :--- | :--- | :--- |
| **Hour 1** | Immediate Stability | Watch Prometheus Grafana dashboards: HTTP error rate $< 0.1\%$, Latency p95 $< 120\text{ms}$, Memory RSS steady. |
| **Hour 6** | Queue & Concurrency | Inspect BullMQ Valkey/Redis queue depth ($< 10$ backlog), PostgreSQL connection pool saturation ($< 40\%$), MinIO upload success rate $100\%$. |
| **Hour 24** | Daily Business Traffic | Review application error logs (`docker compose logs backend --since 24h \| grep ERROR`), audit trail integrity, email delivery success rate. |
| **Hour 48** | Final Sign-Off Review | SRE and Engineering leadership review meeting: confirm zero regressions, close deployment ticket, declare production stable. |

---

## 6. Critical Alert Rules To Watch (Prometheus / Grafana)

The following Prometheus alert rules (maintained in [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)) must remain green:

```yaml
- alert: HighHttpErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "HTTP 5xx error rate exceeds 1% on HaiHire Backend"

- alert: HighLatencyP95
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "p95 request latency exceeds 500ms"

- alert: ServiceDown
  expr: up{job="haihire-backend"} == 0
  for: 1m
  labels:
    severity: page
  annotations:
    summary: "HaiHire Backend instance is unreachable"

- alert: EmailQueueBacklog
  expr: bullmq_queue_waiting_jobs{queue="email-queue"} > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Email dispatch queue has over 100 backlogged jobs"
```
