import { Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDatabase, db } from "./db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants";
import { toInstant } from "../common/date.util";
import { backendEnv } from "../config/env";

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db = db;
  private readonly als = new AsyncLocalStorage<typeof db>();

  get client(): typeof db {
    return this.als.getStore() ?? this.db;
  }

  async transaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
    const existing = this.als.getStore();
    if (existing) {
      return fn(existing);
    }

    const client = this.db as unknown as {
      transaction?: (cb: (tx: typeof db) => Promise<T>) => Promise<T>;
    };
    if (typeof client.transaction === "function") {
      return client.transaction((tx) => this.als.run(tx, () => fn(tx)));
    }
    return this.als.run(this.db, () => fn(this.db));
  }

  async executeTx<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
    return this.transaction(fn);
  }

  async onModuleInit() {
    try {
      await connectDatabase();

      if (
        backendEnv.SEED_DEMO_ON_BOOT &&
        backendEnv.NODE_ENV !== "production"
      ) {
        const existingUser = await this.db.orm.public.User.select("id").first();
        if (!existingUser) {
          const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);
          const adminUserId = crypto.randomUUID();
          const adminOrgId = crypto.randomUUID();
          const memberUserId = crypto.randomUUID();

          await this.db.orm.public.Organization.upsert({
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
            conflictOn: { id: adminOrgId },
          });

          await this.db.orm.public.User.upsert({
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
            conflictOn: { email: DEMO_ACCOUNTS.ADMIN.email },
          });

          await this.db.orm.public.User.upsert({
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
            conflictOn: { email: DEMO_ACCOUNTS.MEMBER.email },
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
}

/**
 * Executes a callback within a database transaction, reusing an existing ALS context
 * or falling back gracefully to mock / plain DB runners across unit tests and production.
 */
export async function runInTransaction<T>(
  prisma: PrismaService,
  fn: (tx: PrismaService["db"]) => Promise<T>,
): Promise<T> {
  const p = prisma as unknown as {
    transaction?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
    executeTx?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
    db: PrismaService["db"];
  };
  if (typeof p.transaction === "function") {
    return p.transaction(fn);
  }
  if (typeof p.executeTx === "function") {
    return p.executeTx(fn);
  }
  return fn(p.db ?? prisma.db);
}
