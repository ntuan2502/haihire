import { Inject, Injectable } from "@nestjs/common";
import { AppForbiddenException } from "../common/app-exception";
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

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Unauthorized request.",
      );
    }

    // Special handling: OWNER role bypasses all checks with full privileges
    if (user.role === Role.OWNER || user.role === "OWNER") {
      return true;
    }

    if (requiredPermission) {
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
