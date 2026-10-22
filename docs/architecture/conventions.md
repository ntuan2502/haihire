# HaiHire Platform Engineering Conventions

> **This file is the SINGLE source of truth for all coding, architectural, and design conventions across the HaiHire platform. Do not duplicate rules elsewhere.**  
> Note: Rules located inside `.agents/rules/` are auto-generated and maintained by `ag-kit`. Use this file as the authoritative operational protocol.

---

## 1. Pure TypeScript Mandate

1. **100% TypeScript Files:** Every file across `backend/`, `frontend/`, `packages/shared/`, and `scripts/` must use TypeScript extensions (`.ts`, `.tsx`, `.mts`, `.cts`). Zero plain JavaScript (`.js`, `.cjs`, `.mjs`) files are permitted anywhere in application code.
   - _Rationale:_ Eliminates runtime type divergence and guarantees end-to-end type safety across the monorepo.
2. **Tooling Exception:** Standard tooling configuration files required by ESM runners (e.g. `vitest.config.mts`, `eslint.config.mjs`) are permitted as build-time configurations.
   - _Rationale:_ Necessary for external Node.js tooling compatibility.

---

## 2. Zero-Any Typing Policy

1. **Strictly Prohibited `any`:** Using `any` or `as any` is strictly forbidden in all workspace packages.
   - _Rationale:_ Bypasses the compiler, masking undefined properties and triggering runtime null/undefined crashes.
2. **Approved Alternatives:** Use explicit interfaces, generics, `unknown` with type guards, or Zod inferred types (`z.infer<typeof Schema>`).
   - _Rationale:_ Preserves deterministic type narrowing and compile-time contract verification.

---

## 3. Centralized Fail-Fast Environment Validation (Zod)

1. **Centralized Schemas:** All environment variables must be declared and validated via centralized Zod schemas:
   - Backend: `backend/src/config/env.ts` (`backendEnv`)
   - Frontend: `frontend/src/lib/env.ts` (`env`)
   - _Rationale:_ Eliminates scattered `process.env` lookups and ensures configuration integrity.
2. **Zero Fallbacks for Secrets:** Never provide fallback defaults for security secrets (`JWT_SECRET`, `ENCRYPTION_SECRET`, `DATABASE_URL`).
   - _Rationale:_ Prevents deploying insecure default credentials to production environments.
3. **Fail-Fast Startup:** Missing or invalid variables must terminate bootstrap immediately (`process.exit(1)`) with descriptive field errors.
   - _Rationale:_ Traps configuration errors before accepting traffic rather than failing under load.
4. **No Direct `process.env` in Code:** Direct consumption of `process.env.X` inside business logic, services, or controllers is prohibited. Import typed `backendEnv` or `env`.
   - _Rationale:_ Guarantees that code only reads validated, typed variables.

---

## 4. 100% DtoPipe Validation Coverage

1. **Mandatory DtoPipe Guard:** Every NestJS controller parameter decorated with `@Body()` must be protected by `@Body(DtoPipe)`.
   - _Rationale:_ Sanitizes incoming HTTP payloads and prevents prototype pollution or malformed input injection.
2. **Enforcement:** Enforced in CI by Gate 5 (`pnpm lint:dtopipe`), asserting 100% endpoint coverage.
   - _Rationale:_ Automated gate prevents security regression during development.

---

## 5. Two-Way i18n Localization (Zero Hardcoded UI Strings)

1. **Zero Hardcoded JSX Text:** Raw user-facing strings, labels, placeholders, and error toasts in JSX/TSX are strictly forbidden.
   - _Rationale:_ Guarantees full localization support and prevents language leaks in bilingual ATS deployments.
2. **Two-Way Dictionary Symmetry:** All keys must exist symmetrically in both Vietnamese (`frontend/src/constants/translations/vi.ts`) and English (`frontend/src/constants/translations/en.ts`) and be typed in `TranslationSchema`.
   - _Rationale:_ Prevents runtime translation key misses (`[missing key]`) when switching languages.
3. **Enforcement:** Enforced by CI Gate 2 (`pnpm lint:i18n`) and Gate 6 (`pnpm lint:error-i18n`).
   - _Rationale:_ Traps unlocalized strings and dictionary drift before merge.

---

## 6. Language & Documentation Policy

1. **English Mandate:** All code comments, commit messages, documentation files, decisions, runbooks, and pull requests must be written in English.
   - _Rationale:_ Standardizes enterprise engineering communications and avoids encoding ambiguities.
2. **Localized UI Exception:** Vietnamese is reserved strictly for conversational user chat and the `vi.ts` translation dictionary.
   - _Rationale:_ Keeps UI bilingual while keeping engineering artifacts internationally standard.

---

## 7. Component Architecture & Frontend Conventions

1. **5-Layer Modular Structure (`frontend/src/components/`):**
   - `ui/`: Pristine Shadcn UI primitives added via official CLI (`pnpx shadcn add`).
   - `shared/`: Reusable ATS UI controls, custom selects, badges, and guards.
   - `layout/`: Global navigation and layout shells.
   - `providers/`: App-level React context and cache providers.
   - `[feature]/`: Domain-specific components scoped by feature (e.g. `jobs/`, `candidates/`).
   - _Rationale:_ Prevents component sprawling and establishes clear modular boundaries.
2. **Named React Imports:** Always use named imports (e.g. `import { useState, type ReactNode } from "react"`). Never use `import React from "react"` or `React.x`.
   - _Rationale:_ Enhances tree-shaking and adheres to React 19 standards.
3. **The `cn` Package Standard:** Use the official `cn` package directly (`import { cn } from "cn"`). Never re-add `clsx` or `tailwind-merge`.
   - _Rationale:_ Avoids duplicate class merging libraries in frontend bundle.
4. **Full-Width Canvas Layout:** Application pages must span full screen width; do not box dashboards in `max-w-7xl mx-auto`.
   - _Rationale:_ Modern enterprise ATS dashboards require high information density.

---

## 8. Network Gatekeeper & API Hygiene

1. **Client-Side Axios Interceptor:** Axios request interceptors must inspect outgoing URLs and reject malformed stringifications (e.g. `[object Object]`, `undefined`, `null`).
   - _Rationale:_ Traps broken frontend string interpolations before dispatching broken network requests.
2. **Anti-Monolith File Boundary:** Feature hooks and API clients must not exceed 400 lines; split by domain with barrel re-exports.
   - _Rationale:_ Keeps source files readable, testable, and maintainable.
3. **No Parameterized Callbacks in Handlers:** Wrap parameterized event handlers in arrow functions (`onClick={() => handle(item.id)}`) rather than passing raw callbacks.
   - _Rationale:_ Prevents `MouseEvent` objects from accidentally leaking into domain payload parameters.

---

## 9. Database, ORM & Transaction Architecture

1. **Prisma 8 Contract-First Schema:** All database models live in `backend/src/prisma/contract.prisma`.
   - _Rationale:_ Generates compiled, deterministic runtime codecs and contracts.
2. **Cascade Deletion Integrity:** Child entities (`Application`, `Interview`, `CandidateDocument`, `ActivityLog`) must declare `onDelete: Cascade` targeting their parent root.
   - _Rationale:_ Guarantees database-level atomic cascade deletion and eliminates orphan child records.
3. **AsyncLocalStorage Transaction Propagation:** Use `PrismaService.executeTx()` for transactional business operations.
   - _Rationale:_ Reuses the active database transaction across nested services without manual parameter passing.
4. **Distributed Saga Pattern:** Operations crossing MinIO object storage and PostgreSQL must use Saga compensation with BullMQ dead-letter queue (DLQ) retry fallbacks.
   - _Rationale:_ Ensures storage and database consistency even during network or service crashes.

---

## 10. Multi-Tenant Scoping Mandate

1. **Mandatory `organizationId` Filter:** Every database query touching tenant-scoped entities must explicitly filter by `where: { organizationId }`.
   - _Rationale:_ Prevents cross-tenant data leakage vulnerabilities.
2. **Enforcement:** Enforced in CI by Gate 9 (`pnpm lint:tenant-scope`).
   - _Rationale:_ Automatically detects queries lacking tenant boundary isolation.

---

## 11. Testing & AAA Testing Standard

1. **Arrange-Act-Assert Pattern:** All unit tests must structure logic using Arrange-Act-Assert.
   - _Rationale:_ Keeps test logic clean, readable, and reproducible.
2. **Adjacent Test Files:** Unit and integration tests must live adjacent to the source file they test (`*.spec.ts`, `*.spec.tsx`).
   - _Rationale:_ Makes test coverage obvious and simplifies code navigation.
3. **Zero Test Regressions:** Net test count cannot decrease. Tested via `pnpm test:diff` (CI Gate 13).
   - _Rationale:_ Prevents accidental removal or commenting out of test cases.
4. **No `.skip`:** Never commit `it.skip` or `describe.skip`.
   - _Rationale:_ Hides regressions and inflates false confidence in CI pipelines.

---

## 12. Design Rules & UI Standards

1. **DESIGN.md Gate:** Net-new UI features must follow design tokens specified in design documentation.
   - _Rationale:_ Maintains consistent typography, spacing, and color schemes.
2. **No Default Purple:** Do not use purple as a default accent unless explicitly required by brand brief.
   - _Rationale:_ Avoids generic AI template appearances.
3. **No Fake Screenshots:** Never build fake product screenshots out of nested `<div>` mockups.
   - _Rationale:_ Retains clean, authentic UI presentation without clutter.

---

## 13. Git Workflow & Conventional Commits

1. **Branch Format:** Work on dedicated branches (`feat/`, `fix/`, `refactor/`).
   - _Rationale:_ Keeps the main branch deployable and isolates feature work.
2. **Conventional Commits with Scope:** Format messages as `type(scope): description` in lowercase English with no trailing period (e.g. `docs(architecture): consolidate system architecture documentation`).
   - _Rationale:_ Enforces clean, machine-parseable commit history for automated changelog generation.

---

## 14. Agent Operational & Feedback Rules

Extracted from historical development feedback to govern AI pair programming:

1. **Never chain commands with `&&` in Windows PowerShell:** Execute commands individually.
   - _Rationale:_ PowerShell syntax fails on `&&` in certain Windows runtime versions.
2. **Package.json First:** Inspect `package.json` scripts before creating or executing ad-hoc commands.
   - _Rationale:_ Prevents running inconsistent commands or introducing shadow tools.
3. **No Instant-Noodle Patches:** Investigate root causes and propose durable solutions rather than quick superficial fixes.
   - _Rationale:_ Prevents compounding technical debt.
4. **Verified-Ship Mindset:** Every claimed completion must be verified with raw execution evidence before submitting for review.
   - _Rationale:_ Ensures code actually works rather than merely compiling.

---

## 15. Frontend & Next.js Script Architecture

1. **Next.js `<Script>` Abstraction:** Never render raw JSX `<script>` tags inside React Server Components or layout trees. Always import `Script` from `next/script` with a unique `id` and appropriate `strategy` (e.g. `strategy="beforeInteractive"` for synchronous theme initialization in `<head>`).
   - _Rationale:_ React 19 App Router reconciler emits errors when encountering raw `<script>` tags during client hydration.
2. **Hydration Warning Scope:** Place `suppressHydrationWarning` strictly on `<html>` in `app/layout.tsx` when manipulating root class names via theme scripts; never scatter it onto arbitrary child components.
   - _Rationale:_ Prevents hiding genuine hydration mismatches in business UI components.
3. **No Console Masking:** Never monkey-patch `console.error` or override browser listeners to suppress hydration or framework warnings.
   - _Rationale:_ Masks production reconciliation bugs and blinds E2E automated test assertion listeners.
