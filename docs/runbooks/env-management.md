# Environment Management Runbook

> Governance, Zod runtime validation, parity enforcement, and secret rotation for HaiHire environment configuration.

---

## 1. Authoritative Configuration Files

| Artifact                                                                         | Purpose                                                                                           | Access / Git Policy                     |
| :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :-------------------------------------- |
| [`.env.example`](../../.env.example)                                             | Local Dev template (`24` core keys + commented `# OPTIONAL OVERRIDES`)                            | Committed (SSOT for Dev sync gate)      |
| [`.env.staging.example`](../../.env.staging.example)                             | Local Docker Staging template (`25` core keys + optional overrides, `:8081`)                      | Committed template only                 |
| [`.env.production.example`](../../.env.production.example)                       | Production VPS template (`27` core keys + optional overrides, `chmod 600` on VPS)                 | Committed template only                 |
| `.env` / `.env.staging` / `.env.production`                                      | Active local / staging / production runtime secrets                                               | **Git-ignored — NEVER commit**          |
| [apps/api/src/config/database-url.ts](../../apps/api/src/config/database-url.ts) | Resolves `DATABASE_URL` directly or derives it automatically from `POSTGRES_USER`/`PASSWORD`/`DB` | Shared by `env.ts`, Vitest & cleanup    |
| [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts)                   | Backend startup Zod schema, `MINIO_PUBLIC_URL` default derivation, and cross-field `superRefine`  | Enforced at API boot                    |
| [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts)                         | Frontend split validation (`NEXT_PUBLIC_API_URL` client vs `INTERNAL_API_URL` auto-default SSR)   | Enforced on server & browser            |
| [scripts/check-env-sync.ts](../../scripts/check-env-sync.ts)                     | Parity audit (active core keys + `# OPTIONAL OVERRIDES`) and Staging/Prod Compose coverage        | Required CI gate (`pnpm lint:env-sync`) |

---

## 2. Parity Enforcement (`pnpm lint:env-sync`)

Template parity distinguishes **core active keys** (required in local `.env` / `.env.staging` / `.env.production`) from documented `# OPTIONAL OVERRIDES` (commented out unless needed, such as `DATABASE_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_API_URL`, or inactive email providers):

1. Update `.env.example` (plus `.env.staging.example` / `.env.production.example` when applicable) — keep required keys active and place rare/derived overrides under `# OPTIONAL OVERRIDES`.
2. Update the Zod schema in [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) or [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts).
3. Pass any container-required overrides into [docker-compose.yml](../../docker-compose.yml), [docker-compose.staging.yml](../../docker-compose.staging.yml), and [docker-compose.prod.yml](../../docker-compose.prod.yml).
4. Run verification before committing:

```bash
pnpm lint:env-sync
pnpm check:prod-email-provider
```

`scripts/check-env-sync.ts` verifies core key parity, allows uncommenting documented optional overrides locally (such as local SMTP settings in `.env`), validates Compose coverage for both `docker-compose.staging.yml` and `docker-compose.prod.yml`, and confirms every variable referenced in code exists in `.env.example`.

---

## 3. Production Security Guardrails

At startup, [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) fails fast if any production safety invariant is violated:

| Variable                        | Production Rule                                                         | Reason                                                          |
| :------------------------------ | :---------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `NODE_ENV`                      | Must equal `production`                                                 | Enables production security checks & disables demo boot seeding |
| `SEED_DEMO_ON_BOOT`             | **Must be `false`** (defaults `false` when omitted)                     | Prevents seeding demo credentials in live databases             |
| `JWT_SECRET`                    | Random cryptographically strong secret (never default/placeholder)      | Signs auth cookies & access tokens                              |
| `ENCRYPTION_SECRET`             | Random cryptographically strong secret (`min 32 chars`)                 | Encrypts sensitive credentials at rest                          |
| `METRICS_TOKEN`                 | Min `32` chars when set; required in production                         | `/metrics` returns `404` in production when unset               |
| `SYSTEM_EMAIL_PROVIDER`         | Cannot be `SIMULATED` in production (`pnpm check:prod-email-provider`)  | Enforces real `SMTP`, `RESEND`, or `SENDGRID` delivery          |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Omitted or `false` (disabled automatically when `NODE_ENV=production`)  | Hides demo quick-login controls on login screen                 |
| `INTERNAL_API_URL`              | `http://api:3001` in Docker Compose (defaults `127.0.0.1:3001` locally) | Powers SSR & internal proxy routing in `apps/web`               |

Provider-specific cross-field rules enforced by `superRefine`:

- If `SYSTEM_EMAIL_PROVIDER=SMTP`: `SYSTEM_EMAIL_SMTP_HOST`, `SYSTEM_EMAIL_SMTP_USER`, and `SYSTEM_EMAIL_SMTP_PASS` must all be non-empty.
- If `SYSTEM_EMAIL_PROVIDER=RESEND`: `SYSTEM_EMAIL_RESEND_API_KEY` must be non-empty.
- If `WEBHOOK_PROVIDER` is set: `WEBHOOK_URL` is required; if `WEBHOOK_PROVIDER=TELEGRAM`, `WEBHOOK_CHAT_ID` is also required.

---

## 4. Provisioning & Rotating Secrets

### Generating High-Entropy Secrets

```bash
# Generate 32-byte (64-hex-char) values for JWT_SECRET, ENCRYPTION_SECRET, and METRICS_TOKEN
openssl rand -hex 32
```

Ensure `.env.production` on the host restricts read/write access strictly to the deploy user:

```bash
chmod 600 .env.production
```

### Quarterly Rotation Procedure

1. **Non-Data Secrets (`JWT_SECRET`, `METRICS_TOKEN`, `REDIS_PASSWORD`, `MINIO_SECRET_KEY`, `POSTGRES_PASSWORD`):**
   - Generate a new value, update `.env.production` and any dependent Prometheus scraper config (for `METRICS_TOKEN`), and perform a rolling restart via `pnpm docker:prod:up`.
   - Note: Rotating `JWT_SECRET` signs out active user sessions cleanly on next token verification.
2. **Data Encryption Key (`ENCRYPTION_SECRET`):**
   - Never overwrite `ENCRYPTION_SECRET` in-place while encrypted tenant records (`EmailSetting` / `OrganizationWebhookSetting` credentials) are stored in PostgreSQL without first decrypting or re-encrypting stored ciphertexts during a planned maintenance window.
3. **Validate Compose Rendering Before Restart:**

```bash
pnpm docker:prod:config > /dev/null
```

---

## 5. Related Documentation

- [Engineering Conventions](../architecture/conventions.md)
- [Production Deployment Plan](production-deployment-plan.md)
- [Alerts Runbook](alerts.md)
