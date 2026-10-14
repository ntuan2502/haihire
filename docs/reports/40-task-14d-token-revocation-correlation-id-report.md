# Task #14D: Refresh Token Revocation & Correlation ID Middleware

**Milestone:** v1.0.0 Hardening Phase — Task #14D (Final P2 Hardening Task)  
**Author:** HaiHire Enterprise ATS Engineering Team  
**Status:** Completed  
**Branch:** `fix/task-14d-token-revocation-correlation-id`  
**Commits:**
- `d0e8de8`: `feat(auth): add token version for refresh token revocation`
- `9b03563`: `feat(observability): add correlation id middleware`

---

## 1. Executive Summary

Task #14D addresses the final two Priority 2 (P2) architectural vulnerabilities identified in the **Task #14 Phase 1 Gap Analysis**, bringing the HaiHire platform to full v1.0.0 production readiness:

1. **Stateless Refresh Tokens Without Revocation (Issue #1):**
   - Refresh tokens were 7-day stateless JWTs without database or cache backing.
   - Compromised tokens could not be revoked until natural expiration.
   - Password changes or user logouts did not invalidate existing active tokens or sessions.
2. **Missing Correlation ID (X-Request-ID) Middleware (Issue #2):**
   - HTTP requests lacked a unified correlation identifier.
   - Logs across HTTP controllers, service operations, database transactions, and background queue workers could not be correlated during concurrent production workloads.

### Solution Overview

- **Part A: Refresh Token Revocation via `tokenVersion`:**
  - Added `tokenVersion Int @default(0)` to the `User` model in `contract.prisma`.
  - Applied schema migration via `prisma db update` and emitted updated TypeScript contracts via `prisma contract emit`.
  - Embedded `tokenVersion` into both Access and Refresh JWT payloads during `login`, `register`, and `refreshToken`.
  - Enforced `tokenVersion` parity in `JwtStrategy.validate()` and `AuthService.refreshToken()`.
  - Implemented `logout(userId)` and `changePassword(userId, currentPassword, newPassword)` to increment `tokenVersion`, instantly invalidating all prior active tokens across all devices.
  - Ensured seamless backward compatibility: existing sessions default to `tokenVersion: 0` without breaking user sessions upon deployment.
- **Part B: Correlation ID Middleware & Observability:**
  - Created `CorrelationIdMiddleware` backed by Node.js native `AsyncLocalStorage`.
  - Automatically captures incoming client `X-Request-ID` headers (or generates RFC 4122 UUID v4 fallback) and echoes `X-Request-ID` in HTTP response headers.
  - Implemented `CorrelationLogger extends ConsoleLogger` to prefix log messages with `[<request-id>]`, falling back to `[no-correlation]` for background daemons.
  - Integrated `CorrelationLogger` into NestJS application bootstrap and attached `requestId` to structured HTTP access telemetry logs.
  - Registered middleware globally in `AppModule.configure()`.
- **Verification & CI Gates:**
  - **11/11 CI Gates Passed** in `pnpm check:all:fast` (35.87s).
  - **606 Total Tests Passed** (406 backend + 200 frontend across 73 test files), surpassing the 594+ threshold.
  - **Zero Any Policy:** 100% compliance maintained (0 `as any`, 0 `: any`).
  - **Tenant Scoping:** 212 safe queries maintained in `pnpm lint:tenant-scope`.

---

## 2. Part A: Refresh Token Revocation

### 2.1 Audit & Revocation Strategy Comparison

| Criteria | Option A: `tokenVersion` on User (Selected) | Option B: RefreshToken Table | Option C: Redis Blacklist |
| :--- | :--- | :--- | :--- |
| **Architectural Complexity** | Low (Single scalar column on `User`) | High (New table, foreign keys, cleanup cron) | Medium (Key lifecycle, Redis dependency) |
| **Performance Overhead** | Zero additional queries (piggybacks on existing user fetch) | 1 additional DB lookup & write per refresh | Fast in-memory check, but requires Redis uptime |
| **Session Control** | Global revocation (all sessions revoked on logout/password change) | Granular per-device/session revocation | Granular per-token revocation |
| **Failure Mode** | Database is source of truth; 100% resilient | Database is source of truth | Redis outage breaks revocation checks |

**Decision:** Option A was chosen because revoking all active sessions upon password change or logout is the standard security model for enterprise ATS platforms, requires zero additional tables or background garbage collection, and introduces zero latency overhead.

### 2.2 Database Migration

1. **Schema Update (`backend/src/prisma/contract.prisma`):**
   ```prisma
   model User {
     id             String               @id @default(uuid())
     email          String               @unique
     name           String
     password       String?
     avatarUrl      String?
     role           Role                 @default(MEMBER)
     tokenVersion   Int                  @default(0)
     organizationId String?
     ...
     @@map("user")
   }
   ```
2. **Migration Execution:**
   - `prisma contract emit` updated `contract.json` and `contract.d.ts`.
   - `prisma db update` executed migration operation: `Add column "tokenVersion" to "user"`.
   - Default value `0` ensures existing users transition seamlessly with zero downtime or session invalidation.

### 2.3 Authentication & Strategy Hardening

#### 1. Token Issuance (`backend/src/auth/auth.service.ts`)
```typescript
const tokenVersion = user.tokenVersion ?? 0;
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
  tokenVersion,
};

const accessToken = this.jwtService.sign(payload);
const refreshToken = this.jwtService.sign(
  { sub: user.id, type: "refresh", tokenVersion },
  { expiresIn: "7d" },
);
```

#### 2. Access Token Verification (`backend/src/auth/jwt.strategy.ts`)
```typescript
async validate(payload: JwtPayload) {
  const user = await this.prisma.db.orm.public.User.select(
    "id",
    "email",
    "name",
    "role",
    "avatarUrl",
    "organizationId",
    "tokenVersion",
    "createdAt",
  )
    .where((u) => u.id.eq(payload.sub))
    .first();

  if (!user) {
    throw new AppUnauthorizedException(APP_ERROR_CODES.UNAUTHORIZED, "User not found or token invalid");
  }

  const payloadTokenVersion = payload.tokenVersion ?? 0;
  const userTokenVersion = user.tokenVersion ?? 0;
  if (payloadTokenVersion !== userTokenVersion) {
    throw new AppUnauthorizedException(APP_ERROR_CODES.UNAUTHORIZED, "Token has been revoked");
  }

  return user;
}
```

#### 3. Refresh Flow Validation (`backend/src/auth/auth.service.ts`)
```typescript
const decodedTokenVersion = decoded.tokenVersion ?? 0;
const userTokenVersion = user.tokenVersion ?? 0;
if (decodedTokenVersion !== userTokenVersion) {
  throw new AppUnauthorizedException(
    APP_ERROR_CODES.USER_SESSION_EXPIRED,
    "Token has been revoked",
  );
}
```

#### 4. Revocation Triggers: Logout & Password Change
- **Logout (`POST /auth/logout`):**
  Guarded by `OptionalJwtAuthGuard`. If user session is present, increments `tokenVersion`:
  ```typescript
  async logout(userId: string): Promise<void> {
    const user = await this.prisma.db.orm.public.User.select("id", "tokenVersion")
      .where((u) => u.id.eq(userId))
      .first();

    if (user) {
      await this.prisma.db.orm.public.User
        .where((u) => u.id.eq(userId))
        .update({
          tokenVersion: (user.tokenVersion ?? 0) + 1,
          updatedAt: toInstant(),
        });
    }
  }
  ```
- **Change Password (`POST /auth/change-password`):**
  Guarded by `JwtAuthGuard` and validated via `@Body(DtoPipe(ChangePasswordDto))`. Compares existing password, hashes new password, and increments `tokenVersion`, invalidating all stolen or legacy tokens instantly.

---

## 3. Part B: Correlation ID Middleware & Observability

### 3.1 Middleware Architecture (`backend/src/common/middleware/correlation-id.middleware.ts`)

```typescript
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const correlationStorage = new AsyncLocalStorage<{ requestId: string }>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers["x-request-id"];
    const requestId =
      (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || randomUUID();

    res.setHeader("X-Request-ID", requestId);

    correlationStorage.run({ requestId }, () => {
      next();
    });
  }
}
```

### 3.2 Correlation Logger (`backend/src/common/logger/correlation-logger.service.ts`)

```typescript
import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import { correlationStorage } from "../middleware/correlation-id.middleware";

@Injectable({ scope: Scope.TRANSIENT })
export class CorrelationLogger extends ConsoleLogger {
  protected override formatMessage(
    _logLevel: string,
    message: unknown,
    _pidMessage: string,
    _formattedLogLevel: string,
    context?: string,
  ): string {
    const store = correlationStorage.getStore();
    const requestId = store?.requestId || "no-correlation";
    return `[${requestId}] ${context ? `[${context}] ` : ""}${message}\n`;
  }
}
```

### 3.3 Production Log Output Example

With `CorrelationLogger` and `CorrelationIdMiddleware` active, logs throughout request lifecycles correlate synchronously:

```text
[550e8400-e29b-41d4-a716-446655440000] [AuthService] User logged in: admin@tun.io.vn
[550e8400-e29b-41d4-a716-446655440000] [PrismaService] Query completed in 3ms
[550e8400-e29b-41d4-a716-446655440000] [EmailProcessor] Enqueued email job 'send-email'
{"level":"info","timestamp":"2026-10-14T02:00:15.123Z","type":"HTTP_ACCESS","requestId":"550e8400-e29b-41d4-a716-446655440000","method":"POST","path":"/auth/login","status":200,"latencyMs":14,"userId":"usr-admin","orgId":"org-1"}
```

For background daemons or tasks outside an HTTP context, the logger gracefully falls back:
```text
[no-correlation] [MetricsService] Prometheus metrics scraped
[no-correlation] [OrphanCleanupProcessor] Processed orphan cleanup cycle
```

---

## 4. Verification & Testing

### 4.1 Unit Test Coverage

1. **`correlation-id.middleware.spec.ts` (6 tests):**
   - Verified UUID v4 generation when `X-Request-ID` is missing.
   - Verified client `X-Request-ID` header preservation.
   - Verified header array handling (`["id-1", "id-2"]`).
   - Verified `CorrelationLogger` contextual output `[requestId] [Context] message`.
   - Verified `[no-correlation]` fallback outside request scope.
   - Verified un-contextual message formatting.
2. **`jwt.strategy.spec.ts` (7 tests):**
   - Verified successful validation when `tokenVersion` matches database user.
   - Verified rejection with `"Token has been revoked"` when `tokenVersion` mismatches.
   - Verified backward compatibility: legacy tokens without `tokenVersion` accept user default 0.
   - Verified missing user handling.
   - Verified cookie and bearer token extraction.
3. **`auth.service.spec.ts` (13 tests):**
   - Verified `login` signs access and refresh tokens with `tokenVersion`.
   - Verified `register` creates user with `tokenVersion: 0`.
   - Verified `refreshToken` succeeds when `tokenVersion` matches.
   - Verified `refreshToken` rejects with `"Token has been revoked"` when `tokenVersion` is outdated.
   - Verified `logout` increments `tokenVersion`.
   - Verified `changePassword` updates password hash and increments `tokenVersion`.
   - Verified `changePassword` rejects incorrect current password without modifying `tokenVersion`.

### 4.2 CI Architecture Fast Gates (`pnpm check:all:fast`)

```text
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.29s
  2. Two-Way i18n & Zero Hardcoded Strings (pnpm lint:i18n) [PASS]    0.65s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   20.75s
  4. TypeScript Type Safety                     [PASS]   11.63s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.29s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.41s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.38s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.42s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.36s
 10. CI Gate 11: Documentation Markdown Link Integrity [PASS]    0.39s
 11. Test Count Delta & Anti-Regression         [PASS]    0.30s
──────────────────────────────────────────────────────────────────
 Total Time: 35.87s
 Status: 🟢 ALL CHECKS PASSED (11/11) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

### 4.3 Full Test Suite Execution (`pnpm test`)

```text
backend test:  Test Files  40 passed (40) | Tests  406 passed (406)
frontend test: Test Files  33 passed (33) | Tests  200 passed (200)

Total Passed Tests: 606 passed across 73 test files (0 failures).
```

---

## 5. Acceptance Criteria Checklist

- [x] **Part A (Refresh Token Revocation):**
  - [x] `User` model contains `tokenVersion Int @default(0)` in `contract.prisma`.
  - [x] Database migration applied via `prisma db update` and contracts emitted via `prisma contract emit`.
  - [x] JWT payload includes `tokenVersion` in both access and refresh tokens.
  - [x] `JwtStrategy.validate()` verifies `tokenVersion` parity.
  - [x] `AuthService.logout()` increments `tokenVersion`.
  - [x] `AuthService.changePassword()` increments `tokenVersion`.
  - [x] Old tokens rejected with 401 Unauthorized after revocation.
  - [x] Legacy sessions default to version 0 and remain valid.
  - [x] Unit tests cover all revocation and backward-compatibility scenarios.
- [x] **Part B (Correlation ID Middleware):**
  - [x] `CorrelationIdMiddleware` created with `AsyncLocalStorage`.
  - [x] Reads incoming client `X-Request-ID` or generates UUID v4 fallback.
  - [x] Sets response header `X-Request-ID`.
  - [x] `CorrelationLogger` extends `ConsoleLogger` with `[<requestId>]` prefix.
  - [x] Middleware registered globally in `AppModule.configure()`.
  - [x] Structured HTTP access log incorporates `requestId`.
  - [x] Unit tests cover UUID generation, header preservation, context propagation, and formatting.
- [x] **Global Quality & Conventions:**
  - [x] `pnpm check:all:fast` passes 11/11 gates in 35.87s.
  - [x] `pnpm test` passes 606 tests (406 backend + 200 frontend).
  - [x] `pnpm build` passes with 0 errors.
  - [x] Zero Any Policy maintained (0 `as any`, 0 `: any`).
  - [x] Commits follow conventional commit standards with strictly lowercase subjects.

---

## 6. Milestone Conclusion

With the completion of **Task #14D**, all Priority 2 (P2) architectural gaps identified in the Task #14 Phase 1 Gap Analysis have been resolved:
- **Task #14A:** Frontend Error Boundaries & Resiliency
- **Task #14B:** Sourcing Query Scoping & Distributed Lock Concurrency Control
- **Task #14C:** Public Careers ISR Caching & Email DLQ Alerting
- **Task #14D:** Refresh Token Revocation & Correlation ID Middleware

The platform is officially hardened, resilient, observable, and fully ready for the **v1.0.0 Release**.
