import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
import { toInstant } from "../../common/date.util";
import { AppBadRequestException } from "../../common/app-exception";
import {
  APP_ERROR_CODES,
  Role,
  PERMISSION_LIST,
  hasPermission,
  type Permission,
} from "@haihire/shared";
import type { RolePermissionItemDto } from "../dto/role-permissions.dto";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { EventsService } from "../../events/events.service";

export const CUSTOMIZABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.RECRUITER,
  Role.HIRING_MANAGER,
  Role.INTERVIEWER,
  Role.MEMBER,
];

export const CORE_ADMIN_PERMISSIONS: Permission[] = [
  "org:manage_roles",
  "org:manage_members",
  "org:delete",
  "org:transfer_ownership",
];

@Injectable()
export class OrganizationsRolesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  /**
   * Returns the complete matrix of 5 roles x all permissions for the specified organization.
   * Merges persistent overrides from DB on top of the shared default matrix.
   */
  async getRolePermissionsMatrix(
    organizationId: string,
  ): Promise<Record<Role, Record<Permission, boolean>>> {
    const matrix = {} as Record<Role, Record<Permission, boolean>>;

    for (const role of CUSTOMIZABLE_ROLES) {
      matrix[role] = {} as Record<Permission, boolean>;
      for (const permission of PERMISSION_LIST) {
        if (role === Role.ADMIN) {
          matrix[role][permission] = true;
        } else {
          matrix[role][permission] = hasPermission(role, permission);
        }
      }
    }

    const overrides = await this.prisma.organizationRolePermission.findMany({
      where: { organizationId },
      select: {
        role: true,
        permission: true,
        granted: true,
      },
    });

    for (const record of overrides) {
      const role = record.role as Role;
      if (role === Role.ADMIN) {
        continue;
      }
      const perm = record.permission as Permission;
      if (matrix[role] && perm in matrix[role]) {
        matrix[role][perm] = record.granted;
      }
    }

    return matrix;
  }

  /**
   * Updates permission overrides for a specific role within an organization.
   */
  async updateRolePermissions(
    organizationId: string,
    roleStr: string,
    updates: RolePermissionItemDto[],
    actorId?: string,
  ): Promise<{ role: Role; permissions: Record<Permission, boolean> }> {
    if (roleStr === Role.ADMIN) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
        "ADMIN role permissions are immutable and cannot be modified",
      );
    }

    if (!CUSTOMIZABLE_ROLES.includes(roleStr as Role)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        `Role '${roleStr}' cannot be customized. Supported roles: ${CUSTOMIZABLE_ROLES.join(", ")}`,
      );
    }

    const role = roleStr as Role;

    await runInTransaction(this.prisma, async (tx) => {
      for (const update of updates) {
        const existing = await tx.organizationRolePermission.findFirst({
          where: {
            organizationId,
            role,
            permission: update.permission,
          },
        });

        if (existing) {
          await tx.organizationRolePermission.update({
            where: {
              id: existing.id,
              organizationId,
            },
            data: {
              granted: update.granted,
              updatedAt: toInstant(),
            },
          });
        } else {
          await tx.organizationRolePermission.create({
            data: {
              id: crypto.randomUUID(),
              organizationId,
              role,
              permission: update.permission,
              granted: update.granted,
              updatedAt: toInstant(),
            },
          });
        }
      }
    });

    if (this.permissionResolver) {
      this.permissionResolver.invalidateCache(organizationId);
    }

    await this.auditLog?.logOrg(
      organizationId,
      actorId || null,
      "ROLE_PERMISSIONS_UPDATED",
      "ROLE_PERMISSIONS",
      { role: roleStr, permissions: updates },
    );

    this.eventsService?.emit({
      type: "PERMISSIONS_CHANGED",
      organizationId,
      role: roleStr,
      data: { action: "UPDATED" },
    });

    const fullMatrix = await this.getRolePermissionsMatrix(organizationId);

    return {
      role,
      permissions: fullMatrix[role],
    };
  }

  /**
   * Resets customized role permissions back to default for an entire organization or a specific role.
   * Deletes persistent override records from OrganizationRolePermission and clears the cache.
   * Modifying or resetting the ADMIN role is strictly forbidden.
   */
  async resetRolePermissions(
    organizationId: string,
    roleStr?: string,
    actorId?: string,
  ): Promise<{ deleted: number }> {
    if (roleStr) {
      if (roleStr === Role.ADMIN) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
          "ADMIN role permissions are immutable and cannot be reset",
        );
      }
      if (!CUSTOMIZABLE_ROLES.includes(roleStr as Role)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          `Role ${roleStr} cannot be customized`,
        );
      }
    }

    const targetRole = roleStr ? (roleStr as Role) : undefined;
    let deletedCount = 0;

    await runInTransaction(this.prisma, async (tx) => {
      const where: { organizationId: string; role?: Role } = { organizationId };
      if (targetRole) {
        where.role = targetRole;
      }

      const existing = await tx.organizationRolePermission.findMany({
        where: { ...where, organizationId },
      });
      const toDelete = existing.filter(
        (item: { role: Role; id: string }) => item.role !== Role.ADMIN,
      );
      deletedCount = toDelete.length;

      if (toDelete.length > 0) {
        await tx.organizationRolePermission.deleteMany({
          where: {
            id: { in: toDelete.map((item: { id: string }) => item.id) },
            organizationId,
          },
        });
      }
    });

    if (this.permissionResolver) {
      this.permissionResolver.invalidateCache(organizationId);
    }

    await this.auditLog?.logOrg(
      organizationId,
      actorId || null,
      "ROLE_PERMISSIONS_RESET",
      "ROLE_PERMISSIONS",
      { role: roleStr || "ALL" },
    );

    this.eventsService?.emit({
      type: "PERMISSIONS_CHANGED",
      organizationId,
      role: roleStr || "ALL",
      data: { action: "RESET" },
    });

    return { deleted: deletedCount };
  }
}
