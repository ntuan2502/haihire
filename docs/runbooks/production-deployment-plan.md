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
- [ ] **Container Image Build & Registry Push:**
  Build immutable production images tagged with Git commit SHA and `:latest`:
  ```bash
  export IMAGE_TAG=$(git rev-parse --short HEAD)
  docker build -f backend/Dockerfile -t registry.haihire.internal/haihire-backend:${IMAGE_TAG} -t registry.haihire.internal/haihire-backend:latest .
  docker build -f frontend/Dockerfile -t registry.haihire.internal/haihire-frontend:${IMAGE_TAG} -t registry.haihire.internal/haihire-frontend:latest .
  docker push registry.haihire.internal/haihire-backend:${IMAGE_TAG}
  docker push registry.haihire.internal/haihire-frontend:${IMAGE_TAG}
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

# 1.3 Verify production configuration validity
pnpm docker:prod:config
# or: docker compose --env-file .env.production -f docker-compose.prod.yml config
```

### Step 2: Database Migration Check
```bash
# Verify backward-compatibility of schema before stopping application
pnpm run migration:status
pnpm run migrate
```

### Step 3: Progressive Rolling Deployment
```bash
# 3.1 Pull new container images
docker compose --env-file .env.production -f docker-compose.prod.yml pull backend frontend

# 3.2 Deploy Backend with graceful drain
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps --build backend

# 3.3 Verify backend health before updating frontend
curl -f -s http://localhost:3001/health | grep '"status":"ok"' || exit 1

# 3.4 Deploy Frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps --build frontend
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
# Step 1: Revert container image to N-1 verified release tag
export PREVIOUS_STABLE_TAG="v0.9.9-stable"

docker compose -f docker-compose.prod.yml stop backend frontend
TAG=${PREVIOUS_STABLE_TAG} docker compose -f docker-compose.prod.yml up -d backend frontend

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
