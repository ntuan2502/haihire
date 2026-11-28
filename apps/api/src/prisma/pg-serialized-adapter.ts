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

/**
 * Wraps a Prisma transaction so all queries and transaction lifecycle calls execute
 * strictly sequentially through a FIFO promise queue, preventing pg@9.0's deprecated
 * concurrent `client.query()` calls on a single transaction `PoolClient`.
 */
export function wrapSerializedTransaction(
  tx: PrismaTransaction,
): PrismaTransaction {
  let queue: Promise<void> = Promise.resolve();
  const enqueue = <T>(op: () => Promise<T>): Promise<T> => {
    const next = queue.then(op, op);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const { createSavepoint, rollbackToSavepoint, releaseSavepoint } = tx;

  return {
    provider: tx.provider,
    adapterName: tx.adapterName,
    options: tx.options,
    queryRaw: (query) => enqueue(() => tx.queryRaw(query)),
    executeRaw: (query) => enqueue(() => tx.executeRaw(query)),
    commit: () => enqueue(() => tx.commit()),
    rollback: () => enqueue(() => tx.rollback()),
    ...(createSavepoint
      ? {
          createSavepoint: (name: string) =>
            enqueue(() => createSavepoint.call(tx, name)),
        }
      : {}),
    ...(rollbackToSavepoint
      ? {
          rollbackToSavepoint: (name: string) =>
            enqueue(() => rollbackToSavepoint.call(tx, name)),
        }
      : {}),
    ...(releaseSavepoint
      ? {
          releaseSavepoint: (name: string) =>
            enqueue(() => releaseSavepoint.call(tx, name)),
        }
      : {}),
  };
}

function wrapDriverAdapter(adapter: PrismaDriverAdapter): PrismaDriverAdapter {
  const { getConnectionInfo } = adapter;
  return {
    provider: adapter.provider,
    adapterName: adapter.adapterName,
    queryRaw: (query) => adapter.queryRaw(query),
    executeRaw: (query) => adapter.executeRaw(query),
    executeScript: (script) => adapter.executeScript(script),
    startTransaction: async (isolationLevel) => {
      const tx = await adapter.startTransaction(isolationLevel);
      return wrapSerializedTransaction(tx);
    },
    ...(getConnectionInfo
      ? { getConnectionInfo: () => getConnectionInfo.call(adapter) }
      : {}),
    dispose: () => adapter.dispose(),
  };
}

/**
 * Creates a `PrismaPg` driver adapter factory whose transactions serialize queries
 * sequentially over the underlying `pg.PoolClient`.
 */
export function createSerializedPgAdapter(
  pool: Pool,
): PrismaDriverAdapterFactory & {
  connectToShadowDb(): Promise<PrismaDriverAdapter>;
} {
  const baseFactory = new PrismaPg(pool);
  return {
    provider: baseFactory.provider,
    adapterName: baseFactory.adapterName,
    connect: async () => wrapDriverAdapter(await baseFactory.connect()),
    connectToShadowDb: async () =>
      wrapDriverAdapter(await baseFactory.connectToShadowDb()),
  };
}
