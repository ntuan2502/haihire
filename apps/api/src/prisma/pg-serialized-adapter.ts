import type { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Pool } from "pg";

export type PrismaDriverAdapterFactory = NonNullable<
  NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["adapter"]
>;
export type PrismaDriverAdapter = Awaited<
  ReturnType<PrismaDriverAdapterFactory["connect"]>
>;
export type PrismaTransaction = Awaited<
  ReturnType<PrismaDriverAdapter["startTransaction"]>
>;

const SERIALIZED_TX_METHODS = new Set([
  "queryRaw",
  "executeRaw",
  "commit",
  "rollback",
  "createSavepoint",
  "rollbackToSavepoint",
  "releaseSavepoint",
]);

/**
 * Wraps a Prisma transaction via `Proxy` so all query and transaction lifecycle
 * calls execute strictly sequentially through a FIFO promise queue while forwarding
 * any additional properties or future Prisma methods transparently.
 */
export function wrapSerializedTransaction<T extends PrismaTransaction>(
  tx: T,
): T {
  let queue: Promise<void> = Promise.resolve();
  const enqueue = <R>(op: () => Promise<R>): Promise<R> => {
    const next = queue.then(op, op);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  return new Proxy(tx, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") {
        return value;
      }
      if (typeof prop === "string" && SERIALIZED_TX_METHODS.has(prop)) {
        return (...args: unknown[]) =>
          enqueue(() =>
            (value as (...a: unknown[]) => Promise<unknown>).apply(
              target,
              args,
            ),
          );
      }
      return value.bind(target);
    },
  });
}

function wrapDriverAdapter<T extends PrismaDriverAdapter>(adapter: T): T {
  return new Proxy(adapter, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") {
        return value;
      }
      if (prop === "startTransaction") {
        return async (...args: unknown[]) => {
          const tx = await (
            value as (...a: unknown[]) => Promise<PrismaTransaction>
          ).apply(target, args);
          return wrapSerializedTransaction(tx);
        };
      }
      return value.bind(target);
    },
  });
}

/**
 * Creates a `PrismaPg` driver adapter factory whose transactions serialize queries
 * sequentially over the underlying `pg.PoolClient`.
 */
export function createSerializedPgAdapter(pool: Pool): PrismaPg {
  const baseFactory = new PrismaPg(pool);
  return new Proxy(baseFactory, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") {
        return value;
      }
      if (prop === "connect" || prop === "connectToShadowDb") {
        return async (...args: unknown[]) => {
          const adapter = await (
            value as (...a: unknown[]) => Promise<PrismaDriverAdapter>
          ).apply(target, args);
          return wrapDriverAdapter(adapter);
        };
      }
      return value.bind(target);
    },
  });
}
