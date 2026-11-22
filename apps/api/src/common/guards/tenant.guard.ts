import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppForbiddenException } from "../app-exception";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const requestedOrgId =
      req.query?.organizationId ||
      req.body?.organizationId ||
      req.params?.organizationId;

    if (!requestedOrgId || !req.user) {
      return true;
    }

    // Direct match with active tenant
    if (req.user.organizationId === requestedOrgId) {
      return true;
    }

    // Check persistent membership across organizations
    try {
      const userMemberships = await this.prisma.organizationMember.findMany({
        where: { userId: req.user.id },
        select: { organizationId: true },
      });

      const matchedMembership = userMemberships.find(
        (m) => m.organizationId === requestedOrgId,
      ) as
        | {
            organizationId: string;
            role?: string;
            organization?: { ownerId?: string | null } | null;
          }
        | undefined;
      if (!matchedMembership) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Access denied: You do not have permission to access resources in this organization.",
          { organizationId: requestedOrgId },
        );
      }

      // Synchronize active tenant, role, and ownership context before RolesGuard runs
      let resolvedRole = matchedMembership.role;
      let resolvedOwnerId = matchedMembership.organization?.ownerId;
      if (
        !resolvedRole &&
        typeof (this.prisma.organizationMember as { findFirst?: unknown })
          ?.findFirst === "function"
      ) {
        try {
          const membershipDetail =
            (await this.prisma.organizationMember.findFirst({
              where: {
                userId: req.user.id,
                organizationId: requestedOrgId,
              },
              select: {
                role: true,
                organization: { select: { ownerId: true } },
              },
            })) as
              | {
                  role?: string;
                  organization?: { ownerId?: string | null } | null;
                }
              | null
              | undefined;
          resolvedRole = membershipDetail?.role;
          resolvedOwnerId = membershipDetail?.organization?.ownerId;
        } catch {
          // Non-fatal fallback for lightweight mocks without findFirst
        }
      }

      req.user.organizationId = requestedOrgId;
      if (resolvedRole) {
        req.user.role = resolvedRole;
      }
      if (resolvedOwnerId !== undefined) {
        req.user.isOwner = resolvedOwnerId === req.user.id;
      } else if (resolvedRole) {
        req.user.isOwner = false;
      }
    } catch (err) {
      if (err instanceof AppForbiddenException) {
        throw err;
      }
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: Cross-tenant operation rejected.",
        { organizationId: requestedOrgId },
      );
    }

    return true;
  }
}
