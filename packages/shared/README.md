# @haihire/shared

> Canonical domain types, error codes, and shared contracts for the HaiHire Enterprise ATS platform.

---

## 📦 Overview

`@haihire/shared` serves as the single source of truth across the monorepo, shared by both `backend/` and `frontend/`. It eliminates interface divergence and guarantees type safety across the network boundary.

---

## 📁 Domain Module Exports

The package exports domain models and utilities organized under `src/`:

| Module | Contents |
| :--- | :--- |
| **`brand.ts`** | `BRAND_CONFIG` constants: product name (`HaiHire`), monogram (`H`), legal name, and default tenant slug |
| **`errors.ts`** | `APP_ERROR_CODES` enum (51 standardized codes), `AppErrorEnvelope`, and HTTP status mappings |
| **`common.ts`** | Standardized pagination interfaces (`PaginationParams`, `PaginatedResult<T>`), sorting, and date helpers |
| **`jobs.ts`** | Job entity schemas, requisition statuses (`DRAFT`, `PUBLISHED`, `CLOSED`), requirements, and department enums |
| **`candidates.ts`** | Candidate profiles, contact details, resume metadata, and deduplication types |
| **`applications.ts`**| Recruitment pipeline stages (`APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`), reviews, notes |
| **`interviews.ts`** | Scheduled interview formats (`IN_PERSON`, `VIDEO`, `PHONE`), scorecards, ratings, and time slots |
| **`organizations.ts`**| Organization boundaries, membership roles (`OWNER`, `ADMIN`, `RECRUITER`, `INTERVIEWER`), invitations |
| **`email-templates.ts`**| System email template definitions and interpolation variable schemas |
| **`sourcing.ts`** | Tracking links, UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), attribution clicks |

---

## ⚡ Usage in Workspace

Import directly into backend or frontend files:

```typescript
import { APP_ERROR_CODES, PaginatedResult, JobStatus, BRAND_CONFIG } from "@haihire/shared";
```

### Build & Verification
```bash
# Verify shared package type safety
pnpm --filter @haihire/shared run build
```
