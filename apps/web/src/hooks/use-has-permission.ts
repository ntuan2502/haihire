import { useAuth } from "@/context/auth-context";
import { hasPermission, type Permission, type Role } from "@haihire/shared";
import {
  useRolePermissionsMatrix,
  useMyPermissions,
} from "./use-organization-queries";

/**
 * Hook to verify if the currently authenticated user possesses a given permission.
 * Automatically resolves dynamic isOwner bypass, dynamic organization role permissions,
 * and role-based permissions fallback.
 */
export function useHasPermission(permission: Permission): boolean {
  const { user, isOwner } = useAuth();
  const effectiveIsOwner = Boolean(
    isOwner ||
    user?.isOwner ||
    (user?.organization?.ownerId && user.organization.ownerId === user.id),
  );

  const isAdminOrOwner = effectiveIsOwner || user?.role === "ADMIN";

  let matrix: Record<Role, Record<Permission, boolean>> | undefined;
  let myPermissions: { permissions: Permission[] } | undefined;

  try {
    const matrixQuery = useRolePermissionsMatrix({
      enabled: Boolean(user && isAdminOrOwner),
    });
    matrix = matrixQuery?.data;
  } catch {
    // Fallback when rendered outside QueryClientProvider (e.g. isolated test environments)
    matrix = undefined;
  }

  try {
    const myPermsQuery = useMyPermissions({
      enabled: Boolean(user && !isAdminOrOwner),
    });
    myPermissions = myPermsQuery?.data;
  } catch {
    myPermissions = undefined;
  }

  if (!user || !user.role) {
    return false;
  }
  if (effectiveIsOwner) {
    return true;
  }

  const role = user.role as Role;
  if (
    role !== "ADMIN" &&
    matrix &&
    matrix[role] &&
    typeof matrix[role][permission] === "boolean"
  ) {
    return matrix[role][permission];
  }

  if (myPermissions?.permissions && Array.isArray(myPermissions.permissions)) {
    return myPermissions.permissions.includes(permission);
  }

  return hasPermission(role, permission, effectiveIsOwner);
}
