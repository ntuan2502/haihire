# Environment Management Runbook

> Governance, Zod runtime validation, parity enforcement, and secret rotation for HaiHire environment configuration.

---

## 1. Authoritative Configuration Files

| Artifact                                                       | Purpose                                                                      | Access / Git Policy             |
| :------------------------------------------------------------- | :--------------------------------------------------------------------------- | :------------------------------ |
| [`.env.example`](../../.env.example)                           | Local development template (`56` keys)                                       | Committed (SSOT for key parity) |
| [`.env.production.example`](../../.env.production.example)     | Production deployment template (`chmod 600` on server)                       | Committed template only         |
| `.env` / `.env.production`                                     | Active local / server runtime secrets                                        | **Git-ignored — NEVER commit**  |
| [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) | Backend startup Zod schema + cross-field `superRefine` checks                | Enforced at API boot            |
| [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts)       | Frontend split validation (`NEXT_PUBLIC_*` client vs `INTERNAL_API_URL` SSR) | Enforced on server & browser    |
| [scripts/check-env-sync.ts](../../scripts/check-env-sync.ts)   | Static parity & Compose coverage gate (`pnpm lint:env-sync`)                 | Required CI gate                |

---

## 2. Parity Enforcement (`pnpm lint:env-sync`)

Whenever you add, rename, or remove an environment variable:

1. Update `.env.example` and `.env.production.example` together with accurate defaults/placeholders.
2. Update the Zod schema in [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) or [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts).
3. Pass any container-required overrides into [docker-compose.yml](../../docker-compose.yml) and [docker-compose.prod.yml](../../docker-compose.prod.yml).
4. Run verification before committing:

```bash
pnpm lint:env-sync
pnpm check:prod-email-provider
```

`scripts/check-env-sync.ts` audits key parity against `.env.example` and checks that environment variable references across the codebase resolve cleanly.

---

## 3. Production Security Guardrails

At startup, [apps/api/src/config/env.ts](../../apps/api/src/config/env.ts) fails fast if any production safety invariant is violated:

| Variable                        | Production Rule                                                        | Reason                                                          |
| :------------------------------ | :--------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `NODE_ENV`                      | Must equal `production`                                                | Enables production security checks & disables demo boot seeding |
| `SEED_DEMO_ON_BOOT`             | **Must be `false`** when `NODE_ENV=production`                         | Prevents seeding demo credentials in live databases             |
| `JWT_SECRET`                    | Random cryptographically strong secret (never default/placeholder)     | Signs auth cookies & access tokens                              |
| `ENCRYPTION_SECRET`             | Random cryptographically strong secret                                 | Encrypts sensitive credentials at rest                          |
| `METRICS_TOKEN`                 | Min `32` chars when set; required in production                        | `/metrics` returns `404` in production when unset               |
| `SYSTEM_EMAIL_PROVIDER`         | Cannot be `SIMULATED` in production (`pnpm check:prod-email-provider`) | Enforces real SMTP or Resend delivery                           |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | `false`                                                                | Hides demo quick-login controls on login screen                 |
| `INTERNAL_API_URL`              | Required non-empty URL on Next.js server (e.g., `http://api:3001`)     | Powers SSR & internal proxy routing in `apps/web`               |

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
