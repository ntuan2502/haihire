import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@haihire/shared";

export const PERMISSION_KEY = "permission";

/**
 * Decorator to enforce permission-based access control on routes.
 * Evaluated by RolesGuard (or RequirePermissionGuard).
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
