# HaiHire System Architecture & Design Overview

> **Enterprise Multi-Tenant Applicant Tracking System (ATS)**  
> Technical Architecture, Infrastructure Topology, and Core Design Patterns.

---

## 1. System Topology

```mermaid
flowchart TB
    subgraph Clients["Clients & Edge Traffic"]
        Browser["Desktop & Mobile Browsers"]
        Candidate["Public Candidates (/careers/*)"]
        Recruiter["Recruiter / Admin Portal (/dashboard/*)"]
    end

    subgraph Edge["Reverse Proxy & Edge Network"]
        Gateway["Reverse Proxy Gateway (TLS Termination & Routing)"]
    end

    subgraph FrontendCluster["Next.js 16.3.8 Frontend App (Port 13000)"]
        RSC["React Server Components (RSC)\n• /careers/[orgSlug]/[jobSlug]\n• Server-Side SEO & JSON-LD"]
        ClientApp["Client Components (React 19.3)\n• Kanban Pipeline Board\n• Wizard Forms & TanStack Query"]
        EdgeProxy["Next.js Edge Proxy (proxy.ts)\n• Auth Cookie verification & redirects"]
        RewriteProxy["Next.js Rewrite Proxy (/api/*)\n• Backend proxy & SSR forwarding"]
    end

    subgraph BackendCluster["NestJS 12.1.2 API Server (Port 13001)"]
        GuardLayer["Guard Pipeline\n• JwtAuthGuard (HttpOnly Cookie)\n• RolesGuard (Dynamic isOwner Bypass)\n• RequirePermissionGuard"]
        Controllers["Modular Domain Controllers\n• Auth, Jobs, Candidates, Applications\n• Interviews, Email, Sourcing, Organizations\n• Webhooks, Users, Metrics, Health"]
        SagaService["Application Saga Coordinator\n• MinIO Upload -> Prisma TX -> Compensating DLQ"]
        ALS["AsyncLocalStorage Transaction Manager\n• PrismaService.executeTx()"]
        EmailWorker["BullMQ Email Processor\n• Deterministic Idempotency Keys"]
        OrphanWorker["Orphan File Cleanup Worker\n• Daily Cron (0 4 * * *)"]
    end

    subgraph DataTier["Data & Storage Infrastructure"]
        Postgres[("PostgreSQL 17.6\n(Port 15432 / 5432)\nPrisma ORM 8 RC Contract")]
        Valkey[("Valkey 8.0.2 Cache & Queue\n(Port 16379 / 6379)\nBullMQ Engine")]
        MinIO[("MinIO S3 Object Storage\n(Port 19000 / 9000)\nResumes & Documents")]
    end

    Browser --> Gateway
    Candidate --> Gateway
    Recruiter --> Gateway
    Gateway --> FrontendCluster
    Gateway --> BackendCluster

    EdgeProxy --> ClientApp
    ClientApp --> RewriteProxy
    RSC -->|Internal Network| BackendCluster
    RewriteProxy -->|Internal Network| BackendCluster

    BackendCluster --> GuardLayer
    GuardLayer --> Controllers
    Controllers --> SagaService
    SagaService --> ALS
    ALS --> Postgres
    SagaService --> MinIO
    Controllers --> EmailWorker
    EmailWorker --> Valkey
    OrphanWorker --> Postgres
    OrphanWorker --> MinIO
```

---

## 2. Technology Stack Baseline

| Tier / Domain                 | Technology                |        Version         | Purpose                                                                 |
| :---------------------------- | :------------------------ | :--------------------: | :---------------------------------------------------------------------- |
| **Runtime Environment**       | Node.js                   |         `26.x`         | Modern Active LTS runtime across Docker and CI.                         |
| **Package Management**        | pnpm                      |        `12.6.0`        | Strict workspace dependency management, zero phantom dependencies.      |
| **Frontend Framework**        | Next.js (App Router)      |        `16.3.8`        | Hybrid RSC + Client architecture, Turbopack, standalone output.         |
| **UI Engine**                 | React                     |         `19.3`         | Modern concurrent rendering, Server Components, and transition hooks.   |
| **Styling Engine**            | Tailwind CSS              |        `v4.0.0`        | CSS-first zero-config design tokens, Slate palette.                     |
| **Backend Framework**         | NestJS                    |        `12.1.2`        | Modular enterprise server architecture, Express engine.                 |
| **Database & ORM**            | PostgreSQL + Prisma       | `17.6` / `8.0.0-rc.13` | Multi-tenant datastore with Prisma Contract-first schema compilation.   |
| **Distributed Cache & Queue** | Valkey (Redis-compatible) |        `8.0.2`         | Open-source Redis replacement for BullMQ queues and cache.              |
| **Object Storage**            | MinIO (S3-compatible)     |     `RELEASE.2025`     | Tenant-segregated PDF/DOCX resume storage with expiring presigned URLs. |
| **Language Baseline**         | TypeScript                |        `6.0.3`         | Strict type safety across backend, frontend, and shared packages.       |
| **Test Runners**              | Vitest + Playwright       |   `5.0.3` / `1.63.0`   | Comprehensive unit/integration tests and browser E2E test suite.        |

---

## 3. Service Topology & Request Flow

1. **Client Ingress:** Requests hit the Edge Gateway or Next.js Frontend depending on route.
2. **Edge Proxy Interception:** `frontend/src/proxy.ts` inspects session authentication cookies (`haihire_token`, `haihire_has_org`) and handles server-side redirects (e.g. unauthenticated users requesting `/dashboard` are redirected to `/auth/login`).
3. **API Routing:**
   - Client requests to `/api/*` are forwarded via Next.js proxy rewrites to the NestJS backend on internal port `13001`.
   - Direct requests to public career pages (`/careers/[orgSlug]/[jobSlug]`) execute as React Server Components (RSC) fetching metadata directly from the backend.
4. **Backend Security Pipeline:**
   - Every API request passes through `JwtAuthGuard`, extracting the user token and tenant context.
   - `RolesGuard` evaluates dynamic ownership via `Organization.ownerId` (granting super-admin bypass) and verifies permissions declared via `@RequirePermission()`.
   - Every controller `@Body()` parameter is validated by `DtoPipe` to enforce fail-fast Zod/class-validator schemas.
5. **Data Persistence:**
   - Relational entities are persisted to PostgreSQL 17 via Prisma 8 contract (`src/prisma/contract.prisma`).
   - Transactions use `PrismaService.executeTx()` with `AsyncLocalStorage` for propagation.
   - File uploads execute via the Saga coordinator combining MinIO S3 storage and DB commits with compensating rollbacks.
   - Background tasks (emails, webhooks, metrics) are dispatched to BullMQ queues powered by Valkey.

---

## 4. Backend Modules

The backend monolith is structured into domain modules located under `backend/src/`:

- `applications/`: Candidate application submissions, pipeline progression, and distributed Saga orchestration.
- `auth/`: Authentication, JWT issuance, cookie handling, passport strategies, and permission guards.
- `candidates/`: Candidate profiles, resumes, tags, and PII protection.
- `common/`: Global exception filters, `DtoPipe`, interceptors, and encryption helpers.
- `config/`: Centralized fail-fast Zod environment schema (`env.ts`).
- `email/`: Multi-provider transactional email delivery (Resend, SendGrid, SMTP, Simulated).
- `interviews/`: Interview scheduling, calendar invites, and interviewer scorecards.
- `jobs/`: Job requisitions, custom hiring pipelines, and stage management.
- `metrics/`: Prometheus metrics collection and alerting probes.
- `organizations/`: Multi-tenant organization boundaries, memberships, and dynamic ownership.
- `prisma/`: Prisma 8 contract, database client, and transaction management.
- `sourcing/`: Sourcing channels, tracking links, and attribution clicks.
- `webhook-settings/`: Outbound tenant webhook notifications (Discord, Telegram, Generic).
