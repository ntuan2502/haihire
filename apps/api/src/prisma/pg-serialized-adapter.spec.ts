import { describe, it, expect, vi } from "vitest";
import {
  wrapSerializedTransaction,
  type PrismaTransaction,
} from "./pg-serialized-adapter";

function createFakeTransaction() {
  let active = 0;
  let maxConcurrent = 0;
  const order: string[] = [];

  const track = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    order.push(`start:${label}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return await fn();
    } finally {
      order.push(`end:${label}`);
      active -= 1;
    }
  };

  const tx: PrismaTransaction = {
    provider: "postgres",
    adapterName: "@prisma/adapter-pg",
    options: { usePhantomQuery: false },
    queryRaw: vi.fn((query) =>
      track(`query:${query.sql}`, async () => ({
        columnNames: [],
        columnTypes: [],
        rows: [],
      })),
    ),
    executeRaw: vi.fn((query) => track(`exec:${query.sql}`, async () => 1)),
    commit: vi.fn(() => track("commit", async () => undefined)),
    rollback: vi.fn(() => track("rollback", async () => undefined)),
    createSavepoint: vi.fn((name) =>
      track(`sp:create:${name}`, async () => undefined),
    ),
    rollbackToSavepoint: vi.fn((name) =>
      track(`sp:rollback:${name}`, async () => undefined),
    ),
    releaseSavepoint: vi.fn((name) =>
      track(`sp:release:${name}`, async () => undefined),
    ),
  };

  return {
    tx,
    getMaxConcurrent: () => maxConcurrent,
    getOrder: () => order,
  };
}

describe("wrapSerializedTransaction", () => {
  it("executes concurrent Promise.all queries strictly sequentially on the underlying transaction", async () => {
    const fake = createFakeTransaction();
    const wrapped = wrapSerializedTransaction(fake.tx);

    const [r1, r2, r3] = await Promise.all([
      wrapped.queryRaw({ sql: "SELECT 1", args: [], argTypes: [] }),
      wrapped.executeRaw({ sql: "UPDATE t SET x=1", args: [], argTypes: [] }),
      wrapped.queryRaw({ sql: "SELECT 2", args: [], argTypes: [] }),
    ]);

    expect(r1.rows).toEqual([]);
    expect(r2).toBe(1);
    expect(r3.rows).toEqual([]);
    expect(fake.getMaxConcurrent()).toBe(1);
    expect(fake.getOrder()).toEqual([
      "start:query:SELECT 1",
      "end:query:SELECT 1",
      "start:exec:UPDATE t SET x=1",
      "end:exec:UPDATE t SET x=1",
      "start:query:SELECT 2",
      "end:query:SELECT 2",
    ]);
  });

  it("propagates query failure without wedging the queue so rollback still runs", async () => {
    const fake = createFakeTransaction();
    vi.mocked(fake.tx.queryRaw).mockRejectedValueOnce(new Error("SQL syntax"));
    const wrapped = wrapSerializedTransaction(fake.tx);

    const p1 = wrapped.queryRaw({ sql: "BAD SQL", args: [], argTypes: [] });
    const p2 = wrapped.rollback();

    await expect(p1).rejects.toThrow("SQL syntax");
    await expect(p2).resolves.toBeUndefined();
    expect(fake.tx.rollback).toHaveBeenCalledTimes(1);
  });

  it("waits for queued queries to complete before calling commit", async () => {
    const fake = createFakeTransaction();
    const wrapped = wrapSerializedTransaction(fake.tx);

    const q = wrapped.queryRaw({ sql: "SELECT 1", args: [], argTypes: [] });
    const c = wrapped.commit();
    await Promise.all([q, c]);

    expect(fake.getMaxConcurrent()).toBe(1);
    expect(fake.getOrder()).toEqual([
      "start:query:SELECT 1",
      "end:query:SELECT 1",
      "start:commit",
      "end:commit",
    ]);
  });
});
