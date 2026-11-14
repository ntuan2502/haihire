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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly als = new AsyncLocalStorage<PrismaService>();
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
    this.self = this;
  }

  /**
   * Alias for current transactional context or the base PrismaService instance.
   */
  get tx(): PrismaService {
    return this.als.getStore() ?? this.self;
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
    return this.$transaction(async (txClient) => {
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
            `Initialized default demo accounts: ${DEMO_ACCOUNTS.ADMIN.email} (ADMIN - Org Admin), ${DEMO_ACCOUNTS.MEMBER.email} (MEMBER - No Org)`,
          );
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Database connection pending or initializing...", msg);
    }
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
