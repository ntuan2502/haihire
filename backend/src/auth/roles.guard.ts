import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<("ADMIN" | "MEMBER")[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new AppForbiddenException(APP_ERROR_CODES.FORBIDDEN, "Unauthorized request.");
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

    return true;
  }
}
