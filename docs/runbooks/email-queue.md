# Runbook: Email Queue Backlog Remediation

**System:** HaiHire Enterprise ATS  
**Related Documentation:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)  
**Alert Rule:** `HaiHireEmailQueueBacklog` (Warning)  
**Responsible Teams:** SRE & Backend Engineering (`team: sre`)

---

## Alert Triggers & Conditions

- **`HaiHireEmailQueueBacklog` (Warning):**
  > Email queue `email-queue` has $> 500$ jobs in `waiting` state for $> 10$ minutes.  
  > Email delivery throughput (interview invitations, rejection letters, verification notices) is experiencing severe delays.

---

## Step 1: Verify Incident

Inspect email queue depth directly on the Prometheus metrics endpoint:

```bash
# Production
curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | grep email-queue

# Development
curl -s http://localhost:13001/metrics | grep bullmq_queue_depth | grep email-queue
```

Inspect `EmailProcessor` application logs:

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -E "EmailProcessor|EmailService"
```

---

## Step 2: Diagnose Root Cause

1. **Verify Email Provider Status:**
   - **SMTP:** Test TCP reachability to SMTP host:
     ```bash
     nc -zv smtp.gmail.com 587
     ```
   - **Resend / SendGrid:** Check external provider status dashboards:
     - Resend Status: https://status.resend.com
     - SendGrid Status: https://status.sendgrid.com
2. **Check Provider Quota & Rate Limits:**
   - Search logs for HTTP `429 Too Many Requests` or `Daily sending quota exceeded`.
3. **Verify Email Credentials & Secrets:**
   - Check environment variables: `SYSTEM_EMAIL_PROVIDER`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_RESEND_API_KEY`.

---

## Step 3: Mitigate (Short-Term Action)

1. **If Primary Provider Experiences Outage:**
   - Temporarily failover to secondary provider (e.g. switch from SMTP to Resend or vice versa) in `.env.production`:
     ```env
     SYSTEM_EMAIL_PROVIDER="RESEND"
     SYSTEM_EMAIL_RESEND_API_KEY="re_..."
     ```
   - Restart backend container to apply configuration:
     ```bash
     docker compose -f docker-compose.prod.yml restart backend
     ```
2. **If Backlog is Due to Mass Candidate Campaign:**
   - Temporarily scale up worker `concurrency` in NestJS BullMQ module (provided host CPU/RAM allows).

---

## Step 4: Resolve (Long-Term Fix)

1. Upgrade provider billing tier if daily sending quotas were exhausted.
2. Implement adaptive tenant-level rate limiting and exponential backoff for batch email dispatches.
3. Validate domain SPF, DKIM, and DMARC DNS records to prevent connection drops by destination MX servers.

---

## Step 5: Post-Mortem & Incident Closure

- [ ] Metric `bullmq_queue_depth{queue="email-queue",state="waiting"}` drops to $< 50$.
- [ ] Alert `HaiHireEmailQueueBacklog` transitions to `RESOLVED`.
- [ ] Query database `EmailLog` table to inspect failure counts:
  ```bash
  docker exec -it haihire-prod-postgres psql -U haihire_user -d haihire_db -c "SELECT status, COUNT(*) FROM \"EmailLog\" WHERE \"createdAt\" > NOW() - INTERVAL '2 hours' GROUP BY status;"
  ```
- [ ] Notify affected tenant organizations if critical notices were delayed.
