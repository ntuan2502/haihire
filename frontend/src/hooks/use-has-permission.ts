import { useAuth } from "@/context/auth-context";
import { hasPermission, type Permission, type Role } from "@haihire/shared";

/**
 * Hook to verify if the currently authenticated user possesses a given permission.
 * Automatically resolves dynamic isOwner bypass and role-based permissions.
 */
export function useHasPermission(permission: Permission): boolean {
  const { user, isOwner } = useAuth();
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
  return hasPermission(user.role as Role, permission, effectiveIsOwner);
}
