import {
  Injectable,
  Inject,
  Optional,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  hasPermission,
  type Permission,
  Role,
  PERMISSIONS,
} from "@haihire/shared";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

interface CacheEntry {
  overrides: Map<string, boolean>;
  expiresAt: number;
}

export const PERMISSIONS_INVALIDATE_CHANNEL = "haihire:permissions:invalidate";
export const PERMISSIONS_CACHE_PREFIX = "haihire:permissions:";

@Injectable()
export class PermissionResolverService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PermissionResolverService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000; // 60 seconds
  private subscriberClient?: Redis;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redisClient?: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.redisClient) {
      try {
        this.subscriberClient = this.redisClient.duplicate();
        await this.subscriberClient.connect().catch(() => {});
        await this.subscriberClient
          .subscribe(PERMISSIONS_INVALIDATE_CHANNEL)
          .catch(() => {});

        this.subscriberClient.on(
          "message",
          (channel: string, message: string) => {
            if (channel === PERMISSIONS_INVALIDATE_CHANNEL) {
              try {
                const data = JSON.parse(message) as {
                  organizationId?: string;
                };
                if (data.organizationId) {
                  this.cache.delete(data.organizationId);
                } else {
                  this.cache.clear();
                }
              } catch {
                this.cache.clear();
              }
            }
          },
        );
      } catch (err) {
        this.logger.warn(
          `Failed to initialize Valkey pub/sub permission subscriber: ${err}`,
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriberClient) {
      try {
        await this.subscriberClient
          .unsubscribe(PERMISSIONS_INVALIDATE_CHANNEL)
          .catch(() => {});
        await this.subscriberClient.quit().catch(() => {});
      } catch {
        this.subscriberClient.disconnect();
      }
    }
  }

  /**
   * Resolves whether a specific role has a permission within an organization.
   * Priority:
   * 1. Dynamic organization override stored in OrganizationRolePermission.
   * 2. Fallback to hardcoded default matrix from @haihire/shared.
   */
  async resolvePermission(
    organizationId: string | null | undefined,
    role: Role,
    permission: Permission,
  ): Promise<boolean> {
    // ADMIN permissions are strictly immutable and always granted
    if (role === Role.ADMIN) {
      return true;
    }

    if (!organizationId) {
      return hasPermission(role, permission);
    }

    const overrides = await this.getOverrides(organizationId);
    const key = `${role}:${permission}`;

    if (overrides.has(key)) {
      return Boolean(overrides.get(key));
    }

    return hasPermission(role, permission);
  }

  /**
   * Resolves all active permissions granted to a specific role in an organization.
   */
  async resolveAllPermissions(
    organizationId: string | null | undefined,
    role: Role,
    isOwner = false,
  ): Promise<Permission[]> {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];
    if (isOwner || role === Role.ADMIN) {
      return allPermissions;
    }

    const overrides = organizationId
      ? await this.getOverrides(organizationId)
      : null;

    return allPermissions.filter((permission) => {
      const key = `${role}:${permission}`;
      if (overrides?.has(key)) {
        return Boolean(overrides.get(key));
      }
      return hasPermission(role, permission);
    });
  }

  /**
   * Retrieves and caches all permission overrides for a given organization.
   * L1: In-memory Map
   * L2: Distributed Redis/Valkey Cache
   * Fallback: Database query
   */
  async getOverrides(organizationId: string): Promise<Map<string, boolean>> {
    // L1: In-memory cache
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.overrides;
    }

    // L2: Redis cache
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get(
          `${PERMISSIONS_CACHE_PREFIX}${organizationId}`,
        );
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          const overrides = new Map<string, boolean>(Object.entries(parsed));
          this.cache.set(organizationId, {
            overrides,
            expiresAt: Date.now() + this.ttlMs,
          });
          return overrides;
        }
      } catch (err) {
        this.logger.warn(`Redis permission cache lookup failed: ${err}`);
      }
    }

    // Database lookup
    const records = await this.prisma.organizationRolePermission.findMany({
      where: { organizationId },
      select: {
        role: true,
        permission: true,
        granted: true,
      },
    });

    const overrides = new Map<string, boolean>();
    for (const r of records) {
      if (r.role === Role.ADMIN) {
        this.logger.warn(
          `[PermissionResolver] ADMIN role override detected for permission '${r.permission}' in organization '${organizationId}', ignoring.`,
        );
        continue;
      }
      overrides.set(`${r.role}:${r.permission}`, r.granted);
    }

    // Populate L1 cache
    this.cache.set(organizationId, {
      overrides,
      expiresAt: Date.now() + this.ttlMs,
    });

    // Populate L2 Redis cache
    if (this.redisClient) {
      try {
        const obj = Object.fromEntries(overrides);
        await this.redisClient.set(
          `${PERMISSIONS_CACHE_PREFIX}${organizationId}`,
          JSON.stringify(obj),
          "EX",
          60,
        );
      } catch (err) {
        this.logger.warn(`Redis permission cache write failed: ${err}`);
      }
    }

    return overrides;
  }

  /**
   * Invalidates cached permission overrides for an organization (or all organizations)
   * across L1 local memory, L2 Redis store, and publishes invalidation event to all replicas.
   */
  invalidateCache(organizationId?: string): void {
    if (organizationId) {
      this.cache.delete(organizationId);
    } else {
      this.cache.clear();
    }

    if (this.redisClient) {
      const payload = JSON.stringify({ organizationId });
      if (organizationId) {
        this.redisClient
          .del(`${PERMISSIONS_CACHE_PREFIX}${organizationId}`)
          .catch((err) =>
            this.logger.warn(`Failed to delete Redis permission key: ${err}`),
          );
      } else {
        void this.clearAllRedisPermissionKeys().catch((err) =>
          this.logger.warn(`Failed to clear Redis permission keys: ${err}`),
        );
      }

      this.redisClient
        .publish(PERMISSIONS_INVALIDATE_CHANNEL, payload)
        .catch((err) =>
          this.logger.warn(
            `Failed to publish permission cache invalidation: ${err}`,
          ),
        );
    }
  }

  private async clearAllRedisPermissionKeys(): Promise<void> {
    if (!this.redisClient) return;

    if (typeof this.redisClient.scan === "function") {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redisClient.scan(
          cursor,
          "MATCH",
          `${PERMISSIONS_CACHE_PREFIX}*`,
          "COUNT",
          100,
        );
        if (keys && keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== "0");
      return;
    }

    if (typeof this.redisClient.keys === "function") {
      const keys = await this.redisClient.keys(`${PERMISSIONS_CACHE_PREFIX}*`);
      if (keys && keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    }
  }
}
