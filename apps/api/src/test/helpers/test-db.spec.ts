import { describe, expect, it, vi } from "vitest";
import { cleanDatabase } from "./test-db";
import {
  extractDatabaseName,
  isSafeTestDatabaseName,
  resolveTestDatabaseUrl,
} from "./test-db-url";

describe("test-db isolation & safety guard", () => {
  it("rewrites dev DATABASE_URL to haihire_test_db while preserving port & params", () => {
    const devUrl =
      "postgresql://haihire_user:haihire_password@localhost:5432/haihire_db?schema=public";
    const resolved = resolveTestDatabaseUrl(devUrl, { postgresPort: "15432" });

    expect(resolved).toBe(
      "postgresql://haihire_user:haihire_password@localhost:15432/haihire_test_db?schema=public",
    );
    expect(extractDatabaseName(resolved)).toBe("haihire_test_db");
    expect(isSafeTestDatabaseName("haihire_test_db")).toBe(true);
    expect(isSafeTestDatabaseName("haihire_db")).toBe(false);
  });

  it("preserves CI URL that already targets a test database and rejects unsafe overrideTestUrl", () => {
    const ciUrl =
      "postgresql://haihire_test:haihire_test_password@localhost:5432/haihire_test_db?schema=public";
    expect(resolveTestDatabaseUrl(ciUrl)).toBe(ciUrl);

    expect(() =>
      resolveTestDatabaseUrl(ciUrl, {
        overrideTestUrl:
          "postgresql://haihire_user:pass@localhost:15432/haihire_db?schema=public",
      }),
    ).toThrow(/must contain "test"/i);
  });

  it("refuses to clean a non-test database and runs ZERO destructive SQL", async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue([{ db: "haihire_db" }]);
    const executeRawUnsafe = vi.fn();
    const transaction = vi.fn();

    const fakePrisma = {
      $queryRawUnsafe: queryRawUnsafe,
      $executeRawUnsafe: executeRawUnsafe,
      $transaction: transaction,
    };

    await expect(cleanDatabase(fakePrisma as never)).rejects.toThrow(
      /REFUSING TO CLEAN NON-TEST DATABASE "haihire_db"/,
    );
    expect(executeRawUnsafe).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("dynamically truncates all public tables except _prisma_migrations inside haihire_test_db", async () => {
    const executeCalls: string[] = [];
    const queryRawUnsafe = vi
      .fn()
      .mockResolvedValueOnce([{ db: "haihire_test_db" }])
      .mockResolvedValueOnce([
        { tablename: "organization" },
        { tablename: "organization_ai_connection" },
        { tablename: "user" },
      ]);

    const txClient = {
      $executeRawUnsafe: vi.fn(async (sql: string) => {
        executeCalls.push(sql);
        return 0;
      }),
    };

    const fakePrisma = {
      $queryRawUnsafe: queryRawUnsafe,
      $transaction: vi.fn(
        async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
      ),
    };

    await cleanDatabase(fakePrisma as never);

    expect(executeCalls).toEqual([
      "SELECT set_config('app.bypass_rls', 'on', true);",
      'TRUNCATE TABLE "public"."organization", "public"."organization_ai_connection", "public"."user" RESTART IDENTITY CASCADE;',
    ]);
  });
});
