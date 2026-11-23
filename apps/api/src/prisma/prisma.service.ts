import { Injectable } from "@nestjs/common";
import type { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEMO_ACCOUNTS } from "../auth/constants";
import { backendEnv } from "../config/env";
import { ensureDefaultDemoAccounts } from "./demo-seed.util";

const connectionString = backendEnv.DATABASE_URL;

const PROXIED_PRISMA_DELEGATES = new Set<string>([
  "organization",
  "user",
  "organizationMember",
  "organizationRolePermission",
  "inviteLink",
  "job",
  "candidate",
  "application",
  "interview",
  "emailTemplate",
  "emailFlowConfig",
  "emailSetting",
  "emailLog",
  "activityLog",
  "candidateDocument",
  "trackingLink",
  "trackingClick",
  "organizationWebhookSetting",
  "organizationAuditLog",
  "platformAuditLog",
  "applicationNote",
  "candidateNote",
  "pipelineStage",
  "storedFile",
  "outboxEvent",
  "notificationPreference",
  "notification",
  "$queryRaw",
  "$executeRaw",
  "$queryRawUnsafe",
  "$executeRawUnsafe",
]);

export interface TenantRlsContext {
  tenantOrgId?: string | null;
  bypassRls?: boolean;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly als = new AsyncLocalStorage<PrismaService>();
  private readonly tenantContextAls = new AsyncLocalStorage<TenantRlsContext>();
  private readonly self: PrismaService;

  constructor() {
    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
    const proxied = new Proxy(this, {
      get: (target, prop, receiver) => {
        if (typeof prop === "string" && PROXIED_PRISMA_DELEGATES.has(prop)) {
          const txClient = target.als.getStore();
          if (txClient && txClient !== target && prop in txClient) {
            const val = Reflect.get(txClient, prop, txClient);
            return typeof val === "function" ? val.bind(txClient) : val;
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    this.self = proxied;
    return proxied;
  }

  /**
   * Alias for current transactional context or the base PrismaService instance.
   */
  get tx(): PrismaService {
    return this.als.getStore() ?? this.self;
  }

  /**
   * Binds tenant RLS metadata into AsyncLocalStorage for the duration of `fn`.
   */
  runWithTenantContext<T>(
    tenantOrgId: string | null | undefined,
    fn: () => T,
    options?: { bypassRls?: boolean },
  ): T {
    return this.tenantContextAls.run(
      {
        tenantOrgId: tenantOrgId ?? null,
        bypassRls: options?.bypassRls ?? false,
      },
      fn,
    );
  }

  /**
   * Returns the active AsyncLocalStorage tenant RLS context if present.
   */
  getCurrentTenantContext(): TenantRlsContext | undefined {
    return this.tenantContextAls.getStore();
  }

  /**
   * Runs a callback inside a PostgreSQL transaction with Row-Level Security enforced
   * under the non-superuser `haihire_rls_user` role for the given tenant.
   */
  async withTenantRls<T>(
    tenantOrgId: string,
    fn: (tx: PrismaService) => Promise<T>,
  ): Promise<T> {
    if (!tenantOrgId) {
      throw new Error("withTenantRls requires a non-empty tenantOrgId.");
    }
    return this.$transaction(async (txClient) => {
      await txClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantOrgId}, true), set_config('app.bypass_rls', 'off', true)`;
      await txClient.$executeRawUnsafe("SET LOCAL ROLE haihire_rls_user;");
      return this.tenantContextAls.run({ tenantOrgId, bypassRls: false }, () =>
        this.als.run(txClient as PrismaService, () =>
          fn(txClient as PrismaService),
        ),
      );
    }) as Promise<T>;
  }

  /**
   * Runs a system/background callback inside a PostgreSQL transaction under
   * `haihire_rls_user` with explicit transaction-local `app.bypass_rls = 'on'`.
   */
  async withSystemRlsBypass<T>(
    fn: (tx: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (txClient) => {
      await txClient.$executeRaw`SELECT set_config('app.current_tenant_id', '', true), set_config('app.bypass_rls', 'on', true)`;
      await txClient.$executeRawUnsafe("SET LOCAL ROLE haihire_rls_user;");
      return this.tenantContextAls.run(
        { tenantOrgId: null, bypassRls: true },
        () =>
          this.als.run(txClient as PrismaService, () =>
            fn(txClient as PrismaService),
          ),
      );
    }) as Promise<T>;
  }

  /**
   * Executes a callback within a database transaction, automatically propagating
   * AsyncLocalStorage context so nested transactional calls reuse the same transaction.
   */
  async transaction<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    const existing = this.als.getStore();
    if (existing) {
      return fn(existing);
    }
    const tenantCtx = this.tenantContextAls.getStore();
    return this.$transaction(async (txClient) => {
      if (tenantCtx?.tenantOrgId || tenantCtx?.bypassRls) {
        const orgVal = tenantCtx.tenantOrgId ?? "";
        const bypassVal = tenantCtx.bypassRls ? "on" : "off";
        await txClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgVal}, true), set_config('app.bypass_rls', ${bypassVal}, true)`;
        if (
          typeof (txClient as { $executeRawUnsafe?: unknown })
            .$executeRawUnsafe === "function"
        ) {
          await txClient.$executeRawUnsafe("SET LOCAL ROLE haihire_rls_user;");
        }
      }
      return this.als.run(txClient as PrismaService, () =>
        fn(txClient as PrismaService),
      );
    }) as Promise<T>;
  }

  async executeTx<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    return this.transaction(fn);
  }

  async onModuleInit() {
    try {
      await this.$connect();

      try {
        await this.$executeRawUnsafe(
          "CREATE EXTENSION IF NOT EXISTS unaccent;",
        );
      } catch {
        // Non-superuser or non-Postgres environments may ignore extension creation; search falls back in JS.
      }

      if (
        backendEnv.SEED_DEMO_ON_BOOT &&
        backendEnv.NODE_ENV !== "production"
      ) {
        const existingUser = await this.user.findFirst({
          select: { id: true },
        });
        if (!existingUser) {
          await ensureDefaultDemoAccounts(this);
          console.log(
            `Initialized default demo account: ${DEMO_ACCOUNTS.ADMIN.email} (ADMIN - demo-1)`,
          );
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Database connection pending or initializing...", msg);
    }
  }

  /**
   * Returns current connection pool statistics from pg.Pool.
   */
  getPoolStats() {
    return {
      totalCount: this.pool?.totalCount ?? 0,
      idleCount: this.pool?.idleCount ?? 0,
      waitingCount: this.pool?.waitingCount ?? 0,
      activeCount: Math.max(
        0,
        (this.pool?.totalCount ?? 0) - (this.pool?.idleCount ?? 0),
      ),
    };
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool?.end();
  }
}

/**
 * Executes a callback within a database transaction, reusing an existing ALS context
 * or falling back gracefully to mock / plain DB runners across unit tests and production.
 */
export async function runInTransaction<T>(
  prisma: PrismaService,
  fn: (tx: PrismaService) => Promise<T>,
): Promise<T> {
  const p = prisma as unknown as {
    transaction?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T>;
    executeTx?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T>;
    $transaction?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T>;
  };
  if (typeof p.transaction === "function") {
    return p.transaction(fn);
  }
  if (typeof p.executeTx === "function") {
    return p.executeTx(fn);
  }
  if (typeof p.$transaction === "function") {
    return p.$transaction(fn);
  }
  return fn(prisma);
}
