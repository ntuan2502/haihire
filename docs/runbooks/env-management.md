# Runbook: Environment Variable Management & Architecture

> **Single Source of Truth & Zero-Leakage Environment System**  
> Covers configuration structure, loading mechanics, synchronization protocols, and Docker deployment workflows.

---

## 1. Environment Files Architecture

HaiHire employs a strictly segregated 5-file environment architecture ensuring complete isolation between host dev machines, client browsers, SSR runtimes, and containerized production clusters.

| File Path | Target Scope & Responsibility | Loaded By | Committed to Git? |
| :--- | :--- | :--- | :---: |
| **`.env`** (Root) | Local machine host ports & Docker infra services (Postgres, MinIO, Valkey). Single source of truth for local dev ports. | Root scripts, `docker-compose.yml`, `backend/src/config/env.ts` (dynamic mapping) | ❌ **NO** (`.gitignore`) |
| **`.env.example`** (Root) | Baseline port template for developers cloning the repository. | Reference template | ✅ **YES** |
| **`backend/.env`** | Local NestJS backend configuration: secrets, DB connection string, S3, SMTP, and CORS. | NestJS via `dotenv.config()` & Zod schema (`backend/src/config/env.ts`) | ❌ **NO** (`.gitignore`) |
| **`backend/.env.example`** | Complete template for backend configuration with non-secret placeholder values. | CI workflow, new onboarding | ✅ **YES** |
| **`frontend/.env`** | Local Next.js frontend configuration: SSR internal URL, client-side public URLs, and seed helpers. | Next.js runtime & Zod schema (`frontend/src/lib/env.ts`) | ❌ **NO** (`.gitignore`) |
| **`frontend/.env.example`** | Complete template for frontend configuration with non-secret placeholder values. | CI workflow, new onboarding | ✅ **YES** |
| **`.env.production.example`** | Production cluster blueprint containing all secrets, database credentials, domains, and mail configs. | Reference template for production deployer | ✅ **YES** |
| **`.env.production`** (Root) | Real production values on secure production hosts. | `docker compose --env-file .env.production -f docker-compose.prod.yml` | ❌ **NO** (Strictly forbidden) |

---

## 2. Environment Loading Protocols

### 2.1 Local Development Mode (`pnpm dev`)
When executing `pnpm dev` from root:
1. **Root `.env`** defines system ports:
   - `BACKEND_PORT=13001`
   - `FRONTEND_PORT=13000`
   - `POSTGRES_PORT=15432`
   - `MINIO_PORT=19000`
   - `REDIS_PORT=16379`
2. **Backend Startup**:
   - `backend/src/config/env.ts` loads root `.env` first, then `backend/.env`.
   - **Dynamic Host Port Synchronization**: The Zod configuration automatically rewrites localhost ports in `DATABASE_URL`, `FRONTEND_URL`, and `MINIO_PUBLIC_URL` using host ports from root `.env` to prevent manual mismatches.
3. **Frontend Startup**:
   - Next.js automatically loads `frontend/.env`.
   - `INTERNAL_API_URL` routes server-side calls directly to `http://127.0.0.1:13001`.
   - `NEXT_PUBLIC_API_URL=""` enables Next.js reverse proxy rewrites to avoid CORS on local network devices.

---

### 2.2 Build-Time vs Runtime (`NEXT_PUBLIC_*`)

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
1. If deploying frontend and backend to distinct public domains (e.g. `https://api.example.com`), you **MUST** provide `NEXT_PUBLIC_API_URL` during `docker build` using BuildKit build arguments:
   ```dockerfile
   ARG NEXT_PUBLIC_API_URL=""
   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
   ```
2. When left as an empty string (`""`), client-side API requests call relative paths (`/api/...`), and Next.js proxy rewrites handle routing to `INTERNAL_API_URL`.

---

### 2.3 Production Docker Compose Deployment

#### Running Production Containers:
Always use the standardized npm commands or pass `--env-file .env.production`:
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

## 3. Synchronization Protocol & CI Quality Gate

### 3.1 Adding a New Environment Variable
Whenever introducing a new environment variable:
1. Add the variable to the service Zod schema:
   - Backend: `backend/src/config/env.ts`
   - Frontend: `frontend/src/lib/env.ts`
2. Add the variable to `.env.example` in the respective directory with a clear description and default/placeholder.
3. Add the variable to the active `.env` file locally.
4. If used in production Docker Compose, add it to `.env.production.example` and `docker-compose.prod.yml`.
5. Run the verification gate:
   ```bash
   pnpm lint:env-sync
   ```

### 3.2 Automated CI Gate (`pnpm lint:env-sync`)
The gate script `scripts/check-env-sync.ts` runs automatically during CI (Gate 7) and pre-commit checks:
- Verifies 100% key parity between `.env` and `.env.example` across Root, Backend, and Frontend.
- Ensures all `${VAR}` substitutions in `docker-compose.prod.yml` exist in `.env.production.example`.
- Confirms dev host port alignment across root and service configs.
- Rejects undocumented or extra keys immediately.

---

## 4. Troubleshooting Common Issues

### Issue 1: `Critical Configuration Error: Invalid / Missing Environment`
- **Cause:** A required variable in `backend/src/config/env.ts` is missing or secrets are shorter than security thresholds (JWT < 16 chars, Encryption < 32 chars).
- **Fix:** Check startup terminal output for the exact key and update `backend/.env`.

### Issue 2: `docker compose: variable is not set. Defaulting to a blank string.`
- **Cause:** Running `docker compose -f docker-compose.prod.yml up` without specifying `--env-file .env.production`.
- **Fix:** Use `pnpm docker:prod:up` or pass `--env-file .env.production`.

### Issue 3: Client calls point to localhost instead of production API
- **Cause:** `NEXT_PUBLIC_API_URL` was baked during build with a localhost value, or left empty when on a separated domain.
- **Fix:** Rebuild the frontend container providing `args: NEXT_PUBLIC_API_URL: https://api.yourdomain.com`.
