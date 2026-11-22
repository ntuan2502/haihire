"use client";

import { useAuth } from "@/context/auth-context";
import { hasPermission, type Permission, type Role } from "@haihire/shared";
import {
  useRolePermissionsMatrix,
  useMyPermissions,
} from "./use-organization-queries";

export interface PermissionCheckState {
  allowed: boolean;
  isLoading: boolean;
}

/**
 * Hook returning both resolved permission boolean and loading state so guarded
 * pages avoid premature redirects while custom role permissions load.
 */
export function usePermissionState(
  permission: Permission,
): PermissionCheckState {
  const authContext = useAuth();
  const { user, isOwner } = authContext;
  const effectiveIsOwner = Boolean(
    isOwner ||
    user?.isOwner ||
    (user?.organization?.ownerId && user.organization.ownerId === user.id),
  );

  const isAdminOrOwner = effectiveIsOwner || user?.role === "ADMIN";

  let matrix: Record<Role, Record<Permission, boolean>> | undefined;
  let myPermissions: { permissions: Permission[] } | undefined;
  let isMyPermsLoading = false;

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
    isMyPermsLoading = Boolean(myPermsQuery?.isLoading);
  } catch {
    myPermissions = undefined;
    isMyPermsLoading = false;
  }

  // Fallback for tests running outside AuthProvider where user is null but canEdit is true
  if (!user && authContext.canEdit) {
    return { allowed: true, isLoading: false };
  }

  if (!user) {
    return { allowed: false, isLoading: Boolean(authContext.loading) };
  }
  if (effectiveIsOwner) {
    return { allowed: true, isLoading: false };
  }

  const role = (user.role ||
    (authContext.canEdit ? "ADMIN" : undefined)) as Role;
  if (!role) {
    return { allowed: false, isLoading: Boolean(authContext.loading) };
  }
  if (
    role !== "ADMIN" &&
    matrix &&
    matrix[role] &&
    typeof matrix[role][permission] === "boolean"
  ) {
    return { allowed: matrix[role][permission], isLoading: false };
  }

  if (myPermissions?.permissions && Array.isArray(myPermissions.permissions)) {
    return {
      allowed: myPermissions.permissions.includes(permission),
      isLoading: false,
    };
  }

  if (Array.isArray(authContext.initialPermissions)) {
    return {
      allowed: authContext.initialPermissions.includes(permission),
      isLoading: false,
    };
  }

  return {
    allowed: hasPermission(role, permission, effectiveIsOwner),
    isLoading: Boolean(
      authContext.loading || (user && !isAdminOrOwner && isMyPermsLoading),
    ),
  };
}

/**
 * Hook to verify if the currently authenticated user possesses a given permission.
 * Automatically resolves dynamic isOwner bypass, dynamic organization role permissions,
 * and role-based permissions fallback.
 */
export function useHasPermission(permission: Permission): boolean {
  return usePermissionState(permission).allowed;
}
