import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionResolverService } from "./permission-resolver.service";
import type { PrismaService } from "../prisma/prisma.service";
import type Redis from "ioredis";
import { Role } from "@haihire/shared";

describe("PermissionResolverService (Dynamic DB Overrides & Fallback Matrix)", () => {
  let service: PermissionResolverService;
  let mockRecords: Array<{
    organizationId: string;
    role: string;
    permission: string;
    granted: boolean;
  }>;
  let findManyFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRecords = [];

    findManyFn = vi
      .fn()
      .mockImplementation(
        async ({ where }: { where?: { organizationId?: string } } = {}) => {
          const orgId = where?.organizationId;
          return mockRecords
            .filter((r) => !orgId || r.organizationId === orgId)
            .map((r) => ({
              role: r.role,
              permission: r.permission,
              granted: r.granted,
            }));
        },
      );

    const mockPrismaService = {
      organizationRolePermission: {
        findMany: findManyFn,
      },
    };

    service = new PermissionResolverService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it("1. Falls back to static permissions matrix when org has no custom overrides", async () => {
    // MEMBER does not have candidate:view by default
    const memberCanView = await service.resolvePermission(
      "org-1",
      Role.MEMBER,
      "candidate:view",
    );
    expect(memberCanView).toBe(false);

    // ADMIN has job:create by default
    const adminCanCreateJob = await service.resolvePermission(
      "org-1",
      Role.ADMIN,
      "job:create",
    );
    expect(adminCanCreateJob).toBe(true);
  });

  it("2. Falls back to static permissions matrix when organizationId is null or undefined", async () => {
    const res = await service.resolvePermission(null, Role.ADMIN, "org:delete");
    expect(res).toBe(true);
  });

  it("3. Returns true when organization explicitly overrides permission with granted=true", async () => {
    mockRecords.push({
      organizationId: "org-custom",
      role: Role.MEMBER,
      permission: "candidate:view",
      granted: true,
    });

    const result = await service.resolvePermission(
      "org-custom",
      Role.MEMBER,
      "candidate:view",
    );
    expect(result).toBe(true);
  });

  it("4. Returns false when organization explicitly overrides permission with granted=false (even if default is true)", async () => {
    // RECRUITER by default has job:create = true
    mockRecords.push({
      organizationId: "org-custom",
      role: Role.RECRUITER,
      permission: "job:create",
      granted: false,
    });

    const result = await service.resolvePermission(
      "org-custom",
      Role.RECRUITER,
      "job:create",
    );
    expect(result).toBe(false);
  });

  it("5. Caches queries in memory to avoid repetitive DB calls and respects invalidateCache", async () => {
    // First query executes DB fetch
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(findManyFn).toHaveBeenCalledTimes(1);

    // Second query uses cache (no DB call)
    await service.resolvePermission(
      "org-cached",
      Role.MEMBER,
      "candidate:view",
    );
    expect(findManyFn).toHaveBeenCalledTimes(1);

    // Invalidate cache for org-cached
    service.invalidateCache("org-cached");

    // Next query hits DB again
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(findManyFn).toHaveBeenCalledTimes(2);

    // Invalidate all cache
    service.invalidateCache();
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(findManyFn).toHaveBeenCalledTimes(3);
  });

  it("6. ADMIN role is strictly immutable and always returns true even if DB has granted=false", async () => {
    mockRecords.push({
      organizationId: "org-admin-test",
      role: Role.ADMIN,
      permission: "job:create",
      granted: false,
    });
    mockRecords.push({
      organizationId: "org-admin-test",
      role: Role.ADMIN,
      permission: "candidate:delete",
      granted: false,
    });

    const canCreate = await service.resolvePermission(
      "org-admin-test",
      Role.ADMIN,
      "job:create",
    );
    const canDelete = await service.resolvePermission(
      "org-admin-test",
      Role.ADMIN,
      "candidate:delete",
    );

    expect(canCreate).toBe(true);
    expect(canDelete).toBe(true);
    expect(findManyFn).not.toHaveBeenCalled();
  });

  it("7. ADMIN role is not affected by cache invalidation", async () => {
    service.invalidateCache("org-admin-test");
    const result = await service.resolvePermission(
      "org-admin-test",
      Role.ADMIN,
      "candidate:delete",
    );
    expect(result).toBe(true);
    expect(findManyFn).not.toHaveBeenCalled();
  });

  it("8. Other roles (RECRUITER, MEMBER) still use DB overrides normally and ignore ADMIN records in getOverrides", async () => {
    mockRecords.push({
      organizationId: "org-mixed",
      role: Role.ADMIN,
      permission: "job:view",
      granted: false,
    });
    mockRecords.push({
      organizationId: "org-mixed",
      role: Role.RECRUITER,
      permission: "job:delete",
      granted: true,
    });
    mockRecords.push({
      organizationId: "org-mixed",
      role: Role.MEMBER,
      permission: "candidate:view",
      granted: true,
    });

    const recruiterDelete = await service.resolvePermission(
      "org-mixed",
      Role.RECRUITER,
      "job:delete",
    );
    const memberCandidate = await service.resolvePermission(
      "org-mixed",
      Role.MEMBER,
      "candidate:view",
    );
    const adminView = await service.resolvePermission(
      "org-mixed",
      Role.ADMIN,
      "job:view",
    );

    expect(recruiterDelete).toBe(true);
    expect(memberCandidate).toBe(true);
    expect(adminView).toBe(true);

    const overrides = await service.getOverrides("org-mixed");
    expect(overrides.has("ADMIN:job:view")).toBe(false);
    expect(overrides.get("RECRUITER:job:delete")).toBe(true);
    expect(overrides.get("MEMBER:candidate:view")).toBe(true);
  });

  describe("Redis L2 Cache and Pub/Sub Invalidation", () => {
    interface MockRedisClient {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      del: ReturnType<typeof vi.fn>;
      keys: ReturnType<typeof vi.fn>;
      publish: ReturnType<typeof vi.fn>;
      duplicate: ReturnType<typeof vi.fn>;
    }
    interface MockSubscriberClient {
      connect: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
      unsubscribe: ReturnType<typeof vi.fn>;
      quit: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
    }

    let mockRedis: MockRedisClient;
    let mockSubscriber: MockSubscriberClient;
    let messageHandler:
      ((channel: string, message: string) => void) | undefined;
    let redisService: PermissionResolverService;

    beforeEach(async () => {
      mockSubscriber = {
        connect: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue("OK"),
        disconnect: vi.fn(),
        on: vi
          .fn()
          .mockImplementation(
            (event: string, cb: (channel: string, msg: string) => void) => {
              if (event === "message") {
                messageHandler = cb;
              }
            },
          ),
      };

      mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
        keys: vi.fn().mockResolvedValue([]),
        publish: vi.fn().mockResolvedValue(1),
        duplicate: vi.fn().mockReturnValue(mockSubscriber),
      };

      const mockPrismaService = {
        organizationRolePermission: {
          findMany: findManyFn,
        },
      };

      redisService = new PermissionResolverService(
        mockPrismaService as unknown as PrismaService,
        mockRedis as unknown as Redis,
      );
      await redisService.onModuleInit();
    });

    it("9. Reads from Redis L2 cache if L1 memory misses", async () => {
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({
          "MEMBER:candidate:view": true,
        }),
      );

      const allowed = await redisService.resolvePermission(
        "org-redis-hit",
        Role.MEMBER,
        "candidate:view",
      );

      expect(allowed).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        "haihire:permissions:org-redis-hit",
      );
      expect(findManyFn).not.toHaveBeenCalled();
    });

    it("10. Writes to Redis cache with 60s TTL on DB fetch", async () => {
      mockRecords.push({
        organizationId: "org-redis-write",
        role: Role.MEMBER,
        permission: "candidate:view",
        granted: true,
      });

      await redisService.resolvePermission(
        "org-redis-write",
        Role.MEMBER,
        "candidate:view",
      );

      expect(findManyFn).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "haihire:permissions:org-redis-write",
        JSON.stringify({ "MEMBER:candidate:view": true }),
        "EX",
        60,
      );
    });

    it("11. InvalidateCache deletes Redis key and publishes to invalidate channel", () => {
      redisService.invalidateCache("org-redis-inv");

      expect(mockRedis.del).toHaveBeenCalledWith(
        "haihire:permissions:org-redis-inv",
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        "haihire:permissions:invalidate",
        JSON.stringify({ organizationId: "org-redis-inv" }),
      );
    });

    it("12. Clears local L1 cache when receiving pub/sub invalidation message", async () => {
      // First, populate L1 cache
      mockRecords.push({
        organizationId: "org-pubsub",
        role: Role.MEMBER,
        permission: "job:view",
        granted: true,
      });
      await redisService.resolvePermission(
        "org-pubsub",
        Role.MEMBER,
        "job:view",
      );
      expect(findManyFn).toHaveBeenCalledTimes(1);

      // Trigger pub/sub message as if another replica published it
      expect(messageHandler).toBeDefined();
      messageHandler!(
        "haihire:permissions:invalidate",
        JSON.stringify({ organizationId: "org-pubsub" }),
      );

      // Next query should miss L1 and hit DB again
      await redisService.resolvePermission(
        "org-pubsub",
        Role.MEMBER,
        "job:view",
      );
      expect(findManyFn).toHaveBeenCalledTimes(2);
    });
  });
});
