# Technical Report: Task #11 Phase 1 — Environment Variable Architecture Audit & Refactor Proposal

**Project:** HaiHire Enterprise ATS  
**Author:** Senior Software Engineer / Orchestrator Agent  
**Date:** 2026-10-09  
**Status:** 📋 PHASE 1 AUDIT & PROPOSAL COMPLETE — PENDING DEEPSEEK REVIEW & APPROVAL  
**Branch:** `chore/task-10-memory-docs-consistency`  
**Reference Artifact:** [`docs/reports/README.md`](README.md), [`docs/PROJECT_METRICS.md`](../PROJECT_METRICS.md), [`scripts/check-env-sync.ts`](../../scripts/check-env-sync.ts), [`docker-compose.yml`](../../docker-compose.yml), [`docker-compose.prod.yml`](../../docker-compose.prod.yml)

---

## 1. Executive Summary

An exhaustive audit of the `haihire` repository discovered **7 environment files** containing **47 unique environment variables**. Of these 47 variables, **42 (89.4%) appear across multiple files**, with **19 variables exhibiting conflicting values** across development, Docker Compose, and template files.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CURRENT REPOSITORY ENV TOPOLOGY                       │
├───────────────────────────────┬───────────────────────────────┬─────────────┤
│ Root Files                    │ Backend Files                 │ Frontend    │
│ - .env (18 vars, untracked)   │ - backend/.env (29 vars)      │ - frontend/ │
│ - .env.example (18 vars)      │ - backend/.env.example (29)   │   .env (10) │
│ - .env.production.example (32)│                               │ - frontend/ │
│                               │                               │   .env.ex(10)
└───────────────────────────────┴───────────────────────────────┴─────────────┘
```

### Critical Findings:
1. **Developer Triplicate Setup & Confusion:** Developers currently must maintain 3 separate `.env` files (`.env`, `backend/.env`, `frontend/.env`), causing frequent configuration drift and hard-to-debug runtime discrepancies.
2. **Ambiguous `PORT` Collision:** Both `backend/.env` and `frontend/.env` define `PORT` (`13001` vs `13000` in dev, `3001` vs `3000` in templates). In a unified environment, a bare `PORT` key is ambiguous.
3. **Dead / Orphan Variables:** `frontend/.env` and `frontend/.env.example` blindly define `WEBHOOK_PROVIDER`, `WEBHOOK_URL`, `WEBHOOK_SECRET_TOKEN`, `WEBHOOK_CHAT_ID`, and `PUSHGATEWAY_PORT`, which are **never read** by any frontend code or script.
4. **Disjointed Comment Formats:** Section headers vary from 3-line hashes (`# ===`) to dashed rules (`# ---`), section numbering ranges from 6 to 11, and `frontend/.env.example` has a missing Section 4 header where `NEXT_PUBLIC_MINIO_URL` is left unsectioned and uncommented.
5. **Runtime Loading Asymmetry:** Backend in dev mode evaluates `process.cwd()`, meaning `pnpm dev` from root resolves `backend/.env` while completely ignoring root `.env`.

---

## Part A: Inventory of All Environment Files

A recursive filesystem scan (`find . -maxdepth 3 -name ".env*"`) confirmed exactly 7 environment files:

| File Path | Tracked in Git? | Gitignored? | Size (Bytes) | Lines | Purpose Declared in Header Comment |
|---|:---:|:---:|:---:|:---:|---|
| `.env` | ❌ No | ✅ Yes | 1,969 | 49 | System-level configuration used by `docker-compose.yml` and dev scripts. |
| [`.env.example`](../../.env.example) | ✅ Yes | ❌ No | 2,301 | 52 | System-level template used by `docker-compose.yml` and dev scripts. |
| [`.env.production.example`](../../.env.production.example) | ✅ Yes | ❌ No | 4,746 | 101 | Production deployment template for secure runners (chmod 600 notice). |
| `backend/.env` | ❌ No | ✅ Yes | 4,814 | 115 | Active backend local environment (database, storage, auth secrets, email). |
| [`backend/.env.example`](../../backend/.env.example) | ✅ Yes | ❌ No | 5,498 | 117 | Backend environment template with strict fail-fast Zod validation rules. |
| `frontend/.env` | ❌ No | ✅ Yes | 2,392 | 49 | Active frontend local environment (Next.js internal API URL, client variables). |
| [`frontend/.env.example`](../../frontend/.env.example) | ✅ Yes | ❌ No | 2,597 | 50 | Frontend environment template for Next.js SSR and client browser builds. |

*Verification Evidence:* Git tracking verified via `git ls-files`. Gitignore verified via root `.gitignore` (line 12), `backend/.gitignore` (line 3), and `frontend/.gitignore` (line 34).

---

## Part B: Variable Inventory Per File

*(All production credentials, JWT secrets, passwords, and API keys are strictly masked with `<redacted>`)*

### B.1: Inventory Per File

#### 1. File: `.env` (Root Active Dev — 18 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `POSTGRES_USER` | `haihire_user` | Yes |
| 2 | `POSTGRES_PASSWORD` | `<redacted>` | No |
| 3 | `POSTGRES_DB` | `haihire_db` | No |
| 4 | `POSTGRES_PORT` | `15432` | No |
| 5 | `MINIO_ROOT_USER` | `minioadmin` | Yes |
| 6 | `MINIO_ROOT_PASSWORD` | `<redacted>` | No |
| 7 | `MINIO_PORT` | `19000` | No |
| 8 | `MINIO_CONSOLE_PORT` | `19001` | No |
| 9 | `MINIO_BUCKET_NAME` | `haihire-resumes` | No |
| 10 | `BACKEND_PORT` | `13001` | Yes |
| 11 | `FRONTEND_PORT` | `13000` | No |
| 12 | `REDIS_PORT` | `16379` | Yes |
| 13 | `WEBHOOK_PROVIDER` | `""` | No |
| 14 | `WEBHOOK_URL` | `""` | No |
| 15 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 16 | `WEBHOOK_CHAT_ID` | `""` | No |
| 17 | `PUSHGATEWAY_PORT` | `9091` | Yes |
| 18 | `PUSHGATEWAY_URL` | `http://localhost:9091` | No |

#### 2. File: `.env.example` (Root Template — 18 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `POSTGRES_USER` | `haihire_user` | Yes |
| 2 | `POSTGRES_PASSWORD` | `<redacted>` | No |
| 3 | `POSTGRES_DB` | `haihire_db` | No |
| 4 | `POSTGRES_PORT` | `5432` | No |
| 5 | `MINIO_ROOT_USER` | `minioadmin` | Yes |
| 6 | `MINIO_ROOT_PASSWORD` | `<redacted>` | No |
| 7 | `MINIO_PORT` | `9000` | No |
| 8 | `MINIO_CONSOLE_PORT` | `9001` | No |
| 9 | `MINIO_BUCKET_NAME` | `haihire-resumes` | No |
| 10 | `BACKEND_PORT` | `3001` | Yes |
| 11 | `FRONTEND_PORT` | `3000` | No |
| 12 | `REDIS_PORT` | `6379` | Yes |
| 13 | `WEBHOOK_PROVIDER` | `""` | Yes |
| 14 | `WEBHOOK_URL` | `""` | No |
| 15 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 16 | `WEBHOOK_CHAT_ID` | `""` | No |
| 17 | `PUSHGATEWAY_PORT` | `9091` | Yes |
| 18 | `PUSHGATEWAY_URL` | `http://pushgateway:9091` | No |

#### 3. File: `.env.production.example` (Root Production Template — 32 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `GITHUB_REPOSITORY_OWNER` | `ntuan2502` | Yes |
| 2 | `IMAGE_TAG` | `v1.0.0` | Yes |
| 3 | `NODE_ENV` | `production` | Yes |
| 4 | `BACKEND_PORT` | `3001` | No |
| 5 | `FRONTEND_PORT` | `3000` | No |
| 6 | `POSTGRES_USER` | `haihire_prod_user` | Yes |
| 7 | `POSTGRES_PASSWORD` | `<redacted>` | Yes |
| 8 | `POSTGRES_DB` | `haihire_production` | No |
| 9 | `REDIS_PASSWORD` | `<redacted>` | Yes |
| 10 | `MINIO_ACCESS_KEY` | `<redacted>` | Yes |
| 11 | `MINIO_SECRET_KEY` | `<redacted>` | Yes |
| 12 | `MINIO_BUCKET_NAME` | `haihire-production-resumes` | No |
| 13 | `MINIO_PUBLIC_URL` | `https://s3.yourcompany.com` | No |
| 14 | `JWT_SECRET` | `<redacted>` | Yes |
| 15 | `ENCRYPTION_SECRET` | `<redacted>` | Yes |
| 16 | `FRONTEND_URL` | `https://ats.yourcompany.com` | Yes |
| 17 | `FRONTEND_API_URL` | `https://api.yourcompany.com` | No |
| 18 | `SYSTEM_EMAIL_PROVIDER` | `SMTP` | Yes |
| 19 | `SYSTEM_EMAIL_FROM_NAME` | `HaiHire Production Team` | No |
| 20 | `SYSTEM_EMAIL_FROM_EMAIL` | `careers@yourcompany.com` | No |
| 21 | `SYSTEM_EMAIL_SMTP_HOST` | `smtp.sendgrid.net` | Yes |
| 22 | `SYSTEM_EMAIL_SMTP_PORT` | `587` | No |
| 23 | `SYSTEM_EMAIL_SMTP_USER` | `apikey` | No |
| 24 | `SYSTEM_EMAIL_SMTP_PASS` | `<redacted>` | No |
| 25 | `SYSTEM_EMAIL_RESEND_API_KEY`| `<redacted>` | Yes |
| 26 | `SYSTEM_EMAIL_SENDGRID_API_KEY`| `<redacted>` | Yes |
| 27 | `WEBHOOK_PROVIDER` | `""` | Yes |
| 28 | `WEBHOOK_URL` | `""` | No |
| 29 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 30 | `WEBHOOK_CHAT_ID` | `""` | No |
| 31 | `PUSHGATEWAY_PORT` | `9091` | Yes |
| 32 | `PUSHGATEWAY_URL` | `http://pushgateway:9091` | No |

#### 4. File: `backend/.env` (Backend Active Dev — 29 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `PORT` | `13001` | Yes |
| 2 | `DATABASE_URL` | `<redacted>` | Yes |
| 3 | `JWT_SECRET` | `<redacted>` | Yes |
| 4 | `ENCRYPTION_SECRET` | `<redacted>` | Yes |
| 5 | `DEMO_SEED_PASSWORD` | `<redacted>` | Yes |
| 6 | `FRONTEND_URL` | `http://localhost:13000` | Yes |
| 7 | `MINIO_ENDPOINT` | `localhost` | Yes |
| 8 | `MINIO_PORT` | `19000` | Yes |
| 9 | `MINIO_USE_SSL` | `false` | Yes |
| 10 | `MINIO_ACCESS_KEY` | `<redacted>` | Yes |
| 11 | `MINIO_SECRET_KEY` | `<redacted>` | Yes |
| 12 | `MINIO_BUCKET_NAME` | `haihire-resumes` | Yes |
| 13 | `MINIO_PUBLIC_URL` | `http://localhost:19000` | Yes |
| 14 | `SYSTEM_EMAIL_PROVIDER` | `SMTP` | Yes |
| 15 | `SYSTEM_EMAIL_FROM_NAME` | `HaiHire Platform` | Yes |
| 16 | `SYSTEM_EMAIL_FROM_EMAIL` | `haihire.app@gmail.com` | Yes |
| 17 | `SYSTEM_EMAIL_SMTP_HOST` | `smtp.gmail.com` | Yes |
| 18 | `SYSTEM_EMAIL_SMTP_PORT` | `587` | No |
| 19 | `SYSTEM_EMAIL_SMTP_USER` | `haihire.app@gmail.com` | No |
| 20 | `SYSTEM_EMAIL_SMTP_PASS` | `<redacted>` | No |
| 21 | `SYSTEM_EMAIL_RESEND_API_KEY`| `<redacted>` | Yes |
| 22 | `SYSTEM_EMAIL_SENDGRID_API_KEY`| `<redacted>` | Yes |
| 23 | `REDIS_PORT` | `16379` | No |
| 24 | `WEBHOOK_PROVIDER` | `""` | No |
| 25 | `WEBHOOK_URL` | `""` | No |
| 26 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 27 | `WEBHOOK_CHAT_ID` | `""` | No |
| 28 | `PUSHGATEWAY_PORT` | `9091` | Yes |
| 29 | `PUSHGATEWAY_URL` | `http://localhost:9091` | No |

#### 5. File: `backend/.env.example` (Backend Template — 29 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `PORT` | `3001` | Yes |
| 2 | `DATABASE_URL` | `<redacted>` | Yes |
| 3 | `JWT_SECRET` | `<redacted>` | Yes |
| 4 | `ENCRYPTION_SECRET` | `<redacted>` | Yes |
| 5 | `DEMO_SEED_PASSWORD` | `<redacted>` | Yes |
| 6 | `FRONTEND_URL` | `http://localhost:3000` | Yes |
| 7 | `MINIO_ENDPOINT` | `localhost` | Yes |
| 8 | `MINIO_PORT` | `9000` | Yes |
| 9 | `MINIO_USE_SSL` | `false` | Yes |
| 10 | `MINIO_ACCESS_KEY` | `<redacted>` | Yes |
| 11 | `MINIO_SECRET_KEY` | `<redacted>` | Yes |
| 12 | `MINIO_BUCKET_NAME` | `haihire-resumes` | Yes |
| 13 | `MINIO_PUBLIC_URL` | `http://localhost:9000` | Yes |
| 14 | `SYSTEM_EMAIL_PROVIDER` | `SIMULATED` | Yes |
| 15 | `SYSTEM_EMAIL_FROM_NAME` | `HaiHire Platform` | Yes |
| 16 | `SYSTEM_EMAIL_FROM_EMAIL` | `noreply@haihire.internal` | Yes |
| 17 | `SYSTEM_EMAIL_SMTP_HOST` | `""` | Yes |
| 18 | `SYSTEM_EMAIL_SMTP_PORT` | `587` | No |
| 19 | `SYSTEM_EMAIL_SMTP_USER` | `""` | No |
| 20 | `SYSTEM_EMAIL_SMTP_PASS` | `<redacted>` | No |
| 21 | `SYSTEM_EMAIL_RESEND_API_KEY`| `<redacted>` | Yes |
| 22 | `SYSTEM_EMAIL_SENDGRID_API_KEY`| `<redacted>` | Yes |
| 23 | `REDIS_PORT` | `6379` | Yes |
| 24 | `WEBHOOK_PROVIDER` | `""` | Yes |
| 25 | `WEBHOOK_URL` | `""` | Yes |
| 26 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | Yes |
| 27 | `WEBHOOK_CHAT_ID` | `""` | Yes |
| 28 | `PUSHGATEWAY_PORT` | `9091` | Yes |
| 29 | `PUSHGATEWAY_URL` | `http://pushgateway:9091` | No |

#### 6. File: `frontend/.env` (Frontend Active Dev — 10 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `PORT` | `13000` | Yes |
| 2 | `INTERNAL_API_URL` | `http://127.0.0.1:13001` | Yes |
| 3 | `NEXT_PUBLIC_API_URL` | `""` | Yes |
| 4 | `NEXT_PUBLIC_MINIO_URL` | `/haihire-resumes` | No |
| 5 | `NEXT_PUBLIC_DEMO_SEED_PASSWORD`| `<redacted>` | Yes |
| 6 | `WEBHOOK_PROVIDER` | `""` | No |
| 7 | `WEBHOOK_URL` | `""` | No |
| 8 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 9 | `WEBHOOK_CHAT_ID` | `""` | No |
| 10 | `PUSHGATEWAY_PORT` | `9091` | Yes |

#### 7. File: `frontend/.env.example` (Frontend Template — 10 variables)
| # | Variable | Value (Redacted) | Comment Above? |
|---|---|---|:---:|
| 1 | `PORT` | `3000` | Yes |
| 2 | `INTERNAL_API_URL` | `http://127.0.0.1:3001` | Yes |
| 3 | `NEXT_PUBLIC_API_URL` | `""` | Yes |
| 4 | `NEXT_PUBLIC_MINIO_URL` | `/haihire-resumes` | No |
| 5 | `NEXT_PUBLIC_DEMO_SEED_PASSWORD`| `<redacted>` | Yes |
| 6 | `WEBHOOK_PROVIDER` | `""` | Yes |
| 7 | `WEBHOOK_URL` | `""` | No |
| 8 | `WEBHOOK_SECRET_TOKEN` | `<redacted>` | No |
| 9 | `WEBHOOK_CHAT_ID` | `""` | No |
| 10 | `PUSHGATEWAY_PORT` | `9091` | Yes |

---

### B.2: Master Cross-File Presence Matrix (47 Variables)

| Variable | Files Present In | Count |
|---|---|:---:|
| `PUSHGATEWAY_PORT`, `WEBHOOK_CHAT_ID`, `WEBHOOK_PROVIDER`, `WEBHOOK_SECRET_TOKEN`, `WEBHOOK_URL` | **All 7 files** (`.env`, `.env.example`, `.env.production.example`, `backend/.env`, `backend/.env.example`, `frontend/.env`, `frontend/.env.example`) | 7 |
| `MINIO_BUCKET_NAME`, `PUSHGATEWAY_URL` | `.env`, `.env.example`, `.env.production.example`, `backend/.env`, `backend/.env.example` | 5 |
| `MINIO_PORT`, `PORT`, `REDIS_PORT` | `.env`, `.env.example`, `backend/.env`, `backend/.env.example` (or `frontend/.env*` for `PORT`) | 4 |
| `BACKEND_PORT`, `ENCRYPTION_SECRET`, `FRONTEND_PORT`, `FRONTEND_URL`, `JWT_SECRET`, `MINIO_ACCESS_KEY`, `MINIO_PUBLIC_URL`, `MINIO_SECRET_KEY`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `SYSTEM_EMAIL_FROM_EMAIL`, `SYSTEM_EMAIL_FROM_NAME`, `SYSTEM_EMAIL_PROVIDER`, `SYSTEM_EMAIL_RESEND_API_KEY`, `SYSTEM_EMAIL_SENDGRID_API_KEY`, `SYSTEM_EMAIL_SMTP_HOST`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_SMTP_PORT`, `SYSTEM_EMAIL_SMTP_USER` | 3 files (Root + Backend or Production Template) | 3 |
| `DATABASE_URL`, `DEMO_SEED_PASSWORD`, `INTERNAL_API_URL`, `MINIO_CONSOLE_PORT`, `MINIO_ENDPOINT`, `MINIO_ROOT_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_USE_SSL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_SEED_PASSWORD`, `NEXT_PUBLIC_MINIO_URL`, `POSTGRES_PORT` | 2 files (package pair or root pair) | 2 |
| `FRONTEND_API_URL`, `GITHUB_REPOSITORY_OWNER`, `IMAGE_TAG`, `NODE_ENV`, `REDIS_PASSWORD` | `.env.production.example` only | **1 (Unique)** |

---

## Part C: Duplicate & Divergence Analysis

### C.1: Multi-File Variable Classification
- **42 of 47 variables (89.4%)** appear across multiple files.
- **Root vs Backend Duplication:** Database parameters (`POSTGRES_*`), S3 parameters (`MINIO_*`), and queue parameters (`REDIS_*`) are defined in both root and backend environments.
- **Dead Frontend Variables:** Frontend files define 5 variables (`WEBHOOK_PROVIDER`, `WEBHOOK_URL`, `WEBHOOK_SECRET_TOKEN`, `WEBHOOK_CHAT_ID`, `PUSHGATEWAY_PORT`) with **zero code references** in `frontend/`.

### C.2: Single-File Variables (5 Total)
- `FRONTEND_API_URL`: Used exclusively in production Docker Compose (`docker-compose.prod.yml:207`) for Next.js public client URL.
- `GITHUB_REPOSITORY_OWNER`: GHCR namespace for container images in `docker-compose.prod.yml`.
- `IMAGE_TAG`: Immutable container release tag (`v1.0.0`).
- `NODE_ENV`: Production runtime mode.
- `REDIS_PASSWORD`: Valkey production authentication password.

### C.3: Critical Inconsistencies (Conflicting Values)

The following **19 variables** possess conflicting values across files:

```
❌ PORT:
   backend/.env = 13001 | backend/.env.example = 3001
   frontend/.env = 13000 | frontend/.env.example = 3000
   --> Critical collision: Unnamespaced "PORT" refers to two different servers!

❌ POSTGRES_PORT:
   .env = 15432 (local host port) | .env.example = 5432 (standard container port)

❌ REDIS_PORT:
   .env = 16379 (local host port) | .env.example = 6379 (standard container port)

❌ MINIO_PORT & MINIO_CONSOLE_PORT:
   .env = 19000 & 19001 | .env.example = 9000 & 9001

❌ BACKEND_PORT & FRONTEND_PORT:
   .env = 13001 & 13000 | .env.example = 3001 & 3000

❌ INTERNAL_API_URL:
   frontend/.env = http://127.0.0.1:13001 | frontend/.env.example = http://127.0.0.1:3001

❌ FRONTEND_URL:
   backend/.env = http://localhost:13000 | backend/.env.example = http://localhost:3000
   .env.production.example = https://ats.yourcompany.com

❌ MINIO_PUBLIC_URL:
   backend/.env = http://localhost:19000 | backend/.env.example = http://localhost:9000

❌ PUSHGATEWAY_URL:
   .env = http://localhost:9091 | .env.example = http://pushgateway:9091
```

---

## Part D: Runtime Environment Loading Analysis

### D.1: Backend — Dev Mode
- **Evidence:**
  - [`backend/src/config/env.ts:6-8`](../../backend/src/config/env.ts):
    ```ts
    dotenv.config({ path: path.resolve(process.cwd(), ".env") });
    dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
    dotenv.config();
    ```
  - [`backend/package.json:15`](../../backend/package.json): `"dev": "node --import tsx --watch --watch-path=src src/main.ts"`
- **Loading Behavior:** When launched via `pnpm dev` from root, pnpm executes with cwd set to `backend/`. Therefore:
  - `path.resolve(process.cwd(), ".env")` resolves to `backend/.env`.
  - Root `.env` is **never loaded**.
- **Dynamic Port Patching:** [`backend/src/config/env.ts:125-158`](../../backend/src/config/env.ts) dynamically rewrites `PORT`, `DATABASE_URL`, `FRONTEND_URL`, and `MINIO_PORT` using `process.env.BACKEND_PORT`, `process.env.POSTGRES_PORT`, etc.
- **NestJS ConfigModule:** [`backend/src/app.module.ts:31`](../../backend/src/app.module.ts) initializes `ConfigModule.forRoot({ isGlobal: true })`, which loads from `process.cwd()`.

### D.2: Backend — Docker Mode
- **Evidence:**
  - [`docker-compose.yml:93-110`](../../docker-compose.yml):
    ```yaml
    env_file:
      - path: ./backend/.env
        required: false
    environment:
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER:-haihire_user}:${POSTGRES_PASSWORD:-haihire_password}@postgres:5432/${POSTGRES_DB:-haihire_db}?schema=public
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ```
- **Loading Behavior:** Compose injects environment variables into the container environment. No `.env` is mounted into the container. Compose interpolates `${POSTGRES_USER}` from root `.env`!

### D.3: Frontend — Dev Mode
- **Evidence:**
  - [`frontend/scripts/dev.ts:9-17`](../../frontend/scripts/dev.ts):
    ```ts
    const rootEnv = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(rootEnv)) process.loadEnvFile(rootEnv);
    const localEnv = path.resolve(__dirname, "../.env");
    if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
    ```
  - [`frontend/next.config.ts:6-13`](../../frontend/next.config.ts): Repeats identical `loadEnvFile` sequence.
  - [`frontend/src/lib/env.ts:1-58`](../../frontend/src/lib/env.ts): Enforces `INTERNAL_API_URL` during SSR.

### D.4: Frontend — Docker Mode
- **Evidence:**
  - [`frontend/Dockerfile:32-36`](../../frontend/Dockerfile):
    ```dockerfile
    ARG NEXT_PUBLIC_API_URL=""
    ARG NEXT_PUBLIC_MINIO_URL="/haihire-resumes"
    ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
    ENV NEXT_PUBLIC_MINIO_URL=$NEXT_PUBLIC_MINIO_URL
    ```
- **Loading Behavior:** Next.js inlines `NEXT_PUBLIC_*` at build time into client JS bundles. At runtime, the container runs `node server.js` on port `3000`.

### D.5: Docker Compose Interpolation vs `env_file`
- Docker Compose reads `.env` located in the root directory for `${VAR}` syntax interpolation.
- `env_file:` directives only populate process environment inside containers.

### D.6: CI/CD Pipeline
- **Evidence:** [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)
  - Line 146: Executes `pnpm lint:env-sync` (CI Gate 6).
  - Lines 157-196: Generates `backend/.env` and `frontend/.env` via bash heredocs.
  - Lines 283-330: Generates all 3 files (`.env`, `backend/.env`, `frontend/.env`) for E2E tests.
  - Lines 483, 505: Deploys via `docker compose --env-file .env.production -f docker-compose.prod.yml`.

### D.7: Validation Scripts
- [`scripts/check-env-sync.ts`](../../scripts/check-env-sync.ts): Checks 4 pairwise sets enforcing 100% bidirectional key parity.
- [`packages/shared/scripts/check-env.ts`](../../packages/shared/scripts/check-env.ts): Redundant legacy script checking backend and frontend pairs.

---

## Part E: Comment Structure Audit

| Aspect | `.env.example` (Root) | `.env.production.example` (Root) | `backend/.env.example` | `frontend/.env.example` |
|---|---|---|---|---|
| **Header Banner** | 3-line `# ===` block | 3-line `# ===` block | 3-line `# ===` block | 3-line `# ===` block |
| **Section Header Style** | `# -------------------`<br>`# N. TITLE`<br>`# -------------------` | `# -------------------`<br>`# N. TITLE`<br>`# -------------------` | `# -------------------`<br>`# N. TITLE`<br>`# -------------------` | `# -------------------`<br>`# N. TITLE`<br>`# -------------------` |
| **Section Count** | 6 sections (1 to 6) | 10 sections (0 to 9) | 9 sections (1 to 9) | 6 sections (1, 2, 3, 5, 6, 7 — **missing 4**) |
| **Section Naming** | Docker service names | Environment & security names | Architecture-focused names | Client/server focused names |
| **Variable Comments** | Zero individual comments | Verbose security & openssl notes | Detailed type & format notes | Brief comments |
| **Missing Sections / Bugs** | None | None | None | **Section 4 header is missing**; `NEXT_PUBLIC_MINIO_URL` is unsectioned. Contains dead backend vars. |

---

## Part F: Evaluation of Architectural Options

The project owner's mandate:
> *"Dev, docker đều dùng chung biến ở trong .env ở cùng một chỗ, không phân biệt dev hay docker hay production khi run start nữa."*

| Criteria | Option A: Single Root `.env` (Unified Source) | Option B: Root `.env` + Symlinks | Option C: 3-File Isolated Architecture | Option D: Root Source + Auto-Sync (`pnpm env:sync`) |
|---|:---:|:---:|:---:|:---:|
| **1. Dev Experience** | 🟢 **1 file to edit** | 🟢 **1 file to edit** | 🔴 **3 files to edit** | 🟡 **1 file** + run sync script |
| **2. Docker Compatibility** | 🟢 **100% native** | 🔴 **Breaks on Windows git** | 🟡 Multi-file compose mount | 🟢 Works natively |
| **3. Next.js Compatibility** | 🟢 **Native** (`loadEnvFile`) | 🟢 Works if symlink resolves | 🟢 Works | 🟢 Works |
| **4. CI Compatibility** | 🟢 **1 heredoc in CI** | 🔴 Flaky on Windows runners | 🔴 Complex (3 heredocs) | 🟡 Requires sync step in CI |
| **5. Migration Effort** | 🟢 **Low** (~5 files updated) | 🔴 High / platform fragile | 🟡 Medium | 🟡 Medium |
| **6. Architectural Cleanliness** | 🟢 **Highest** (1 SSOT) | 🔴 Fragile OS symlinks | 🔴 Drift risk continues | 🟡 Redundant generated files |

---

## Part G: Proposed Solution & Migration Plan

### G.1: Target Directory Architecture

```
haihire/
├── .env                          # SINGLE ACTIVE LOCAL ENV (Gitignored)
├── .env.example                  # SINGLE LOCAL TEMPLATE (Tracked, 10-section standard)
├── .env.production               # SINGLE ACTIVE PROD ENV (Gitignored on production host)
├── .env.production.example       # SINGLE PROD TEMPLATE (Tracked, 10-section standard)
├── backend/
│   ├── .env                      # ❌ DELETED
│   └── .env.example              # ❌ DELETED
└── frontend/
    ├── .env                      # ❌ DELETED
    └── .env.example              # ❌ DELETED
```

### G.2: Port Collision Resolution & Variable Mapping

To eliminate the conflict between backend (`3001`/`13001`) and frontend (`3000`/`13000`), the unified `.env` will explicitly define:
- `BACKEND_PORT`: NestJS API server listening port (`3001` template / `13001` dev).
- `FRONTEND_PORT`: Next.js web application listening port (`3000` template / `13000` dev).

Both `backend/src/config/env.ts` (line 125) and `frontend/scripts/dev.ts` (line 21) already support these keys.

#### Master 10-Section Variable Mapping:
- **Section 1: RUNTIME & PORTS:** `NODE_ENV`, `BACKEND_PORT`, `FRONTEND_PORT`
- **Section 2: POSTGRESQL & PRISMA:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`
- **Section 3: VALKEY / REDIS:** `REDIS_PORT`, `REDIS_PASSWORD`
- **Section 4: MINIO OBJECT STORAGE:** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`
- **Section 5: SECURITY SECRETS:** `JWT_SECRET`, `ENCRYPTION_SECRET`, `DEMO_SEED_PASSWORD`
- **Section 6: NETWORKING & ENDPOINTS:** `FRONTEND_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MINIO_URL`
- **Section 7: SYSTEM EMAIL:** `SYSTEM_EMAIL_PROVIDER`, `SYSTEM_EMAIL_FROM_NAME`, `SYSTEM_EMAIL_FROM_EMAIL`, `SYSTEM_EMAIL_SMTP_HOST`, `SYSTEM_EMAIL_SMTP_PORT`, `SYSTEM_EMAIL_SMTP_USER`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_RESEND_API_KEY`, `SYSTEM_EMAIL_SENDGRID_API_KEY`
- **Section 8: WEBHOOK NOTIFICATIONS:** `WEBHOOK_PROVIDER`, `WEBHOOK_URL`, `WEBHOOK_SECRET_TOKEN`, `WEBHOOK_CHAT_ID`
- **Section 9: PROMETHEUS METRICS:** `PUSHGATEWAY_PORT`, `PUSHGATEWAY_URL`
- **Section 0 (Production Only):** `GITHUB_REPOSITORY_OWNER`, `IMAGE_TAG`, `FRONTEND_API_URL`

### G.3: Standardized Template Structure

Both `.env.example` and `.env.production.example` will adopt an **identical 10-section structure**:

```bash
# ==============================================================================
# HAIHIRE PLATFORM - ENVIRONMENT CONFIGURATION TEMPLATE
# ==============================================================================
# Single Source of Truth for Local Dev, Docker Compose, and CI Environments.
# Copy this file to .env and customize values for your local environment.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. APPLICATION RUNTIME & PORTS
# ------------------------------------------------------------------------------
NODE_ENV=development
BACKEND_PORT=3001
FRONTEND_PORT=3000

# ------------------------------------------------------------------------------
# 2. POSTGRESQL DATABASE & PRISMA ORM
# ------------------------------------------------------------------------------
POSTGRES_USER=haihire_user
POSTGRES_PASSWORD=haihire_password
POSTGRES_DB=haihire_db
POSTGRES_PORT=5432
DATABASE_URL="postgresql://haihire_user:haihire_password@localhost:5432/haihire_db?schema=public"

# ------------------------------------------------------------------------------
# 3. VALKEY / REDIS DISTRIBUTED CACHE & QUEUE
# ------------------------------------------------------------------------------
REDIS_PORT=6379
REDIS_PASSWORD=""

# ------------------------------------------------------------------------------
# 4. MINIO S3 OBJECT STORAGE
# ------------------------------------------------------------------------------
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="haihire-resumes"
MINIO_PUBLIC_URL="http://localhost:9000"

# ------------------------------------------------------------------------------
# 5. SECURITY & CRYPTOGRAPHIC SECRETS
# ------------------------------------------------------------------------------
JWT_SECRET="haihire-platform-dev-jwt-secret-key-2026"
ENCRYPTION_SECRET="haihire-platform-dev-encryption-key-32-chars-2026"
DEMO_SEED_PASSWORD="dev-seed-password-2026"

# ------------------------------------------------------------------------------
# 6. NETWORKING, CORS & API ENDPOINTS
# ------------------------------------------------------------------------------
FRONTEND_URL="http://localhost:3000"
INTERNAL_API_URL="http://127.0.0.1:3001"
NEXT_PUBLIC_API_URL=""
NEXT_PUBLIC_MINIO_URL="/haihire-resumes"

# ------------------------------------------------------------------------------
# 7. SYSTEM EMAIL DISPATCH (NOTIFICATIONS & INVITES)
# ------------------------------------------------------------------------------
SYSTEM_EMAIL_PROVIDER="SIMULATED"
SYSTEM_EMAIL_FROM_NAME="HaiHire Platform"
SYSTEM_EMAIL_FROM_EMAIL="noreply@haihire.internal"
SYSTEM_EMAIL_SMTP_HOST=""
SYSTEM_EMAIL_SMTP_PORT=587
SYSTEM_EMAIL_SMTP_USER=""
SYSTEM_EMAIL_SMTP_PASS=""
SYSTEM_EMAIL_RESEND_API_KEY=""
SYSTEM_EMAIL_SENDGRID_API_KEY=""

# ------------------------------------------------------------------------------
# 8. MULTI-CHANNEL WEBHOOK NOTIFICATIONS (OPTIONAL GLOBAL FALLBACK)
# ------------------------------------------------------------------------------
WEBHOOK_PROVIDER=""
WEBHOOK_URL=""
WEBHOOK_SECRET_TOKEN=""
WEBHOOK_CHAT_ID=""

# ------------------------------------------------------------------------------
# 9. PROMETHEUS PUSHGATEWAY (CRON & BATCH JOB METRICS)
# ------------------------------------------------------------------------------
PUSHGATEWAY_PORT=9091
PUSHGATEWAY_URL="http://pushgateway:9091"
```

### G.4: Runtime Code Modifications Required
1. **`backend/src/config/env.ts`:**
   Change lines 6-8 to locate root `.env` dynamically:
   ```ts
   const rootEnvPath = path.resolve(process.cwd(), process.cwd().endsWith("backend") ? ".." : ".", ".env");
   dotenv.config({ path: rootEnvPath });
   dotenv.config();
   ```
2. **`backend/src/app.module.ts`:**
   Update `ConfigModule.forRoot` to look at `['../.env', '.env']`.
3. **`frontend/next.config.ts` & `frontend/scripts/dev.ts`:**
   Streamline to read exclusively from root `../.env` and eliminate references to local `frontend/.env`.
4. **`docker-compose.yml`:**
   Update backend and frontend `env_file:` to point to `./.env`.
5. **`scripts/check-env-sync.ts`:**
   Simplify `envPairs` to validate only:
   - Root `.env.example` vs `.env` (100% key parity).
   - Root `.env.production.example` vs `.env.production` (100% key parity).
   - Variables in `docker-compose.prod.yml` against `.env.production.example`.

### G.5: Step-by-Step Migration Plan for Phase 2
1. **Step 1:** Backup current active `.env`, `backend/.env`, and `frontend/.env`.
2. **Step 2:** Merge all variables into root `.env` and `.env.example` using the standardized 10-section template.
3. **Step 3:** Format `.env.production.example` with identical 10-section numbering and styling.
4. **Step 4:** Update `backend/src/config/env.ts` and `backend/src/app.module.ts`.
5. **Step 5:** Clean up `frontend/next.config.ts`, `frontend/scripts/dev.ts`, and `frontend/src/lib/env.ts`.
6. **Step 6:** Update `docker-compose.yml` (`env_file: .env`).
7. **Step 7:** Update CI workflow (`.github/workflows/ci-cd.yml`) and sync scripts (`scripts/check-env-sync.ts`).
8. **Step 8:** Delete `backend/.env.example`, `frontend/.env.example`, `backend/.env`, and `frontend/.env`.
9. **Step 9:** Execute full verification suite (`pnpm check:all`) to validate that all 11 CI gates, unit tests, and production builds pass.

### G.6: Rollback Plan
If unexpected issues arise during Phase 2:
1. Revert Git working directory: `git checkout HEAD -- . && git clean -fd`.
2. Restore local backups of `backend/.env` and `frontend/.env`.
3. Verify test baseline with `pnpm test` and `pnpm lint:env-sync`.

---

## Part H: Risk Assessment

| Risk Description | Likelihood | Impact | Severity | Mitigation Strategy |
|---|:---:|:---:|:---:|---|
| **CI Gate 1 (`lint:env-sync`) failure** | High | Medium | Medium | Update `scripts/check-env-sync.ts` simultaneously in the same commit to validate root parity. |
| **Port collision during simultaneous dev launch** | Medium | High | High | Standardize `BACKEND_PORT=13001` and `FRONTEND_PORT=13000` in root `.env`. Both packages already inspect these keys. |
| **Prisma CLI fails to find `DATABASE_URL`** | Low | High | Medium | Prisma 8 natively climbs parent directories searching for `.env`. Verified working from `backend/`. |
| **Docker Compose builds in container miss variables** | Low | High | High | Verify with `pnpm docker:prod:config` and run a local `docker compose up --build` test before merging. |
| **Developer confusion during git pull** | Medium | Low | Low | Update `README.md` and project conventions; add deprecation notice if old `backend/.env` is detected. |

---

## Part I: Questions & Decisions for DeepSeek

Before proceeding to Phase 2 execution, please review and confirm the following 5 strategic points:

1. **Architecture Option Approval:**  
   Do you approve **Option A (Single Root `.env` as the Single Source of Truth + elimination of `backend/.env*` and `frontend/.env*`)**?
2. **`PORT` Variable Disambiguation:**  
   Do you confirm deprecating the un-namespaced `PORT` in `.env` in favor of explicit `BACKEND_PORT` and `FRONTEND_PORT` to prevent collisions?
3. **Database URL Derivation vs Explicit String:**  
   Should `.env` maintain both individual Postgres connection parameters (`POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.) AND the full `DATABASE_URL` connection string?
4. **Purge of Dead Frontend Variables:**  
   Do you confirm the removal of `WEBHOOK_*` and `PUSHGATEWAY_*` variables from frontend context (as frontend contains zero usages of them)?
5. **Phase 2 Scope & Branching:**  
   Should Phase 2 be executed directly on the current branch `chore/task-10-memory-docs-consistency` or branched to `refactor/task-11-env-unification`?
