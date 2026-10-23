import { Injectable, Inject, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hasPermission, type Permission, Role } from "@haihire/shared";

interface CacheEntry {
  overrides: Map<string, boolean>;
  expiresAt: number;
}

@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000; // 60 seconds

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

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
   * Retrieves and caches all permission overrides for a given organization.
   */
  async getOverrides(organizationId: string): Promise<Map<string, boolean>> {
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.overrides;
    }

    const records =
      await this.prisma.db.orm.public.OrganizationRolePermission.select(
        "role",
        "permission",
        "granted",
      )
        .where((p) => p.organizationId.eq(organizationId))
        .all();

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

    this.cache.set(organizationId, {
      overrides,
      expiresAt: Date.now() + this.ttlMs,
    });

    return overrides;
  }

  /**
   * Invalidates cached permission overrides for an organization (or all organizations).
   */
  invalidateCache(organizationId?: string): void {
    if (organizationId) {
      this.cache.delete(organizationId);
    } else {
      this.cache.clear();
    }
  }
}
