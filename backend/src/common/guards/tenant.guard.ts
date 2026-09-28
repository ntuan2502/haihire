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
      const userMemberships =
        await this.prisma.db.orm.public.OrganizationMember.select(
          "organizationId",
        )
          .where((m) => m.userId.eq(req.user.id))
          .all();

      const isMember = userMemberships.some(
        (m) => m.organizationId === requestedOrgId,
      );
      if (!isMember) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN,
          "Access denied: You do not have permission to access resources in this organization.",
        );
      }
    } catch (err) {
      if (err instanceof AppForbiddenException) {
        throw err;
      }
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: Cross-tenant operation rejected.",
      );
    }

    return true;
  }
}
