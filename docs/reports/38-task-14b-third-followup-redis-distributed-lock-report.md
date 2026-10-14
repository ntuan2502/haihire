# Task #14B Third Follow-up: Redis/Valkey Distributed Lock for Click Counter

**Milestone:** v1.0.0 Hardening Phase — Task #14B Third Follow-up  
**Author:** HaiHire Enterprise ATS Engineering Team  
**Status:** Completed  
**Branch:** `fix/task-14b-redis-distributed-lock`  
**Commits:**
- `12c7d01`: `perf(sourcing): use redis distributed lock for click counter`
- `b4067fa`: `test(sourcing): add multi-instance concurrency test`

---

## 1. Executive Summary

During the architectural review following the Second Follow-up of **Task #14B: Sourcing Query Scoping & Database Indexes**, an essential production limitation was identified in the in-memory mutex implementation (`withClickLock` using `Map<string, Promise<void>>`):
- **Single-Instance Limitation:** The in-memory promise mutex correctly serializes concurrent requests arriving at a *single* Node.js process.
- **Multi-Instance Vulnerability:** In production environments running multi-replica containers behind a load balancer (e.g. Caddy, Kubernetes, or AWS ECS), each instance has its own private memory space. Two requests for the same tracking token routed to separate instances would still read and write concurrently, resulting in lost counter updates under PostgreSQL `READ COMMITTED` isolation.

### Solution Overview
To achieve true enterprise-grade concurrency protection across distributed nodes:
1. **Audited Redis/Valkey Access:** Evaluated BullMQ connection reuse vs. a dedicated NestJS provider. Confirmed that in BullMQ v6, `Queue.client` is no longer a public property and coupling sourcing to unrelated background worker queues (`orphan-cleanup-queue` or `email-queue`) violates domain boundaries. Built a clean, global `RedisModule` providing a singleton `REDIS_CLIENT` backed by `ioredis`.
2. **Distributed Lock Implementation:**
   - **Key Format:** `click:lock:${token}`
   - **Atomic Acquisition:** `redis.set(lockKey, lockValue, "PX", 5000, "NX")`
   - **Deadlock Protection:** 5000ms TTL ensures keys are automatically garbage-collected if a node crashes mid-transaction.
   - **Atomic Safe Release:** Evaluated via Lua script `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end` to verify lock ownership before deletion.
   - **High-Availability Fallback:** After 3000ms (`MAX_WAIT_MS`), or if Redis is unreachable, the system logs a structured warning and proceeds to execute the click transaction rather than blocking user navigation.
3. **Multi-Instance Concurrency Testing:**
   - Implemented `createMockRedis()` simulating atomic `SET NX PX` and Lua release evaluation.
   - Tested 100 concurrent clicks fired across two independent simulated application nodes (`instance1` and `instance2`) sharing the same Redis instance via `Promise.all`.
   - Confirmed `clicksCount === 100`, 100 click records created, and 0 lost updates.
4. **Zero Regressions & CI Gates:**
   - 71 test files passed, 585 total tests passed (+4 new tests).
   - All 11 CI architecture gates passed in `pnpm check:all:fast` (38.3s).
   - 212 safe queries verified via `pnpm lint:tenant-scope`.
   - 100% compliant with the Zero Any Policy (0 `as any` / 0 `: any`).

---

## 2. Part A: Redis & Valkey Architecture Audit

### 2.1 Project Redis Access Inspection
HaiHire utilizes **Valkey 8.0.2** (Redis-compatible, open-source engine) configured in `docker-compose.yml` on port `6379`. The backend already contains `ioredis` (`^6.0.0`) in its production dependencies.

An audit of existing usage revealed:
- `app.service.ts`: Implements health-check ping via `@Optional() @Inject("REDIS_CLIENT")` with fallback to ad-hoc `new Redis(...)`.
- `app.module.ts`: Configures `BullModule.forRootAsync(...)` for background queues (`orphan-cleanup-queue`, `email-queue`).

### 2.2 Connection Strategy: Option A vs. Option B Evaluation

| Criteria | Option A: Reuse BullMQ Connection | Option B: Dedicated Global Redis Provider (Selected) |
| :--- | :--- | :--- |
| **BullMQ Compatibility** | BullMQ v6.3.11 removed public `Queue.client`; requires deep internal access (`getBackend().client`). | Fully native and typed via standard `ioredis` instance. |
| **Domain Separation** | Coupling `SourcingModule` to `orphan-cleanup-queue` or `email-queue` introduces cross-domain pollution. | Clean module isolation; sourcing depends only on shared cache infrastructure. |
| **Lifecycle & Health** | Pausing, draining, or closing queues could unexpectedly disrupt sourcing telemetry. | Standalone client lifecycle managed cleanly via NestJS `OnModuleDestroy`. |
| **Testability** | Complex queue mocking required just to test tracking links. | Simple, lightweight mock client injection with zero queue overhead. |

**Decision:** Option B was implemented via a global `RedisModule` in `backend/src/redis/redis.module.ts`, exporting the standard `"REDIS_CLIENT"` injection token.

---

## 3. Part B: Distributed Lock Implementation

### 3.1 Global `RedisModule`
In `backend/src/redis/redis.module.ts`:
```typescript
export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>("REDIS_HOST", "localhost");
        const port = Number(config.get<number>("REDIS_PORT", 6379));
        const password = config.get<string>("REDIS_PASSWORD") || undefined;

        return new Redis({
          host,
          port,
          password,
          connectTimeout: 2000,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableOfflineQueue: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
```

### 3.2 Distributed Lock Logic in `SourcingService`
In `backend/src/sourcing/sourcing.service.ts`:
```typescript
export interface RedisLockClient {
  set(key: string, value: string, mode: "PX", duration: number, flag: "NX"): Promise<string | null>;
  eval(script: string, numKeys: number, key: string, arg: string): Promise<unknown>;
}

@Injectable()
export class SourcingService {
  private readonly logger = new Logger(SourcingService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Optional()
    @Inject("REDIS_CLIENT")
    private readonly redis?: RedisLockClient,
  ) {}

  private async withClickLock<T>(
    token: string,
    fn: () => Promise<T>,
    options?: { maxWaitMs?: number; retryIntervalMs?: number; lockTtlMs?: number },
  ): Promise<T> {
    if (!this.redis) {
      this.logger.warn(`Redis client not configured for token ${token}, proceeding without distributed lock`);
      return fn();
    }

    const lockKey = `click:lock:${token}`;
    const lockValue = crypto.randomUUID();
    const LOCK_TTL_MS = options?.lockTtlMs ?? 5000;
    const MAX_WAIT_MS = options?.maxWaitMs ?? 3000;
    const RETRY_INTERVAL_MS = options?.retryIntervalMs ?? 50;

    const start = Date.now();

    while (true) {
      let acquired: string | null = null;
      try {
        acquired = await this.redis.set(
          lockKey,
          lockValue,
          "PX",
          LOCK_TTL_MS,
          "NX",
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to acquire Redis click lock for token ${token}, proceeding without lock: ${err instanceof Error ? err.message : String(err)}`,
        );
        return await fn();
      }

      if (acquired === "OK") {
        try {
          return await fn();
        } finally {
          const releaseScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          try {
            await this.redis.eval(releaseScript, 1, lockKey, lockValue);
          } catch (err: unknown) {
            this.logger.error(
              `Failed to release click lock for token ${token}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      if (Date.now() - start > MAX_WAIT_MS) {
        this.logger.warn(
          `Click lock timeout after ${MAX_WAIT_MS}ms for token ${token}, proceeding without lock`,
        );
        return await fn();
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
```

---

## 4. Part C: Concurrency & Multi-Instance Verification

### 4.1 Mock Redis Simulation
In `backend/src/sourcing/sourcing.service.spec.ts`:
```typescript
function createMockRedis() {
  const store = new Map<string, { value: string; expiresAt: number }>();

  return {
    set: vi.fn(async (key: string, value: string, _px?: string, ttl?: number, nx?: string) => {
      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now) {
        if (nx === "NX") {
          return null;
        }
      }
      const expiresAt = ttl ? now + ttl : Infinity;
      store.set(key, { value, expiresAt });
      return "OK";
    }),
    eval: vi.fn(async (_script: string, _numkeys: number, key: string, arg: string) => {
      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now && existing.value === arg) {
        store.delete(key);
        return 1;
      }
      return 0;
    }),
    store,
  };
}
```

### 4.2 Multi-Instance Concurrency Test Case
Simulates two distinct service instances (`instance1` and `instance2`) representing separate backend nodes connected to a common Valkey instance:
```typescript
it("serializes concurrent calls across multiple simulated instances sharing Redis", async () => {
  inMemoryLinks.push({
    id: "link-multi-instance",
    token: "lnk-multi",
    source: SourcingChannel.LINKEDIN,
    clicksCount: 0,
    isActive: true,
    deletedAt: null,
  });

  const sharedRedis = createMockRedis();
  const instance1 = new SourcingService(mockPrisma as never, mockActivitiesService as never, sharedRedis);
  const instance2 = new SourcingService(mockPrisma as never, mockActivitiesService as never, sharedRedis);

  // Simulate async transaction I/O delay to induce contention
  executeTxSpy.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    return fn(currentMockDb);
  });

  // 50 calls from instance 1 + 50 calls from instance 2 concurrently (100 total)
  const promises = [
    ...Array.from({ length: 50 }, (_, i) =>
      instance1.recordClick("lnk-multi", "https://linkedin.com", `10.0.1.${i + 1}`, `Node1-Agent-${i}`, {
        maxWaitMs: 15000,
        retryIntervalMs: 10,
      }),
    ),
    ...Array.from({ length: 50 }, (_, i) =>
      instance2.recordClick("lnk-multi", "https://linkedin.com", `10.0.2.${i + 1}`, `Node2-Agent-${i}`, {
        maxWaitMs: 15000,
        retryIntervalMs: 10,
      }),
    ),
  ];

  const results = await Promise.all(promises);

  expect(results.every((r) => r.success)).toBe(true);
  expect(inMemoryLinks[0].clicksCount).toBe(100);
  expect(inMemoryClicks).toHaveLength(100);
  expect(executeTxSpy).toHaveBeenCalledTimes(100);
});
```

### 4.3 Test Suite Execution Results
```bash
$ vitest run src/sourcing/sourcing.service.spec.ts
 ✓ src/sourcing/sourcing.service.spec.ts (11 tests) 2237ms
   ✓ SourcingService (11)
     ✓ should create a new tracking link with unique token
     ✓ should record public clicks and increment click count in transaction
     ✓ should return paginated links with conversion rate
     ✓ should calculate correct sourcing overview stats and funnel
     ✓ should strictly scope getStats to current organization and never leak other tenant data
     ✓ recordClick handles concurrent calls without lost updates (578ms)
     ✓ recordClick acquires distributed lock, increments counter, and releases lock
     ✓ recordClick retries and eventually acquires lock when initially held by another process
     ✓ recordClick proceeds without lock when wait time exceeds maxWaitMs timeout
     ✓ recordClick releases distributed lock even when transaction throws error
     ✓ serializes concurrent calls across multiple simulated instances sharing Redis (1555ms)

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

---

## 5. Part D: Full Verification Results

### 5.1 Test Suite
```bash
$ pnpm test
 Test Files  71 passed (71)
      Tests  585 passed (585) — 385 backend, 200 frontend
   Duration  22.48s
```

### 5.2 CI Fast Architecture Verification (`pnpm check:all:fast`)
```
==================================================================
                       VERIFICATION SUMMARY                       
==================================================================
  1. Environment Variables Synchronization & Parity [PASS]    0.31s
  2. Two-Way i18n & Zero Hardcoded Strings (pnpm lint:i18n) [PASS]    0.86s
  3. ESLint Code Quality (Backend + Frontend)   [PASS]   27.49s
  4. TypeScript Type Safety                     [PASS]    7.28s
  5. CI Gate 3: DtoPipe Validation Coverage     [PASS]    0.20s
  6. CI Gate 4: Error Code i18n Localization    [PASS]    0.35s
  7. CI Gate 5: API Contract & Leaks Audit      [PASS]    0.34s
  8. CI Gate 6: Prometheus Alert Rules Audit    [PASS]    0.36s
  9. CI Gate 10: Tenant Scoping Static Analysis [PASS]    0.29s
 10. CI Gate 11: Documentation Markdown Link Integrity [PASS]    0.52s
 11. Test Count Delta & Anti-Regression         [PASS]    0.30s
──────────────────────────────────────────────────────────────────
 Total Time: 38.3s
 Status: 🟢 ALL CHECKS PASSED (11/11) — SYSTEM IS 100% HEALTHY & READY!
==================================================================
```

### 5.3 Tenant Scoping
```bash
$ pnpm lint:tenant-scope
Scanned files: 8
Total queries inspected: 212
Safe queries: 212
Unsafe queries: 0
[CI GATE PASSED] All 212 tenant-scoped queries are properly isolated!
```

### 5.4 Zero Any Policy Audit
```powershell
Select-String -Path "backend/src/redis/redis.module.ts", "backend/src/sourcing/sourcing.service.ts", "backend/src/sourcing/sourcing.service.spec.ts" -Pattern "as any|: any"
# Output: 0 matches found (100% Zero Any compliant)
```

---

## 6. Summary of Acceptance Criteria

| Acceptance Criterion | Status | Evidence |
| :--- | :---: | :--- |
| `withClickLock` uses Redis instead of in-memory Map | **Completed** | Keyed via `click:lock:${token}` using `REDIS_CLIENT`. |
| Atomic acquire (`SET NX PX`) | **Completed** | Uses `redis.set(lockKey, lockValue, "PX", LOCK_TTL_MS, "NX")`. |
| Atomic release via Lua script | **Completed** | Evaluates owner validation before delete via Lua script. |
| TTL deadlock prevention | **Completed** | 5000ms TTL automatically frees locks on node crash. |
| Timeout handling without user blocking | **Completed** | Proceeds after 3000ms or on Redis network error to preserve UX. |
| Multi-instance concurrency test | **Completed** | 100 concurrent requests across 2 simulated nodes tested and verified. |
| 585 tests pass (0 regressions) | **Passed** | 71 test files, 585 tests passed. |
| `pnpm check:all:fast` | **Passed** | 11/11 architecture checks passed in 38.3s. |
| `pnpm lint:tenant-scope` | **Passed** | 212/212 queries verified safe. |
