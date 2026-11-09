import { useAuth } from "@/context/auth-context";
import { hasPermission, type Permission, type Role } from "@haihire/shared";
import { useRolePermissionsMatrix } from "./use-organization-queries";

/**
 * Hook to verify if the currently authenticated user possesses a given permission.
 * Automatically resolves dynamic isOwner bypass, dynamic organization role permissions,
 * and role-based permissions fallback.
 */
export function useHasPermission(permission: Permission): boolean {
  const { user, isOwner } = useAuth();
  let matrix: Record<Role, Record<Permission, boolean>> | undefined;

  try {
    const matrixQuery = useRolePermissionsMatrix();
    matrix = matrixQuery?.data;
  } catch {
    // Fallback when rendered outside QueryClientProvider (e.g. isolated test environments)
    matrix = undefined;
  }

  if (!user || !user.role) {
    return false;
  }
  const effectiveIsOwner = Boolean(
    isOwner ||
    user.isOwner ||
    (user.organization?.ownerId && user.organization.ownerId === user.id),
  );
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

  return hasPermission(role, permission, effectiveIsOwner);
}
