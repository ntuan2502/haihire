import { useAuth } from "@/context/auth-context";
import { hasPermission, type Permission, type Role } from "@haihire/shared";

/**
 * Hook to verify if the currently authenticated user possesses a given permission.
 * Automatically resolves OWNER role bypass and role-based permissions.
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user || !user.role) {
    return false;
  }
  return hasPermission(user.role as Role, permission);
}
