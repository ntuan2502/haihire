# Runbook: Environment Variable Management & Architecture

> **Single Source of Truth & Zero-Leakage Environment System**  
> Covers configuration structure, loading mechanics, synchronization protocols, and Docker deployment workflows.

---

## 1. Environment Files Architecture

Following the Task #11 unification, HaiHire employs a unified **Single Source of Truth (SSOT)** environment architecture. All services (Backend, Frontend, Prisma CLI, and Docker Compose) read directly from a single root configuration. Package-level environment files (`backend/.env*` and `frontend/.env*`) have been eliminated.

| File Path | Target Scope & Responsibility | Loaded By | Committed to Git? |
| :--- | :--- | :--- | :---: |
| **`.env`** (Root) | Local machine host ports, secrets, database, Redis, S3, mailers, and Next.js endpoints. **Single Source of Truth for local development and local Docker.** | Backend (`backend/src/config/env.ts`), Frontend (`next.config.ts`, `dev.ts`), Docker Compose (`docker-compose.yml`) | ❌ **NO** (`.gitignore`) |
| **`.env.example`** (Root) | Complete standardized 10-section template for local development and Docker Compose. | Reference template (`cp .env.example .env`) | ✅ **YES** |
| **`.env.production.example`** (Root) | Standardized 10-section production template for secure deployments. Contains production metadata, domains, and security recommendations. | Reference template (`cp .env.production.example .env.production`) | ✅ **YES** |
| **`.env.production`** (Root) | Real production secrets and endpoints on secure production servers (chmod 600). | `docker compose --env-file .env.production -f docker-compose.prod.yml` | ❌ **NO** (Strictly forbidden) |

---

## 2. Standardized 10-Section Structure

Both `.env.example` and `.env.production.example` follow a unified 10-section organization:

1. **Application Runtime & Ports:** `NODE_ENV`, `BACKEND_PORT`, `FRONTEND_PORT` (eliminates unnamespaced `PORT` collision).
2. **PostgreSQL Database & Prisma ORM:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`.
3. **Valkey / Redis Distributed Cache & Queue:** `REDIS_PORT`, `REDIS_PASSWORD`.
4. **MinIO S3 Object Storage:** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`.
5. **Security & Cryptographic Secrets:** `JWT_SECRET`, `ENCRYPTION_SECRET`, `DEMO_SEED_PASSWORD`.
6. **Networking, CORS & API Endpoints:** `FRONTEND_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MINIO_URL`.
7. **System Email Dispatch:** `SYSTEM_EMAIL_PROVIDER`, `SYSTEM_EMAIL_FROM_NAME`, `SYSTEM_EMAIL_FROM_EMAIL`, `SYSTEM_EMAIL_SMTP_HOST`, `SYSTEM_EMAIL_SMTP_PORT`, `SYSTEM_EMAIL_SMTP_USER`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_RESEND_API_KEY`, `SYSTEM_EMAIL_SENDGRID_API_KEY`.
8. **Multi-Channel Webhook Notifications:** `WEBHOOK_PROVIDER`, `WEBHOOK_URL`, `WEBHOOK_SECRET_TOKEN`, `WEBHOOK_CHAT_ID`.
9. **Prometheus Pushgateway:** `PUSHGATEWAY_PORT`, `PUSHGATEWAY_URL`.
10. *(Production Template only — Section 1)* **Production Deployment Metadata:** `GITHUB_REPOSITORY_OWNER`, `IMAGE_TAG`.

---

## 3. Environment Loading Protocols

### 3.1 Local Development Mode (`pnpm dev`)
When executing `pnpm dev` from the repository root:
1. **Backend Loading:**
   - [`backend/src/config/env.ts`](../../backend/src/config/env.ts) locates the repository root and loads root `.env`.
   - Dynamic port synchronization automatically maps `BACKEND_PORT` to `PORT`, and ensures localhost URLs for Postgres, MinIO, and Frontend align.
   - NestJS [`backend/src/app.module.ts`](../../backend/src/app.module.ts) configures `ConfigModule` to search `['../.env', '.env']`.
2. **Frontend Loading:**
   - [`frontend/scripts/dev.ts`](../../frontend/scripts/dev.ts) loads root `../../.env` and sets `process.env.PORT` from `FRONTEND_PORT`.
   - [`frontend/next.config.ts`](../../frontend/next.config.ts) loads root `.env` to configure API rewrites (`/api/*` -> `http://127.0.0.1:13001`) and allowed dev origins.
   - Runtime Zod validation in [`frontend/src/lib/env.ts`](../../frontend/src/lib/env.ts) ensures `INTERNAL_API_URL` is set during SSR.
3. **Prisma CLI Loading:**
   - Prisma 8 CLI automatically climbs parent directories and loads root `..\.env` when executing from `backend/`.

---

### 3.2 Build-Time vs Runtime (`NEXT_PUBLIC_*`)

> ⚠️ **CRITICAL ARCHITECTURAL DISTINCTION**:  
> Variables prefixed with `NEXT_PUBLIC_` are **inlined statically into the JavaScript client bundle at build-time** (`next build`).

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      BUILD TIME                        │
                    │               (pnpm run build:frontend)                │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                 Evaluates NEXT_PUBLIC_*
                                               │
                                               ▼
                              Inlined directly into .next/static/*.js
                                               │
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       RUN TIME                                             │
├─────────────────────────────────────────┬──────────────────────────────────────────────────┤
│           BROWSER CLIENT                │                 NODE.JS SSR SERVER               │
│                                         │                                                  │
│ Reads inlined strings from *.js chunks. │ Reads process.env.INTERNAL_API_URL dynamically   │
│ Does NOT read process.env at runtime!   │ from container/host environment.                 │
└─────────────────────────────────────────┴──────────────────────────────────────────────────┘
```

#### Key Rules:
1. If deploying frontend and backend to distinct public domains (e.g. `https://api.example.com`), provide `NEXT_PUBLIC_API_URL` during `docker build` using BuildKit build arguments:
   ```dockerfile
   ARG NEXT_PUBLIC_API_URL=""
   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
   ```
2. When left as an empty string (`""`), client-side API requests call relative paths (`/api/...`), and Next.js proxy rewrites handle routing to `INTERNAL_API_URL`.

---

### 3.3 Production Docker Compose Deployment

Always use standardized npm commands or pass `--env-file .env.production`:
```bash
# Verify configuration without starting containers:
pnpm docker:prod:config

# Start production cluster:
pnpm docker:prod:up

# Stop production cluster:
pnpm docker:prod:down
```

Equivalent native CLI command:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

> **Why `--env-file` is mandatory:**  
> Docker Compose performs variable interpolation (`${VAR}`) in the YAML file *before* service definitions are parsed. Specifying `--env-file .env.production` ensures `${POSTGRES_USER}`, `${JWT_SECRET}`, and `${ENCRYPTION_SECRET}` are substituted without relying on dev `.env`.

---

## 4. Synchronization Protocol & CI Quality Gate

### 4.1 Adding a New Environment Variable
Whenever introducing a new environment variable:
1. Add the variable to the relevant Zod schema:
   - Backend: `backend/src/config/env.ts`
   - Frontend: `frontend/src/lib/env.ts`
2. Add the variable to `.env.example` in the root directory under the appropriate section with documentation.
3. If applicable for production, add it to `.env.production.example` and `docker-compose.prod.yml`.
4. Update local `.env`.
5. Run the verification gate:
   ```bash
   pnpm lint:env-sync
   ```

### 4.2 Automated CI Gate (`pnpm lint:env-sync`)
The gate script [`scripts/check-env-sync.ts`](../../scripts/check-env-sync.ts) runs automatically during CI (Gate 6) and pre-commit checks:
- Verifies 100% key parity between root `.env` and `.env.example`.
- Ensures all `${VAR}` substitutions in `docker-compose.prod.yml` exist in `.env.production.example`.
- Confirms internal consistency between `BACKEND_PORT`, `FRONTEND_PORT`, `INTERNAL_API_URL`, and `FRONTEND_URL`.
- Rejects undocumented or extra keys immediately.

---

## 5. Troubleshooting Common Issues

### Issue 1: `Critical Configuration Error: Invalid / Missing Environment`
- **Cause:** A required variable in root `.env` is missing or secrets are shorter than security thresholds (JWT < 16 chars, Encryption < 32 chars).
- **Fix:** Check startup terminal output for the exact key and update root `.env`.

### Issue 2: `docker compose: variable is not set. Defaulting to a blank string.`
- **Cause:** Running `docker compose -f docker-compose.prod.yml up` without specifying `--env-file .env.production`.
- **Fix:** Use `pnpm docker:prod:up` or pass `--env-file .env.production`.

### Issue 3: Client calls point to localhost instead of production API
- **Cause:** `NEXT_PUBLIC_API_URL` was baked during build with a localhost value, or left empty when on a separated domain.
- **Fix:** Rebuild the frontend container providing `args: NEXT_PUBLIC_API_URL: https://api.yourdomain.com`.
