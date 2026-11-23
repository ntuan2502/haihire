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
    const rawOrgSources = [
      req.params?.organizationId,
      req.query?.organizationId,
      req.body?.organizationId,
    ].filter((val) => val !== undefined && val !== null && val !== "");

    if (rawOrgSources.length === 0 || !req.user) {
      return true;
    }

    if (rawOrgSources.some((val) => typeof val !== "string")) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: Conflicting or invalid organizationId parameter.",
      );
    }

    const uniqueOrgIds = Array.from(new Set(rawOrgSources as string[]));
    if (uniqueOrgIds.length > 1) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: Conflicting or invalid organizationId parameter.",
      );
    }

    const requestedOrgId = uniqueOrgIds[0];

    // Direct match with active tenant
    if (req.user.organizationId === requestedOrgId) {
      return true;
    }

    // Check persistent membership across organizations
    try {
      const userMemberships = await this.prisma.organizationMember.findMany({
        where: { userId: req.user.id },
        select: {
          organizationId: true,
          role: true,
          organization: { select: { id: true, ownerId: true } },
        },
      });

      const matchedMembership = userMemberships.find(
        (m) => m.organizationId === requestedOrgId,
      ) as
        | {
            organizationId: string;
            role?: string;
            organization?: {
              id?: string;
              ownerId?: string | null;
            } | null;
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
        (!resolvedRole || resolvedOwnerId === undefined) &&
        typeof (this.prisma.organizationMember as { findFirst?: unknown })
          ?.findFirst === "function"
      ) {
        const membershipDetail =
          (await this.prisma.organizationMember.findFirst({
            where: {
              userId: req.user.id,
              organizationId: requestedOrgId,
            },
            select: {
              role: true,
              organization: { select: { id: true, ownerId: true } },
            },
          })) as
            | {
                role?: string;
                organization?: {
                  id?: string;
                  ownerId?: string | null;
                } | null;
              }
            | null
            | undefined;
        resolvedRole = membershipDetail?.role ?? resolvedRole;
        if (membershipDetail?.organization?.ownerId !== undefined) {
          resolvedOwnerId = membershipDetail.organization.ownerId;
        }
      }

      req.user.organizationId = requestedOrgId;
      req.user.role = resolvedRole || "MEMBER";
      req.user.isOwner = Boolean(
        resolvedOwnerId && resolvedOwnerId === req.user.id,
      );
      req.user.organization = {
        id: requestedOrgId,
        ownerId: resolvedOwnerId ?? null,
      };
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
