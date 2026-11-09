import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService, runInTransaction } from "./prisma.service";

describe("PrismaService transaction context", () => {
  let prisma: PrismaService;
  let transactions: PrismaService[];
  let baseClient: PrismaService;

  beforeEach(() => {
    prisma = new PrismaService();
    baseClient = prisma.tx;
    transactions = [];
    // Stub the database boundary; transaction(), tx, and ALS remain the real implementation.
    vi.spyOn(prisma, "$transaction").mockImplementation((async (callback: (tx: PrismaService) => Promise<unknown>) => {
      const tx = { marker: Symbol("transaction") } as unknown as PrismaService;
      transactions.push(tx);
      return callback(tx);
    }) as unknown as PrismaService["$transaction"]);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("uses the base client outside transactions", () => {
    expect(prisma.tx === baseClient).toBe(true);
    expect(baseClient.user === prisma.user).toBe(true);
    expect(transactions).toHaveLength(0);
  });

  it("reuses one transaction across nested helpers and asynchronous continuations", async () => {
    const result = await runInTransaction(prisma, async (outer) => {
      expect(prisma.tx).toBe(outer);
      await Promise.resolve();
      return prisma.executeTx(async (inner) => {
        expect(inner).toBe(outer);
        expect(prisma.tx).toBe(outer);
        return "committed";
      });
    });
    expect(result).toBe("committed");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tx === baseClient).toBe(true);
  });

  it("keeps simultaneous asynchronous transactions isolated", async () => {
    let entered = 0;
    let release!: () => void;
    const bothEntered = new Promise<void>((resolve) => { release = resolve; });
    const branch = () => prisma.transaction(async (tx) => {
      if (++entered === 2) release();
      await bothEntered;
      expect(prisma.tx).toBe(tx);
      await prisma.transaction(async (nested) => { expect(nested).toBe(tx); });
      return tx;
    });
    const [first, second] = await Promise.all([branch(), branch()]);
    expect(first).not.toBe(second);
    expect(transactions).toHaveLength(2);
    expect(prisma.tx === baseClient).toBe(true);
  });

  it("propagates failure and clears context before the next transaction", async () => {
    const failure = new Error("write failed");
    await expect(prisma.transaction(async () => {
      await prisma.transaction(async () => { throw failure; });
    })).rejects.toBe(failure);
    expect(prisma.tx === baseClient).toBe(true);
    await prisma.transaction(async (tx) => {
      expect(tx).not.toBe(transactions[0]);
      expect(prisma.tx).toBe(tx);
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.tx === baseClient).toBe(true);
  });
});
