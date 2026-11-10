import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../prisma/prisma.service";
import { queryEmailLogs } from "./email-log-query";

describe("queryEmailLogs", () => {
  it("paginates and filters in the database while keeping the tenant scope in count", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "log-21" }]);
    const count = vi.fn().mockResolvedValue(42);
    const prisma = {
      emailLog: { findMany, count },
    } as unknown as PrismaService;

    const result = await queryEmailLogs(
      prisma,
      { scope: "ORGANIZATION", organizationId: "org-a" },
      { page: 2, limit: 20, search: " Alice ", status: "FAILED" },
    );

    const where = {
      scope: "ORGANIZATION",
      organizationId: "org-a",
      status: { in: ["FAILED"] },
      OR: [
        { recipientName: { contains: "Alice", mode: "insensitive" } },
        { recipientEmail: { contains: "Alice", mode: "insensitive" } },
        { subject: { contains: "Alice", mode: "insensitive" } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith({
      where,
      skip: 20,
      take: 20,
      orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    });
    expect(count).toHaveBeenCalledWith({ where });
    expect(result).toEqual({
      data: [{ id: "log-21" }],
      total: 42,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });
});
