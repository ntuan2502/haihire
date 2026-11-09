import { Injectable } from "@nestjs/common";
import type { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants";
import { toInstant } from "../common/date.util";
import { backendEnv } from "../config/env";

const connectionString = backendEnv.DATABASE_URL;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly als = new AsyncLocalStorage<PrismaService>();
  private readonly self: PrismaService;

  constructor() {
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
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
      return this.als.run(txClient as PrismaService, () => fn(txClient as PrismaService));
    }) as Promise<T>;
  }

  async executeTx<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    return this.transaction(fn);
  }

  async onModuleInit() {
    try {
      await this.$connect();

      if (
        backendEnv.SEED_DEMO_ON_BOOT &&
        backendEnv.NODE_ENV !== "production"
      ) {
        const existingUser = await this.user.findFirst({ select: { id: true } });
        if (!existingUser) {
          const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);
          const adminUserId = crypto.randomUUID();
          const adminOrgId = crypto.randomUUID();
          const memberUserId = crypto.randomUUID();

          await this.organization.upsert({
            where: { id: adminOrgId },
            create: {
              id: adminOrgId,
              name: "Admin",
              slug: "admin",
              ownerId: adminUserId,
              updatedAt: toInstant(),
            },
            update: {
              name: "Admin",
              slug: "admin",
              ownerId: adminUserId,
              updatedAt: toInstant(),
            },
          });

          await this.user.upsert({
            where: { email: DEMO_ACCOUNTS.ADMIN.email },
            create: {
              id: adminUserId,
              email: DEMO_ACCOUNTS.ADMIN.email,
              name: "Demo Admin",
              password: hashedPassword,
              role: "ADMIN",
              organizationId: adminOrgId,
              updatedAt: toInstant(),
            },
            update: {
              email: DEMO_ACCOUNTS.ADMIN.email,
              name: "Demo Admin",
              password: hashedPassword,
              role: "ADMIN",
              organizationId: adminOrgId,
              updatedAt: toInstant(),
            },
          });

          await this.user.upsert({
            where: { email: DEMO_ACCOUNTS.MEMBER.email },
            create: {
              id: memberUserId,
              email: DEMO_ACCOUNTS.MEMBER.email,
              name: "Demo Member",
              password: hashedPassword,
              role: "MEMBER",
              updatedAt: toInstant(),
            },
            update: {
              email: DEMO_ACCOUNTS.MEMBER.email,
              name: "Demo Member",
              password: hashedPassword,
              role: "MEMBER",
              updatedAt: toInstant(),
            },
          });
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
  const p = prisma as unknown as { transaction?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T>; executeTx?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T>; $transaction?: (fn: (tx: PrismaService) => Promise<T>) => Promise<T> };
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
