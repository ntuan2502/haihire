"use client";

import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";

/**
 * Provides shared permission checks, owner/admin escalation rules,
 * and localized role helpers for all /settings/members views.
 */
export function useMembersAccess() {
  const { user, isOwner, refreshUser } = useAuth();
  const { t } = useI18n();
  const canManageMembers = useHasPermission("org:manage_members");
  const canManageAdminTargets = Boolean(isOwner || user?.role === "ADMIN");

  const roleOptions = useMemo(() => getOrgRoleOptions(t), [t]);
  const inviteRoleOptions = useMemo(
    () => getOrgRoleOptions(t, { excludeAdmin: !canManageAdminTargets }),
    [t, canManageAdminTargets],
  );

  const getRoleLabel = useCallback(
    (role: string): string => getOrgRoleLabel(role, t),
    [t],
  );

  return {
    user,
    isOwner,
    refreshUser,
    canManageMembers,
    canManageAdminTargets,
    roleOptions,
    inviteRoleOptions,
    getRoleLabel,
  };
}
