import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  AppForbiddenException,
  AppUnauthorizedException,
} from "../common/app-exception";
import {
  APP_ERROR_CODES,
  hasPermission,
  type Permission,
  Role,
} from "@haihire/shared";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "./require-permission.decorator";
import { ROLES_KEY } from "./roles.decorator";
import { PermissionResolverService } from "./permission-resolver.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission && (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "Unauthorized request.",
      );
    }

    // Dynamic organization owner bypass (ADR-003):
    const isOwner = Boolean(
      user.isOwner || user.organization?.ownerId === user.id,
    );
    if (isOwner) {
      return true;
    }

    if (requiredPermission) {
      if (this.permissionResolver) {
        return this.permissionResolver
          .resolvePermission(user.organizationId, user.role, requiredPermission)
          .then((allowed) => {
            if (!allowed) {
              throw new AppForbiddenException(
                APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
                `Role '${user.role}' does not have the required permission '${requiredPermission}'.`,
              );
            }
            return true;
          });
      }

      const allowed = hasPermission(user.role, requiredPermission);
      if (!allowed) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
          `Role '${user.role}' does not have the required permission '${requiredPermission}'.`,
        );
      }
      return true;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
          "Insufficient role permissions to perform this action.",
        );
      }
      return true;
    }

    return true;
  }
}

export const RequirePermissionGuard = RolesGuard;
